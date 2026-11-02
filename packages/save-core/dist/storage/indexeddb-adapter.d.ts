/**
 * Dhamrai Life — Dexie / IndexedDB Persistence Adapter
 * =====================================================
 * Transactional, local persistence for save slots and pre-migration backup snapshots.
 */
import { Dexie, type Table } from 'dexie';
import { SaveEnvelopeV2, CurrencyCode } from '@dhamrai/shared-contracts';
import { ISaveStorageAdapter, MigrationSnapshotRecord, SaveSlotMetadata } from '../types.js';
interface SaveSlotEntity {
    slotName: string;
    saveId: string;
    saveSchemaVersion: number;
    createdAtIso: string;
    updatedAtIso: string;
    cashMinorUnits: number;
    currency: CurrencyCode;
    reputation: number;
    missionsCompletedCount: number;
    checksumSha256: string;
    payloadJson: string;
}
export declare class DhamraiSaveDatabase extends Dexie {
    saves: Table<SaveSlotEntity, string>;
    migrationSnapshots: Table<MigrationSnapshotRecord, string>;
    constructor(dbName?: string);
}
export declare class IndexedDBStorageAdapter implements ISaveStorageAdapter {
    private readonly _db;
    constructor(dbName?: string);
    init(): Promise<void>;
    close(): Promise<void>;
    saveRecord(slotName: string, envelope: SaveEnvelopeV2): Promise<void>;
    loadRecord(slotName: string): Promise<unknown | null>;
    listSlots(): Promise<SaveSlotMetadata[]>;
    deleteRecord(slotName: string): Promise<boolean>;
    saveMigrationSnapshot(snapshot: MigrationSnapshotRecord): Promise<void>;
    getLatestMigrationSnapshot(slotName: string): Promise<MigrationSnapshotRecord | null>;
    getMigrationSnapshots(slotName: string): Promise<MigrationSnapshotRecord[]>;
    /**
     * Commits a pre-migration snapshot and the migrated save record in a single atomic database transaction.
     * If any error occurs during the transaction, both operations are rolled back completely.
     */
    saveMigratedRecordWithSnapshot(slotName: string, snapshot: MigrationSnapshotRecord, migratedEnvelope: SaveEnvelopeV2): Promise<void>;
    clearAll(): Promise<void>;
}
export {};
//# sourceMappingURL=indexeddb-adapter.d.ts.map