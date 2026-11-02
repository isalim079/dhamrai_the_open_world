/**
 * Dhamrai Life — PostgreSQL User Repository
 * ===========================================
 * Production PostgreSQL data access repository executing parameterized SQL statements
 * for account persistence, Google identity lookup, and encrypted token management.
 */
import { IUserRepository } from './user.repository.interface.js';
import { UserRecord } from './user.entity.js';
export declare const PG_POOL_TOKEN: unique symbol;
export interface IPgClient {
    query(text: string, params?: unknown[]): Promise<{
        rows: unknown[];
        rowCount: number;
    }>;
}
export declare const USER_TABLE_SCHEMA_SQL = "\nCREATE TABLE IF NOT EXISTS users (\n  id VARCHAR(64) PRIMARY KEY,\n  google_sub VARCHAR(255) UNIQUE NOT NULL,\n  email VARCHAR(255) NOT NULL,\n  name VARCHAR(255),\n  encrypted_refresh_token TEXT NOT NULL,\n  encryption_iv VARCHAR(32) NOT NULL,\n  encryption_tag VARCHAR(32) NOT NULL,\n  created_at_iso TIMESTAMPTZ NOT NULL DEFAULT NOW(),\n  updated_at_iso TIMESTAMPTZ NOT NULL DEFAULT NOW()\n);\n\nCREATE INDEX IF NOT EXISTS idx_users_google_sub ON users(google_sub);\n";
export declare class PostgresUserRepository implements IUserRepository {
    private readonly _client?;
    constructor(_client?: IPgClient | undefined);
    findById(id: string): Promise<UserRecord | null>;
    findByGoogleSub(googleSub: string): Promise<UserRecord | null>;
    save(user: UserRecord): Promise<UserRecord>;
    update(id: string, partial: Partial<UserRecord>): Promise<UserRecord | null>;
    delete(id: string): Promise<boolean>;
    private mapRowToRecord;
}
//# sourceMappingURL=postgres-user.repository.d.ts.map