import { describe, it, expect, beforeEach } from 'vitest';
import { ConflictException } from '@nestjs/common';
import { LeaseLockService } from '../src/index.js';

describe('API Cloud Save — Optimistic Concurrency Lease Lock Manager', () => {
  let leaseLockService: LeaseLockService;

  beforeEach(() => {
    leaseLockService = new LeaseLockService();
  });

  it('successfully acquires a lease lock for a user and slot', () => {
    const lease = leaseLockService.acquireLease('usr_001', 'Slot_1', undefined, undefined, 5000);

    expect(lease.leaseToken).toBeDefined();
    expect(lease.userId).toBe('usr_001');
    expect(lease.slotName).toBe('Slot_1');
    expect(lease.expiresAtMs).toBeGreaterThan(Date.now());
  });

  it('allows the same lease holder to renew an active lease', () => {
    const lease1 = leaseLockService.acquireLease('usr_001', 'Slot_1', undefined, undefined, 5000);
    const lease2 = leaseLockService.acquireLease('usr_001', 'Slot_1', lease1.leaseToken, undefined, 10000);

    expect(lease2.leaseToken).toBe(lease1.leaseToken);
    expect(lease2.expiresAtMs).toBeGreaterThan(lease1.expiresAtMs);
  });

  it('rejects concurrent lease acquisition by a different worker while lease is active', () => {
    leaseLockService.acquireLease('usr_001', 'Slot_1', 'client_worker_A', undefined, 10000);

    // Worker B attempts to lock the same slot
    expect(() =>
      leaseLockService.acquireLease('usr_001', 'Slot_1', 'client_worker_B', undefined, 10000)
    ).toThrowError(ConflictException);
  });

  it('permits a new lease once the previous lease has expired', () => {
    // Acquire lease that expires immediately (ttlMs = -1)
    leaseLockService.acquireLease('usr_001', 'Slot_1', 'client_worker_A', undefined, -100);

    // Worker B can now acquire the lease cleanly
    const leaseB = leaseLockService.acquireLease('usr_001', 'Slot_1', 'client_worker_B', undefined, 5000);
    expect(leaseB.leaseToken).toBe('client_worker_B');
  });

  it('detects version collision when expectedVersion does not match remote version', () => {
    leaseLockService.setKnownVersion('usr_001', 'Slot_1', '2026-11-02T12:00:00.000Z');

    // Client expects version "2026-11-01T10:00:00.000Z" (stale/older)
    expect(() =>
      leaseLockService.acquireLease('usr_001', 'Slot_1', undefined, '2026-11-01T10:00:00.000Z')
    ).toThrowError(ConflictException);
  });

  it('updates known version and clears lease upon commitVersionAndRelease', () => {
    const lease = leaseLockService.acquireLease('usr_001', 'Slot_1', undefined, undefined, 5000);

    leaseLockService.commitVersionAndRelease('usr_001', 'Slot_1', lease.leaseToken, '2026-11-02T12:05:00.000Z');

    expect(leaseLockService.getKnownVersion('usr_001', 'Slot_1')).toBe('2026-11-02T12:05:00.000Z');

    // Another client can immediately acquire a fresh lease
    const nextLease = leaseLockService.acquireLease('usr_001', 'Slot_1', 'client_B', '2026-11-02T12:05:00.000Z');
    expect(nextLease.leaseToken).toBe('client_B');
  });

  it('rejects commit when lease token does not match active lease (lease ownership validation)', () => {
    const lease = leaseLockService.acquireLease('usr_001', 'Slot_1', 'authorized_holder', undefined, 10000);

    expect(() =>
      leaseLockService.commitVersionAndRelease('usr_001', 'Slot_1', 'impostor_token', '2026-11-02T12:10:00.000Z')
    ).toThrowError(ConflictException);
  });

  describe('Multi-Instance & Production Concurrency Limitations (Audit Proof)', () => {
    it('demonstrates that process-local in-memory lease locks fail to coordinate across separate API instances', () => {
      // Simulate two independent service instances (e.g. running behind a load balancer or across containers)
      const apiInstanceA = new LeaseLockService();
      const apiInstanceB = new LeaseLockService();

      // Instance A acquires a lease lock for user_001
      const leaseA = apiInstanceA.acquireLease('usr_001', 'Slot_1', 'worker_node_A', undefined, 10000);
      expect(leaseA.leaseToken).toBe('worker_node_A');

      // Instance B receives a concurrent write lease acquisition for the same user and slot.
      // Because state is in-memory and process-local, Instance B has no knowledge of Instance A's lease!
      // In a true distributed lease system, this call on Instance B MUST throw ConflictException.
      // However, because it is process-local, Instance B mistakenly succeeds:
      const leaseB = apiInstanceB.acquireLease('usr_001', 'Slot_1', 'worker_node_B', undefined, 10000);
      expect(leaseB.leaseToken).toBe('worker_node_B');

      // Consequence: Both worker A and worker B now hold conflicting leases simultaneously!
      expect(apiInstanceA.verifyLease('usr_001', 'Slot_1', 'worker_node_A')).toBe(true);
      expect(apiInstanceB.verifyLease('usr_001', 'Slot_1', 'worker_node_B')).toBe(true);

      // This test proves that in-memory lease locking is process-local and is a production blocker for multi-instance deployments.
    });

    it('demonstrates that application restart clears active leases', () => {
      let serviceInstance: LeaseLockService | null = new LeaseLockService();
      serviceInstance.acquireLease('usr_001', 'Slot_1', 'worker_A', undefined, 60000);

      // Simulate container or process restart
      serviceInstance = new LeaseLockService();

      // State is lost on restart; another worker can acquire immediately without waiting for TTL
      const leaseAfterRestart = serviceInstance.acquireLease('usr_001', 'Slot_1', 'worker_B', undefined, 60000);
      expect(leaseAfterRestart.leaseToken).toBe('worker_B');
    });
  });
});
