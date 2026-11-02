/**
 * Dhamrai Life — Dexie / IndexedDB Persistence Adapter
 * =====================================================
 * Transactional, local persistence for save slots and pre-migration backup snapshots.
 */
import { Dexie } from 'dexie';
import { CURRENCY_CODE_BDT } from '@dhamrai/shared-contracts';
export class DhamraiSaveDatabase extends Dexie {
    saves;
    migrationSnapshots;
    constructor(dbName = 'DhamraiLifeSaveDB') {
        super(dbName);
        this.version(1).stores({
            saves: 'slotName, saveId, saveSchemaVersion, updatedAtIso',
            migrationSnapshots: 'id, slotName, originalVersion, createdAtIso',
        });
    }
}
export class IndexedDBStorageAdapter {
    _db;
    constructor(dbName = 'DhamraiLifeSaveDB') {
        this._db = new DhamraiSaveDatabase(dbName);
    }
    async init() {
        if (!this._db.isOpen()) {
            await this._db.open();
        }
    }
    async close() {
        if (this._db.isOpen()) {
            this._db.close();
        }
    }
    async saveRecord(slotName, envelope) {
        await this.init();
        const completedMissionsCount = Object.values(envelope.missions).filter((m) => m.state === 'COMPLETED').length;
        const entity = {
            slotName,
            saveId: envelope.saveId,
            saveSchemaVersion: envelope.saveSchemaVersion,
            createdAtIso: envelope.createdAtIso,
            updatedAtIso: envelope.updatedAtIso,
            cashMinorUnits: envelope.player.cashMinorUnits,
            currency: envelope.player.currency ?? CURRENCY_CODE_BDT,
            reputation: envelope.player.reputation,
            missionsCompletedCount: completedMissionsCount,
            checksumSha256: envelope.checksumSha256,
            payloadJson: JSON.stringify(envelope),
        };
        await this._db.saves.put(entity);
    }
    async loadRecord(slotName) {
        await this.init();
        const entity = await this._db.saves.get(slotName);
        if (!entity) {
            return null;
        }
        return JSON.parse(entity.payloadJson);
    }
    async listSlots() {
        await this.init();
        const entities = await this._db.saves.toArray();
        return entities.map((e) => ({
            slotName: e.slotName,
            saveId: e.saveId,
            saveSchemaVersion: e.saveSchemaVersion,
            createdAtIso: e.createdAtIso,
            updatedAtIso: e.updatedAtIso,
            cashMinorUnits: e.cashMinorUnits,
            currency: e.currency ?? CURRENCY_CODE_BDT,
            reputation: e.reputation,
            missionsCompletedCount: e.missionsCompletedCount,
            checksumSha256: e.checksumSha256,
        }));
    }
    async deleteRecord(slotName) {
        await this.init();
        const exists = await this._db.saves.get(slotName);
        if (!exists) {
            return false;
        }
        await this._db.transaction('rw', [this._db.saves, this._db.migrationSnapshots], async () => {
            await this._db.saves.delete(slotName);
            await this._db.migrationSnapshots.where('slotName').equals(slotName).delete();
        });
        return true;
    }
    async saveMigrationSnapshot(snapshot) {
        await this.init();
        await this._db.migrationSnapshots.put(snapshot);
    }
    async getLatestMigrationSnapshot(slotName) {
        await this.init();
        const matches = await this._db.migrationSnapshots
            .where('slotName')
            .equals(slotName)
            .reverse()
            .sortBy('createdAtIso');
        return matches[0] ?? null;
    }
    async getMigrationSnapshots(slotName) {
        await this.init();
        return this._db.migrationSnapshots
            .where('slotName')
            .equals(slotName)
            .sortBy('createdAtIso');
    }
    /**
     * Commits a pre-migration snapshot and the migrated save record in a single atomic database transaction.
     * If any error occurs during the transaction, both operations are rolled back completely.
     */
    async saveMigratedRecordWithSnapshot(slotName, snapshot, migratedEnvelope) {
        await this.init();
        await this._db.transaction('rw', [this._db.saves, this._db.migrationSnapshots], async () => {
            await this._db.migrationSnapshots.put(snapshot);
            const completedMissionsCount = Object.values(migratedEnvelope.missions).filter((m) => m.state === 'COMPLETED').length;
            const entity = {
                slotName,
                saveId: migratedEnvelope.saveId,
                saveSchemaVersion: migratedEnvelope.saveSchemaVersion,
                createdAtIso: migratedEnvelope.createdAtIso,
                updatedAtIso: migratedEnvelope.updatedAtIso,
                cashMinorUnits: migratedEnvelope.player.cashMinorUnits,
                currency: migratedEnvelope.player.currency ?? CURRENCY_CODE_BDT,
                reputation: migratedEnvelope.player.reputation,
                missionsCompletedCount: completedMissionsCount,
                checksumSha256: migratedEnvelope.checksumSha256,
                payloadJson: JSON.stringify(migratedEnvelope),
            };
            await this._db.saves.put(entity);
        });
    }
    async clearAll() {
        await this.init();
        await this._db.transaction('rw', [this._db.saves, this._db.migrationSnapshots], async () => {
            await this._db.saves.clear();
            await this._db.migrationSnapshots.clear();
        });
    }
}
//# sourceMappingURL=indexeddb-adapter.js.map