/**
 * Dhamrai Life — Driver Stamina
 * =============================
 * Pure drain / regen math for Milestone 13. No I/O.
 */

export const STAMINA_DRAIN_FOOT_SPRINT_PER_SEC = 8;
export const STAMINA_DRAIN_PEDAL_SPRINT_PER_SEC = 12;
export const STAMINA_REGEN_IDLE_PER_SEC = 4;
export const STAMINA_REGEN_WALK_PER_SEC = 2;
export const STAMINA_CRITICAL_THRESHOLD = 15;
export const TEA_BUFF_REGEN_MULT = 2;
export const TEA_BUFF_DURATION_MS = 30_000;

export const CHA_STAMINA_RESTORE = 35;
export const BISCUIT_STAMINA_RESTORE = 20;

export type ConsumableItemId = 'cha_cup' | 'biscuits';

export interface ConsumableDef {
  id: ConsumableItemId;
  priceMinorUnits: number;
  staminaRestore: number;
  grantsTeaBuff: boolean;
  nameBn: string;
  nameEn: string;
  descriptionBn: string;
  descriptionEn: string;
}

export const CONSUMABLES: Record<ConsumableItemId, ConsumableDef> = {
  cha_cup: {
    id: 'cha_cup',
    priceMinorUnits: 500, // ৳5
    staminaRestore: CHA_STAMINA_RESTORE,
    grantsTeaBuff: true,
    nameBn: 'চা',
    nameEn: 'Cha (tea)',
    descriptionBn: 'গরম দুধ চা — ক্লান্তি দূর করে।',
    descriptionEn: 'Hot milk tea — restores stamina.',
  },
  biscuits: {
    id: 'biscuits',
    priceMinorUnits: 800, // ৳8
    staminaRestore: BISCUIT_STAMINA_RESTORE,
    grantsTeaBuff: false,
    nameBn: 'বিস্কুট',
    nameEn: 'Biscuits',
    descriptionBn: 'চায়ের সাথে বিস্কুট।',
    descriptionEn: 'Biscuits with tea.',
  },
};

export interface StaminaTickInput {
  staminaPercent: number;
  dtSec: number;
  sprinting: boolean;
  inVehicle: boolean;
  moving: boolean;
  teaBuffActive: boolean;
}

export interface StaminaTickResult {
  staminaPercent: number;
  sprintBlocked: boolean;
  drained: number;
  regenerated: number;
}

function clamp01to100(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

export function canSprint(staminaPercent: number): boolean {
  return clamp01to100(staminaPercent) >= STAMINA_CRITICAL_THRESHOLD;
}

/**
 * Advance stamina for one simulation slice.
 * When sprinting is requested but blocked, treat as non-sprint for regen purposes.
 */
export function tickStamina(input: StaminaTickInput): StaminaTickResult {
  const dt = input.dtSec > 0 && Number.isFinite(input.dtSec) ? input.dtSec : 0;
  let stamina = clamp01to100(input.staminaPercent);
  const sprintBlocked = !canSprint(stamina);
  const effectiveSprint = input.sprinting && !sprintBlocked;

  let drained = 0;
  let regenerated = 0;

  if (effectiveSprint) {
    const rate = input.inVehicle
      ? STAMINA_DRAIN_PEDAL_SPRINT_PER_SEC
      : STAMINA_DRAIN_FOOT_SPRINT_PER_SEC;
    drained = rate * dt;
    stamina = clamp01to100(stamina - drained);
  } else {
    let regenRate = input.moving ? STAMINA_REGEN_WALK_PER_SEC : STAMINA_REGEN_IDLE_PER_SEC;
    if (input.teaBuffActive) {
      regenRate *= TEA_BUFF_REGEN_MULT;
    }
    regenerated = regenRate * dt;
    stamina = clamp01to100(stamina + regenerated);
  }

  return {
    staminaPercent: stamina,
    sprintBlocked: !canSprint(stamina),
    drained,
    regenerated,
  };
}

export function recoverStamina(current: number, amount: number): number {
  return clamp01to100(current + amount);
}

export function spendStamina(current: number, amount: number): number {
  return clamp01to100(current - amount);
}
