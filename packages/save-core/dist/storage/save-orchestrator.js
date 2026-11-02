/**
 * Dhamrai Life — Save Orchestrator
 * ==================================
 * High-level save manager coordinating domain engine serialization,
 * Zod validation, SHA-256 integrity verification, schema migrations,
 * pre-migration snapshot isolation, and storage adapters.
 */
import { GameCoreEngine } from '@dhamrai/game-core';
import { InvalidSaveSchemaError, SaveSlotNotFoundError, SaveSystemError, SnapshotRestorationConflictError, } from '../errors.js';
import { attachChecksum, verifySaveIntegrity, } from '../crypto/checksum.js';
import { validateSaveEnvelopeV2 } from '../schemas/v2.schema.js';
import { SchemaMigrationPipeline } from '../migrations/migration-pipeline.js';
import { CURRENT_SAVE_SCHEMA_VERSION, } from '../types.js';
const PLACEHOLDER_CHECKSUM = '0000000000000000000000000000000000000000000000000000000000000000';
export class SaveOrchestrator {
    _adapter;
    _migrationPipeline;
    constructor(adapter, migrationPipeline = new SchemaMigrationPipeline()) {
        this._adapter = adapter;
        this._migrationPipeline = migrationPipeline;
    }
    get adapter() {
        return this._adapter;
    }
    get migrationPipeline() {
        return this._migrationPipeline;
    }
    /**
     * Initializes the underlying storage adapter.
     */
    async init() {
        await this._adapter.init();
    }
    /**
     * Serializes current domain engine state, validates against Zod V2 schema,
     * computes SHA-256 checksum, and writes atomically to storage.
     */
    async saveEngine(slotName, engine, saveId) {
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
    async loadSave(slotName) {
        const raw = await this._adapter.loadRecord(slotName);
        if (raw === null || raw === undefined) {
            throw new SaveSlotNotFoundError(slotName);
        }
        // Inspect schema version (rejects future versions with UnsupportedFutureVersionError)
        const version = this._migrationPipeline.inspectSchemaVersion(raw);
        let envelopeToVerify = raw;
        // Handle migrations for legacy saves (e.g. V1 -> V2)
        if (version < CURRENT_SAVE_SCHEMA_VERSION) {
            // 1. Pre-migration snapshot isolation: Capture original state before executing migrations
            const snapshot = {
                id: `${slotName}_v${version}_${Date.now()}`,
                slotName,
                originalVersion: version,
                payloadJson: JSON.stringify(raw),
                createdAtIso: new Date().toISOString(),
            };
            // 2. Run sequential migrations (pure transformation without mutating raw input)
            const { data: migratedData } = await this._migrationPipeline.migrateToTarget(raw, CURRENT_SAVE_SCHEMA_VERSION);
            // 3. Validate migrated payload with target Zod schema first (applying defaults)
            const validatedMigrated = validateSaveEnvelopeV2({
                ...migratedData,
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
        await verifySaveIntegrity(envelope);
        return envelope;
    }
    /**
     * Retrieves the latest pre-migration backup snapshot for a given slot, if any exists.
     */
    async getLatestMigrationSnapshot(slotName) {
        return this._adapter.getLatestMigrationSnapshot(slotName);
    }
    /**
     * Restores a save slot directly from its latest pre-migration snapshot.
     * Enforces that restoration cannot overwrite an unrelated save (different saveId)
     * or a newer save from subsequent gameplay after migration.
     */
    async restoreFromSnapshot(slotName) {
        const snapshot = await this._adapter.getLatestMigrationSnapshot(slotName);
        if (!snapshot) {
            return null;
        }
        const currentRecord = (await this._adapter.loadRecord(slotName));
        const snapshotPayload = JSON.parse(snapshot.payloadJson);
        if (currentRecord) {
            // Guard against overwriting an unrelated save session with a different saveId
            if (currentRecord['saveId'] &&
                snapshotPayload['saveId'] &&
                currentRecord['saveId'] !== snapshotPayload['saveId']) {
                throw new SnapshotRestorationConflictError(slotName, `Slot currently contains an unrelated save session (current saveId: "${currentRecord['saveId']}", snapshot saveId: "${snapshotPayload['saveId']}").`);
            }
            // Guard against overwriting a newer save session from subsequent gameplay after migration
            const hasNewerGameplay = currentRecord['saveSchemaVersion'] === CURRENT_SAVE_SCHEMA_VERSION &&
                Array.isArray(currentRecord['ledger']) &&
                Array.isArray(snapshotPayload['ledger']) &&
                currentRecord['ledger'].length > snapshotPayload['ledger'].length;
            if (hasNewerGameplay) {
                throw new SnapshotRestorationConflictError(slotName, `Slot currently contains newer gameplay saved after migration (current ledger transactions: ${currentRecord['ledger'].length}, snapshot ledger: ${snapshotPayload['ledger'].length}).`);
            }
        }
        await this._adapter.saveRecord(slotName, snapshotPayload);
        return snapshotPayload;
    }
    /**
     * Loads a save envelope and hydrates a pure GameCoreEngine instance.
     */
    async restoreEngine(slotName) {
        const envelope = await this.loadSave(slotName);
        return GameCoreEngine.fromSaveEnvelope(envelope);
    }
    /**
     * Checks whether a save slot exists.
     */
    async hasSave(slotName) {
        try {
            const record = await this._adapter.loadRecord(slotName);
            return record !== null && record !== undefined;
        }
        catch {
            return false;
        }
    }
    /**
     * Lists all existing save slots and metadata.
     */
    async listSlots() {
        return this._adapter.listSlots();
    }
    /**
     * Deletes a save slot by name.
     */
    async deleteSlot(slotName) {
        return this._adapter.deleteRecord(slotName);
    }
    /**
     * Exports a save slot to a JSON string.
     */
    async exportSaveToJson(slotName, pretty = true) {
        const envelope = await this.loadSave(slotName);
        return JSON.stringify(envelope, null, pretty ? 2 : undefined);
    }
    /**
     * Imports a save from a JSON string into a designated save slot.
     * Validates version, structure, and integrity before writing.
     */
    async importSaveFromJson(jsonString, targetSlotName) {
        let parsed;
        try {
            parsed = JSON.parse(jsonString);
        }
        catch (e) {
            throw new SaveSystemError(`Failed to parse save JSON: ${e.message}`);
        }
        if (parsed === null || typeof parsed !== 'object') {
            throw new InvalidSaveSchemaError('Imported save payload must be a JSON object.');
        }
        const payload = parsed;
        const destinationSlot = targetSlotName ?? payload['slotName'] ?? 'ImportedSave';
        payload['slotName'] = destinationSlot;
        // Handle migrations if older version
        const version = this._migrationPipeline.inspectSchemaVersion(payload);
        let finalPayload = payload;
        if (version < CURRENT_SAVE_SCHEMA_VERSION) {
            const { data: migrated } = await this._migrationPipeline.migrateToTarget(payload, CURRENT_SAVE_SCHEMA_VERSION);
            finalPayload = migrated;
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
//# sourceMappingURL=save-orchestrator.js.map