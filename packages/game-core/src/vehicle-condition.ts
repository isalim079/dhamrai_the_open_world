/**
 * Dhamrai Life — Vehicle Condition (wear, tire pressure, puncture)
 * =================================================================
 * Pure gameplay math for Milestone 13. No I/O.
 */

export const WEAR_DAMAGE_PER_METER = 1 / 2000; // ~1 damage / 2 km
export const WEAR_SPRINT_DAMAGE_MULT = 1.5;
export const TIRE_LOSS_PER_METER = 8 / 1000; // ~8% / km
export const TIRE_SPRINT_LOSS_MULT = 1.4;
export const PUNCTURE_TIRE_THRESHOLD = 30;
export const PUNCTURE_CHANCE_PER_METER_BELOW = 0.0004; // ~40% chance per km below threshold

export const DAMAGE_SPEED_SOFT_THRESHOLD = 60;
export const DAMAGE_SPEED_HARD_THRESHOLD = 85;
export const DAMAGE_SPEED_SOFT_MULT = 0.85;
export const DAMAGE_SPEED_HARD_MULT = 0.7;
export const LOW_TIRE_STEER_MULT = 0.65;

export interface VehicleConditionState {
  damagePercent: number;
  tirePressurePercent: number;
  isPunctured: boolean;
}

export interface TravelWearResult {
  damagePercent: number;
  tirePressurePercent: number;
  isPunctured: boolean;
  punctureTriggered: boolean;
  damageDelta: number;
  tireDelta: number;
}

export interface SpeedModifiers {
  topSpeedMult: number;
  steerMult: number;
  limpMode: boolean;
}

function clamp01to100(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

/**
 * Apply odometer-based wear. `rng01` must return [0, 1) for puncture rolls.
 */
export function applyTravelWear(
  state: VehicleConditionState,
  distanceM: number,
  sprinting: boolean,
  rng01: () => number = Math.random
): TravelWearResult {
  if (!(distanceM > 0) || !Number.isFinite(distanceM)) {
    return {
      damagePercent: clamp01to100(state.damagePercent),
      tirePressurePercent: clamp01to100(state.tirePressurePercent),
      isPunctured: state.isPunctured,
      punctureTriggered: false,
      damageDelta: 0,
      tireDelta: 0,
    };
  }

  const damageMult = sprinting ? WEAR_SPRINT_DAMAGE_MULT : 1;
  const tireMult = sprinting ? TIRE_SPRINT_LOSS_MULT : 1;

  const damageDelta = distanceM * WEAR_DAMAGE_PER_METER * damageMult;
  const tireDelta = distanceM * TIRE_LOSS_PER_METER * tireMult;

  let damagePercent = clamp01to100(state.damagePercent + damageDelta);
  let tirePressurePercent = clamp01to100(state.tirePressurePercent - tireDelta);
  let isPunctured = state.isPunctured;
  let punctureTriggered = false;

  if (!isPunctured && tirePressurePercent < PUNCTURE_TIRE_THRESHOLD) {
    const rollChance = distanceM * PUNCTURE_CHANCE_PER_METER_BELOW;
    if (rng01() < rollChance) {
      isPunctured = true;
      punctureTriggered = true;
      tirePressurePercent = Math.min(tirePressurePercent, 10);
    }
  }

  return {
    damagePercent,
    tirePressurePercent,
    isPunctured,
    punctureTriggered,
    damageDelta,
    tireDelta,
  };
}

export function computeSpeedModifiers(state: VehicleConditionState): SpeedModifiers {
  let topSpeedMult = 1;
  if (state.damagePercent >= DAMAGE_SPEED_HARD_THRESHOLD) {
    topSpeedMult = DAMAGE_SPEED_HARD_MULT;
  } else if (state.damagePercent >= DAMAGE_SPEED_SOFT_THRESHOLD) {
    topSpeedMult = DAMAGE_SPEED_SOFT_MULT;
  }

  const steerMult = state.tirePressurePercent < PUNCTURE_TIRE_THRESHOLD ? LOW_TIRE_STEER_MULT : 1;
  const limpMode = state.isPunctured;

  return { topSpeedMult, steerMult, limpMode };
}

export type RepairServiceId = 'tire_fix' | 'tune_up' | 'full_service' | 'chain_oil';

export interface RepairServiceDef {
  id: RepairServiceId;
  priceMinorUnits: number;
  nameBn: string;
  nameEn: string;
  descriptionBn: string;
  descriptionEn: string;
}

export const REPAIR_SERVICES: Record<RepairServiceId, RepairServiceDef> = {
  tire_fix: {
    id: 'tire_fix',
    priceMinorUnits: 2000, // ৳20
    nameBn: 'টায়ার পাম্প / পাংচার ঠিক',
    nameEn: 'Tire pump / puncture fix',
    descriptionBn: 'টায়ার চাপ পূর্ণ এবং পাংচার দূর।',
    descriptionEn: 'Restore tire pressure and clear puncture.',
  },
  tune_up: {
    id: 'tune_up',
    priceMinorUnits: 4000, // ৳40
    nameBn: 'টিউন-আপ',
    nameEn: 'Tune-up',
    descriptionBn: 'ক্ষতি ২৫% কমায়।',
    descriptionEn: 'Reduce damage by 25%.',
  },
  full_service: {
    id: 'full_service',
    priceMinorUnits: 7500, // ৳75
    nameBn: 'পূর্ণ সার্ভিস',
    nameEn: 'Full service',
    descriptionBn: 'ক্ষতি ও টায়ার সম্পূর্ণ মেরামত।',
    descriptionEn: 'Reset damage and tire pressure.',
  },
  chain_oil: {
    id: 'chain_oil',
    priceMinorUnits: 1500, // ৳15
    nameBn: 'চেইন অয়েল',
    nameEn: 'Chain oil',
    descriptionBn: 'ক্ষতি ১০% কমায় (কায়েতপাড়া)।',
    descriptionEn: 'Reduce damage by 10% (Kayetpara).',
  },
};

export function applyRepair(
  state: VehicleConditionState,
  serviceId: RepairServiceId
): VehicleConditionState {
  const damage = clamp01to100(state.damagePercent);
  const tire = clamp01to100(state.tirePressurePercent);

  switch (serviceId) {
    case 'tire_fix':
      return { damagePercent: damage, tirePressurePercent: 100, isPunctured: false };
    case 'tune_up':
      return {
        damagePercent: clamp01to100(damage - 25),
        tirePressurePercent: tire,
        isPunctured: state.isPunctured,
      };
    case 'full_service':
      return { damagePercent: 0, tirePressurePercent: 100, isPunctured: false };
    case 'chain_oil':
      return {
        damagePercent: clamp01to100(damage - 10),
        tirePressurePercent: tire,
        isPunctured: state.isPunctured,
      };
    default:
      return { damagePercent: damage, tirePressurePercent: tire, isPunctured: state.isPunctured };
  }
}
