/**
 * Dhamrai Life — Player Locomotion Audio Subsystem
 * =================================================
 * Synthesizes procedural footstep acoustics synchronized with character controller locomotion:
 * 1. Walking cadence: ~2.0 Hz (500ms interval).
 * 2. Sprinting cadence: ~3.2 Hz (312ms interval).
 * 3. Immediate cessation when stationary or entering a vehicle.
 * 4. Zero node leaks or timer accumulations.
 */

export class LocomotionAudio {
  private ctx: AudioContext | null = null;
  private sfxBus: GainNode | null = null;

  private stepTimer = 0.0;
  private isSteppingLeft = false;

  constructor() {}

  public init(ctx: AudioContext, sfxBus: GainNode): void {
    this.ctx = ctx;
    this.sfxBus = sfxBus;
  }

  /**
   * Updates locomotion footstep state and triggers rhythmic steps when moving on foot.
   */
  public update(
    dt: number,
    speedMps: number,
    isSprinting: boolean,
    isInVehicle: boolean
  ): void {
    if (!this.ctx || !this.sfxBus || this.ctx.state !== 'running') return;

    // Guard: No footsteps if riding or virtually stationary
    if (isInVehicle || speedMps < 0.25) {
      this.stepTimer = 0.0;
      return;
    }

    // Determine target cadence and interval
    // Walking ~2.0 Hz (500ms), Sprinting ~3.2 Hz (312ms)
    const targetHz = isSprinting ? 3.2 : 2.0;
    const stepInterval = 1.0 / targetHz;

    this.stepTimer += dt;
    if (this.stepTimer >= stepInterval) {
      this.stepTimer = 0.0;
      this.triggerFootstep(isSprinting);
    }
  }

  private triggerFootstep(isSprinting: boolean): void {
    if (!this.ctx || !this.sfxBus) return;

    try {
      const now = this.ctx.currentTime;
      this.isSteppingLeft = !this.isSteppingLeft;

      // 1. Low-frequency ground impact thud (80-140 Hz)
      const thudOsc = this.ctx.createOscillator();
      const thudGain = this.ctx.createGain();

      const baseFreq = this.isSteppingLeft ? 95 : 110;
      const thudFreq = baseFreq + (isSprinting ? 15 : 0) + (Math.random() * 10 - 5);
      thudOsc.type = 'sine';
      thudOsc.frequency.setValueAtTime(thudFreq, now);
      thudOsc.frequency.exponentialRampToValueAtTime(45, now + 0.06);

      const thudPeak = isSprinting ? 0.18 : 0.11;
      thudGain.gain.setValueAtTime(0.0001, now);
      thudGain.gain.linearRampToValueAtTime(thudPeak, now + 0.003);
      thudGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);

      thudOsc.connect(thudGain);
      thudGain.connect(this.sfxBus);

      thudOsc.start(now);
      thudOsc.stop(now + 0.08);

      thudOsc.onended = () => {
        try {
          thudOsc.disconnect();
          thudGain.disconnect();
        } catch {}
      };

      // 2. High-frequency sole/shoe scuff on asphalt/pavement (bandpass filtered noise)
      const scuffFilter = this.ctx.createBiquadFilter();
      scuffFilter.type = 'bandpass';
      scuffFilter.frequency.setValueAtTime(950 + (Math.random() * 200 - 100), now);
      scuffFilter.Q.setValueAtTime(2.0, now);

      const scuffGain = this.ctx.createGain();
      const scuffPeak = isSprinting ? 0.09 : 0.05;
      scuffGain.gain.setValueAtTime(0.0001, now);
      scuffGain.gain.linearRampToValueAtTime(scuffPeak, now + 0.004);
      scuffGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.055);

      // Create a short 50ms buffer of noise for the shoe texture
      const sampleRate = this.ctx.sampleRate || 44100;
      const frames = Math.floor(sampleRate * 0.06);
      const scuffBuf = this.ctx.createBuffer(1, frames, sampleRate);
      const data = scuffBuf.getChannelData(0);
      for (let i = 0; i < frames; i++) {
        data[i] = Math.random() * 2.0 - 1.0;
      }

      const scuffSource = this.ctx.createBufferSource();
      scuffSource.buffer = scuffBuf;

      scuffSource.connect(scuffFilter);
      scuffFilter.connect(scuffGain);
      scuffGain.connect(this.sfxBus);

      scuffSource.start(now);
      scuffSource.stop(now + 0.06);

      scuffSource.onended = () => {
        try {
          scuffSource.disconnect();
          scuffFilter.disconnect();
          scuffGain.disconnect();
        } catch {}
      };
    } catch (err) {
      console.warn('LocomotionAudio: Failed to trigger footstep:', err);
    }
  }

  public dispose(): void {
    this.stepTimer = 0.0;
    this.ctx = null;
    this.sfxBus = null;
  }
}
