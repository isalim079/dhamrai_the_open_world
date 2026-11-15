/**
 * Dhamrai Life — Pedal Rickshaw Audio Subsystem
 * ==============================================
 * Synthesizes authentic Bangladeshi cycle rickshaw acoustics:
 * 1. Dual-tone brass bell ("Tring-Tring") at ~2400 Hz and ~2800 Hz.
 * 2. Speed-responsive tire rolling noise with dynamic lowpass cutoff.
 * 3. Mechanical bicycle chain and sprocket pedaling cadence.
 * 4. High-frequency friction brake squeal with state/cooldown gating.
 */

import { clamp, createPinkNoiseBuffer } from './SynthesizerUtils.js';

export class RickshawAudio {
  private ctx: AudioContext | null = null;
  private sfxBus: GainNode | null = null;

  // Rolling sound nodes
  private rollingSource: AudioBufferSourceNode | null = null;
  private rollingFilter: BiquadFilterNode | null = null;
  private rollingGain: GainNode | null = null;
  private isRollingActive = false;

  // Chain pedaling state
  private chainTimer = 0.0;

  // Brake squeal state
  private lastBrakeSquealTime = -10.0;
  private readonly brakeSquealCooldown = 1.5; // seconds between squeals

  constructor() {}

  /**
   * Initializes the rickshaw audio nodes under the SFX bus.
   */
  public init(ctx: AudioContext, sfxBus: GainNode): void {
    this.ctx = ctx;
    this.sfxBus = sfxBus;

    try {
      // 1. Setup continuous rolling noise loop
      const pinkNoise = createPinkNoiseBuffer(ctx, 2.0);
      this.rollingSource = ctx.createBufferSource();
      this.rollingSource.buffer = pinkNoise;
      this.rollingSource.loop = true;

      this.rollingFilter = ctx.createBiquadFilter();
      this.rollingFilter.type = 'lowpass';
      this.rollingFilter.frequency.setValueAtTime(200, ctx.currentTime);
      this.rollingFilter.Q.setValueAtTime(1.5, ctx.currentTime);

      this.rollingGain = ctx.createGain();
      this.rollingGain.gain.setValueAtTime(0.0, ctx.currentTime);

      this.rollingSource.connect(this.rollingFilter);
      this.rollingFilter.connect(this.rollingGain);
      this.rollingGain.connect(sfxBus);

      this.rollingSource.start();
      this.isRollingActive = true;
    } catch (err) {
      console.warn('RickshawAudio: Failed to initialize rolling sound generator:', err);
    }
  }

  /**
   * Triggers the iconic dual-tone cycle rickshaw bell ("Tring-Tring!").
   * Synthesizes two rapid metallic strikes spaced ~110ms apart.
   * Each strike combines twin frequencies (~2400 Hz & ~2800 Hz) with exponential decay.
   */
  public triggerBell(): void {
    if (!this.ctx || !this.sfxBus || this.ctx.state !== 'running') return;

    const now = this.ctx.currentTime;
    // Primary strike at t=0, secondary rebound strike at t=110ms
    this.synthesizeBellStrike(now, 0.45);
    this.synthesizeBellStrike(now + 0.11, 0.35);
  }

  private synthesizeBellStrike(startTime: number, peakGain: number): void {
    if (!this.ctx || !this.sfxBus) return;

    try {
      const strikeGain = this.ctx.createGain();
      strikeGain.gain.setValueAtTime(0.0001, startTime);
      strikeGain.gain.linearRampToValueAtTime(peakGain, startTime + 0.003);
      strikeGain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.38);

      const highPass = this.ctx.createBiquadFilter();
      highPass.type = 'highpass';
      highPass.frequency.setValueAtTime(1200, startTime);

      strikeGain.connect(highPass);
      highPass.connect(this.sfxBus);

      // Frequencies for brass rickshaw bell
      const freqs = [2400, 2820, 4850];
      const gains = [0.6, 0.5, 0.15];

      for (let i = 0; i < freqs.length; i++) {
        const osc = this.ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freqs[i]!, startTime);

        const oscGain = this.ctx.createGain();
        oscGain.gain.setValueAtTime(gains[i]!, startTime);

        osc.connect(oscGain);
        oscGain.connect(strikeGain);

        osc.start(startTime);
        osc.stop(startTime + 0.40);

        osc.onended = () => {
          try {
            osc.disconnect();
            oscGain.disconnect();
          } catch {}
        };
      }

