import { describe, it, expect } from 'vitest';
import { ROLE_INTRO_SCAFFOLDS, getRoleIntroScaffold } from '../src/role-intros.js';
import { PHASE_1_MISSIONS } from '../src/missions.js';

describe('Role intro scaffolds (M26)', () => {
  it('includes market_vendor bridge to mission_5', () => {
    expect(ROLE_INTRO_SCAFFOLDS.length).toBeGreaterThanOrEqual(2);
    const vendor = getRoleIntroScaffold('market_vendor');
    expect(vendor?.bridgeMissionId).toBe('mission_5_vendor_day');
    expect(PHASE_1_MISSIONS.mission_5_vendor_day).toBeDefined();
    expect(PHASE_1_MISSIONS.mission_5_vendor_day.rewardMinorUnits).toBe(3500);
  });
});
