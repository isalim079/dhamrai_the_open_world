/**
 * Dhamrai Life — Shared Contracts & Domain DTOs
 * ==============================================
 * Single source of truth for TypeScript types, spatial coordinates,
 * canonical constants, mission interfaces, economy events, and save envelopes.
 */

/**
 * Three.js Right-Handed Metric World Coordinate Representation.
 * Coordinate conventions:
 *   x: Easting offset in metres (+X = East, -X = West)
 *   y: Elevation offset in metres (+Y = Up, -Y = Down, relative to provisional +12.0m baseline)
 *   z: Inverted Northing offset in metres (+Z = South, -Z = North; Three.js camera looks North at -Z)
 */
export interface WorldPosition {
  x: number;
  y: number;
  z: number;
}

/**
 * Geographic WGS84 Coordinate (degrees, metres).
 */
export interface GeodeticCoordinate {
  longitude: number;
  latitude: number;
  elevation: number;
}

/**
 * 2D Axis-Aligned Geographic Bounding Envelope.
 * Order: [minLongitude, minLatitude, maxLongitude, maxLatitude]
 */
export type BoundingEnvelopeTuple = readonly [
  minLongitude: number,
  minLatitude: number,
  maxLongitude: number,
  maxLatitude: number
];

// Canonical CRS & Origin Constants (Reconciled Baseline - 2 Nov 2026)
export const CRS_IDENTIFIER = 'ESRI:102954';
export const ORIGIN_NAME = 'Dhamrai Rathkhola Stand';
export const ORIGIN_WGS84_LON = 90.217400;
export const ORIGIN_WGS84_LAT = 23.914800;
export const ORIGIN_ELEVATION_M = 12.0;

// Full-precision projected origin constants in BUTM 2010 (ESRI:102954 / pyproj 3.6.1):
export const ORIGIN_PROJECTED_EASTING = 522126.5567081776;
export const ORIGIN_PROJECTED_NORTHING = 2644810.7821246446;

// Phase 1 Playable Geographic Extents (1,024m x 1,024m slice, 16 chunks)
export const PLAYABLE_SLICE_SIZE_M = 1024;
export const CHUNK_SIZE_M = 256;
export const ACTIVE_CHUNK_AXIS_INDICES = [-2, -1, 0, 1] as const;
export const PHASE_1_BOUNDING_ENVELOPE: BoundingEnvelopeTuple = [
  90.212361, 23.910168, 90.222439, 23.919432,
] as const;

/**
 * Standardized Phase 1 3D World Anchors.
 */
export const PHASE_1_ANCHORS = {
  RATHKHOLA_ORIGIN: { x: 0.0, y: 0.0, z: 0.0 } as WorldPosition,
  RATHKHOLA_MARKET_PICKUP: { x: 15.0, y: 0.0, z: -10.0 } as WorldPosition,
  HARDINGE_HIGH_SCHOOL: { x: -73.1, y: 1.0, z: -221.3 } as WorldPosition,
  THANA_JUNCTION_CHECKPOINT: { x: -61.0, y: 0.0, z: 66.5 } as WorldPosition,
  DHAMRAI_POLICE_STATION: { x: -114.5, y: 0.0, z: 2.7 } as WorldPosition,
  KAYETPARA_METAL_WORKSHOP: { x: -295.3, y: 0.0, z: -77.0 } as WorldPosition,
  SRI_SRI_YASHOMADHAB_MANDIR: { x: -346.2, y: 0.5, z: -110.2 } as WorldPosition,
  DHAMRAI_POURASHAVA: { x: -67.0, y: 1.0, z: -282.7 } as WorldPosition,
  DHAMRAI_GOVT_COLLEGE: { x: 41.0, y: 0.0, z: 215.2 } as WorldPosition,
} as const;

/**
 * Currency Standard: Bangladeshi Taka (BDT).
 * All monetary calculations use integer minor units (Poisha: 1 BDT = 100 Poisha)
 * to eliminate floating-point representation errors.
 */
export const CURRENCY_CODE_BDT = 'BDT' as const;
export type CurrencyCode = typeof CURRENCY_CODE_BDT;

/**
 * Economy Transaction Event for Append-Only Ledger.
 */
export type TransactionCategory =
  | 'INITIAL_BALANCE'
  | 'FARE_PAYMENT'
  | 'DELIVERY_PAYMENT'
  | 'VEHICLE_RENTAL'
  | 'MAINTENANCE_COST'
  | 'FINE_PENALTY'
  | 'REPUTATION_BONUS';

