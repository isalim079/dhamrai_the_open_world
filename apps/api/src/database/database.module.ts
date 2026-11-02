import { Module, ServiceUnavailableException } from '@nestjs/common';
import { InMemoryUserRepository } from './in-memory-user.repository.js';
import { USER_REPOSITORY_TOKEN } from './user.repository.interface.js';
import { IPgClient, PG_POOL_TOKEN, PostgresUserRepository, USER_TABLE_SCHEMA_SQL } from './postgres-user.repository.js';
import { SAVE_LEASE_TABLE_SCHEMA_SQL } from '../cloud-save/lease-lock.service.js';
import { OAUTH_STATE_SCHEMA_SQL } from '../auth/google-auth.service.js';

interface NodePgPool {
  query(text: string, params?: unknown[]): Promise<{ rows: unknown[]; rowCount: number | null }>;
  end(): Promise<void>;
}
export async function createPostgresClient(): Promise<IPgClient | undefined> {
  const connectionString = process.env['DATABASE_URL'];
  if (!connectionString) {
    if (process.env['NODE_ENV'] === 'production') throw new ServiceUnavailableException('PostgreSQL is required in production.');
    return undefined;
  }
  try {
    // Loaded only for a configured PostgreSQL deployment. Failure never selects memory.
    const driverName = 'pg';
    const driver = await import(driverName) as { Pool: new (options: { connectionString: string; connectionTimeoutMillis: number }) => NodePgPool };
    const pool = new driver.Pool({ connectionString, connectionTimeoutMillis: 5000 });
    const client: IPgClient = { query: async (sql, params) => {
      const result = await pool.query(sql, params);
      return { rows: result.rows, rowCount: result.rowCount ?? 0 };
    } };
    try {
      await client.query(USER_TABLE_SCHEMA_SQL);
      await client.query(SAVE_LEASE_TABLE_SCHEMA_SQL);
      await client.query(OAUTH_STATE_SCHEMA_SQL);
    } catch { await pool.end(); throw new Error(); }
    return client;
  } catch { throw new ServiceUnavailableException('PostgreSQL initialization failed.'); }
}

@Module({
  providers: [
    { provide: PG_POOL_TOKEN, useFactory: createPostgresClient },
    { provide: USER_REPOSITORY_TOKEN, inject: [PG_POOL_TOKEN], useFactory: (client?: IPgClient) => {
      if (client) return new PostgresUserRepository(client);
      if (process.env['NODE_ENV'] === 'production') throw new ServiceUnavailableException('PostgreSQL user repository required.');
      return new InMemoryUserRepository();
    } },
    InMemoryUserRepository,
  ],
  exports: [PG_POOL_TOKEN, USER_REPOSITORY_TOKEN, InMemoryUserRepository],
})
export class DatabaseModule {}
