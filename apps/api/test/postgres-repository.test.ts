import { it,expect,vi } from 'vitest';
import { PostgresUserRepository } from '../src/database/postgres-user.repository.js';
it('SQL contract mock: upsert conflicts on google_sub and returns persisted internal ID',async()=>{
  const now=new Date().toISOString();
  const query=vi.fn().mockResolvedValue({rowCount:1,rows:[{id:'original-id',google_sub:'sub',email:'e',encrypted_refresh_token:'encrypted',encryption_iv:'iv',encryption_tag:'tag',created_at_iso:now,updated_at_iso:now}]});
  const repo=new PostgresUserRepository({query});
  const result=await repo.save({id:'competing-new-id',googleSub:'sub',email:'e',encryptedRefreshToken:'no_refresh_token_provided',encryptionIv:'iv',encryptionTag:'tag',createdAtIso:now,updatedAtIso:now});
  const sql=query.mock.calls[0]![0] as string;
  expect(sql).toContain('ON CONFLICT (google_sub)');expect(sql).toContain('RETURNING *');
  expect(sql).not.toMatch(/\bid\s*=\s*EXCLUDED.id/);
  expect(result.id).toBe('original-id');
});