export interface EconomyTransaction {
  id: string;
  timestampMs: number;
  category: TransactionCategory;
  deltaMinorUnits: number; // Stored in Poisha (1 BDT = 100 Poisha) for strict integer math
  currency: CurrencyCode;
  description: string;
  runningBalanceMinorUnits: number;
}

/**
 * Mission Lifecycle States.
 */
export type MissionState =
  | 'UNAVAILABLE'
  | 'AVAILABLE'
  | 'ACTIVE'
  | 'COMPLETED'
  | 'FAILED';

export interface MissionObjective {
  id: string;
  bengaliTitle: string;
  description: string;
  targetPosition: WorldPosition;
  completionRadiusM: number;
  isCompleted: boolean;
}

export interface MissionDefinition {
  id: string;
  bengaliTitle: string;
  englishTitle: string;
  description: string;
  rewardMinorUnits: number; // Stored in Poisha (e.g. 3000 Poisha = ৳30.00 BDT)
  currency: CurrencyCode;
  reputationDelta: number;
  objectives: MissionObjective[];
}

/**
 * Player Archetype / Role (Current V2 Canonical Model).
 */
export interface PlayerState {
  roleId: 'rickshaw_driver';
  position: WorldPosition;
  headingRadians: number;
  isInVehicle: boolean;
  vehicleState?: {
    id: string;
    speedMps: number;
    steeringAngleRad: number;
    damagePercent: number;
  };
  cashMinorUnits: number; // Integer Poisha (1 BDT = 100 Poisha)
  currency: CurrencyCode; // Explicitly 'BDT'
  reputation: number;
}

/**
 * Legacy V1 Player State (Milestone 2 Schema).
 */
export interface PlayerStateV1 {
  roleId: 'rickshaw_driver';
  position: WorldPosition;
  headingRadians: number;
  isInVehicle: boolean;
  vehicleState?: {
    id: string;
    speedMps: number;
    steeringAngleRad: number;
    damagePercent: number;
  };
  cashPence: number;
  reputation: number;
}

/**
 * Legacy V1 Economy Transaction (Milestone 2 Schema).
 */
export interface EconomyTransactionV1 {
  id: string;
  timestampMs: number;
  category: TransactionCategory;
  deltaPence: number;
  description: string;
  runningBalancePence: number;
}

/**
 * Inventory Item Categories and Interface.
 */
export type ItemCategory = 'DOCUMENT' | 'TOOL' | 'CARGO' | 'VALUABLE' | 'CONSUMABLE';

export interface InventoryItem {
  id: string;
  nameBn: string;
  nameEn: string;
  category: ItemCategory;
  quantity: number;
  isStackable: boolean;
  maxStackSize: number;
  descriptionBn: string;
  descriptionEn: string;
  metadata?: Record<string, string | number | boolean>;
}

/**
 * Save Envelope Version 1 (Preserved Legacy Schema).
 * Baseline schema from Milestone 2 with Pence currency and without inventory.
 */
export interface SaveEnvelopeV1 {
  saveSchemaVersion: 1;
  saveId: string;
  slotName: string;
  createdAtIso: string;
  updatedAtIso: string;
  player: PlayerStateV1;
  missions: Record<string, {
    state: MissionState;
    completedObjectiveIds: string[];
    startedAtMs?: number;
    completedAtMs?: number;
  }>;
  ledger: EconomyTransactionV1[];
  worldFlags: Record<string, boolean | number | string>;
  checksumSha256: string;
}

/**
 * Save Envelope Version 2 (Canonical Current Storage Model).
 * Introduces full inventory persistence, explicit BDT currency code, and standardized minor units.
 */
export interface SaveEnvelopeV2 {
  saveSchemaVersion: 2;
  saveId: string;
  slotName: string;
  createdAtIso: string;
  updatedAtIso: string;
  player: PlayerState;
  inventory: InventoryItem[];
  missions: Record<string, {
    state: MissionState;
    completedObjectiveIds: string[];
    startedAtMs?: number;
    completedAtMs?: number;
  }>;
  ledger: EconomyTransaction[];
  worldFlags: Record<string, boolean | number | string>;
  checksumSha256: string;
}

export type SaveEnvelope = SaveEnvelopeV2;
