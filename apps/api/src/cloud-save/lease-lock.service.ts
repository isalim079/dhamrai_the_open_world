import { Injectable, Optional, Inject, ConflictException, ServiceUnavailableException, BadRequestException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { IPgClient, PG_POOL_TOKEN } from '../database/postgres-user.repository.js';

export interface SaveLease {
  leaseToken: string; userId: string; slotName: string; acquiredAtMs: number; expiresAtMs: number; expectedVersion?: string;
}
export const SAVE_LEASE_TABLE_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS save_leases (
  key TEXT PRIMARY KEY, user_id VARCHAR(64) NOT NULL, slot_name VARCHAR(64) NOT NULL,
  lease_token VARCHAR(128) NOT NULL, acquired_at_ms BIGINT NOT NULL, expires_at_ms BIGINT NOT NULL,
  expected_version VARCHAR(255), known_version VARCHAR(255), committed_file_name TEXT,
  updated_at_iso TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE save_leases ADD COLUMN IF NOT EXISTS committed_file_name TEXT;
`;
const DB_NOW = '(EXTRACT(EPOCH FROM clock_timestamp()) * 1000)::bigint';

@Injectable()
export class LeaseLockService {
  private readonly leases = new Map<string, SaveLease>();
  private readonly versions = new Map<string, string>();
  private readonly files = new Map<string, string>();
  constructor(@Optional() @Inject(PG_POOL_TOKEN) private readonly db?: IPgClient) {
    this.requireStore();
  }
  private requireStore(): void {
    if (!this.db && process.env['NODE_ENV'] === 'production') throw new ServiceUnavailableException('PostgreSQL lease store required.');
  }
  private key(userId: string, slotName: string): string {
    if (typeof userId !== 'string' || !userId || userId.length > 64 || typeof slotName !== 'string' || !slotName || slotName.length > 64) throw new BadRequestException('Invalid save slot.');
    return JSON.stringify([userId, slotName]);
  }
  private conflict(): never { throw new ConflictException('Lease expired, owned by another session, or expected version is stale.'); }

  public async acquireLease(userId: string, slotName: string, clientLeaseToken?: string, expectedVersion?: string, ttlMs = 30000): Promise<SaveLease> {
    this.requireStore();
    if (!Number.isInteger(ttlMs) || ttlMs < 1 || ttlMs > 120000) throw new BadRequestException('Lease TTL must be 1–120000 milliseconds.');
    if (expectedVersion !== undefined && (typeof expectedVersion !== 'string' || !expectedVersion || expectedVersion.length > 255)) throw new BadRequestException('Invalid expected version.');
    const key = this.key(userId, slotName);
    const freshToken = randomUUID();
    if (this.db) {
      // One autocommit statement. The unique-key conflict locks the row, then
      // PostgreSQL re-evaluates this predicate against the winning row version.
      // No preceding SELECT; expired reclamation and acquisition are the same CAS.
      const res = await this.db.query(`INSERT INTO save_leases
        (key,user_id,slot_name,lease_token,acquired_at_ms,expires_at_ms,expected_version)
        SELECT $1,$2,$3,$4,${DB_NOW},${DB_NOW}+$5,$6::varchar WHERE $6::varchar IS NULL
        ON CONFLICT (key) DO UPDATE SET
          lease_token = CASE WHEN save_leases.expires_at_ms > ${DB_NOW} THEN save_leases.lease_token ELSE $4 END,
          acquired_at_ms = CASE WHEN save_leases.expires_at_ms > ${DB_NOW} THEN save_leases.acquired_at_ms ELSE ${DB_NOW} END,
          expires_at_ms = ${DB_NOW}+$5, expected_version = $6::varchar, updated_at_iso=NOW()
        WHERE (save_leases.expires_at_ms <= ${DB_NOW} AND save_leases.known_version IS NOT DISTINCT FROM $6::varchar)
           OR (save_leases.expires_at_ms > ${DB_NOW} AND save_leases.lease_token=$7
               AND save_leases.expected_version IS NOT DISTINCT FROM $6::varchar)
        RETURNING *`, [key, userId, slotName, freshToken, ttlMs, expectedVersion ?? null, clientLeaseToken ?? null]);
      // INSERT's WHERE must not hide existing rows when expectedVersion is non-null.
      // The alternate UPDATE below is also an atomic CAS and cannot create a lease.
      let row = res.rows[0] as Record<string, unknown> | undefined;
      if (!row && expectedVersion !== undefined) {
        const updated = await this.db.query(`UPDATE save_leases SET
          lease_token=CASE WHEN expires_at_ms > ${DB_NOW} THEN lease_token ELSE $2 END,
          acquired_at_ms=CASE WHEN expires_at_ms > ${DB_NOW} THEN acquired_at_ms ELSE ${DB_NOW} END,
          expires_at_ms=${DB_NOW}+$3, expected_version=$4::varchar, updated_at_iso=NOW()
          WHERE key=$1 AND ((expires_at_ms <= ${DB_NOW} AND known_version IS NOT DISTINCT FROM $4::varchar)
            OR (expires_at_ms > ${DB_NOW} AND lease_token=$5 AND expected_version IS NOT DISTINCT FROM $4::varchar)) RETURNING *`,
          [key, freshToken, ttlMs, expectedVersion, clientLeaseToken ?? null]);
        row = updated.rows[0] as Record<string, unknown> | undefined;
      }
      if (!row) return this.conflict();
      return { leaseToken: String(row['lease_token']), userId, slotName, acquiredAtMs: Number(row['acquired_at_ms']),
        expiresAtMs: Number(row['expires_at_ms']), expectedVersion };
    }
    const now = Date.now();
    const held = this.leases.get(key);
    if (held && held.expiresAtMs > now) {
      if (!clientLeaseToken || held.leaseToken !== clientLeaseToken || held.expectedVersion !== expectedVersion) return this.conflict();
      const renewed = { ...held, expiresAtMs: now + ttlMs };
      this.leases.set(key, renewed); return { ...renewed };
    }
    if (this.versions.get(key) !== expectedVersion) return this.conflict();
    const lease = { userId, slotName, leaseToken: freshToken, acquiredAtMs: now, expiresAtMs: now + ttlMs, expectedVersion };
    this.leases.set(key, lease); return { ...lease };
  }

  public async verifyLease(userId: string, slotName: string, leaseToken?: string): Promise<boolean> {
    this.requireStore();
    const key = this.key(userId, slotName);
    if (!leaseToken) return false;
    if (this.db) {
      const res = await this.db.query(`SELECT 1 FROM save_leases WHERE key=$1 AND lease_token=$2 AND expires_at_ms > ${DB_NOW}`, [key, leaseToken]);
      return res.rowCount === 1;
    }
    const lease = this.leases.get(key);
    return !!lease && lease.leaseToken === leaseToken && lease.expiresAtMs > Date.now();
  }

  public async commitVersionAndRelease(userId: string, slotName: string, leaseToken?: string, newVersion?: string, committedFileName?: string): Promise<void> {
    this.requireStore();
    const key = this.key(userId, slotName);
    if (!leaseToken || !newVersion) return this.conflict();
    if (this.db) {
      // Publication is a single fenced UPDATE. No SELECT/UPDATE race, and an
      // expired/superseded holder cannot change the canonical version or pointer.
      const res = await this.db.query(`UPDATE save_leases SET known_version=$3, committed_file_name=$4,
        lease_token='', expires_at_ms=0, expected_version=NULL, updated_at_iso=NOW()
        WHERE key=$1 AND lease_token=$2 AND expires_at_ms > ${DB_NOW}
          AND known_version IS NOT DISTINCT FROM expected_version RETURNING key`,
        [key, leaseToken, newVersion, committedFileName ?? null]);
      if (res.rowCount !== 1) return this.conflict();
      return;
    }
    const lease = this.leases.get(key);
    if (!lease || lease.leaseToken !== leaseToken || lease.expiresAtMs <= Date.now() || this.versions.get(key) !== lease.expectedVersion) return this.conflict();
    this.versions.set(key, newVersion);
    if (committedFileName) this.files.set(key, committedFileName);
    this.leases.delete(key);
  }
  public async releaseLease(userId: string, slotName: string, leaseToken?: string): Promise<void> {
    this.requireStore(); const key = this.key(userId, slotName);
    if (!leaseToken) return this.conflict();
    if (this.db) {
      await this.db.query(`UPDATE save_leases SET lease_token='',expires_at_ms=0 WHERE key=$1 AND lease_token=$2`, [key, leaseToken]); return;
    }
    if (this.leases.get(key)?.leaseToken === leaseToken) this.leases.delete(key);
  }
  public async getKnownVersion(userId: string, slotName: string): Promise<string | null> {
    this.requireStore(); const key = this.key(userId, slotName);
    if (this.db) {
      const res = await this.db.query('SELECT known_version FROM save_leases WHERE key=$1', [key]);
      return (res.rows[0] as {known_version?: string} | undefined)?.known_version ?? null;
    }
    return this.versions.get(key) ?? null;
  }
  public async getCommittedSave(userId: string, slotName: string): Promise<{fileName: string; version: string} | null> {
    this.requireStore(); const key = this.key(userId, slotName);
    if (this.db) {
      const res = await this.db.query('SELECT committed_file_name, known_version FROM save_leases WHERE key=$1', [key]);
      const row = res.rows[0] as {committed_file_name?: string; known_version?: string} | undefined;
      return row?.committed_file_name && row.known_version ? {fileName: row.committed_file_name, version: row.known_version} : null;
    }
    const fileName = this.files.get(key); const version = this.versions.get(key);
    return fileName && version ? {fileName, version} : null;
  }
  // Test/bootstrap seeding only: an observation may never overwrite a held lease
  // or a previously committed version. GET /cloud-save does not call this method.
  public async setKnownVersion(userId: string, slotName: string, version: string): Promise<void> {
    this.requireStore(); const key = this.key(userId, slotName);
    if (this.db) {
      await this.db.query(`INSERT INTO save_leases(key,user_id,slot_name,lease_token,acquired_at_ms,expires_at_ms,known_version)
        VALUES($1,$2,$3,'',0,0,$4) ON CONFLICT(key) DO NOTHING`, [key,userId,slotName,version]); return;
    }
    if (!this.leases.has(key) && !this.versions.has(key)) this.versions.set(key, version);
  }
  public async clearAll(): Promise<void> {
    if (process.env['NODE_ENV'] !== 'test') throw new Error('Test-only operation.');
    if (this.db) { await this.db.query('DELETE FROM save_leases'); return; }
    this.leases.clear(); this.versions.clear(); this.files.clear();
  }
}
