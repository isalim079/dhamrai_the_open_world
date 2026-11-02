/**
 * Dhamrai Life — In-Memory Persistence Adapter
 * =============================================
 * Fast, pure in-memory implementation of ISaveStorageAdapter for unit tests and fallback.
 */
import { CURRENCY_CODE_BDT } from '@dhamrai/shared-contracts';
export class MemoryStorageAdapter {
    _saves = new Map();
    _snapshots = [];
    async init() { }
    async close() { }
    async saveRecord(slotName, envelope) {
        this._saves.set(slotName, JSON.stringify(envelope));
    }
    async loadRecord(slotName) {
        const json = this._saves.get(slotName);
        if (!json) {
            return null;
        }
        return JSON.parse(json);
    }
    async listSlots() {
        const results = [];
        for (const [slotName, json] of this._saves.entries()) {
            const envelope = JSON.parse(json);
            const completedCount = Object.values(envelope.missions ?? {}).filter((m) => m.state === 'COMPLETED').length;
            results.push({
                slotName,
                saveId: envelope.saveId,
                saveSchemaVersion: envelope.saveSchemaVersion,
                createdAtIso: envelope.createdAtIso,
                updatedAtIso: envelope.updatedAtIso,
                cashMinorUnits: envelope.player?.cashMinorUnits ?? 0,
                currency: envelope.player?.currency ?? CURRENCY_CODE_BDT,
                reputation: envelope.player?.reputation ?? 0,
                missionsCompletedCount: completedCount,
                checksumSha256: envelope.checksumSha256,
            });
        }
        return results;
    }
    async deleteRecord(slotName) {
        const existed = this._saves.delete(slotName);
        if (existed) {
            for (let i = this._snapshots.length - 1; i >= 0; i--) {
                if (this._snapshots[i]?.slotName === slotName) {
                    this._snapshots.splice(i, 1);
                }
            }
        }
        return existed;
    }
    async saveMigrationSnapshot(snapshot) {
        this._snapshots.push({ ...snapshot });
    }
    async getLatestMigrationSnapshot(slotName) {
        const matches = this._snapshots.filter((s) => s.slotName === slotName);
        if (matches.length === 0) {
            return null;
        }
        return matches[matches.length - 1] ?? null;
    }
    async getMigrationSnapshots(slotName) {
        return this._snapshots.filter((s) => s.slotName === slotName);
    }
    async saveMigratedRecordWithSnapshot(slotName, snapshot, migratedEnvelope) {
        this._snapshots.push({ ...snapshot });
        this._saves.set(slotName, JSON.stringify(migratedEnvelope));
    }
    async clearAll() {
        this._saves.clear();
        this._snapshots.length = 0;
    }
}
//# sourceMappingURL=memory-adapter.js.map