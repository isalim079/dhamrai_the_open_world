/**
 * Dhamrai Life — Cloud Save Optimistic Concurrency Lease Lock Manager
 * ====================================================================
 * Manages distributed lease locks for cloud save synchronization to prevent
 * mid-air collisions and concurrent save overwrites across multiple browser
 * tabs or devices.
 */
export interface SaveLease {
    leaseToken: string;
    userId: string;
    slotName: string;
    acquiredAtMs: number;
    expiresAtMs: number;
    expectedVersion?: string;
}
export declare class LeaseLockService {
    private readonly _leases;
    private readonly _latestSaveVersions;
    private readonly _defaultTtlMs;
    /**
     * Acquires a lease lock for a user and slot.
     * Throws ConflictException if a non-expired lease is already held by another client.
     */
    acquireLease(userId: string, slotName: string, clientLeaseToken?: string, expectedVersion?: string, ttlMs?: number): SaveLease;
    /**
     * Verifies whether a given lease token is currently valid and active for the user slot.
     */
    verifyLease(userId: string, slotName: string, leaseToken?: string): boolean;
    /**
     * Commits an updated version and releases the lease lock atomically.
     */
    commitVersionAndRelease(userId: string, slotName: string, leaseToken?: string, newVersion?: string): void;
    /**
     * Explicitly releases a lease lock without committing.
     */
    releaseLease(userId: string, slotName: string, leaseToken?: string): void;
    getKnownVersion(userId: string, slotName: string): string | null;
    setKnownVersion(userId: string, slotName: string, version: string): void;
    clearAll(): void;
    private buildKey;
}
//# sourceMappingURL=lease-lock.service.d.ts.map