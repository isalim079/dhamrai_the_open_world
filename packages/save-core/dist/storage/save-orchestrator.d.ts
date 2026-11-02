/**
 * Dhamrai Life — Save Orchestrator
 * ==================================
 * High-level save manager coordinating domain engine serialization,
 * Zod validation, SHA-256 integrity verification, schema migrations,
 * pre-migration snapshot isolation, and storage adapters.
 */
import { SaveEnvelopeV2 } from '@dhamrai/shared-contracts';
import { GameCoreEngine } from '@dhamrai/game-core';
import { SchemaMigrationPipeline } from '../migrations/migration-pipeline.js';
import { ISaveStorageAdapter, MigrationSnapshotRecord, SaveSlotMetadata } from '../types.js';
export declare class SaveOrchestrator {
    private readonly _adapter;
    private readonly _migrationPipeline;
    constructor(adapter: ISaveStorageAdapter, migrationPipeline?: SchemaMigrationPipeline);
    get adapter(): ISaveStorageAdapter;
    get migrationPipeline(): SchemaMigrationPipeline;
    /**
     * Initializes the underlying storage adapter.
     */
    init(): Promise<void>;
    /**
     * Serializes current domain engine state, validates against Zod V2 schema,
     * computes SHA-256 checksum, and writes atomically to storage.
     */
    saveEngine(slotName: string, engine: GameCoreEngine, saveId?: string): Promise<SaveEnvelopeV2>;
    /**
     * Loads a save envelope by slot name.
     * Performs version inspection, pre-migration snapshot isolation (if older version),
     * sequential schema migration (e.g. V1 -> V2), Zod schema validation, and SHA-256 integrity verification.
     */
    loadSave(slotName: string): Promise<SaveEnvelopeV2>;
    /**
     * Retrieves the latest pre-migration backup snapshot for a given slot, if any exists.
     */
    getLatestMigrationSnapshot(slotName: string): Promise<MigrationSnapshotRecord | null>;
    /**
     * Restores a save slot directly from its latest pre-migration snapshot.
     * Enforces that restoration cannot overwrite an unrelated save (different saveId)
     * or a newer save from subsequent gameplay after migration.
     */
    restoreFromSnapshot(slotName: string): Promise<unknown | null>;
    /**
     * Loads a save envelope and hydrates a pure GameCoreEngine instance.
     */
    restoreEngine(slotName: string): Promise<GameCoreEngine>;
    /**
     * Checks whether a save slot exists.
     */
    hasSave(slotName: string): Promise<boolean>;
    /**
     * Lists all existing save slots and metadata.
     */
    listSlots(): Promise<SaveSlotMetadata[]>;
    /**
     * Deletes a save slot by name.
     */
    deleteSlot(slotName: string): Promise<boolean>;
    /**
     * Exports a save slot to a JSON string.
     */
    exportSaveToJson(slotName: string, pretty?: boolean): Promise<string>;
    /**
     * Imports a save from a JSON string into a designated save slot.
     * Validates version, structure, and integrity before writing.
     */
    importSaveFromJson(jsonString: string, targetSlotName?: string): Promise<SaveEnvelopeV2>;
}
//# sourceMappingURL=save-orchestrator.d.ts.map