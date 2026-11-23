/**
 * Milestone 12 — Game-day clock (default: 24 real minutes = 1 game day).
 */

import {
  formatGameClock,
  getDayPhase,
  getNightFactor,
  getSunSpherical,
  sunDirectionFromSpherical,
  type DayPhase,
} from './atmosphereCurves.js';

export const DEFAULT_FULL_DAY_SECONDS = 1440; // 24 minutes
export const TIME_SCALE_STORAGE_KEY = 'dhamrai.timeScale';

export class DayNightCycle {
  /** Normalized time of day in [0, 1). */
  public t = 0.35; // start mid-morning (~08:24)
  public paused = false;
  public timeScale = 1.0;
  public fullDaySeconds: number;

  constructor(fullDaySeconds = DEFAULT_FULL_DAY_SECONDS) {
    this.fullDaySeconds = fullDaySeconds;
    this.loadPrefs();
  }

  private loadPrefs(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const raw = localStorage.getItem(TIME_SCALE_STORAGE_KEY);
      if (raw != null) {
        const v = Number(raw);
        if (Number.isFinite(v) && v >= 0 && v <= 64) this.timeScale = v;
      }
    } catch {
      /* ignore */
    }
  }

  public persistPrefs(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(TIME_SCALE_STORAGE_KEY, String(this.timeScale));
    } catch {
      /* ignore */
    }
  }

  public update(dt: number): void {
    if (this.paused || this.timeScale === 0) return;
    const rate = this.timeScale / this.fullDaySeconds;
    this.t = (this.t + dt * rate) % 1;
    if (this.t < 0) this.t += 1;
  }

  public setTimeOfDay(t: number): void {
    const x = t % 1;
    this.t = x < 0 ? x + 1 : x;
  }

  public setPaused(paused: boolean): void {
    this.paused = paused;
  }

  public setTimeScale(scale: number): void {
    this.timeScale = Math.max(0, Math.min(64, scale));
    this.persistPrefs();
  }

  public get phase(): DayPhase {
    return getDayPhase(this.t);
  }

  public get nightFactor(): number {
    return getNightFactor(this.t);
  }

  public get isNightLike(): boolean {
    return this.nightFactor >= 0.35;
  }

  public get clockLabel(): string {
    return formatGameClock(this.t);
  }

  public getSunDirection(): { x: number; y: number; z: number } {
    const { elevation, azimuth } = getSunSpherical(this.t);
    return sunDirectionFromSpherical(elevation, azimuth);
  }
}
