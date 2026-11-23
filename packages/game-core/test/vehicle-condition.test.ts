import { describe, it, expect } from 'vitest';
import {
  applyTravelWear,
  applyRepair,
  computeSpeedModifiers,
  WEAR_DAMAGE_PER_METER,
  TIRE_LOSS_PER_METER,
  DAMAGE_SPEED_SOFT_THRESHOLD,
  DAMAGE_SPEED_HARD_THRESHOLD,
} from '../src/vehicle-condition.js';

describe('VehicleCondition — wear, tire, puncture, repair', () => {
  it('increases damage and decreases tire with distance', () => {
    const result = applyTravelWear(
      { damagePercent: 0, tirePressurePercent: 100, isPunctured: false },
      2000,
      false,
      () => 1 // never puncture
    );
    expect(result.damageDelta).toBeCloseTo(2000 * WEAR_DAMAGE_PER_METER, 5);
    expect(result.damagePercent).toBeCloseTo(1, 5);
    expect(result.tireDelta).toBeCloseTo(2000 * TIRE_LOSS_PER_METER, 5);
    expect(result.tirePressurePercent).toBeCloseTo(100 - 16, 5);
    expect(result.punctureTriggered).toBe(false);
  });

  it('accelerates tire loss and damage under sprint', () => {
    const base = applyTravelWear(
      { damagePercent: 0, tirePressurePercent: 100, isPunctured: false },
      1000,
      false,
      () => 1
    );
    const sprint = applyTravelWear(
      { damagePercent: 0, tirePressurePercent: 100, isPunctured: false },
      1000,
      true,
      () => 1
    );
    expect(sprint.damageDelta).toBeGreaterThan(base.damageDelta);
    expect(sprint.tireDelta).toBeGreaterThan(base.tireDelta);
  });

  it('triggers puncture deterministically below threshold when rng succeeds', () => {
    const result = applyTravelWear(
      { damagePercent: 10, tirePressurePercent: 25, isPunctured: false },
      500,
      false,
      () => 0 // always puncture
    );
    expect(result.punctureTriggered).toBe(true);
    expect(result.isPunctured).toBe(true);
    expect(result.tirePressurePercent).toBeLessThanOrEqual(10);
  });

  it('does not re-trigger puncture when already punctured', () => {
    const result = applyTravelWear(
      { damagePercent: 10, tirePressurePercent: 5, isPunctured: true },
      500,
      false,
      () => 0
    );
    expect(result.punctureTriggered).toBe(false);
    expect(result.isPunctured).toBe(true);
  });

  it('reduces top speed at high damage', () => {
    const soft = computeSpeedModifiers({
      damagePercent: DAMAGE_SPEED_SOFT_THRESHOLD,
      tirePressurePercent: 100,
      isPunctured: false,
    });
    expect(soft.topSpeedMult).toBe(0.85);

    const hard = computeSpeedModifiers({
      damagePercent: DAMAGE_SPEED_HARD_THRESHOLD,
      tirePressurePercent: 100,
      isPunctured: false,
    });
    expect(hard.topSpeedMult).toBe(0.7);
    expect(hard.limpMode).toBe(false);

    const limp = computeSpeedModifiers({
      damagePercent: 0,
      tirePressurePercent: 10,
      isPunctured: true,
    });
    expect(limp.limpMode).toBe(true);
    expect(limp.steerMult).toBeLessThan(1);
  });

  it('applies repair services correctly', () => {
    const worn = { damagePercent: 40, tirePressurePercent: 20, isPunctured: true };
    expect(applyRepair(worn, 'tire_fix')).toEqual({
      damagePercent: 40,
      tirePressurePercent: 100,
      isPunctured: false,
    });
    expect(applyRepair(worn, 'tune_up').damagePercent).toBe(15);
    expect(applyRepair(worn, 'full_service')).toEqual({
      damagePercent: 0,
      tirePressurePercent: 100,
      isPunctured: false,
    });
    expect(applyRepair(worn, 'chain_oil').damagePercent).toBe(30);
  });
});
