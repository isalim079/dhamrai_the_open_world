/**
 * Dhamrai Life — Civic Enforcement (fines, police heat, checkpoint stops)
 * ========================================================================
 * Pure gameplay math for Milestone 14. No I/O.
 */

export type InfractionCode = 'SPEEDING' | 'NO_LICENSE' | 'FLEE_STOP' | 'NIGHT_RECKLESS';

export const SPEEDING_THRESHOLD_KPH = 16;
export const THANA_ENFORCE_RADIUS_M = 40;
export const FLEE_RADIUS_M = 12;
export const STOP_COOLDOWN_MS = 90_000;
export const LICENSE_DISCOUNT_MINOR = 1000; // ৳10
export const HEAT_ON_PAY = -10;
export const HEAT_DECAY_PER_SEC = 2 / 60; // ~2 heat per minute
export const HEAT_HUD_THRESHOLD = 15;
export const HEAT_WATCHFUL_THRESHOLD = 40;
export const HEAT_RESTOP_THRESHOLD = 70;

export const FINE_SPEEDING_MINOR = 2500; // ৳25
export const FINE_FLEE_MINOR = 4000; // ৳40
export const FINE_NO_LICENSE_MINOR = 5000; // ৳50
export const FINE_NIGHT_ADDON_MINOR = 1500; // ৳15

export const HEAT_SPEEDING = 8;
export const HEAT_FLEE = 20;
export const HEAT_NO_LICENSE = 15;
export const HEAT_NIGHT = 5;

/** Milestone 19 — soft arrest when heat is critical near Thana */
export const HEAT_ARREST_THRESHOLD = 85;
export const ARREST_FINE_MINOR = 8000; // ৳80
export const ARREST_HOLD_MS = 8_000;
export const ARREST_HEAT_AFTER = 25;
export const ARREST_COOLDOWN_MS = 180_000;

export interface Infraction {
  code: InfractionCode;
  fineMinorUnits: number;
  heatDelta: number;
  descriptionBn: string;
  descriptionEn: string;
}

export interface PoliceStopState {
  id: string;
  openedAtMs: number;
  baseFineMinorUnits: number;
  currentFineMinorUnits: number;
  licenseDiscountApplied: boolean;
  primaryCode: InfractionCode;
  fleeing: boolean;
  paid: boolean;
  /** Anchor position for flee distance checks */
  stopX: number;
  stopZ: number;
}

export interface InfractionContext {
  speedKph: number;
  distanceToThanaM: number;
  inVehicle: boolean;
  isNightOrDusk: boolean;
  hasLicense: boolean;
  policeHeat: number;
  nowMs: number;
  lastStopMs: number;
  hasActiveStop: boolean;
  activeStop?: PoliceStopState | null;
  playerDistanceFromStopM?: number;
}

