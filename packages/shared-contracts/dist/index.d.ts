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
 * Currency Standard: Bangladeshi Taka (BDT).
 * All monetary calculations use integer minor units (Poisha: 1 BDT = 100 Poisha)
 * to eliminate floating-point representation errors.
 */
export declare const CURRENCY_CODE_BDT: "BDT";
export type CurrencyCode = typeof CURRENCY_CODE_BDT;
/**
 * Economy Transaction Event for Append-Only Ledger.
 */
export type TransactionCategory = 'INITIAL_BALANCE' | 'FARE_PAYMENT' | 'DELIVERY_PAYMENT' | 'VEHICLE_RENTAL' | 'MAINTENANCE_COST' | 'FINE_PENALTY' | 'REPUTATION_BONUS';
export interface EconomyTransaction {
    id: string;
    timestampMs: number;
    category: TransactionCategory;
    deltaMinorUnits: number;
    currency: CurrencyCode;
    description: string;
    runningBalanceMinorUnits: number;
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
    rewardMinorUnits: number;
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
    cashMinorUnits: number;
    currency: CurrencyCode;
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
/**
 * Navigation Graph & World Streaming Contracts (Phase 1 Sprint 5 / 6).
 */
export interface NavNode {
    id: string;
    osmNodeId?: number;
    position: WorldPosition;
    isJunction: boolean;
    connectedEdgeIds: string[];
}
export interface NavEdge {
    id: string;
    osmWayId?: number;
    fromNodeId: string;
    toNodeId: string;
    distanceMeters: number;
    highwayClass: string;
    isOneWay: boolean;
    allowsRickshaw: boolean;
    widthMeters: number;
    speedLimitKph: number;
    surface: string;
    waypoints: WorldPosition[];
}
export interface TurnRestriction {
    id: string;
    type: 'no_left_turn' | 'no_right_turn' | 'no_u_turn' | 'only_straight_on' | string;
    fromEdgeId?: string;
    fromWayId?: number;
    viaNodeId: string;
    toEdgeId?: string;
    toWayId?: number;
}
export interface DirectedNavGraph {
    version: string;
    crs: string;
    origin: WorldPosition;
    nodes: Record<string, NavNode>;
    edges: NavEdge[];
    turnRestrictions: TurnRestriction[];
    totalRoadLengthMeters: number;
    plazaConnectorsCount: number;
}
export interface ChunkBounds {
    minX: number;
    minZ: number;
    maxX: number;
    maxZ: number;
}
export interface ChunkManifest {
    worldDataVersion: string;
    chunkId: string;
    chunkX: number;
    chunkZ: number;
    boundsMeters: ChunkBounds;
    neighbors: string[];
    glbAsset: string;
    roadCount: number;
    buildingCount: number;
    triangleCount: number;
    fileSizeBytes: number;
}
export interface WorldManifest {
    worldDataVersion: string;
    crs: string;
    origin: {
        name: string;
        wgs84Lon: number;
        wgs84Lat: number;
        elevationM: number;
        projectedEasting: number;
        projectedNorthing: number;
    };
    sliceBoundingBox: BoundingEnvelopeTuple;
    chunkSizeMeters: number;
    activeChunkAxisIndices: readonly number[];
    chunks: ChunkManifest[];
}
//# sourceMappingURL=index.d.ts.map