/**
 * Dhamrai Life — Cloud Save Optimistic Concurrency Lease Lock Manager
 * ====================================================================
 * Manages distributed lease locks for cloud save synchronization to prevent
 * mid-air collisions and concurrent save overwrites across multiple browser
 * tabs or devices.
 */

import { Injectable, ConflictException } from '@nestjs/common';
import * as crypto from 'crypto';

export interface SaveLease {
  leaseToken: string;
  userId: string;
  slotName: string;
  acquiredAtMs: number;
  expiresAtMs: number;
  expectedVersion?: string; // e.g. previous updatedAtIso or checksum
}

@Injectable()
export class LeaseLockService {
  private readonly _leases: Map<string, SaveLease> = new Map(); // key: `${userId}:${slotName}`
  private readonly _latestSaveVersions: Map<string, string> = new Map(); // key: `${userId}:${slotName}`, val: updatedAtIso/checksum
  private readonly _defaultTtlMs: number = 30_000; // 30 seconds lease timeout

  /**
   * Acquires a lease lock for a user and slot.
   * Throws ConflictException if a non-expired lease is already held by another client.
   */
  public acquireLease(
    userId: string,
    slotName: string,
    clientLeaseToken?: string,
    expectedVersion?: string,
    ttlMs: number = this._defaultTtlMs
  ): SaveLease {
    const key = this.buildKey(userId, slotName);
    const now = Date.now();
    const existing = this._leases.get(key);

    // If existing lease is still active
    if (existing && existing.expiresAtMs > now) {
      if (clientLeaseToken && existing.leaseToken === clientLeaseToken) {
        // Renewal by the same lease holder
        existing.expiresAtMs = now + ttlMs;
        return { ...existing };
      }
      throw new ConflictException(
        `Cloud save slot "${slotName}" is currently locked by another active session. Lease expires in ${Math.ceil(
          (existing.expiresAtMs - now) / 1000
        )}s.`
      );
    }

    // Check version collision: if expectedVersion was specified, ensure it matches the latest known version
    if (expectedVersion) {
      const latestVersion = this._latestSaveVersions.get(key);
      if (latestVersion && latestVersion !== expectedVersion) {
        throw new ConflictException(
          `Concurrent modification detected on slot "${slotName}". Expected version "${expectedVersion}", but remote version is "${latestVersion}". Please reload the cloud save first.`
        );
      }
    }

    const leaseToken = clientLeaseToken || `lease_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
    const lease: SaveLease = {
      leaseToken,
      userId,
      slotName,
      acquiredAtMs: now,
      expiresAtMs: now + ttlMs,
      expectedVersion,
    };

    this._leases.set(key, lease);
    return { ...lease };
  }

  /**
   * Verifies whether a given lease token is currently valid and active for the user slot.
   */
  public verifyLease(userId: string, slotName: string, leaseToken?: string): boolean {
    const key = this.buildKey(userId, slotName);
    const now = Date.now();
    const lease = this._leases.get(key);

    if (!lease || lease.expiresAtMs <= now) {
      // If no lease exists or expired, allow write if no lease was required, but if token was passed it must match
      return !leaseToken || (lease !== undefined && lease.leaseToken === leaseToken);
    }

    return lease.leaseToken === leaseToken;
  }

  /**
   * Commits an updated version and releases the lease lock atomically.
   */
  public commitVersionAndRelease(
    userId: string,
    slotName: string,
    leaseToken?: string,
    newVersion?: string
  ): void {
    const key = this.buildKey(userId, slotName);
    const now = Date.now();
    const lease = this._leases.get(key);

    if (lease && lease.expiresAtMs > now && leaseToken && lease.leaseToken !== leaseToken) {
      throw new ConflictException(`Cannot commit save: lease token mismatch for slot "${slotName}".`);
    }

    if (newVersion) {
      this._latestSaveVersions.set(key, newVersion);
    }

    this._leases.delete(key);
  }

  /**
   * Explicitly releases a lease lock without committing.
   */
  public releaseLease(userId: string, slotName: string, leaseToken?: string): void {
    const key = this.buildKey(userId, slotName);
    const lease = this._leases.get(key);
    if (!lease) return;

    if (!leaseToken || lease.leaseToken === leaseToken) {
      this._leases.delete(key);
    }
  }

  public getKnownVersion(userId: string, slotName: string): string | null {
    return this._latestSaveVersions.get(this.buildKey(userId, slotName)) ?? null;
  }

  public setKnownVersion(userId: string, slotName: string, version: string): void {
    this._latestSaveVersions.set(this.buildKey(userId, slotName), version);
  }

  public clearAll(): void {
    this._leases.clear();
    this._latestSaveVersions.clear();
  }

  private buildKey(userId: string, slotName: string): string {
    return `${userId}:${slotName}`;
  }
}
