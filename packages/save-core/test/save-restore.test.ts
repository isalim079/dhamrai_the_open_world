import { describe, it, expect, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import 'fake-indexeddb/auto';
import { GameCoreEngine } from '@dhamrai/game-core';
import { PHASE_1_ANCHORS } from '@dhamrai/shared-contracts';
import {
  SaveOrchestrator,
  IndexedDBStorageAdapter,
  MemoryStorageAdapter,
  SaveSlotNotFoundError,
  ChecksumMismatchError,
  SchemaMigrationPipeline,
  MigrationFailedError,
  InvalidSaveSchemaError,
  SnapshotRestorationConflictError,
  UnsupportedFutureVersionError,
} from '../src/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Save Core — Save/Restore Integration & Local Persistence', () => {
  let idbAdapter: IndexedDBStorageAdapter;
  let memAdapter: MemoryStorageAdapter;

  beforeEach(async () => {
    idbAdapter = new IndexedDBStorageAdapter('DhamraiTestDB_' + Math.random().toString(36).slice(2));
    await idbAdapter.init();

    memAdapter = new MemoryStorageAdapter();
  });

  it('creates new saves using canonical SaveSchemaVersion 2 with BDT currency', async () => {
    const orchestrator = new SaveOrchestrator(memAdapter);
    const engine = GameCoreEngine.createNewGame(1000);
    const savedEnvelope = await orchestrator.saveEngine('fresh_v2_slot', engine);
    expect(savedEnvelope.saveSchemaVersion).toBe(2);
    expect(savedEnvelope.player.currency).toBe('BDT');
    expect(savedEnvelope.player.cashMinorUnits).toBe(25000);
    expect(Array.isArray(savedEnvelope.inventory)).toBe(true);
  });

  it('performs full save and restore cycle for all domain state via IndexedDB', async () => {
    const orchestrator = new SaveOrchestrator(idbAdapter);
    await orchestrator.init();

    // 1. Initialize engine
    const engine = GameCoreEngine.createNewGame(1000);

    // 2. Perform gameplay mutations: rent, move, mission progress
    engine.processDailyVehicleRent(2000); // ৳250 -> ৳200
    engine.updatePlayerPosition(PHASE_1_ANCHORS.HARDINGE_HIGH_SCHOOL, 1.25);
    engine.setInVehicle(true);

    // Add inventory item with metadata
    engine.inventory.addItem({
      id: 'brass_plate_artisan',
      nameBn: 'ধামরাই কাঁসার থালা',
      nameEn: 'Dhamrai Bell-Metal Plate',
      category: 'CARGO',
      quantity: 4,
      isStackable: true,
      maxStackSize: 10,
      descriptionBn: 'ধামরাইয়ের প্রাচীন ধাতব ঐতিহ্যবাহী কাঁসা',
      descriptionEn: 'Traditional Dhamrai bell-metal artisan craft',
      metadata: { artisanLotId: 'kayetpara_batch_04', inspectionPassed: true },
    });

    // Advance mission
    engine.missions.activateMission('mission_1_first_fare', 2500);
    engine.missions.completeObjective('mission_1_first_fare', 'obj_m1_pickup');
    engine.missions.completeObjective('mission_1_first_fare', 'obj_m1_dropoff');
    engine.completeMission('mission_1_first_fare', 3500); // +৳30 -> ৳230 (23000 Poisha)

    // Set custom world flag
    engine.setWorldFlag('rainIntensity', 'light');

    // 3. Save into slot "slot_alpha"
    const savedEnvelope = await orchestrator.saveEngine('slot_alpha', engine, 'save_alpha_01');
    expect(savedEnvelope.slotName).toBe('slot_alpha');
    expect(savedEnvelope.saveSchemaVersion).toBe(2);
    expect(savedEnvelope.player.cashMinorUnits).toBe(23000);
    expect(savedEnvelope.player.currency).toBe('BDT');
    expect(savedEnvelope.checksumSha256).toMatch(/^[0-9a-f]{64}$/);

    // 4. Hydrate new engine instance from persisted storage
    const restoredEngine = await orchestrator.restoreEngine('slot_alpha');

    // 5. Assert economy & ledger fidelity
    expect(restoredEngine.economy.balanceMinorUnits).toBe(23000);
    expect(restoredEngine.economy.ledger.length).toBe(3); // Initial + Rent + Fare
    expect(restoredEngine.economy.ledger[0]?.currency).toBe('BDT');
    expect(restoredEngine.economy.verifyIntegrity()).toBe(true);

    // 6. Assert player state fidelity
    expect(restoredEngine.player.roleId).toBe('rickshaw_driver');
    expect(restoredEngine.player.position).toEqual(PHASE_1_ANCHORS.HARDINGE_HIGH_SCHOOL);
    expect(restoredEngine.player.headingRadians).toBe(1.25);
    expect(restoredEngine.player.isInVehicle).toBe(true);
    expect(restoredEngine.player.reputations.transportReputation).toBe(15);

    // 7. Assert inventory fidelity
    expect(restoredEngine.inventory.hasItem('rickshaw_license_slip')).toBe(true);
    expect(restoredEngine.inventory.hasItem('brass_plate_artisan', 4)).toBe(true);
    const restoredItem = restoredEngine.inventory.getItem('brass_plate_artisan');
    expect(restoredItem?.category).toBe('CARGO');
    expect(restoredItem?.quantity).toBe(4);
    expect(restoredItem?.metadata).toEqual({
      artisanLotId: 'kayetpara_batch_04',
      inspectionPassed: true,
    });

    // 8. Assert mission fidelity
    const m1 = restoredEngine.missions.getInstance('mission_1_first_fare');
    expect(m1?.state).toBe('COMPLETED');
    expect(m1?.completedObjectiveIds).toContain('obj_m1_pickup');
    expect(m1?.completedObjectiveIds).toContain('obj_m1_dropoff');

    // 9. Assert world flags fidelity
    expect(restoredEngine.getWorldFlag('rainIntensity')).toBe('light');
  });

  it('guarantees repeated save and restore without state drift', async () => {
    const orchestrator = new SaveOrchestrator(memAdapter);
    let currentEngine = GameCoreEngine.createNewGame(1000);
    currentEngine.processDailyVehicleRent(2000);

    // Cycle 1: Save and Restore
    await orchestrator.saveEngine('drift_test', currentEngine);
    currentEngine = await orchestrator.restoreEngine('drift_test');

    const balanceAfterCycle1 = currentEngine.economy.balanceMinorUnits;
    const ledgerLenAfterCycle1 = currentEngine.economy.ledger.length;

    // Cycle 2: Save and Restore without playing
    await orchestrator.saveEngine('drift_test', currentEngine);
    currentEngine = await orchestrator.restoreEngine('drift_test');

    expect(currentEngine.economy.balanceMinorUnits).toBe(balanceAfterCycle1);
    expect(currentEngine.economy.ledger.length).toBe(ledgerLenAfterCycle1);

    // Cycle 3: Save and Restore again
    await orchestrator.saveEngine('drift_test', currentEngine);
    currentEngine = await orchestrator.restoreEngine('drift_test');

    expect(currentEngine.economy.balanceMinorUnits).toBe(balanceAfterCycle1);
    expect(currentEngine.economy.ledger.length).toBe(ledgerLenAfterCycle1);
    expect(currentEngine.economy.verifyIntegrity()).toBe(true);
  });

  it('gracefully handles missing or empty save slots', async () => {
    const orchestrator = new SaveOrchestrator(memAdapter);

    expect(await orchestrator.hasSave('non_existent_slot')).toBe(false);

    await expect(orchestrator.loadSave('non_existent_slot')).rejects.toThrowError(
      SaveSlotNotFoundError
    );

    await expect(orchestrator.restoreEngine('non_existent_slot')).rejects.toThrowError(
      SaveSlotNotFoundError
    );
  });

  it('detects payload inconsistency and rejects corrupted checksums when loading from storage', async () => {
    const orchestrator = new SaveOrchestrator(memAdapter);
    const engine = GameCoreEngine.createNewGame(1000);
    await orchestrator.saveEngine('corrupt_slot', engine);

    // Alter directly the underlying storage payload (e.g. storage bitflip or edit)
    const raw = (await memAdapter.loadRecord('corrupt_slot')) as any;
    raw.player.cashMinorUnits = 9999999;
    await memAdapter.saveRecord('corrupt_slot', raw);

    // Load should fail integrity / consistency verification
    await expect(orchestrator.loadSave('corrupt_slot')).rejects.toThrowError(ChecksumMismatchError);
    await expect(orchestrator.restoreEngine('corrupt_slot')).rejects.toThrowError(
      ChecksumMismatchError
    );
  });

  it('lists slots with metadata correctly including integer BDT minor units', async () => {
    const orchestrator = new SaveOrchestrator(memAdapter);
    const engine1 = GameCoreEngine.createNewGame(1000);
    const engine2 = GameCoreEngine.createNewGame(2000);
    engine2.processDailyVehicleRent(3000);

    await orchestrator.saveEngine('Slot 1', engine1);
    await orchestrator.saveEngine('Slot 2', engine2);

    const slots = await orchestrator.listSlots();
    expect(slots.length).toBe(2);

    const slotNames = slots.map((s) => s.slotName);
    expect(slotNames).toContain('Slot 1');
    expect(slotNames).toContain('Slot 2');

    const slot2 = slots.find((s) => s.slotName === 'Slot 2');
    expect(slot2?.cashMinorUnits).toBe(20000);
    expect(slot2?.currency).toBe('BDT');
  });

  it('supports JSON export and import with slot reassignment and integrity re-verification', async () => {
    const orchestrator = new SaveOrchestrator(memAdapter);
    const engine = GameCoreEngine.createNewGame(1000);
    await orchestrator.saveEngine('source_slot', engine);

    const exportedJson = await orchestrator.exportSaveToJson('source_slot');
    expect(typeof exportedJson).toBe('string');
    expect(exportedJson).toContain('"saveSchemaVersion": 2');
    expect(exportedJson).toContain('"cashMinorUnits": 25000');

    // Import into a new slot
    const importedEnvelope = await orchestrator.importSaveFromJson(
      exportedJson,
      'imported_destination_slot'
    );
    expect(importedEnvelope.slotName).toBe('imported_destination_slot');
    expect(importedEnvelope.saveSchemaVersion).toBe(2);

    // Verify imported slot can be restored
    const restoredEngine = await orchestrator.restoreEngine('imported_destination_slot');
    expect(restoredEngine.economy.balanceMinorUnits).toBe(25000);
    expect(restoredEngine.inventory.hasItem('rickshaw_license_slip')).toBe(true);
  });

  it('deletes slots cleanly', async () => {
    const orchestrator = new SaveOrchestrator(memAdapter);
    const engine = GameCoreEngine.createNewGame(1000);
    await orchestrator.saveEngine('to_delete', engine);

    expect(await orchestrator.hasSave('to_delete')).toBe(true);
    const deleted = await orchestrator.deleteSlot('to_delete');
    expect(deleted).toBe(true);
    expect(await orchestrator.hasSave('to_delete')).toBe(false);
  });

  it('creates pre-migration snapshot before migrating a realistic V1 save and commits atomically to V2', async () => {
    const orchestrator = new SaveOrchestrator(idbAdapter);
    const fixturePath = path.resolve(__dirname, 'fixtures/legacy-v1-save.json');
    const legacyV1 = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));

    // Save legacy V1 payload directly into storage
    await idbAdapter.saveRecord('legacy_v1_slot', legacyV1);

    // Load save — this triggers pre-migration snapshot and migration to V2
    const loaded = await orchestrator.loadSave('legacy_v1_slot');
    expect(loaded.saveSchemaVersion).toBe(2);
    expect(loaded.player.cashMinorUnits).toBe(23000);
    expect(loaded.player.currency).toBe('BDT');
    expect(loaded.inventory.length).toBe(1);
    expect(loaded.inventory[0]?.id).toBe('rickshaw_license_slip');
    expect(loaded.ledger[0]?.deltaMinorUnits).toBe(25000);
    expect(loaded.ledger[0]?.currency).toBe('BDT');

    // Verify snapshot was created in storage
    const snapshot = await orchestrator.getLatestMigrationSnapshot('legacy_v1_slot');
    expect(snapshot).not.toBeNull();
    expect(snapshot?.originalVersion).toBe(1);
    expect(JSON.parse(snapshot!.payloadJson).saveSchemaVersion).toBe(1);
    expect(JSON.parse(snapshot!.payloadJson).player.cashPence).toBe(23000);

    // Verify snapshot can be retrieved and restored
    const restoredSnapshot = await orchestrator.restoreFromSnapshot('legacy_v1_slot');
    expect((restoredSnapshot as any).saveSchemaVersion).toBe(1);
    expect((restoredSnapshot as any).player.cashPence).toBe(23000);

    // Verify we can hydrate an operational engine from the migrated V2 slot
    const engine = await orchestrator.restoreEngine('legacy_v1_slot');
    expect(engine.economy.balanceMinorUnits).toBe(23000);
    expect(engine.missions.getInstance('mission_1_first_fare')?.state).toBe('COMPLETED');
  });

  it('preserves original V1 save without corruption when migration fails', async () => {
    const pipeline = new SchemaMigrationPipeline(2, false);
    pipeline.registerStep({
      fromVersion: 1,
      toVersion: 2,
      description: 'Faulty migration step',
      migrate: () => {
        throw new Error('Disk full during migration');
      },
      validate: () => {},
    });

    const orchestrator = new SaveOrchestrator(memAdapter, pipeline);

    const fixturePath = path.resolve(__dirname, 'fixtures/legacy-v1-save.json');
    const legacyV1 = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));

    await memAdapter.saveRecord('fail_v1_slot', legacyV1);

    // Migration must fail
    await expect(orchestrator.loadSave('fail_v1_slot')).rejects.toThrowError(MigrationFailedError);

    // Original unmigrated record in storage must remain 100% intact
    const recordAfterFail = (await memAdapter.loadRecord('fail_v1_slot')) as any;
    expect(recordAfterFail.saveSchemaVersion).toBe(1);
    expect(recordAfterFail.player.cashPence).toBe(23000);
  });

  it('does not commit when migrated payload violates target Zod schema', async () => {
    const pipeline = new SchemaMigrationPipeline(2, false);
    pipeline.registerStep({
      fromVersion: 1,
      toVersion: 2,
      description: 'Migrate to invalid v2',
      migrate: (legacy: any) => ({
        saveSchemaVersion: 2,
        saveId: legacy.saveId,
        slotName: legacy.slotName,
        createdAtIso: 'not_an_iso_date', // Invalid!
        updatedAtIso: 'not_an_iso_date',
        player: { cashMinorUnits: -999, currency: 'USD' }, // Invalid negative & currency!
        inventory: [],
        missions: {},
        ledger: [],
        worldFlags: {},
        checksumSha256: '0000000000000000000000000000000000000000000000000000000000000000',
      }),
      validate: () => {},
    });

    const orchestrator = new SaveOrchestrator(memAdapter, pipeline);

    const fixturePath = path.resolve(__dirname, 'fixtures/legacy-v1-save.json');
    const legacyV1 = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));

    await memAdapter.saveRecord('bad_schema_slot', legacyV1);

    await expect(orchestrator.loadSave('bad_schema_slot')).rejects.toThrowError(InvalidSaveSchemaError);

    // Storage must still hold original v1 payload
    const record = (await memAdapter.loadRecord('bad_schema_slot')) as any;
    expect(record.saveSchemaVersion).toBe(1);
    expect(record.player.cashPence).toBe(23000);
  });

  it('rejects future-version saves in loadSave without modifying stored data', async () => {
    const orchestrator = new SaveOrchestrator(memAdapter);
    const futureSave = {
      saveSchemaVersion: 3,
      saveId: 'future_001',
      slotName: 'future_slot',
      createdAtIso: '2026-11-02T12:00:00.000Z',
      updatedAtIso: '2026-11-02T12:00:00.000Z',
      player: { cashMinorUnits: 50000, currency: 'BDT' },
      checksumSha256: '0000000000000000000000000000000000000000000000000000000000000000',
    };

    await memAdapter.saveRecord('future_slot', futureSave as any);

    // Loading future save must throw UnsupportedFutureVersionError
    await expect(orchestrator.loadSave('future_slot')).rejects.toThrowError(
      UnsupportedFutureVersionError
    );

    // Stored record must remain completely unmodified
    const record = (await memAdapter.loadRecord('future_slot')) as any;
    expect(record.saveSchemaVersion).toBe(3);
    expect(record.player.cashMinorUnits).toBe(50000);
  });

  it('guarantees repeated calls to loadSave do not create duplicate snapshots or re-run migrations', async () => {
    const orchestrator = new SaveOrchestrator(memAdapter);
    const fixturePath = path.resolve(__dirname, 'fixtures/legacy-v1-save.json');
    const legacyV1 = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));

    await memAdapter.saveRecord('repeat_slot', legacyV1);

    // First load: triggers snapshot and migration to v2
    const firstLoad = await orchestrator.loadSave('repeat_slot');
    expect(firstLoad.saveSchemaVersion).toBe(2);

    const snapshotsAfterFirst = await orchestrator.getLatestMigrationSnapshot('repeat_slot');
    expect(snapshotsAfterFirst).not.toBeNull();
    const allSnapshotsAfterFirst = await memAdapter.getMigrationSnapshots('repeat_slot');
    expect(allSnapshotsAfterFirst.length).toBe(1);

    // Second and third loads: already v2, no new snapshots or migrations
    const secondLoad = await orchestrator.loadSave('repeat_slot');
    expect(secondLoad.saveSchemaVersion).toBe(2);

    const thirdLoad = await orchestrator.loadSave('repeat_slot');
    expect(thirdLoad.saveSchemaVersion).toBe(2);

    const allSnapshotsAfterRepeats = await memAdapter.getMigrationSnapshots('repeat_slot');
    expect(allSnapshotsAfterRepeats.length).toBe(1); // Still exactly 1!
  });

  it('prevents snapshot restoration from overwriting an unrelated save with different saveId', async () => {
    const orchestrator = new SaveOrchestrator(memAdapter);
    const fixturePath = path.resolve(__dirname, 'fixtures/legacy-v1-save.json');
    const legacyV1 = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));

    await memAdapter.saveRecord('conflict_slot', legacyV1);

    // Migrate to create snapshot (snapshot saveId is 'save_slot_01')
    await orchestrator.loadSave('conflict_slot');

    // Overwrite the slot with an entirely new/unrelated session with a different saveId
    const newEngine = GameCoreEngine.createNewGame(2000);
    await orchestrator.saveEngine('conflict_slot', newEngine, 'unrelated_new_session_99');

    // Attempting to restore the snapshot must throw SnapshotRestorationConflictError
    await expect(orchestrator.restoreFromSnapshot('conflict_slot')).rejects.toThrowError(
      SnapshotRestorationConflictError
    );

    // The unrelated newer session in storage must remain 100% intact
    const currentSave = await orchestrator.loadSave('conflict_slot');
    expect(currentSave.saveId).toBe('unrelated_new_session_99');
    expect(currentSave.player.cashMinorUnits).toBe(25000);
  });

  it('prevents snapshot restoration from overwriting a newer save session with advanced gameplay', async () => {
    const orchestrator = new SaveOrchestrator(memAdapter);
    const fixturePath = path.resolve(__dirname, 'fixtures/legacy-v1-save.json');
    const legacyV1 = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));

    await memAdapter.saveRecord('advanced_slot', legacyV1);

    // Migrate legacy save (has 3 transactions in ledger)
    const migrated = await orchestrator.loadSave('advanced_slot');
    expect(migrated.ledger.length).toBe(3);

    // Advance gameplay and save new progress to the same slot
    const engine = await orchestrator.restoreEngine('advanced_slot');
    engine.processDailyVehicleRent(5000); // Transaction 4
    await orchestrator.saveEngine('advanced_slot', engine, legacyV1.saveId);

    // Snapshot restoration must be rejected because newer gameplay has occurred
    await expect(orchestrator.restoreFromSnapshot('advanced_slot')).rejects.toThrowError(
      SnapshotRestorationConflictError
    );

    // Verify advanced gameplay remains preserved
    const current = await orchestrator.loadSave('advanced_slot');
    expect(current.ledger.length).toBe(4);
  });

  it('cleans up migration snapshots when a save slot is deleted', async () => {
    const orchestrator = new SaveOrchestrator(idbAdapter);
    const fixturePath = path.resolve(__dirname, 'fixtures/legacy-v1-save.json');
    const legacyV1 = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));

    await idbAdapter.saveRecord('slot_to_delete', legacyV1);

    // Migrate to create snapshot
    await orchestrator.loadSave('slot_to_delete');
    expect(await orchestrator.getLatestMigrationSnapshot('slot_to_delete')).not.toBeNull();

    // Delete slot
    await orchestrator.deleteSlot('slot_to_delete');

    // Slot and its snapshots must both be deleted
    expect(await orchestrator.hasSave('slot_to_delete')).toBe(false);
    expect(await orchestrator.getLatestMigrationSnapshot('slot_to_delete')).toBeNull();
  });
});
