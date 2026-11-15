/**
 * Dhamrai Life — UI & Quest Event Audio Subsystem
 * ================================================
 * Synthesizes crisp procedural auditory feedback for interface interactions and quest events:
 * 1. Dialogue advancement click.
 * 2. Mission acceptance two-note chime.
 * 3. Mission completion victory fanfare.
 * 4. Fare payout / Poisha metallic coin rattle.
 */

export class UIAudio {
  private ctx: AudioContext | null = null;
  private sfxBus: GainNode | null = null;

  constructor() {}

  public init(ctx: AudioContext, sfxBus: GainNode): void {
    this.ctx = ctx;
    this.sfxBus = sfxBus;
  }

  /**
   * Plays a subtle, tactile click when selecting or advancing dialogue choices.
   */
  public playDialogueClick(): void {
    if (!this.ctx || !this.sfxBus || this.ctx.state !== 'running') return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(320, now + 0.025);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.12, now + 0.002);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.028);

      osc.connect(gain);
      gain.connect(this.sfxBus);

      osc.start(now);
      osc.stop(now + 0.03);

      osc.onended = () => {
        try {
          osc.disconnect();
          gain.disconnect();
        } catch {}
      };
    } catch {}
  }

  /**
   * Plays an uplifting rising two-note chime when a mission or fare trip is accepted.
   * Notes: C5 (523.25 Hz) -> E5 (659.25 Hz)
   */
  public playMissionAccept(): void {
    if (!this.ctx || !this.sfxBus || this.ctx.state !== 'running') return;

    try {
      const now = this.ctx.currentTime;
      const notes = [
        { freq: 523.25, time: now, dur: 0.12 },
        { freq: 659.25, time: now + 0.09, dur: 0.20 },
      ];

      for (const note of notes) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(note.freq, note.time);

        gain.gain.setValueAtTime(0.0001, note.time);
        gain.gain.linearRampToValueAtTime(0.18, note.time + 0.004);
        gain.gain.exponentialRampToValueAtTime(0.0001, note.time + note.dur);

        osc.connect(gain);
        gain.connect(this.sfxBus);

        osc.start(note.time);
        osc.stop(note.time + note.dur + 0.02);

        osc.onended = () => {
          try {
            osc.disconnect();
            gain.disconnect();
          } catch {}
        };
      }
    } catch {}
  }

  /**
   * Plays a triumphant three-note celebratory fanfare upon mission completion.
   * Notes: C5 (523.25 Hz) -> E5 (659.25 Hz) -> G5 (783.99 Hz)
   */
  public playMissionComplete(): void {
    if (!this.ctx || !this.sfxBus || this.ctx.state !== 'running') return;

    try {
      const now = this.ctx.currentTime;
      const notes = [
        { freq: 523.25, time: now, dur: 0.14, peak: 0.20 },
        { freq: 659.25, time: now + 0.12, dur: 0.16, peak: 0.22 },
        { freq: 783.99, time: now + 0.25, dur: 0.35, peak: 0.26 },
      ];

      for (const note of notes) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(note.freq, note.time);

        gain.gain.setValueAtTime(0.0001, note.time);
        gain.gain.linearRampToValueAtTime(note.peak, note.time + 0.005);
        gain.gain.exponentialRampToValueAtTime(0.0001, note.time + note.dur);

        osc.connect(gain);
        gain.connect(this.sfxBus);

        osc.start(note.time);
        osc.stop(note.time + note.dur + 0.03);

        osc.onended = () => {
          try {
            osc.disconnect();
            gain.disconnect();
          } catch {}
        };
      }
    } catch {}
  }

  /**
   * Plays a crisp metallic coin rattle when Poisha cash is paid into the ledger.
   */
  public playCoinPayout(): void {
    if (!this.ctx || !this.sfxBus || this.ctx.state !== 'running') return;

    try {
      const now = this.ctx.currentTime;
      // Twin rapid high-frequency metallic coin pings
      const coins = [
        { freq: 3400, time: now },
        { freq: 4200, time: now + 0.04 },
      ];

      for (const coin of coins) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(coin.freq, coin.time);
        osc.frequency.exponentialRampToValueAtTime(coin.freq * 0.85, coin.time + 0.09);

        gain.gain.setValueAtTime(0.0001, coin.time);
        gain.gain.linearRampToValueAtTime(0.16, coin.time + 0.002);
        gain.gain.exponentialRampToValueAtTime(0.0001, coin.time + 0.08);

        osc.connect(gain);
        gain.connect(this.sfxBus);

        osc.start(coin.time);
        osc.stop(coin.time + 0.09);

        osc.onended = () => {
          try {
            osc.disconnect();
            gain.disconnect();
          } catch {}
        };
      }
    } catch {}
  }

  public dispose(): void {
    this.ctx = null;
    this.sfxBus = null;
  }
}
