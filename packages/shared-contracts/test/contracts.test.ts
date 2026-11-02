import { describe, it, expect } from 'vitest';
import {
  CRS_IDENTIFIER,
  ORIGIN_PROJECTED_EASTING,
  ORIGIN_PROJECTED_NORTHING,
  ORIGIN_WGS84_LON,
  ORIGIN_WGS84_LAT,
  ORIGIN_ELEVATION_M,
  PLAYABLE_SLICE_SIZE_M,
  CHUNK_SIZE_M,
  ACTIVE_CHUNK_AXIS_INDICES,
  PHASE_1_BOUNDING_ENVELOPE,
  PHASE_1_ANCHORS,
  WorldPosition,
} from '../src/index.js';

describe('Shared Contracts & Spatial Reference System', () => {
  it('preserves the canonical BUTM 2010 CRS identifier and full-precision origin', () => {
    expect(CRS_IDENTIFIER).toBe('ESRI:102954');
    expect(ORIGIN_WGS84_LON).toBe(90.217400);
    expect(ORIGIN_WGS84_LAT).toBe(23.914800);
    expect(ORIGIN_ELEVATION_M).toBe(12.0);
    expect(ORIGIN_PROJECTED_EASTING).toBe(522126.5567081776);
    expect(ORIGIN_PROJECTED_NORTHING).toBe(2644810.7821246446);
  });

  it('declares the exact Phase 1 1,024m x 1,024m slice and 16 chunk grid constants', () => {
    expect(PLAYABLE_SLICE_SIZE_M).toBe(1024);
    expect(CHUNK_SIZE_M).toBe(256);
    expect(ACTIVE_CHUNK_AXIS_INDICES).toEqual([-2, -1, 0, 1]);
    expect(ACTIVE_CHUNK_AXIS_INDICES.length * ACTIVE_CHUNK_AXIS_INDICES.length).toBe(16);

    const [minLon, minLat, maxLon, maxLat] = PHASE_1_BOUNDING_ENVELOPE;
    expect(minLon).toBe(90.212361);
    expect(minLat).toBe(23.910168);
    expect(maxLon).toBe(90.222439);
    expect(maxLat).toBe(23.919432);
  });

  it('validates Three.js right-handed coordinate signs for Phase 1 mission anchors', () => {
    // Rathkhola Origin is (0, 0, 0)
    expect(PHASE_1_ANCHORS.RATHKHOLA_ORIGIN).toEqual({ x: 0.0, y: 0.0, z: 0.0 });

    // Hardinge High School: North of origin -> Z must be negative
    const hardinge = PHASE_1_ANCHORS.HARDINGE_HIGH_SCHOOL;
    expect(hardinge.x).toBeLessThan(0); // West of origin
    expect(hardinge.z).toBeLessThan(0); // North of origin (-Z)
    expect(hardinge.y).toBe(1.0); // +1.0m elevation above +12.0m baseline

    // Thana Junction Checkpoint: South of origin -> Z must be positive
    const checkpoint = PHASE_1_ANCHORS.THANA_JUNCTION_CHECKPOINT;
    expect(checkpoint.x).toBeLessThan(0); // West of origin
    expect(checkpoint.z).toBeGreaterThan(0); // South of origin (+Z)

    // Yashomadhab Mandir is further west than the workshop
    const workshop = PHASE_1_ANCHORS.KAYETPARA_METAL_WORKSHOP;
    const temple = PHASE_1_ANCHORS.SRI_SRI_YASHOMADHAB_MANDIR;
    expect(temple.x).toBeLessThan(workshop.x); // -346.2 < -295.3
    const deltaX = temple.x - workshop.x; // -50.9
    const deltaZ = temple.z - workshop.z; // -33.2
    const horizontalDist = Math.hypot(deltaX, deltaZ);
    expect(horizontalDist).toBeCloseTo(60.77, 1);
  });

  it('confirms all Phase 1 anchors lie strictly inside the 1,024m slice [-512, 512]', () => {
    const halfSlice = PLAYABLE_SLICE_SIZE_M / 2; // 512m
    for (const [name, anchor] of Object.entries(PHASE_1_ANCHORS)) {
      expect(Math.abs(anchor.x)).toBeLessThanOrEqual(halfSlice);
      expect(Math.abs(anchor.z)).toBeLessThanOrEqual(halfSlice);
    }
  });
});
