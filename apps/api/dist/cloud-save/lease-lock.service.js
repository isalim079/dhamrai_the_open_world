/**
 * Dhamrai Life — Cloud Save Optimistic Concurrency Lease Lock Manager
 * ====================================================================
 * Manages distributed lease locks for cloud save synchronization to prevent
 * mid-air collisions and concurrent save overwrites across multiple browser
 * tabs or devices.
 */
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Injectable, ConflictException } from '@nestjs/common';
import * as crypto from 'crypto';
let LeaseLockService = class LeaseLockService {
    _leases = new Map(); // key: `${userId}:${slotName}`
    _latestSaveVersions = new Map(); // key: `${userId}:${slotName}`, val: updatedAtIso/checksum
    _defaultTtlMs = 30_000; // 30 seconds lease timeout
    /**
     * Acquires a lease lock for a user and slot.
     * Throws ConflictException if a non-expired lease is already held by another client.
     */
    acquireLease(userId, slotName, clientLeaseToken, expectedVersion, ttlMs = this._defaultTtlMs) {
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
            throw new ConflictException(`Cloud save slot "${slotName}" is currently locked by another active session. Lease expires in ${Math.ceil((existing.expiresAtMs - now) / 1000)}s.`);
        }
        // Check version collision: if expectedVersion was specified, ensure it matches the latest known version
        if (expectedVersion) {
            const latestVersion = this._latestSaveVersions.get(key);
            if (latestVersion && latestVersion !== expectedVersion) {
                throw new ConflictException(`Concurrent modification detected on slot "${slotName}". Expected version "${expectedVersion}", but remote version is "${latestVersion}". Please reload the cloud save first.`);
            }
        }
        const leaseToken = clientLeaseToken || `lease_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
        const lease = {
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
    verifyLease(userId, slotName, leaseToken) {
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
    commitVersionAndRelease(userId, slotName, leaseToken, newVersion) {
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
    releaseLease(userId, slotName, leaseToken) {
        const key = this.buildKey(userId, slotName);
        const lease = this._leases.get(key);
        if (!lease)
            return;
        if (!leaseToken || lease.leaseToken === leaseToken) {
            this._leases.delete(key);
        }
    }
    getKnownVersion(userId, slotName) {
        return this._latestSaveVersions.get(this.buildKey(userId, slotName)) ?? null;
    }
    setKnownVersion(userId, slotName, version) {
        this._latestSaveVersions.set(this.buildKey(userId, slotName), version);
    }
    clearAll() {
        this._leases.clear();
        this._latestSaveVersions.clear();
    }
    buildKey(userId, slotName) {
        return `${userId}:${slotName}`;
    }
};
LeaseLockService = __decorate([
    Injectable()
], LeaseLockService);
export { LeaseLockService };
//# sourceMappingURL=lease-lock.service.js.map