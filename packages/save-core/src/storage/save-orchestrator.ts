/**
 * Dhamrai Life — Save Orchestrator
 * ==================================
 * High-level save manager coordinating domain engine serialization,
 * Zod validation, SHA-256 integrity verification, schema migrations,
 * pre-migration snapshot isolation, and storage adapters.
 */

import { SaveEnvelopeV2 } from '@dhamrai/shared-contracts';
import { GameCoreEngine } from '@dhamrai/game-core';
import {
  InvalidSaveSchemaError,
  SaveSlotNotFoundError,
  SaveSystemError,
  SnapshotRestorationConflictError,
} from '../errors.js';
import {
  attachChecksum,
  verifySaveIntegrity,
} from '../crypto/checksum.js';
import { validateSaveEnvelopeV2 } from '../schemas/v2.schema.js';
import { SchemaMigrationPipeline } from '../migrations/migration-pipeline.js';
import {
  CURRENT_SAVE_SCHEMA_VERSION,
  ISaveStorageAdapter,
  MigrationSnapshotRecord,
  SaveSlotMetadata,
} from '../types.js';

const PLACEHOLDER_CHECKSUM = '0000000000000000000000000000000000000000000000000000000000000000';

export class SaveOrchestrator {
  private readonly _adapter: ISaveStorageAdapter;
  private readonly _migrationPipeline: SchemaMigrationPipeline;

  constructor(
    adapter: ISaveStorageAdapter,
    migrationPipeline: SchemaMigrationPipeline = new SchemaMigrationPipeline()
  ) {
    this._adapter = adapter;
    this._migrationPipeline = migrationPipeline;
  }

  public get adapter(): ISaveStorageAdapter {
    return this._adapter;
  }

  public get migrationPipeline(): SchemaMigrationPipeline {
    return this._migrationPipeline;
  }

  /**
   * Initializes the underlying storage adapter.
   */
  public async init(): Promise<void> {
    await this._adapter.init();
  }

  /**
   * Serializes current domain engine state, validates against Zod V2 schema,
   * computes SHA-256 checksum, and writes atomically to storage.
   */
  public async saveEngine(
    slotName: string,
    engine: GameCoreEngine,
    saveId?: string
  ): Promise<SaveEnvelopeV2> {
    const rawEnvelope = engine.toSaveEnvelope(saveId ?? slotName, slotName);

    // Validate with Zod before writing (enforces V2 types and BDT currency)
    const validatedBeforeChecksum = validateSaveEnvelopeV2({
      ...rawEnvelope,
      checksumSha256: PLACEHOLDER_CHECKSUM,
    });

    // Compute and attach cryptographically valid SHA-256 hash on the validated object
    const envelopeWithChecksum = await attachChecksum(validatedBeforeChecksum);

    // Write to persistent storage
    await this._adapter.saveRecord(slotName, envelopeWithChecksum);

    return envelopeWithChecksum;
  }

  /**
   * Loads a save envelope by slot name.
   * Performs version inspection, pre-migration snapshot isolation (if older version),
   * sequential schema migration (e.g. V1 -> V2), Zod schema validation, and SHA-256 integrity verification.
   */
  public async loadSave(slotName: string): Promise<SaveEnvelopeV2> {
    const raw = await this._adapter.loadRecord(slotName);
    if (raw === null || raw === undefined) {
      throw new SaveSlotNotFoundError(slotName);
    }

    // Inspect schema version (rejects future versions with UnsupportedFutureVersionError)
    const version = this._migrationPipeline.inspectSchemaVersion(raw);

    let envelopeToVerify: unknown = raw;

    // Handle migrations for legacy saves (e.g. V1 -> V2)
    if (version < CURRENT_SAVE_SCHEMA_VERSION) {
      // 1. Pre-migration snapshot isolation: Capture original state before executing migrations
      const snapshot: MigrationSnapshotRecord = {
        id: `${slotName}_v${version}_${Date.now()}`,
        slotName,
        originalVersion: version,
        payloadJson: JSON.stringify(raw),
        createdAtIso: new Date().toISOString(),
      };

      // 2. Run sequential migrations (pure transformation without mutating raw input)
      const { data: migratedData } = await this._migrationPipeline.migrateToTarget(
        raw,
        CURRENT_SAVE_SCHEMA_VERSION
      );

      // 3. Validate migrated payload with target Zod schema first (applying defaults)
      const validatedMigrated = validateSaveEnvelopeV2({
        ...(migratedData as Record<string, unknown>),
        checksumSha256: PLACEHOLDER_CHECKSUM,
      });

      // 4. Compute fresh checksum for the finalized migrated payload
      const migratedWithChecksum = await attachChecksum(validatedMigrated);

      // 5. Atomic write: Only commit to storage after migration AND validation succeed
      await this._adapter.saveMigratedRecordWithSnapshot(slotName, snapshot, migratedWithChecksum);
      envelopeToVerify = migratedWithChecksum;
    }

    // Validate schema against V2
    const envelope = validateSaveEnvelopeV2(envelopeToVerify);

    // Verify SHA-256 payload integrity
    await verifySaveIntegrity(envelope as unknown as Record<string, unknown>);

    return envelope;
  }

