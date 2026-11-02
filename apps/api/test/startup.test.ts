import { it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';

// Run yarn typecheck first: this exercises the actual compiled bootstrap entry.
it.each(['','z'.repeat(64),'not-hex-secret-marker','f'.repeat(62),'0123456789abcdef'.repeat(4)])(
  'production bootstrap exits before listening for missing/invalid/example encryption key %#',key=>{
    const result=spawnSync(process.execPath,['apps/api/dist/main.js'],{
      env:{...process.env,NODE_ENV:'production',DATABASE_URL:'postgresql://localhost/test',
        GOOGLE_CLIENT_ID:'client-id',GOOGLE_CLIENT_SECRET:'secret-marker-not-to-log',
        GOOGLE_REDIRECT_URI:'https://game.example/callback',SESSION_SECRET:randomBytes(32).toString('hex'),
        TOKEN_ENCRYPTION_KEY_HEX:key,USE_REAL_GOOGLE_DRIVE:'true'},encoding:'utf8',timeout:5000,
    });
    expect(result.status).toBe(1);
    expect(result.stdout+result.stderr).not.toContain('secret-marker');
    expect(result.stdout+result.stderr).not.toContain('running on port');
    expect(result.stderr).toContain('API startup failed');
  }
);
