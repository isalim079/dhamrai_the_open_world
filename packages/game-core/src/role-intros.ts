/**
 * Milestone 26 — Second-role intro scaffold (content only).
 * Save schema remains roleId: 'rickshaw_driver'. These defs describe future playable roles
 * and the day-job bridge mission that introduces vendor flavour without a role switch.
 */

export interface RoleIntroScaffold {
  roleId: string;
  nameBn: string;
  nameEn: string;
  bridgeMissionId: string;
  startingCashMinorUnits: number;
  notes: string;
}

export const ROLE_INTRO_SCAFFOLDS: readonly RoleIntroScaffold[] = [
  {
    roleId: 'rickshaw_driver',
    nameBn: 'রিকশা চালক',
    nameEn: 'Rickshaw Driver',
    bridgeMissionId: 'mission_1_first_fare',
    startingCashMinorUnits: 25000,
    notes: 'Canonical Phase 1 playable role.',
  },
  {
    roleId: 'market_vendor',
    nameBn: 'বাজার বিক্রেতা',
    nameEn: 'Market Vendor',
    bridgeMissionId: 'mission_5_vendor_day',
    startingCashMinorUnits: 18000,
    notes: 'Scaffold only — playable switch deferred; day-job mission introduces vendor loop.',
  },
  {
    roleId: 'college_student',
    nameBn: 'কলেজ ছাত্র',
    nameEn: 'College Student',
    bridgeMissionId: 'mission_1_first_fare',
    startingCashMinorUnits: 8000,
    notes: 'Scaffold placeholder for Phase 3 role chains.',
  },
] as const;

export function getRoleIntroScaffold(roleId: string): RoleIntroScaffold | undefined {
  return ROLE_INTRO_SCAFFOLDS.find((r) => r.roleId === roleId);
}
