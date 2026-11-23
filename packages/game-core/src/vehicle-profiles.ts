/**
 * Milestone 34 — Vehicle handling profiles (data-only; applied by client vehicles).
 */

export type ProfileVehicleKind = 'rickshaw' | 'cng' | 'easy_bike' | 'tempo' | 'van_light';

export interface VehicleHandlingProfile {
  id: ProfileVehicleKind;
  nameBn: string;
  nameEn: string;
  normalTargetSpeedMps: number;
  sprintTargetSpeedMps: number;
  maxSteerAngleRad: number;
  massKg: number;
  notes: string;
}

export const VEHICLE_HANDLING_PROFILES: Record<ProfileVehicleKind, VehicleHandlingProfile> = {
  rickshaw: {
    id: 'rickshaw',
    nameBn: 'প্যাডেল রিকশা',
    nameEn: 'Pedal Rickshaw',
    normalTargetSpeedMps: 12 / 3.6,
    sprintTargetSpeedMps: 18 / 3.6,
    maxSteerAngleRad: (35 * Math.PI) / 180,
    massKg: 90,
    notes: 'Canonical Phase 1 player vehicle.',
  },
  cng: {
    id: 'cng',
    nameBn: 'সিএনজি',
    nameEn: 'CNG Auto',
    normalTargetSpeedMps: 22 / 3.6,
    sprintTargetSpeedMps: 32 / 3.6,
    maxSteerAngleRad: (30 * Math.PI) / 180,
    massKg: 280,
    notes: 'Milestone 20 motorized archetype.',
  },
  easy_bike: {
    id: 'easy_bike',
    nameBn: 'ইজি বাইক',
    nameEn: 'Easy Bike',
    normalTargetSpeedMps: 18 / 3.6,
    sprintTargetSpeedMps: 28 / 3.6,
    maxSteerAngleRad: (32 * Math.PI) / 180,
    massKg: 120,
    notes: 'Milestone 22 electric bike.',
  },
  tempo: {
    id: 'tempo',
    nameBn: 'টেম্পো',
    nameEn: 'Tempo',
    normalTargetSpeedMps: 20 / 3.6,
    sprintTargetSpeedMps: 30 / 3.6,
    maxSteerAngleRad: (28 * Math.PI) / 180,
    massKg: 650,
    notes: 'Profile registry only — driveable mesh deferred.',
  },
  van_light: {
    id: 'van_light',
    nameBn: 'হালকা ভ্যান',
    nameEn: 'Light Van',
    normalTargetSpeedMps: 24 / 3.6,
    sprintTargetSpeedMps: 36 / 3.6,
    maxSteerAngleRad: (26 * Math.PI) / 180,
    massKg: 900,
    notes: 'Profile registry only — driveable mesh deferred.',
  },
};

export function getVehicleProfile(id: ProfileVehicleKind): VehicleHandlingProfile {
  return VEHICLE_HANDLING_PROFILES[id];
}

export function listVehicleProfileIds(): ProfileVehicleKind[] {
  return Object.keys(VEHICLE_HANDLING_PROFILES) as ProfileVehicleKind[];
}
