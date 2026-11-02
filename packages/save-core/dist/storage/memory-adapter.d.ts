/**
 * Dhamrai Life — In-Memory Persistence Adapter
 * =============================================
 * Fast, pure in-memory implementation of ISaveStorageAdapter for unit tests and fallback.
 */
import { SaveEnvelopeV2 } from '@dhamrai/shared-contracts';
import { ISaveStorageAdapter, MigrationSnapshotRecord, SaveSlotMetadata } from '../types.js';
export declare class MemoryStorageAdapter implements ISaveStorageAdapter {
    private readonly _saves;
    private readonly _snapshots;
    init(): Promise<void>;
    close(): Promise<void>;
    saveRecord(slotName: string, envelope: SaveEnvelopeV2): Promise<void>;
    loadRecord(slotName: string): Promise<unknown | null>;
    listSlots(): Promise<SaveSlotMetadata[]>;
    deleteRecord(slotName: string): Promise<boolean>;
    saveMigrationSnapshot(snapshot: MigrationSnapshotRecord): Promise<void>;
    getLatestMigrationSnapshot(slotName: string): Promise<MigrationSnapshotRecord | null>;
    getMigrationSnapshots(slotName: string): Promise<MigrationSnapshotRecord[]>;
    saveMigratedRecordWithSnapshot(slotName: string, snapshot: MigrationSnapshotRecord, migratedEnvelope: SaveEnvelopeV2): Promise<void>;
    clearAll(): Promise<void>;
}
//# sourceMappingURL=memory-adapter.d.ts.map