/**
 * Dhamrai Life — In-Memory Persistence Adapter
 * =============================================
 * Fast, pure in-memory implementation of ISaveStorageAdapter for unit tests and fallback.
 */

import { SaveEnvelopeV2, CURRENCY_CODE_BDT } from '@dhamrai/shared-contracts';
import {
  ISaveStorageAdapter,
  MigrationSnapshotRecord,
  SaveSlotMetadata,
} from '../types.js';

export class MemoryStorageAdapter implements ISaveStorageAdapter {
  private readonly _saves = new Map<string, string>();
  private readonly _snapshots: MigrationSnapshotRecord[] = [];

  public async init(): Promise<void> {}
  public async close(): Promise<void> {}

  public async saveRecord(slotName: string, envelope: SaveEnvelopeV2): Promise<void> {
    this._saves.set(slotName, JSON.stringify(envelope));
  }

  public async loadRecord(slotName: string): Promise<unknown | null> {
    const json = this._saves.get(slotName);
    if (!json) {
      return null;
    }
    return JSON.parse(json);
  }

  public async listSlots(): Promise<SaveSlotMetadata[]> {
    const results: SaveSlotMetadata[] = [];
    for (const [slotName, json] of this._saves.entries()) {
      const envelope = JSON.parse(json) as SaveEnvelopeV2;
      const completedCount = Object.values(envelope.missions ?? {}).filter(
        (m) => m.state === 'COMPLETED'
      ).length;

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

  public async deleteRecord(slotName: string): Promise<boolean> {
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

  public async saveMigrationSnapshot(snapshot: MigrationSnapshotRecord): Promise<void> {
    this._snapshots.push({ ...snapshot });
  }

  public async getLatestMigrationSnapshot(slotName: string): Promise<MigrationSnapshotRecord | null> {
    const matches = this._snapshots.filter((s) => s.slotName === slotName);
    if (matches.length === 0) {
      return null;
    }
    return matches[matches.length - 1] ?? null;
  }

  public async getMigrationSnapshots(slotName: string): Promise<MigrationSnapshotRecord[]> {
    return this._snapshots.filter((s) => s.slotName === slotName);
  }

  public async saveMigratedRecordWithSnapshot(
    slotName: string,
    snapshot: MigrationSnapshotRecord,
    migratedEnvelope: SaveEnvelopeV2
  ): Promise<void> {
    this._snapshots.push({ ...snapshot });
    this._saves.set(slotName, JSON.stringify(migratedEnvelope));
  }

  public async clearAll(): Promise<void> {
    this._saves.clear();
    this._snapshots.length = 0;
  }
}
