/**
 * Milestone 37 — Save migration matrix regression (V1 → V2, V2 round-trip).
 */
import { describe, it, expect } from 'vitest';
import { GameCoreEngine } from '@dhamrai/game-core';
import {
  validateSaveEnvelopeV2,
  SchemaMigrationPipeline,
  attachChecksum,
} from '../src/index.js';
import type { SaveEnvelopeV1 } from '@dhamrai/shared-contracts';

describe('Save migration matrix (M37)', () => {
  it('V2 fresh save validates', async () => {
    const engine = GameCoreEngine.createNewGame(1000);
    const save = engine.toSaveEnvelope('m37', 'Matrix');
    const withSum = await attachChecksum(save);
    expect(() => validateSaveEnvelopeV2(withSum)).not.toThrow();
    expect(withSum.saveSchemaVersion).toBe(2);
  });

  it('V1 → V2 migration preserves mission completion', async () => {
    const pipeline = new SchemaMigrationPipeline(2);
    const v1: SaveEnvelopeV1 = {
      saveSchemaVersion: 1,
      saveId: 'legacy-m37',
      slotName: 'Legacy',
      createdAtIso: '2024-01-01T00:00:00.000Z',
      updatedAtIso: '2024-01-01T00:00:00.000Z',
      player: {
        roleId: 'rickshaw_driver',
        position: { x: 1, y: 0, z: 2 },
        headingRadians: 0.5,
        isInVehicle: false,
        cashPence: 25000,
        reputation: 10,
      },
      missions: {
        mission_1_first_fare: {
          state: 'COMPLETED',
          completedObjectiveIds: ['obj_m1_pickup', 'obj_m1_dropoff'],
        },
      },
      ledger: [
        {
          id: 'tx_init',
          timestampMs: 1,
          category: 'INITIAL_BALANCE',
          deltaPence: 25000,
          description: 'start',
          runningBalancePence: 25000,
        },
      ],
      worldFlags: {},
      checksumSha256: 'a'.repeat(64),
    };

    const { data, stepsApplied } = await pipeline.migrateToTarget(v1, 2);
    const migrated = data as import('@dhamrai/shared-contracts').SaveEnvelopeV2;
    expect(stepsApplied).toBe(1);
    expect(migrated.saveSchemaVersion).toBe(2);
    expect(migrated.player.cashMinorUnits).toBe(25000);
    expect(migrated.missions.mission_1_first_fare?.state).toBe('COMPLETED');
  });

  it('V2 round-trip through engine preserves optional civic/property flags', () => {
    const engine = GameCoreEngine.createNewGame(1000);
    engine.applyPoliceHeatDelta(12);
    engine.inspectPlot('plot_rathkhola_corner');
    const save = engine.toSaveEnvelope('m37b', 'RT');
    const loaded = GameCoreEngine.fromSaveEnvelope(save);
    expect(loaded.policeHeat).toBe(12);
    expect(loaded.getInspectedPlotIds()).toContain('plot_rathkhola_corner');
  });
});
