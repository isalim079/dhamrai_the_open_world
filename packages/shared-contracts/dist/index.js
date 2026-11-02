/**
 * Dhamrai Life — Shared Contracts & Domain DTOs
 * ==============================================
 * Single source of truth for TypeScript types, spatial coordinates,
 * canonical constants, mission interfaces, economy events, and save envelopes.
 */
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
export const ACTIVE_CHUNK_AXIS_INDICES = [-2, -1, 0, 1];
export const PHASE_1_BOUNDING_ENVELOPE = [
    90.212361, 23.910168, 90.222439, 23.919432,
];
/**
 * Standardized Phase 1 3D World Anchors.
 */
export const PHASE_1_ANCHORS = {
    RATHKHOLA_ORIGIN: { x: 0.0, y: 0.0, z: 0.0 },
    RATHKHOLA_MARKET_PICKUP: { x: 15.0, y: 0.0, z: -10.0 },
    HARDINGE_HIGH_SCHOOL: { x: -73.1, y: 1.0, z: -221.3 },
    THANA_JUNCTION_CHECKPOINT: { x: -61.0, y: 0.0, z: 66.5 },
    DHAMRAI_POLICE_STATION: { x: -114.5, y: 0.0, z: 2.7 },
    KAYETPARA_METAL_WORKSHOP: { x: -295.3, y: 0.0, z: -77.0 },
    SRI_SRI_YASHOMADHAB_MANDIR: { x: -346.2, y: 0.5, z: -110.2 },
    DHAMRAI_POURASHAVA: { x: -67.0, y: 1.0, z: -282.7 },
    DHAMRAI_GOVT_COLLEGE: { x: 41.0, y: 0.0, z: 215.2 },
};
/**
 * Currency Standard: Bangladeshi Taka (BDT).
 * All monetary calculations use integer minor units (Poisha: 1 BDT = 100 Poisha)
 * to eliminate floating-point representation errors.
 */
export const CURRENCY_CODE_BDT = 'BDT';
//# sourceMappingURL=index.js.map