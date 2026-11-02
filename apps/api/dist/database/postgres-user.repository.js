/**
 * Dhamrai Life — PostgreSQL User Repository
 * ===========================================
 * Production PostgreSQL data access repository executing parameterized SQL statements
 * for account persistence, Google identity lookup, and encrypted token management.
 */
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { Injectable, Optional, Inject } from '@nestjs/common';
export const PG_POOL_TOKEN = Symbol('PgPool');
export const USER_TABLE_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(64) PRIMARY KEY,
  google_sub VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  encrypted_refresh_token TEXT NOT NULL,
  encryption_iv VARCHAR(32) NOT NULL,
  encryption_tag VARCHAR(32) NOT NULL,
  created_at_iso TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at_iso TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_google_sub ON users(google_sub);
`;
let PostgresUserRepository = class PostgresUserRepository {
    _client;
    constructor(_client) {
        this._client = _client;
    }
    async findById(id) {
        if (!this._client) {
            throw new Error('PostgreSQL client pool not configured. Use InMemoryUserRepository for offline testing.');
        }
        const result = await this._client.query(`SELECT id, google_sub, email, name, encrypted_refresh_token, encryption_iv, encryption_tag, created_at_iso, updated_at_iso
       FROM users WHERE id = $1 LIMIT 1;`, [id]);
        if (result.rows.length === 0)
            return null;
        return this.mapRowToRecord(result.rows[0]);
    }
    async findByGoogleSub(googleSub) {
        if (!this._client) {
            throw new Error('PostgreSQL client pool not configured. Use InMemoryUserRepository for offline testing.');
        }
        const result = await this._client.query(`SELECT id, google_sub, email, name, encrypted_refresh_token, encryption_iv, encryption_tag, created_at_iso, updated_at_iso
       FROM users WHERE google_sub = $1 LIMIT 1;`, [googleSub]);
        if (result.rows.length === 0)
            return null;
        return this.mapRowToRecord(result.rows[0]);
    }
    async save(user) {
        if (!this._client) {
            throw new Error('PostgreSQL client pool not configured. Use InMemoryUserRepository for offline testing.');
        }
        const result = await this._client.query(`INSERT INTO users (id, google_sub, email, name, encrypted_refresh_token, encryption_iv, encryption_tag, created_at_iso, updated_at_iso)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (google_sub) DO UPDATE SET
         email = EXCLUDED.email,
         name = EXCLUDED.name,
         encrypted_refresh_token = CASE WHEN EXCLUDED.encrypted_refresh_token = 'no_refresh_token_provided' THEN users.encrypted_refresh_token ELSE EXCLUDED.encrypted_refresh_token END,
         encryption_iv = CASE WHEN EXCLUDED.encrypted_refresh_token = 'no_refresh_token_provided' THEN users.encryption_iv ELSE EXCLUDED.encryption_iv END,
         encryption_tag = CASE WHEN EXCLUDED.encrypted_refresh_token = 'no_refresh_token_provided' THEN users.encryption_tag ELSE EXCLUDED.encryption_tag END,
         updated_at_iso = EXCLUDED.updated_at_iso RETURNING *;`, [
            user.id,
            user.googleSub,
            user.email,
            user.name ?? null,
            user.encryptedRefreshToken,
            user.encryptionIv,
            user.encryptionTag,
            user.createdAtIso,
            user.updatedAtIso,
        ]);
        if (!result.rows[0])
            throw new Error('User upsert returned no identity.');
        return this.mapRowToRecord(result.rows[0]);
    }
    async update(id, partial) {
        if (!this._client)
            throw new Error('PostgreSQL client pool not configured.');
        // Update only supplied mutable fields. Reading/merging an older full record
        // could overwrite a refresh token rotated by a simultaneous code login.
        const columns = {
            email: 'email', name: 'name', encryptedRefreshToken: 'encrypted_refresh_token',
            encryptionIv: 'encryption_iv', encryptionTag: 'encryption_tag',
        };
        const params = [id];
        const assignments = [];
        for (const field of Object.keys(columns)) {
            if (partial[field] !== undefined) {
                params.push(partial[field]);
                assignments.push(`${columns[field]}=$${params.length}`);
            }
        }
        assignments.push('updated_at_iso=NOW()');
        const result = await this._client.query(`UPDATE users SET ${assignments.join(',')} WHERE id=$1 RETURNING *`, params);
        return result.rows[0] ? this.mapRowToRecord(result.rows[0]) : null;
    }
    async delete(id) {
        if (!this._client) {
            throw new Error('PostgreSQL client pool not configured.');
        }
        const result = await this._client.query(`DELETE FROM users WHERE id = $1;`, [id]);
        return result.rowCount > 0;
    }
    mapRowToRecord(row) {
        return {
            id: String(row['id']),
            googleSub: String(row['google_sub']),
            email: String(row['email']),
            name: row['name'] ? String(row['name']) : undefined,
            encryptedRefreshToken: String(row['encrypted_refresh_token']),
            encryptionIv: String(row['encryption_iv']),
            encryptionTag: String(row['encryption_tag']),
            createdAtIso: new Date(String(row['created_at_iso'])).toISOString(),
            updatedAtIso: new Date(String(row['updated_at_iso'])).toISOString(),
        };
    }
};
PostgresUserRepository = __decorate([
    Injectable(),
    __param(0, Optional()),
    __param(0, Inject(PG_POOL_TOKEN)),
    __metadata("design:paramtypes", [Object])
], PostgresUserRepository);
export { PostgresUserRepository };
//# sourceMappingURL=postgres-user.repository.js.map