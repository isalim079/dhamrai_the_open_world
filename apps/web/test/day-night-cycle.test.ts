import { describe, it, expect, beforeEach } from 'vitest';
import { DayNightCycle } from '../src/engine/atmosphere/DayNightCycle.js';

describe('DayNightCycle', () => {
  let cycle: DayNightCycle;

  beforeEach(() => {
    cycle = new DayNightCycle(100); // 100s full day for fast tests
    cycle.timeScale = 1;
    cycle.paused = false;
    cycle.setTimeOfDay(0);
  });

  it('advances t with dt and wraps at 1', () => {
    cycle.update(50); // half day
    expect(cycle.t).toBeCloseTo(0.5, 5);
    cycle.update(60); // wrap
    expect(cycle.t).toBeGreaterThanOrEqual(0);
    expect(cycle.t).toBeLessThan(1);
    expect(cycle.t).toBeCloseTo(0.1, 5);
  });

  it('setTimeOfDay clamps into [0,1)', () => {
    cycle.setTimeOfDay(1.25);
    expect(cycle.t).toBeCloseTo(0.25, 5);
    cycle.setTimeOfDay(-0.1);
    expect(cycle.t).toBeCloseTo(0.9, 5);
  });

  it('pause stops advancement', () => {
    cycle.setTimeOfDay(0.2);
    cycle.setPaused(true);
    cycle.update(10);
    expect(cycle.t).toBeCloseTo(0.2, 5);
  });

  it('reports phase and nightFactor at noon/midnight', () => {
    cycle.setTimeOfDay(0.5);
    expect(cycle.phase).toBe('day');
    expect(cycle.nightFactor).toBe(0);
    expect(cycle.isNightLike).toBe(false);

    cycle.setTimeOfDay(0.0);
    expect(cycle.phase).toBe('night');
    expect(cycle.isNightLike).toBe(true);
  });

  it('clockLabel formats from t', () => {
    cycle.setTimeOfDay(0.5);
    expect(cycle.clockLabel).toBe('12:00');
  });
});
