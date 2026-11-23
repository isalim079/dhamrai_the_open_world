import { describe, it, expect } from 'vitest';
import {
  tickStamina,
  canSprint,
  recoverStamina,
  STAMINA_CRITICAL_THRESHOLD,
  STAMINA_DRAIN_PEDAL_SPRINT_PER_SEC,
  STAMINA_DRAIN_FOOT_SPRINT_PER_SEC,
  CHA_STAMINA_RESTORE,
} from '../src/stamina.js';

describe('Stamina — drain, regen, sprint gate', () => {
  it('drains faster for pedal sprint than foot sprint', () => {
    const foot = tickStamina({
      staminaPercent: 100,
      dtSec: 1,
      sprinting: true,
      inVehicle: false,
      moving: true,
      teaBuffActive: false,
    });
    const pedal = tickStamina({
      staminaPercent: 100,
      dtSec: 1,
      sprinting: true,
      inVehicle: true,
      moving: true,
      teaBuffActive: false,
    });
    expect(foot.drained).toBeCloseTo(STAMINA_DRAIN_FOOT_SPRINT_PER_SEC, 5);
    expect(pedal.drained).toBeCloseTo(STAMINA_DRAIN_PEDAL_SPRINT_PER_SEC, 5);
    expect(pedal.staminaPercent).toBeLessThan(foot.staminaPercent);
  });

  it('regens while idle and clamps at 100', () => {
    const r = tickStamina({
      staminaPercent: 99,
      dtSec: 2,
      sprinting: false,
      inVehicle: false,
      moving: false,
      teaBuffActive: false,
    });
    expect(r.staminaPercent).toBe(100);
    expect(r.regenerated).toBeGreaterThan(0);
  });

  it('blocks sprint below critical threshold', () => {
    expect(canSprint(STAMINA_CRITICAL_THRESHOLD)).toBe(true);
    expect(canSprint(STAMINA_CRITICAL_THRESHOLD - 0.1)).toBe(false);

    const blocked = tickStamina({
      staminaPercent: 10,
      dtSec: 1,
      sprinting: true,
      inVehicle: true,
      moving: true,
      teaBuffActive: false,
    });
    expect(blocked.sprintBlocked).toBe(true);
    expect(blocked.drained).toBe(0);
    expect(blocked.regenerated).toBeGreaterThan(0);
  });

  it('tea restore clamps to 100', () => {
    expect(recoverStamina(80, CHA_STAMINA_RESTORE)).toBe(100);
    expect(recoverStamina(50, CHA_STAMINA_RESTORE)).toBe(85);
  });
});
