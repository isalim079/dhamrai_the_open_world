/**
 * Dhamrai Life — 3D Spatial Ambient Soundscape
 * =============================================
 * Manages spatialized environmental audio emitters for key Dhamrai locations:
 * 1. Rathkhola Stand (X: 0, Z: 0): Market murmur & tea-stall activity/clatter.
 * 2. Kayetpara Metal Workshop (X: -295.3, Z: -77.0): Metallic hammering & brass craft chimes.
 * 3. Thana Junction (X: -61.0, Z: 66.5): Distant traffic and road rumble.
 * Plus an unspatialized subtle atmospheric wind bed.
 *
 * Implements strict distance attenuation, idempotent initialization,
 * and zero emitter duplication across chunk streaming cycles.
 */

import { createPinkNoiseBuffer } from './SynthesizerUtils.js';

export interface SpatialEmitterConfig {
  id: string;
  name: string;
  position: { x: number; y: number; z: number };
  maxDistance: number;
  refDistance: number;
}

export class AmbientSoundscape {
  private ctx: AudioContext | null = null;
  private ambienceBus: GainNode | null = null;

  private isInitialized = false;

  public get isActive(): boolean {
    return this.isInitialized;
  }

  // Global ambient wind/town bed
  private globalBedSource: AudioBufferSourceNode | null = null;
  private globalBedFilter: BiquadFilterNode | null = null;
  private globalBedGain: GainNode | null = null;

  // Zone timers
  private kayetparaHammerTimer = 0.0;
  private rathkholaTeaTimer = 0.0;
  private thanaTrafficTimer = 0.0;

  // Emitter anchors
  public static readonly EMITTERS: Record<string, SpatialEmitterConfig> = {
    RATHKHOLA: {
      id: 'emitter_rathkhola',
      name: 'Rathkhola Stand Market',
      position: { x: 0.0, y: 0.5, z: 0.0 },
      maxDistance: 65.0,
      refDistance: 15.0,
    },
    KAYETPARA: {
      id: 'emitter_kayetpara',
      name: 'Kayetpara Metal Workshop',
      position: { x: -295.3, y: 0.5, z: -77.0 },
      maxDistance: 55.0,
      refDistance: 12.0,
    },
    THANA: {
      id: 'emitter_thana',
      name: 'Thana Junction Checkpoint',
      position: { x: -61.0, y: 0.5, z: 66.5 },
      maxDistance: 55.0,
      refDistance: 15.0,
    },
  };

  // Spatial Panner Nodes
  private panners: Map<string, { panner: PannerNode; gain: GainNode }> = new Map();

  constructor() {}

  /**
   * Initializes the spatial emitters and global soundscape bed under ambienceBus.
   * Idempotent: safe to call repeatedly; will never create duplicate nodes.
   */
  public init(ctx: AudioContext, ambienceBus: GainNode): void {
    if (this.isInitialized) return;
    this.ctx = ctx;
    this.ambienceBus = ambienceBus;

    try {
      // 1. Setup continuous subtle town atmospheric bed
      const pinkNoise = createPinkNoiseBuffer(ctx, 4.0);
      this.globalBedSource = ctx.createBufferSource();
      this.globalBedSource.buffer = pinkNoise;
      this.globalBedSource.loop = true;

      this.globalBedFilter = ctx.createBiquadFilter();
      this.globalBedFilter.type = 'lowpass';
      this.globalBedFilter.frequency.setValueAtTime(320, ctx.currentTime);

      this.globalBedGain = ctx.createGain();
      this.globalBedGain.gain.setValueAtTime(0.08, ctx.currentTime);

      this.globalBedSource.connect(this.globalBedFilter);
      this.globalBedFilter.connect(this.globalBedGain);
      this.globalBedGain.connect(ambienceBus);

      this.globalBedSource.start();

      // 2. Setup 3D Spatial Panners for each landmark
      for (const key of Object.keys(AmbientSoundscape.EMITTERS)) {
        const config = AmbientSoundscape.EMITTERS[key]!;
        const panner = ctx.createPanner();
        panner.panningModel = 'HRTF';
        panner.distanceModel = 'linear';
        panner.refDistance = config.refDistance;
        panner.maxDistance = config.maxDistance;
        panner.rolloffFactor = 1.0;

        if (panner.positionX) {
          panner.positionX.setValueAtTime(config.position.x, ctx.currentTime);
          panner.positionY.setValueAtTime(config.position.y, ctx.currentTime);
          panner.positionZ.setValueAtTime(config.position.z, ctx.currentTime);
        } else {
          panner.setPosition(config.position.x, config.position.y, config.position.z);
        }

        const emitterGain = ctx.createGain();
        emitterGain.gain.setValueAtTime(1.0, ctx.currentTime);

        panner.connect(emitterGain);
        emitterGain.connect(ambienceBus);

        this.panners.set(config.id, { panner, gain: emitterGain });
      }

      this.isInitialized = true;
    } catch (err) {
      console.warn('AmbientSoundscape: Failed to initialize spatial soundscape:', err);
    }
  }

