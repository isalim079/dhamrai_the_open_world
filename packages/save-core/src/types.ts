/**
 * Dhamrai Life — Save Core Types & Constants
 * ============================================
 */

import { SaveEnvelopeV2, CurrencyCode } from '@dhamrai/shared-contracts';

export const CURRENT_SAVE_SCHEMA_VERSION = 2;
export const MIN_SUPPORTED_SAVE_SCHEMA_VERSION = 1;

export interface SaveSlotMetadata {
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
}

export interface MigrationSnapshotRecord {
  id: string;
  slotName: string;
  originalVersion: number;
  payloadJson: string;
  createdAtIso: string;
}

export interface ISaveStorageAdapter {
  init(): Promise<void>;
  close(): Promise<void>;
  saveRecord(slotName: string, envelope: SaveEnvelopeV2): Promise<void>;
  loadRecord(slotName: string): Promise<unknown | null>;
  listSlots(): Promise<SaveSlotMetadata[]>;
  deleteRecord(slotName: string): Promise<boolean>;
  saveMigrationSnapshot(snapshot: MigrationSnapshotRecord): Promise<void>;
  getLatestMigrationSnapshot(slotName: string): Promise<MigrationSnapshotRecord | null>;
  getMigrationSnapshots(slotName: string): Promise<MigrationSnapshotRecord[]>;
  saveMigratedRecordWithSnapshot(
    slotName: string,
    snapshot: MigrationSnapshotRecord,
    migratedEnvelope: SaveEnvelopeV2
  ): Promise<void>;
  clearAll(): Promise<void>;
}