function clampHeat(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

export function applyPoliceHeat(current: number, delta: number): number {
  return clampHeat(current + delta);
}

export function decayPoliceHeat(current: number, dtSec: number, fleeing: boolean): number {
  if (fleeing || !(dtSec > 0)) return clampHeat(current);
  return clampHeat(current - HEAT_DECAY_PER_SEC * dtSec);
}

export function computeFineForCodes(codes: InfractionCode[]): {
  fineMinorUnits: number;
  heatDelta: number;
  primary: InfractionCode;
  descriptionBn: string;
  descriptionEn: string;
} {
  let fine = 0;
  let heat = 0;
  let primary: InfractionCode = codes[0] ?? 'SPEEDING';
  const partsBn: string[] = [];
  const partsEn: string[] = [];

  for (const code of codes) {
    switch (code) {
      case 'SPEEDING':
        fine += FINE_SPEEDING_MINOR;
        heat += HEAT_SPEEDING;
        partsBn.push('দ্রুতগতি');
        partsEn.push('speeding');
        if (primary !== 'FLEE_STOP' && primary !== 'NO_LICENSE') primary = 'SPEEDING';
        break;
      case 'NIGHT_RECKLESS':
        fine += FINE_NIGHT_ADDON_MINOR;
        heat += HEAT_NIGHT;
        partsBn.push('রাতের বেপরোয়া চালনা');
        partsEn.push('night reckless');
        break;
      case 'NO_LICENSE':
        fine += FINE_NO_LICENSE_MINOR;
        heat += HEAT_NO_LICENSE;
        partsBn.push('লাইসেন্স নেই');
        partsEn.push('no license');
        primary = 'NO_LICENSE';
        break;
      case 'FLEE_STOP':
        fine += FINE_FLEE_MINOR;
        heat += HEAT_FLEE;
        partsBn.push('চেকপোস্ট থেকে পালানো');
        partsEn.push('fleeing a stop');
        primary = 'FLEE_STOP';
        break;
    }
  }

  return {
    fineMinorUnits: fine,
    heatDelta: heat,
    primary,
    descriptionBn: partsBn.join(', ') || 'ট্রাফিক জরিমানা',
    descriptionEn: partsEn.join(', ') || 'traffic fine',
  };
}

/**
 * Evaluate whether a new stop should open, or a flee infraction should fire.
 */
export function evaluateInfraction(ctx: InfractionContext): Infraction | null {
  if (ctx.activeStop && !ctx.activeStop.paid && !ctx.activeStop.fleeing) {
    const dist = ctx.playerDistanceFromStopM ?? 0;
    if (dist > FLEE_RADIUS_M) {
      const computed = computeFineForCodes(['FLEE_STOP']);
      return {
        code: 'FLEE_STOP',
        fineMinorUnits: computed.fineMinorUnits,
        heatDelta: computed.heatDelta,
        descriptionBn: computed.descriptionBn,
        descriptionEn: computed.descriptionEn,
      };
    }
    return null;
  }

  if (ctx.hasActiveStop) return null;
  if (ctx.nowMs - ctx.lastStopMs < STOP_COOLDOWN_MS) return null;

  const codes: InfractionCode[] = [];
  const radiusBoost = ctx.policeHeat >= HEAT_WATCHFUL_THRESHOLD ? 0.5 : 0;
  const inZone = ctx.distanceToThanaM <= THANA_ENFORCE_RADIUS_M + radiusBoost;
  const nearThana = ctx.distanceToThanaM <= THANA_ENFORCE_RADIUS_M;

  if (ctx.inVehicle && inZone && ctx.speedKph >= SPEEDING_THRESHOLD_KPH) {
    codes.push('SPEEDING');
    if (ctx.isNightOrDusk) {
      codes.push('NIGHT_RECKLESS');
    }
  }

  if (
    codes.length === 0 &&
    ctx.inVehicle &&
    nearThana &&
    ctx.policeHeat >= HEAT_RESTOP_THRESHOLD &&
    ctx.speedKph >= SPEEDING_THRESHOLD_KPH * 0.75
  ) {
    codes.push('SPEEDING');
  }

  if (codes.length === 0) return null;

  const computed = computeFineForCodes(codes);
  return {
    code: computed.primary,
    fineMinorUnits: computed.fineMinorUnits,
    heatDelta: computed.heatDelta,
    descriptionBn: computed.descriptionBn,
    descriptionEn: computed.descriptionEn,
  };
}

export function openPoliceStop(
  infraction: Infraction,
  nowMs: number,
  hasLicense: boolean,
  stopPos: { x: number; z: number },
  idSuffix = ''
): { stop: PoliceStopState; heatDelta: number } {
  const codes: InfractionCode[] = [];

  if (infraction.code === 'FLEE_STOP') {
    codes.push('FLEE_STOP');
  } else if (infraction.code === 'NO_LICENSE') {
    codes.push('NO_LICENSE');
  } else {
    // Speeding path — reconstruct from fine components
    codes.push('SPEEDING');
    if (infraction.fineMinorUnits >= FINE_SPEEDING_MINOR + FINE_NIGHT_ADDON_MINOR) {
      codes.push('NIGHT_RECKLESS');
    } else if (infraction.code === 'NIGHT_RECKLESS') {
      codes.push('NIGHT_RECKLESS');
    }
  }

  if (!hasLicense && !codes.includes('NO_LICENSE') && infraction.code !== 'FLEE_STOP') {
    codes.push('NO_LICENSE');
  }

  const computed = computeFineForCodes(codes);

  const stop: PoliceStopState = {
    id: `stop_${nowMs}${idSuffix}`,
    openedAtMs: nowMs,
    baseFineMinorUnits: computed.fineMinorUnits,
    currentFineMinorUnits: computed.fineMinorUnits,
    licenseDiscountApplied: false,
    primaryCode: computed.primary,
    fleeing: infraction.code === 'FLEE_STOP',
    paid: false,
    stopX: stopPos.x,
    stopZ: stopPos.z,
  };

  return { stop, heatDelta: computed.heatDelta };
}

export function applyLicenseDiscount(stop: PoliceStopState): PoliceStopState {
  if (stop.licenseDiscountApplied || stop.paid) return stop;
  return {
    ...stop,
    licenseDiscountApplied: true,
    currentFineMinorUnits: Math.max(0, stop.currentFineMinorUnits - LICENSE_DISCOUNT_MINOR),
  };
}

export function markFleeing(stop: PoliceStopState): PoliceStopState {
  return { ...stop, fleeing: true };
}

export function markPaid(stop: PoliceStopState): PoliceStopState {
  return { ...stop, paid: true, fleeing: false };
}

export interface SoftArrestState {
  id: string;
  openedAtMs: number;
  holdUntilMs: number;
  fineMinorUnits: number;
  heatAfter: number;
  released: boolean;
}

export function shouldSoftArrest(ctx: {
  policeHeat: number;
  distanceToThanaM: number;
  nowMs: number;
  lastArrestMs: number;
  hasActiveStop: boolean;
  alreadyHeld: boolean;
}): boolean {
  if (ctx.alreadyHeld || ctx.hasActiveStop) return false;
  if (ctx.nowMs - ctx.lastArrestMs < ARREST_COOLDOWN_MS) return false;
  if (ctx.policeHeat < HEAT_ARREST_THRESHOLD) return false;
  return ctx.distanceToThanaM <= THANA_ENFORCE_RADIUS_M;
}

export function openSoftArrest(nowMs: number, idSuffix = ''): SoftArrestState {
  return {
    id: `arrest_${nowMs}${idSuffix}`,
    openedAtMs: nowMs,
    holdUntilMs: nowMs + ARREST_HOLD_MS,
    fineMinorUnits: ARREST_FINE_MINOR,
    heatAfter: ARREST_HEAT_AFTER,
    released: false,
  };
}

export function isArrestHoldActive(arrest: SoftArrestState | null, nowMs: number): boolean {
  if (!arrest || arrest.released) return false;
  return nowMs < arrest.holdUntilMs;
}
