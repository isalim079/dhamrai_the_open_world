import { describe, it, expect, vi, afterEach } from 'vitest';
import { LeaseLockService } from '../src/index.js';
import { ConflictException } from '@nestjs/common';
import { createPostgresClient } from '../src/database/database.module.js';

afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); });
describe('Lease unit tests (process-local; no distributed correctness claim)', () => {
  it('requires matching owner, active expiry and a current version at commit', async () => {
    const s = new LeaseLockService();
    const l = await s.acquireLease('u','slot');
    expect(await s.verifyLease('u','slot')).toBe(false);
    await expect(s.commitVersionAndRelease('u','slot',undefined,'v1')).rejects.toThrow(ConflictException);
    await expect(s.commitVersionAndRelease('u','slot','wrong','v1')).rejects.toThrow(ConflictException);
    await s.commitVersionAndRelease('u','slot',l.leaseToken,'v1','file1');
    await expect(s.acquireLease('u','slot')).rejects.toThrow(ConflictException);
    await expect(s.acquireLease('u','slot',undefined,'stale')).rejects.toThrow(ConflictException);
    const next=await s.acquireLease('u','slot',undefined,'v1');
    await expect(s.commitVersionAndRelease('u','slot',l.leaseToken,'v2')).rejects.toThrow(ConflictException);
    expect(await s.verifyLease('u','slot',next.leaseToken)).toBe(true);
    expect(await s.getCommittedSave('u','slot')).toEqual({fileName:'file1',version:'v1'});
  });
  it('reclaims expired leases with a fresh server token and fences the old owner', async () => {
    vi.useFakeTimers();
    const s=new LeaseLockService(); const a=await s.acquireLease('u','s',undefined,undefined,10);
    vi.advanceTimersByTime(11);
    expect(await s.verifyLease('u','s',a.leaseToken)).toBe(false);
    await expect(s.commitVersionAndRelease('u','s',a.leaseToken,'v')).rejects.toThrow(ConflictException);
    const b=await s.acquireLease('u','s',a.leaseToken);
    expect(b.leaseToken).not.toBe(a.leaseToken);
    await s.releaseLease('u','s',a.leaseToken);
    expect(await s.verifyLease('u','s',b.leaseToken)).toBe(true);
  });
  it('renews only a matching active owner and rejects invalid TTLs', async () => {
    const s=new LeaseLockService(); const a=await s.acquireLease('u','s');
    const b=await s.acquireLease('u','s',a.leaseToken,undefined,60000);
    expect(b.leaseToken).toBe(a.leaseToken);
    await expect(s.acquireLease('u','s','wrong')).rejects.toThrow(ConflictException);
    for(const ttl of [-1,0,Infinity,120001]) await expect(s.acquireLease('u','t',undefined,undefined,ttl)).rejects.toThrow();
  });
  it('production without PostgreSQL refuses local locking or repository fallback', async () => {
    vi.stubEnv('NODE_ENV','production'); vi.stubEnv('DATABASE_URL','');
    expect(() => new LeaseLockService()).toThrow('PostgreSQL');
    await expect(createPostgresClient()).rejects.toThrow('PostgreSQL');
  });
  it('database errors propagate; no process-local fallback is used', async () => {
    vi.stubEnv('NODE_ENV','production');
    const query=vi.fn().mockRejectedValue(new Error('database offline'));
    const s=new LeaseLockService({query});
    await expect(s.acquireLease('u','s')).rejects.toThrow('database offline');
    await expect(s.commitVersionAndRelease('u','s','token','v')).rejects.toThrow('database offline');
    await expect(s.verifyLease('u','s','token')).rejects.toThrow('database offline');
    await expect(s.getCommittedSave('u','s')).rejects.toThrow('database offline');
  });
});
describe('SQL contract unit tests (query mocks; NOT real PostgreSQL)', () => {
  it('acquisition uses conditional ON CONFLICT and DB time, with no read-before-write', async () => {
    const query=vi.fn().mockResolvedValue({rows:[],rowCount:0});
    await expect(new LeaseLockService({query}).acquireLease('u','s')).rejects.toThrow(ConflictException);
    const sql=query.mock.calls[0]![0] as string;
    expect(sql).toContain('ON CONFLICT (key) DO UPDATE');
    expect(sql).toContain('clock_timestamp()');
    expect(sql).toContain('IS NOT DISTINCT FROM');
    expect(query).toHaveBeenCalledTimes(1);
  });
  it('commit tests owner, expiry and expected version in the same UPDATE', async () => {
    const query=vi.fn().mockResolvedValue({rows:[],rowCount:0});
    await expect(new LeaseLockService({query}).commitVersionAndRelease('u','s','t','v')).rejects.toThrow(ConflictException);
    const sql=query.mock.calls[0]![0] as string;
    expect(sql).toContain('lease_token=$2'); expect(sql).toContain('expires_at_ms >');
    expect(sql).toContain('known_version IS NOT DISTINCT FROM expected_version');
    expect(query).toHaveBeenCalledTimes(1);
  });
});
