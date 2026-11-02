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
  SaveEnvelopeV1,
  SaveEnvelopeV2,
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
    expect(PHASE_1_ANCHORS.RATHKHOLA_ORIGIN).toEqual({ x: 0.0, y: 0.0, z: 0.0 });

    const hardinge = PHASE_1_ANCHORS.HARDINGE_HIGH_SCHOOL;
    expect(hardinge.x).toBeLessThan(0);
    expect(hardinge.z).toBeLessThan(0);
    expect(hardinge.y).toBe(1.0);

    const checkpoint = PHASE_1_ANCHORS.THANA_JUNCTION_CHECKPOINT;
    expect(checkpoint.x).toBeLessThan(0);
    expect(checkpoint.z).toBeGreaterThan(0);

    const workshop = PHASE_1_ANCHORS.KAYETPARA_METAL_WORKSHOP;
    const temple = PHASE_1_ANCHORS.SRI_SRI_YASHOMADHAB_MANDIR;
    expect(temple.x).toBeLessThan(workshop.x);
    const deltaX = temple.x - workshop.x;
    const deltaZ = temple.z - workshop.z;
    const horizontalDist = Math.hypot(deltaX, deltaZ);
    expect(horizontalDist).toBeCloseTo(60.77, 1);
  });

  it('confirms all Phase 1 anchors lie strictly inside the 1,024m slice [-512, 512]', () => {
    const halfSlice = PLAYABLE_SLICE_SIZE_M / 2;
    for (const [name, anchor] of Object.entries(PHASE_1_ANCHORS)) {
      expect(Math.abs(anchor.x)).toBeLessThanOrEqual(halfSlice);
      expect(Math.abs(anchor.z)).toBeLessThanOrEqual(halfSlice);
    }
  });

  it('preserves legacy SaveEnvelopeV1 contract typing (Milestone 2 baseline)', () => {
    const legacyV1: SaveEnvelopeV1 = {
      saveSchemaVersion: 1,
      saveId: 'legacy_v1',
      slotName: 'Slot 1',
      createdAtIso: '2026-11-02T10:00:00.000Z',
      updatedAtIso: '2026-11-02T10:00:00.000Z',
      player: {
        roleId: 'rickshaw_driver',
        position: { x: 0, y: 0, z: 0 },
        headingRadians: 0,
        isInVehicle: false,
        cashPence: 25000,
        reputation: 10,
      },
      missions: {},
      ledger: [
        {
          id: 'tx_init',
          timestampMs: 1000,
          category: 'INITIAL_BALANCE',
          deltaPence: 25000,
          description: 'Initial',
          runningBalancePence: 25000,
        },
      ],
      worldFlags: {},
      checksumSha256: '0000000000000000000000000000000000000000000000000000000000000000',
    };

    expect(legacyV1.saveSchemaVersion).toBe(1);
    expect(legacyV1.player.cashPence).toBe(25000);
    expect((legacyV1 as any).inventory).toBeUndefined();
  });

  it('validates canonical SaveEnvelopeV2 contract typing with inventory and BDT currency', () => {
    const canonicalV2: SaveEnvelopeV2 = {
      saveSchemaVersion: 2,
      saveId: 'save_v2',
      slotName: 'Slot 2',
      createdAtIso: '2026-11-02T12:00:00.000Z',
      updatedAtIso: '2026-11-02T12:00:00.000Z',
      player: {
        roleId: 'rickshaw_driver',
        position: { x: 0, y: 0, z: 0 },
        headingRadians: 0,
        isInVehicle: false,
        cashMinorUnits: 25000,
        currency: 'BDT',
        reputation: 10,
      },
      inventory: [
        {
          id: 'item_1',
          nameBn: 'কাগজ',
          nameEn: 'Document',
          category: 'DOCUMENT',
          quantity: 1,
          isStackable: false,
          maxStackSize: 1,
          descriptionBn: 'বর্ণনা',
          descriptionEn: 'Description',
        },
      ],
      missions: {},
      ledger: [
        {
          id: 'tx_init',
          timestampMs: 1000,
          category: 'INITIAL_BALANCE',
          deltaMinorUnits: 25000,
          currency: 'BDT',
          description: 'Starting cash',
          runningBalanceMinorUnits: 25000,
        },
      ],
      worldFlags: {},
      checksumSha256: '0000000000000000000000000000000000000000000000000000000000000000',
    };

    expect(canonicalV2.saveSchemaVersion).toBe(2);
    expect(canonicalV2.player.currency).toBe('BDT');
    expect(canonicalV2.inventory.length).toBe(1);
    expect(canonicalV2.ledger[0]?.currency).toBe('BDT');
  });
});
