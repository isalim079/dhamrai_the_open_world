import { IPgClient } from '../database/postgres-user.repository.js';
export interface SaveLease {
    leaseToken: string;
    userId: string;
    slotName: string;
    acquiredAtMs: number;
    expiresAtMs: number;
    expectedVersion?: string;
}
export declare const SAVE_LEASE_TABLE_SCHEMA_SQL = "\nCREATE TABLE IF NOT EXISTS save_leases (\n  key TEXT PRIMARY KEY, user_id VARCHAR(64) NOT NULL, slot_name VARCHAR(64) NOT NULL,\n  lease_token VARCHAR(128) NOT NULL, acquired_at_ms BIGINT NOT NULL, expires_at_ms BIGINT NOT NULL,\n  expected_version VARCHAR(255), known_version VARCHAR(255), committed_file_name TEXT,\n  updated_at_iso TIMESTAMPTZ NOT NULL DEFAULT NOW()\n);\nALTER TABLE save_leases ADD COLUMN IF NOT EXISTS committed_file_name TEXT;\n";
export declare class LeaseLockService {
    private readonly db?;
    private readonly leases;
    private readonly versions;
    private readonly files;
    constructor(db?: IPgClient | undefined);
    private requireStore;
    private key;
    private conflict;
    acquireLease(userId: string, slotName: string, clientLeaseToken?: string, expectedVersion?: string, ttlMs?: number): Promise<SaveLease>;
    verifyLease(userId: string, slotName: string, leaseToken?: string): Promise<boolean>;
    commitVersionAndRelease(userId: string, slotName: string, leaseToken?: string, newVersion?: string, committedFileName?: string): Promise<void>;
    releaseLease(userId: string, slotName: string, leaseToken?: string): Promise<void>;
    getKnownVersion(userId: string, slotName: string): Promise<string | null>;
    getCommittedSave(userId: string, slotName: string): Promise<{
        fileName: string;
        version: string;
    } | null>;
    setKnownVersion(userId: string, slotName: string, version: string): Promise<void>;
    clearAll(): Promise<void>;
}
//# sourceMappingURL=lease-lock.service.d.ts.map