      // Automatically clean up strikeGain and highPass after sound finishes
      setTimeout(() => {
        try {
          strikeGain.disconnect();
          highPass.disconnect();
        } catch {}
      }, 500);
    } catch (err) {
      console.warn('RickshawAudio: Failed to synthesize bell strike:', err);
    }
  }

  /**
   * Updates speed-dependent wheel rolling, pedaling chain cadence, and braking.
   */
  public update(
    dt: number,
    speedMps: number,
    isOccupied: boolean,
    isBraking: boolean,
    isPedaling: boolean
  ): void {
    if (!this.ctx || !this.sfxBus || this.ctx.state !== 'running') return;

    const absSpeed = Math.abs(speedMps);
    const now = this.ctx.currentTime;

    // 1. Wheel Rolling Audio Modulation
    if (this.rollingGain && this.rollingFilter) {
      if (!isOccupied || absSpeed < 0.15) {
        // Stationary or unmounted -> quiet
        this.rollingGain.gain.setTargetAtTime(0.0, now, 0.08);
      } else {
        // Active rolling: gain in [0.03, 0.32], filter in [250 Hz, 1200 Hz]
        const speedNorm = clamp(absSpeed / 5.0, 0.0, 1.0); // 5.0 m/s = 18 km/h max speed
        const targetGain = 0.03 + speedNorm * 0.28;
        const targetFreq = 220 + speedNorm * 950;

        this.rollingGain.gain.setTargetAtTime(targetGain, now, 0.05);
        this.rollingFilter.frequency.setTargetAtTime(targetFreq, now, 0.05);
      }
    }

    // 2. Mechanical Pedaling / Chain Ratchet Cadence
    if (isOccupied && isPedaling && absSpeed > 0.3) {
      // Pedaling frequency in [2.2 Hz, 6.0 Hz]
      const cadenceFreq = clamp(2.0 + absSpeed * 0.7, 2.0, 6.0);
      const stepInterval = 1.0 / cadenceFreq;

      this.chainTimer += dt;
      if (this.chainTimer >= stepInterval) {
        this.chainTimer = 0.0;
        this.triggerChainClick();
      }
    } else {
      this.chainTimer = 0.0;
    }

    // 3. Brake Squeal Detection
    if (isOccupied && isBraking && absSpeed > 2.0) {
      if (now - this.lastBrakeSquealTime >= this.brakeSquealCooldown) {
        this.lastBrakeSquealTime = now;
        this.triggerBrakeSqueal(absSpeed);
      }
    }
  }

  private triggerChainClick(): void {
    if (!this.ctx || !this.sfxBus) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1400 + Math.random() * 300, now);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1600, now);
      filter.Q.setValueAtTime(3.0, now);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.08, now + 0.002);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.035);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxBus);

      osc.start(now);
      osc.stop(now + 0.04);

      osc.onended = () => {
        try {
          osc.disconnect();
          filter.disconnect();
          gain.disconnect();
        } catch {}
      };
    } catch {}
  }

  private triggerBrakeSqueal(speedMps: number): void {
    if (!this.ctx || !this.sfxBus) return;

    try {
      const now = this.ctx.currentTime;
      const duration = 0.22;
      const squealGain = this.ctx.createGain();
      const osc = this.ctx.createOscillator();

      const intensity = clamp((speedMps - 2.0) / 3.0, 0.3, 1.0);
      const baseFreq = 2800 + Math.random() * 300;

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.linearRampToValueAtTime(baseFreq - 400, now + duration);

      squealGain.gain.setValueAtTime(0.0001, now);
      squealGain.gain.linearRampToValueAtTime(0.12 * intensity, now + 0.015);
      squealGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      osc.connect(squealGain);
      squealGain.connect(this.sfxBus);

      osc.start(now);
      osc.stop(now + duration + 0.02);

      osc.onended = () => {
        try {
          osc.disconnect();
          squealGain.disconnect();
        } catch {}
      };
    } catch {}
  }

  /**
   * Disposes all audio nodes and stops looping generators.
   */
  public dispose(): void {
    if (this.rollingSource) {
      try {
        this.rollingSource.stop();
        this.rollingSource.disconnect();
      } catch {}
      this.rollingSource = null;
    }
    if (this.rollingFilter) {
      try {
        this.rollingFilter.disconnect();
      } catch {}
      this.rollingFilter = null;
    }
    if (this.rollingGain) {
      try {
        this.rollingGain.disconnect();
      } catch {}
      this.rollingGain = null;
    }
    this.isRollingActive = false;
    this.ctx = null;
    this.sfxBus = null;
  }
}
