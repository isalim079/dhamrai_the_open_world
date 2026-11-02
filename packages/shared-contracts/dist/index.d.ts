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
export declare const CRS_IDENTIFIER = "ESRI:102954";
export declare const ORIGIN_NAME = "Dhamrai Rathkhola Stand";
export declare const ORIGIN_WGS84_LON = 90.2174;
export declare const ORIGIN_WGS84_LAT = 23.9148;
export declare const ORIGIN_ELEVATION_M = 12;
export declare const ORIGIN_PROJECTED_EASTING = 522126.5567081776;
export declare const ORIGIN_PROJECTED_NORTHING = 2644810.7821246446;
export declare const PLAYABLE_SLICE_SIZE_M = 1024;
export declare const CHUNK_SIZE_M = 256;
export declare const ACTIVE_CHUNK_AXIS_INDICES: readonly [-2, -1, 0, 1];
export declare const PHASE_1_BOUNDING_ENVELOPE: BoundingEnvelopeTuple;
/**
 * Standardized Phase 1 3D World Anchors.
 */
export declare const PHASE_1_ANCHORS: {
    readonly RATHKHOLA_ORIGIN: WorldPosition;
    readonly RATHKHOLA_MARKET_PICKUP: WorldPosition;
    readonly HARDINGE_HIGH_SCHOOL: WorldPosition;
    readonly THANA_JUNCTION_CHECKPOINT: WorldPosition;
    readonly DHAMRAI_POLICE_STATION: WorldPosition;
    readonly KAYETPARA_METAL_WORKSHOP: WorldPosition;
    readonly SRI_SRI_YASHOMADHAB_MANDIR: WorldPosition;
    readonly DHAMRAI_POURASHAVA: WorldPosition;
    readonly DHAMRAI_GOVT_COLLEGE: WorldPosition;
};
/**
 * Economy Transaction Event for Append-Only Ledger.
 */
export type TransactionCategory = 'INITIAL_BALANCE' | 'FARE_PAYMENT' | 'DELIVERY_PAYMENT' | 'VEHICLE_RENTAL' | 'MAINTENANCE_COST' | 'FINE_PENALTY' | 'REPUTATION_BONUS';
export interface EconomyTransaction {
    id: string;
    timestampMs: number;
    category: TransactionCategory;
    deltaPence: number;
    description: string;
    runningBalancePence: number;
}
/**
 * Mission Lifecycle States.
 */
export type MissionState = 'UNAVAILABLE' | 'AVAILABLE' | 'ACTIVE' | 'COMPLETED' | 'FAILED';
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
    rewardPence: number;
    reputationDelta: number;
    objectives: MissionObjective[];
}
/**
 * Player Archetype / Role.
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
    cashPence: number;
    reputation: number;
}
/**
 * Save Envelope Version 1 (Root Storage Model).
 */
export interface SaveEnvelopeV1 {
    saveSchemaVersion: 1;
    saveId: string;
    slotName: string;
    createdAtIso: string;
    updatedAtIso: string;
    player: PlayerState;
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
//# sourceMappingURL=index.d.ts.map