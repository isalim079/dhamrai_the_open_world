/** Real database suite. No emulation; requires real PostgreSQL connection. */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { randomUUID } from 'node:crypto';
import { PostgresUserRepository, USER_TABLE_SCHEMA_SQL, IPgClient } from '../src/database/postgres-user.repository.js';
import { LeaseLockService, SAVE_LEASE_TABLE_SCHEMA_SQL } from '../src/cloud-save/lease-lock.service.js';
import { loadEnv } from '../src/config/env.js';

loadEnv();

interface Pool extends IPgClient {end():Promise<void>}
const rawUrl = process.env['TEST_DATABASE_URL'] || process.env['DATABASE_URL'];
// Use direct unpooled connection for Neon if pooler hostname is provided, enabling session-level search_path
const url = rawUrl ? rawUrl.replace('-pooler.', '.') : undefined;

describe.skipIf(!url)('REAL PostgreSQL integration — two independent connection pools', () => {
  let a: Pool, b: Pool, sa: LeaseLockService, sb: LeaseLockService;
  const schema = 'm4_' + randomUUID().replace(/-/g, '');

  beforeAll(async () => {
    const driverName = 'pg';
    const driver = await import(driverName);
    const options = { connectionString: url, max: 1, connectionTimeoutMillis: 5000, options: `-c search_path=${schema}` };
    a = new driver.Pool(options);
    b = new driver.Pool(options);
    await a.query(`CREATE SCHEMA ${schema}`);
    await a.query(USER_TABLE_SCHEMA_SQL);
    await a.query(SAVE_LEASE_TABLE_SCHEMA_SQL);
    sa = new LeaseLockService(a);
    sb = new LeaseLockService(b);
    const pa = await a.query('SELECT pg_backend_pid() AS pid');
    const pb = await b.query('SELECT pg_backend_pid() AS pid');
    expect(pa.rows[0]).not.toEqual(pb.rows[0]);
  }, 15000);

  afterAll(async () => {
    if (a) {
      try {
        await a.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
      } catch {}
      await a.end();
    }
    if (b) await b.end();
  });

  it('concurrent registrations retain one existing internal user ID', async () => {
    const ra = new PostgresUserRepository(a);
    const rb = new PostgresUserRepository(b);
    const sub = randomUUID();
    const user = {
      id: 'original',
      googleSub: sub,
      email: 'test@example.com',
      encryptedRefreshToken: 'encrypted',
      encryptionIv: 'iv',
      encryptionTag: 'tag',
      createdAtIso: new Date().toISOString(),
      updatedAtIso: new Date().toISOString(),
    };
    await ra.save(user);
    const results = await Promise.all(
      Array.from({ length: 32 }, (_, i) => (i % 2 ? ra : rb).save({ ...user, id: randomUUID() }))
    );
    expect(new Set(results.map((r) => r.id))).toEqual(new Set(['original']));
    const rows = await a.query('SELECT id FROM users WHERE google_sub=$1', [sub]);
    expect(rows.rowCount).toBe(1);
  });

  it('concurrent first registrations converge on one generated identity', async () => {
    const sub = randomUUID();
    const ra = new PostgresUserRepository(a);
    const rb = new PostgresUserRepository(b);
    const results = await Promise.all(
      Array.from({ length: 32 }, (_, i) =>
        (i % 2 ? ra : rb).save({
          id: randomUUID(),
          googleSub: sub,
          email: 'test@example.com',
          encryptedRefreshToken: 'encrypted',
          encryptionIv: 'iv',
          encryptionTag: 'tag',
          createdAtIso: new Date().toISOString(),
          updatedAtIso: new Date().toISOString(),
        })
      )
    );
    expect(new Set(results.map((r) => r.id)).size).toBe(1);
  });

  it('simultaneous acquisitions across service instances grant exactly one lease', async () => {
    const slot = randomUUID();
    const results = await Promise.allSettled([sa.acquireLease('u', slot), sb.acquireLease('u', slot)]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((r) => r.status === 'rejected')).toHaveLength(1);
  });

  it('atomic expiry reclamation fences expired and superseded owners and preserves committed pointer', async () => {
    const slot = randomUUID();
    const old = await sa.acquireLease('u', slot, undefined, undefined, 20);
    await a.query('SELECT pg_sleep(0.05)');
    await expect(sa.commitVersionAndRelease('u', slot, old.leaseToken, 'old')).rejects.toThrow();
    const results = await Promise.allSettled([sa.acquireLease('u', slot), sb.acquireLease('u', slot)]);
    const winners = results.filter((r) => r.status === 'fulfilled');
    expect(winners).toHaveLength(1);
    const winner = (winners[0] as PromiseFulfilledResult<Awaited<ReturnType<LeaseLockService['acquireLease']>>>).value;
    await expect(sa.commitVersionAndRelease('u', slot, old.leaseToken, 'old')).rejects.toThrow();
    await expect(sa.commitVersionAndRelease('u', slot, undefined, 'bypass')).rejects.toThrow();
    await sb.commitVersionAndRelease('u', slot, winner.leaseToken, 'v1', 'immutable-file');
    await expect(sa.acquireLease('u', slot, undefined, 'stale')).rejects.toThrow();
    await expect(sa.acquireLease('u', slot)).rejects.toThrow();
    expect(await sa.getCommittedSave('u', slot)).toEqual({ version: 'v1', fileName: 'immutable-file' });
    const next = await sa.acquireLease('u', slot, undefined, 'v1');
    expect(next.leaseToken).not.toBe(old.leaseToken);
  });
});