  /**
   * Updates periodic zone audio events based on distance to player/camera position.
   */
  public update(dt: number, listenerPos: { x: number; y: number; z: number }): void {
    if (!this.ctx || !this.ambienceBus || this.ctx.state !== 'running' || !this.isInitialized) return;

    // 1. Kayetpara Metal Workshop (Anvil Hammering & Brass Shaping)
    const kayetparaCfg = AmbientSoundscape.EMITTERS.KAYETPARA!;
    const distKayetpara = Math.hypot(
      listenerPos.x - kayetparaCfg.position.x,
      listenerPos.z - kayetparaCfg.position.z
    );
    if (distKayetpara < kayetparaCfg.maxDistance) {
      this.kayetparaHammerTimer += dt;
      if (this.kayetparaHammerTimer >= 2.2) {
        this.kayetparaHammerTimer = Math.random() * 0.8; // jitter next strike
        this.triggerAnvilStrike(kayetparaCfg.id);
      }
    } else {
      this.kayetparaHammerTimer = 0.0;
    }

    // 2. Rathkhola Stand (Tea stall clatter & Market murmur)
    const rathkholaCfg = AmbientSoundscape.EMITTERS.RATHKHOLA!;
    const distRathkhola = Math.hypot(
      listenerPos.x - rathkholaCfg.position.x,
      listenerPos.z - rathkholaCfg.position.z
    );
    if (distRathkhola < rathkholaCfg.maxDistance) {
      this.rathkholaTeaTimer += dt;
      if (this.rathkholaTeaTimer >= 3.0) {
        this.rathkholaTeaTimer = Math.random() * 1.0;
        this.triggerTeaStallClatter(rathkholaCfg.id);
      }
    } else {
      this.rathkholaTeaTimer = 0.0;
    }

    // 3. Thana Junction (Distant traffic rumble)
    const thanaCfg = AmbientSoundscape.EMITTERS.THANA!;
    const distThana = Math.hypot(
      listenerPos.x - thanaCfg.position.x,
      listenerPos.z - thanaCfg.position.z
    );
    if (distThana < thanaCfg.maxDistance) {
      this.thanaTrafficTimer += dt;
      if (this.thanaTrafficTimer >= 4.5) {
        this.thanaTrafficTimer = Math.random() * 1.5;
        this.triggerTrafficRumble(thanaCfg.id);
      }
    } else {
      this.thanaTrafficTimer = 0.0;
    }
  }

  /**
   * Synthesizes an artisan metallic hammer strike on brass/anvil.
   */
  public triggerAnvilStrike(emitterId = 'emitter_kayetpara'): void {
    if (!this.ctx) return;
    const pannerEntry = this.panners.get(emitterId);
    if (!pannerEntry) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();

      const baseFreq = 1680 + (Math.random() * 400 - 200); // High metallic chime
      osc.type = 'sine';
      osc.frequency.setValueAtTime(baseFreq, now);

      oscGain.gain.setValueAtTime(0.0001, now);
      oscGain.gain.linearRampToValueAtTime(0.28, now + 0.002);
      oscGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);

      osc.connect(oscGain);
      oscGain.connect(pannerEntry.panner);

      osc.start(now);
      osc.stop(now + 0.30);

      osc.onended = () => {
        try {
          osc.disconnect();
          oscGain.disconnect();
        } catch {}
      };
    } catch {}
  }

  /**
   * Synthesizes roadside tea-stall spoon and glass clink.
   */
  public triggerTeaStallClatter(emitterId = 'emitter_rathkhola'): void {
    if (!this.ctx) return;
    const pannerEntry = this.panners.get(emitterId);
    if (!pannerEntry) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();

      // High glass chime (~3200 Hz)
      osc.type = 'sine';
      osc.frequency.setValueAtTime(3200 + Math.random() * 300, now);

      oscGain.gain.setValueAtTime(0.0001, now);
      oscGain.gain.linearRampToValueAtTime(0.18, now + 0.003);
      oscGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);

      osc.connect(oscGain);
      oscGain.connect(pannerEntry.panner);

      osc.start(now);
      osc.stop(now + 0.18);

      osc.onended = () => {
        try {
          osc.disconnect();
          oscGain.disconnect();
        } catch {}
      };
    } catch {}
  }

  /**
   * Synthesizes distant engine horn / road rumble burst.
   */
  public triggerTrafficRumble(emitterId = 'emitter_thana'): void {
    if (!this.ctx) return;
    const pannerEntry = this.panners.get(emitterId);
    if (!pannerEntry) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();

      // Low engine horn / traffic hum (180 Hz with vibrato)
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(180, now);

      oscGain.gain.setValueAtTime(0.0001, now);
      oscGain.gain.linearRampToValueAtTime(0.14, now + 0.05);
      oscGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);

      osc.connect(oscGain);
      oscGain.connect(pannerEntry.panner);

      osc.start(now);
      osc.stop(now + 0.50);

      osc.onended = () => {
        try {
          osc.disconnect();
          oscGain.disconnect();
        } catch {}
      };
    } catch {}
  }

  /**
   * Disposes all ambient nodes and panners cleanly.
   */
  public dispose(): void {
    if (this.globalBedSource) {
      try {
        this.globalBedSource.stop();
        this.globalBedSource.disconnect();
      } catch {}
      this.globalBedSource = null;
    }
    if (this.globalBedFilter) {
      try {
        this.globalBedFilter.disconnect();
      } catch {}
      this.globalBedFilter = null;
    }
    if (this.globalBedGain) {
      try {
        this.globalBedGain.disconnect();
      } catch {}
      this.globalBedGain = null;
    }

    for (const entry of this.panners.values()) {
      try {
        entry.panner.disconnect();
        entry.gain.disconnect();
      } catch {}
    }
    this.panners.clear();

    this.isInitialized = false;
    this.ctx = null;
    this.ambienceBus = null;
  }
}
