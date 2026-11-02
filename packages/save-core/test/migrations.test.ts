import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import {
  SchemaMigrationPipeline,
  InvalidSaveVersionError,
  UnsupportedFutureVersionError,
  MigrationFailedError,
  attachChecksum,
  validateSaveEnvelopeV2,
  v1ToV2MigrationStep,
} from '../src/index.js';
import { SaveEnvelopeV1, SaveEnvelopeV2 } from '@dhamrai/shared-contracts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Save Core — Schema Migration Pipeline', () => {
  it('correctly inspects supported schema versions', () => {
    const pipeline = new SchemaMigrationPipeline(2);
    expect(pipeline.inspectSchemaVersion({ saveSchemaVersion: 1 })).toBe(1);
    expect(pipeline.inspectSchemaVersion({ saveSchemaVersion: 2 })).toBe(2);
  });

  it('rejects unsupported future schema versions with explicit error', () => {
    const pipeline = new SchemaMigrationPipeline(2);

    expect(() =>
      pipeline.inspectSchemaVersion({ saveSchemaVersion: 3 })
    ).toThrowError(UnsupportedFutureVersionError);

    try {
      pipeline.inspectSchemaVersion({ saveSchemaVersion: 5 });
    } catch (e) {
      expect(e).toBeInstanceOf(UnsupportedFutureVersionError);
      const err = e as UnsupportedFutureVersionError;
      expect(err.detectedVersion).toBe(5);
      expect(err.maxSupportedVersion).toBe(2);
      expect(err.message).toContain('version 5 is newer than the highest supported version (2)');
    }
  });

  it('rejects missing or non-integer saveSchemaVersion with InvalidSaveVersionError', () => {
    const pipeline = new SchemaMigrationPipeline(2);

    expect(() => pipeline.inspectSchemaVersion(null)).toThrowError(InvalidSaveVersionError);
    expect(() => pipeline.inspectSchemaVersion({})).toThrowError(InvalidSaveVersionError);
    expect(() => pipeline.inspectSchemaVersion({ saveSchemaVersion: '1' })).toThrowError(
      InvalidSaveVersionError
    );
    expect(() => pipeline.inspectSchemaVersion({ saveSchemaVersion: 1.5 })).toThrowError(
      InvalidSaveVersionError
    );
    expect(() => pipeline.inspectSchemaVersion({ saveSchemaVersion: -1 })).toThrowError(
      InvalidSaveVersionError
    );
  });

  it('rejects registration of non-sequential migration steps', () => {
    const pipeline = new SchemaMigrationPipeline(3, false);

    expect(() =>
      pipeline.registerStep({
        fromVersion: 1,
        toVersion: 3, // Skipped 2!
        description: 'Invalid jump',
        migrate: (d) => d,
        validate: () => {},
      })
    ).toThrowError(/Non-sequential migration steps not permitted/);
  });

  it('executes sequential migration chain with data isolation', async () => {
    const pipeline = new SchemaMigrationPipeline(3, false);

    // Register step 1 -> 2: Adds inventory array if missing
    pipeline.registerStep({
      fromVersion: 1,
      toVersion: 2,
      description: 'Add inventory array',
      migrate: (data: any) => ({
        ...data,
        saveSchemaVersion: 2,
        inventory: data.inventory ?? [],
      }),
      validate: (data: any) => {
        if (!Array.isArray(data.inventory)) throw new Error('inventory must be an array');
      },
    });

    // Register step 2 -> 3: Migrates player stamina
    pipeline.registerStep({
      fromVersion: 2,
      toVersion: 3,
      description: 'Add player stamina',
      migrate: (data: any) => ({
        ...data,
        saveSchemaVersion: 3,
        player: { ...data.player, stamina: 100 },
      }),
      validate: (data: any) => {
        if (typeof data.player?.stamina !== 'number') throw new Error('stamina required');
      },
    });

    const v1Data = {
      saveSchemaVersion: 1,
      slotName: 'Slot 1',
      player: { cashMinorUnits: 25000, currency: 'BDT' },
    };

    const { data: migrated, stepsApplied } = await pipeline.migrateToTarget(v1Data, 3);

    expect(stepsApplied).toBe(2);
    expect((migrated as any).saveSchemaVersion).toBe(3);
    expect((migrated as any).inventory).toEqual([]);
    expect((migrated as any).player.stamina).toBe(100);

    // Verify original input was not mutated (pure isolation)
    expect(v1Data.saveSchemaVersion).toBe(1);
    expect((v1Data as any).inventory).toBeUndefined();
  });

  describe('Built-in V1 to V2 Migration Step with Realistic Fixture', () => {
    it('successfully migrates realistic legacy-v1-save.json fixture to canonical V2', async () => {
      const fixturePath = path.resolve(__dirname, 'fixtures/legacy-v1-save.json');
      const fixtureRaw = fs.readFileSync(fixturePath, 'utf8');
      const v1Fixture: SaveEnvelopeV1 = JSON.parse(fixtureRaw);

      // Verify fixture starts at V1 with Pence
      expect(v1Fixture.saveSchemaVersion).toBe(1);
      expect(v1Fixture.player.cashPence).toBe(23000);
      expect((v1Fixture as any).inventory).toBeUndefined();
      expect(v1Fixture.ledger[0]?.deltaPence).toBe(25000);

      // Execute migration pipeline targeting version 2
      const pipeline = new SchemaMigrationPipeline(2, true);
      const { data: migratedData, stepsApplied } = await pipeline.migrateToTarget(v1Fixture, 2);
      const migrated = migratedData as SaveEnvelopeV2;

      expect(stepsApplied).toBe(1);
      expect(migrated.saveSchemaVersion).toBe(2);
      expect(migrated.saveId).toBe('save_slot_01');
      expect(migrated.slotName).toBe('QuickSave');

      // Player state migration
      expect(migrated.player.cashMinorUnits).toBe(23000);
      expect(migrated.player.currency).toBe('BDT');
      expect((migrated.player as any).cashPence).toBeUndefined();
      expect(migrated.player.roleId).toBe('rickshaw_driver');
      expect(migrated.player.reputation).toBe(15);

      // Inventory initialization: default canonical starting document restored
      expect(Array.isArray(migrated.inventory)).toBe(true);
      expect(migrated.inventory.length).toBe(1);
      expect(migrated.inventory[0]?.id).toBe('rickshaw_license_slip');
      expect(migrated.inventory[0]?.category).toBe('DOCUMENT');

      // Transaction ledger migration
      expect(migrated.ledger.length).toBe(3);
      expect(migrated.ledger[0]?.deltaMinorUnits).toBe(25000);
      expect(migrated.ledger[0]?.currency).toBe('BDT');
      expect(migrated.ledger[0]?.runningBalanceMinorUnits).toBe(25000);
      expect((migrated.ledger[0] as any).deltaPence).toBeUndefined();

      expect(migrated.ledger[1]?.deltaMinorUnits).toBe(-5000);
      expect(migrated.ledger[1]?.currency).toBe('BDT');
      expect(migrated.ledger[1]?.runningBalanceMinorUnits).toBe(20000);

      expect(migrated.ledger[2]?.deltaMinorUnits).toBe(3000);
      expect(migrated.ledger[2]?.currency).toBe('BDT');
      expect(migrated.ledger[2]?.runningBalanceMinorUnits).toBe(23000);

      // Missions and flags preserved
      expect(migrated.missions['mission_1_first_fare']?.state).toBe('COMPLETED');
      expect(migrated.worldFlags['tutorialCompleted']).toBe(true);

      // Verify data isolation: original fixture must NOT be mutated
      expect(v1Fixture.saveSchemaVersion).toBe(1);
      expect(v1Fixture.player.cashPence).toBe(23000);
      expect((v1Fixture as any).cashMinorUnits).toBeUndefined();
      expect((v1Fixture as any).inventory).toBeUndefined();

      // Verify that after attaching a fresh checksum, it fully passes V2 Zod schema validation
      const withValidChecksum = await attachChecksum(migrated);
      const validated = validateSaveEnvelopeV2(withValidChecksum);
      expect(validated.saveSchemaVersion).toBe(2);
      expect(validated.player.cashMinorUnits).toBe(23000);
      expect(validated.player.currency).toBe('BDT');
    });
  });

  it('preserves recoverability and does not corrupt data if a migration step fails', async () => {
    const pipeline = new SchemaMigrationPipeline(2, false);

    pipeline.registerStep({
      fromVersion: 1,
      toVersion: 2,
      description: 'Faulty migration step',
      migrate: () => {
        throw new Error('Simulated disk/parser failure during migration');
      },
      validate: () => {},
    });

    const v1Data = {
      saveSchemaVersion: 1,
      slotName: 'Slot 1',
      player: { cashMinorUnits: 25000, currency: 'BDT' },
    };

    await expect(pipeline.migrateToTarget(v1Data, 2)).rejects.toThrowError(MigrationFailedError);

    // Verify original remains untouched
    expect(v1Data.saveSchemaVersion).toBe(1);
    expect(v1Data.player.cashMinorUnits).toBe(25000);
  });

  it('preserves original data across repeated failed migration attempts', async () => {
    const pipeline = new SchemaMigrationPipeline(2, false);

    pipeline.registerStep({
      fromVersion: 1,
      toVersion: 2,
      description: 'Faulty step for repeated attempts',
      migrate: () => {
        throw new Error('Repeated failure simulation');
      },
      validate: () => {},
    });

    const v1Data = {
      saveSchemaVersion: 1,
      slotName: 'Slot 1',
      player: { cashMinorUnits: 25000, currency: 'BDT' },
    };

    // Attempt 1, 2, 3
    await expect(pipeline.migrateToTarget(v1Data, 2)).rejects.toThrowError(MigrationFailedError);
    await expect(pipeline.migrateToTarget(v1Data, 2)).rejects.toThrowError(MigrationFailedError);
    await expect(pipeline.migrateToTarget(v1Data, 2)).rejects.toThrowError(MigrationFailedError);

    expect(v1Data.saveSchemaVersion).toBe(1);
    expect(v1Data.player.cashMinorUnits).toBe(25000);
  });
});