  /**
   * Retrieves the latest pre-migration backup snapshot for a given slot, if any exists.
   */
  public async getLatestMigrationSnapshot(slotName: string): Promise<MigrationSnapshotRecord | null> {
    return this._adapter.getLatestMigrationSnapshot(slotName);
  }

  /**
   * Restores a save slot directly from its latest pre-migration snapshot.
   * Enforces that restoration cannot overwrite an unrelated save (different saveId)
   * or a newer save from subsequent gameplay after migration.
   */
  public async restoreFromSnapshot(slotName: string): Promise<unknown | null> {
    const snapshot = await this._adapter.getLatestMigrationSnapshot(slotName);
    if (!snapshot) {
      return null;
    }

    const currentRecord = (await this._adapter.loadRecord(slotName)) as Record<string, unknown> | null;
    const snapshotPayload = JSON.parse(snapshot.payloadJson) as Record<string, unknown>;

    if (currentRecord) {
      // Guard against overwriting an unrelated save session with a different saveId
      if (
        currentRecord['saveId'] &&
        snapshotPayload['saveId'] &&
        currentRecord['saveId'] !== snapshotPayload['saveId']
      ) {
        throw new SnapshotRestorationConflictError(
          slotName,
          `Slot currently contains an unrelated save session (current saveId: "${currentRecord['saveId']}", snapshot saveId: "${snapshotPayload['saveId']}").`
        );
      }

      // Guard against overwriting a newer save session from subsequent gameplay after migration
      const hasNewerGameplay =
        currentRecord['saveSchemaVersion'] === CURRENT_SAVE_SCHEMA_VERSION &&
        Array.isArray(currentRecord['ledger']) &&
        Array.isArray(snapshotPayload['ledger']) &&
        currentRecord['ledger'].length > snapshotPayload['ledger'].length;

      if (hasNewerGameplay) {
        throw new SnapshotRestorationConflictError(
          slotName,
          `Slot currently contains newer gameplay saved after migration (current ledger transactions: ${(currentRecord['ledger'] as unknown[]).length}, snapshot ledger: ${(snapshotPayload['ledger'] as unknown[]).length}).`
        );
      }
    }

    await this._adapter.saveRecord(slotName, snapshotPayload as any);
    return snapshotPayload;
  }

  /**
   * Loads a save envelope and hydrates a pure GameCoreEngine instance.
   */
  public async restoreEngine(slotName: string): Promise<GameCoreEngine> {
    const envelope = await this.loadSave(slotName);
    return GameCoreEngine.fromSaveEnvelope(envelope);
  }

  /**
   * Checks whether a save slot exists.
   */
  public async hasSave(slotName: string): Promise<boolean> {
    try {
      const record = await this._adapter.loadRecord(slotName);
      return record !== null && record !== undefined;
    } catch {
      return false;
    }
  }

  /**
   * Lists all existing save slots and metadata.
   */
  public async listSlots(): Promise<SaveSlotMetadata[]> {
    return this._adapter.listSlots();
  }

  /**
   * Deletes a save slot by name.
   */
  public async deleteSlot(slotName: string): Promise<boolean> {
    return this._adapter.deleteRecord(slotName);
  }

  /**
   * Exports a save slot to a JSON string.
   */
  public async exportSaveToJson(slotName: string, pretty: boolean = true): Promise<string> {
    const envelope = await this.loadSave(slotName);
    return JSON.stringify(envelope, null, pretty ? 2 : undefined);
  }

  /**
   * Imports a save from a JSON string into a designated save slot.
   * Validates version, structure, and integrity before writing.
   */
  public async importSaveFromJson(
    jsonString: string,
    targetSlotName?: string
  ): Promise<SaveEnvelopeV2> {
    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonString);
    } catch (e) {
      throw new SaveSystemError(`Failed to parse save JSON: ${(e as Error).message}`);
    }

    if (parsed === null || typeof parsed !== 'object') {
      throw new InvalidSaveSchemaError('Imported save payload must be a JSON object.');
    }

    const payload = parsed as Record<string, unknown>;
    const destinationSlot = targetSlotName ?? (payload['slotName'] as string) ?? 'ImportedSave';

    payload['slotName'] = destinationSlot;

    // Handle migrations if older version
    const version = this._migrationPipeline.inspectSchemaVersion(payload);
    let finalPayload = payload;

    if (version < CURRENT_SAVE_SCHEMA_VERSION) {
      const { data: migrated } = await this._migrationPipeline.migrateToTarget(
        payload,
        CURRENT_SAVE_SCHEMA_VERSION
      );
      finalPayload = migrated as Record<string, unknown>;
    }

    // Validate with target V2 schema first
    const validated = validateSaveEnvelopeV2({
      ...finalPayload,
      checksumSha256: PLACEHOLDER_CHECKSUM,
    });

    // Attach fresh checksum for the destination slot
    const withChecksum = await attachChecksum(validated);

    await this._adapter.saveRecord(destinationSlot, withChecksum);
    return withChecksum;
  }
}
