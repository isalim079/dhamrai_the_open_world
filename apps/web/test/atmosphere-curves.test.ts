import { describe, it, expect } from 'vitest';
import {
  formatGameClock,
  getDayPhase,
  getNightFactor,
  getSunSpherical,
  sampleAtmosphere,
  sunDirectionFromSpherical,
} from '../src/engine/atmosphere/atmosphereCurves.js';

describe('atmosphereCurves', () => {
  it('maps phases across the day', () => {
    expect(getDayPhase(0.0)).toBe('night');
    expect(getDayPhase(0.25)).toBe('dawn');
    expect(getDayPhase(0.5)).toBe('day');
    expect(getDayPhase(0.75)).toBe('dusk');
    expect(getDayPhase(0.95)).toBe('night');
  });

  it('nightFactor is ~0 at noon and high at midnight', () => {
    expect(getNightFactor(0.5)).toBe(0);
    expect(getNightFactor(0.0)).toBeGreaterThan(0.9);
    expect(getNightFactor(0.9)).toBeGreaterThan(0.5);
  });

  it('sun elevation peaks near noon and is negative at night', () => {
    const noon = getSunSpherical(0.5);
    const midnight = getSunSpherical(0.0);
    expect(noon.elevation).toBeGreaterThan(0.8);
    expect(midnight.elevation).toBeLessThan(0);
  });

  it('sunDirectionFromSpherical returns unit-ish vector', () => {
    const d = sunDirectionFromSpherical(Math.PI / 4, 0);
    const len = Math.hypot(d.x, d.y, d.z);
    expect(len).toBeCloseTo(1, 5);
  });

  it('sampleAtmosphere returns finite values without NaN', () => {
    for (const t of [0, 0.25, 0.5, 0.75, 0.99]) {
      const s = sampleAtmosphere(t, 0.5);
      expect(Number.isFinite(s.sunIntensity)).toBe(true);
      expect(Number.isFinite(s.exposure)).toBe(true);
      expect(Number.isFinite(s.fogDensity)).toBe(true);
      expect(s.skyColor.r).toBeGreaterThanOrEqual(0);
    }
  });

  it('rain increases fog density vs clear at same t', () => {
    const clear = sampleAtmosphere(0.5, 0);
    const rain = sampleAtmosphere(0.5, 1);
    expect(rain.fogDensity).toBeGreaterThan(clear.fogDensity);
  });

  it('formatGameClock formats HH:MM', () => {
    expect(formatGameClock(0)).toBe('00:00');
    expect(formatGameClock(0.5)).toBe('12:00');
  });
});
