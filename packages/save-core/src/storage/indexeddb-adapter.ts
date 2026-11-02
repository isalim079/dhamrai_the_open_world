/**
 * Dhamrai Life — Dexie / IndexedDB Persistence Adapter
 * =====================================================
 * Transactional, local persistence for save slots and pre-migration backup snapshots.
 */

import { Dexie, type Table } from 'dexie';
import { SaveEnvelopeV2, CURRENCY_CODE_BDT, CurrencyCode } from '@dhamrai/shared-contracts';
import {
  ISaveStorageAdapter,
  MigrationSnapshotRecord,
  SaveSlotMetadata,
} from '../types.js';

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

export class DhamraiSaveDatabase extends Dexie {
  public saves!: Table<SaveSlotEntity, string>;
  public migrationSnapshots!: Table<MigrationSnapshotRecord, string>;

  constructor(dbName: string = 'DhamraiLifeSaveDB') {
    super(dbName);
    this.version(1).stores({
      saves: 'slotName, saveId, saveSchemaVersion, updatedAtIso',
      migrationSnapshots: 'id, slotName, originalVersion, createdAtIso',
    });
  }
}

export class IndexedDBStorageAdapter implements ISaveStorageAdapter {
  private readonly _db: DhamraiSaveDatabase;

  constructor(dbName: string = 'DhamraiLifeSaveDB') {
    this._db = new DhamraiSaveDatabase(dbName);
  }

  public async init(): Promise<void> {
    if (!this._db.isOpen()) {
      await this._db.open();
    }
  }

  public async close(): Promise<void> {
    if (this._db.isOpen()) {
      this._db.close();
    }
  }

  public async saveRecord(slotName: string, envelope: SaveEnvelopeV2): Promise<void> {
    await this.init();

    const completedMissionsCount = Object.values(envelope.missions).filter(
      (m) => m.state === 'COMPLETED'
    ).length;

    const entity: SaveSlotEntity = {
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

  public async loadRecord(slotName: string): Promise<unknown | null> {
    await this.init();
    const entity = await this._db.saves.get(slotName);
    if (!entity) {
      return null;
    }
    return JSON.parse(entity.payloadJson);
  }

  public async listSlots(): Promise<SaveSlotMetadata[]> {
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

  public async deleteRecord(slotName: string): Promise<boolean> {
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

  public async saveMigrationSnapshot(snapshot: MigrationSnapshotRecord): Promise<void> {
    await this.init();
    await this._db.migrationSnapshots.put(snapshot);
  }

  public async getLatestMigrationSnapshot(slotName: string): Promise<MigrationSnapshotRecord | null> {
    await this.init();
    const matches = await this._db.migrationSnapshots
      .where('slotName')
      .equals(slotName)
      .reverse()
      .sortBy('createdAtIso');
    return matches[0] ?? null;
  }

  public async getMigrationSnapshots(slotName: string): Promise<MigrationSnapshotRecord[]> {
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
  public async saveMigratedRecordWithSnapshot(
    slotName: string,
    snapshot: MigrationSnapshotRecord,
    migratedEnvelope: SaveEnvelopeV2
  ): Promise<void> {
    await this.init();
    await this._db.transaction('rw', [this._db.saves, this._db.migrationSnapshots], async () => {
      await this._db.migrationSnapshots.put(snapshot);

      const completedMissionsCount = Object.values(migratedEnvelope.missions).filter(
        (m) => m.state === 'COMPLETED'
      ).length;

      const entity: SaveSlotEntity = {
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

  public async clearAll(): Promise<void> {
    await this.init();
    await this._db.transaction('rw', [this._db.saves, this._db.migrationSnapshots], async () => {
      await this._db.saves.clear();
      await this._db.migrationSnapshots.clear();
    });
  }
}
