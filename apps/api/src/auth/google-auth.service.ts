import { Injectable, UnauthorizedException, Optional, Inject } from '@nestjs/common';
import { createPublicKey, verify, randomBytes, createHash, timingSafeEqual } from 'node:crypto';
import { AesGcmService, EncryptedPayload } from '../crypto/aes-gcm.service.js';
import { IPgClient, PG_POOL_TOKEN } from '../database/postgres-user.repository.js';

export interface GoogleIdTokenPayload {
  sub: string; email: string; emailVerified: boolean; name?: string; picture?: string;
  aud: string; iss: string; exp: number;
}
export interface GoogleTokenExchangeResult {
  accessToken: string; refreshToken?: string; expiresInSeconds: number; scope: string; idToken?: string;
}
interface OAuthTransaction {
  state: string; verifier: string; nonce: string; redirectUri: string; expires: number;
}
export const OAUTH_STATE_SCHEMA_SQL = `CREATE TABLE IF NOT EXISTS oauth_used_states (
  state_hash TEXT PRIMARY KEY, expires_at_ms BIGINT NOT NULL
);`;
const GOOGLE_JWKS_URL = 'https://www.googleapis.com/oauth2/v3/certs';
const digest = (s: string) => createHash('sha256').update(s).digest('base64url');
const equal = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

@Injectable()
export class GoogleAuthService {
  private readonly aes: AesGcmService;
  private readonly usedStates = new Map<string, number>();
  private keys: Array<Record<string, unknown>> = [];
  private keysExpireAt = 0;
  constructor(@Optional() @Inject(PG_POOL_TOKEN) private readonly db?: IPgClient) {
    this.aes = new AesGcmService();
  }

  private redirect(redirectUri?: string): string {
    const configured = process.env['GOOGLE_REDIRECT_URI'];
    if (!configured || (redirectUri !== undefined && redirectUri !== configured)) {
      throw new UnauthorizedException('Invalid OAuth redirect URI.');
    }
    const url = new URL(configured);
    const localDev = process.env['NODE_ENV'] !== 'production' && ['localhost', '127.0.0.1'].includes(url.hostname);
    if ((url.protocol !== 'https:' && !(localDev && url.protocol === 'http:')) || url.username || url.password || url.hash) {
      throw new UnauthorizedException('Invalid OAuth redirect URI configuration.');
    }
    return configured;
  }

  public async beginOAuth(redirectUri?: string): Promise<{ authorizationUrl: string; cookie: string }> {
    const target = this.redirect(redirectUri);
    const clientId = process.env['GOOGLE_CLIENT_ID'];
    if (!clientId) throw new UnauthorizedException('Google OAuth is not configured.');
    const transaction: OAuthTransaction = {
      state: randomBytes(32).toString('base64url'), verifier: randomBytes(32).toString('base64url'),
      nonce: randomBytes(32).toString('base64url'), redirectUri: target, expires: Date.now() + 600_000,
    };
    const cookie = Buffer.from(JSON.stringify(this.aes.encrypt(JSON.stringify(transaction)))).toString('base64url');
    const params = new URLSearchParams({ client_id: clientId, redirect_uri: target, response_type: 'code',
      scope: 'openid email profile https://www.googleapis.com/auth/drive.appdata', access_type: 'offline',
      state: transaction.state, nonce: transaction.nonce, code_challenge: digest(transaction.verifier), code_challenge_method: 'S256' });
    return { authorizationUrl: `https://accounts.google.com/o/oauth2/v2/auth?${params}`, cookie };
  }

  public async consumeOAuth(state?: string, cookie?: string, redirectUri?: string): Promise<OAuthTransaction> {
    const target = this.redirect(redirectUri);
    let tx: OAuthTransaction;
    try {
      if (!cookie || cookie.length > 4096 || !state || state.length > 128) throw new Error();
      const sealed = JSON.parse(Buffer.from(cookie, 'base64url').toString()) as EncryptedPayload;
      tx = JSON.parse(this.aes.decrypt(sealed)) as OAuthTransaction;
      if (!Number.isFinite(tx.expires) || tx.expires <= Date.now() || tx.redirectUri !== target || !equal(tx.state, state)) throw new Error();
    } catch { throw new UnauthorizedException('Invalid or expired OAuth transaction.'); }
    // Browser binding is the HttpOnly encrypted transaction cookie. State alone is insufficient.
    const key = digest(tx.state);
    if (this.db) {
      const result = await this.db.query(`INSERT INTO oauth_used_states(state_hash, expires_at_ms)
        VALUES ($1,$2) ON CONFLICT (state_hash) DO NOTHING RETURNING state_hash`, [key, tx.expires]);
      if (result.rowCount !== 1) throw new UnauthorizedException('OAuth transaction already consumed.');
    } else {
      if (process.env['NODE_ENV'] === 'production') throw new UnauthorizedException('OAuth state store unavailable.');
      for (const [s, expires] of this.usedStates) if (expires <= Date.now()) this.usedStates.delete(s);
      if (this.usedStates.has(key)) throw new UnauthorizedException('OAuth transaction already consumed.');
      this.usedStates.set(key, tx.expires);
    }
    return tx;
  }

  public async verifyIdToken(token: string, expectedNonce?: string): Promise<GoogleIdTokenPayload> {
    try {
      if (typeof token !== 'string' || token.length > 16384) throw new Error();
      const parts = token.split('.');
      if (parts.length !== 3 || parts.some(p => !/^[A-Za-z0-9_-]+$/.test(p))) throw new Error();
      const [headerPart, payloadPart, signaturePart] = parts as [string, string, string];
      const header = JSON.parse(Buffer.from(headerPart, 'base64url').toString()) as Record<string, unknown>;
      if (header['alg'] !== 'RS256' || typeof header['kid'] !== 'string' || header['crit']) throw new Error();
      if (this.keysExpireAt <= Date.now() || !this.keys.some(k => k['kid'] === header['kid'])) {
        const response = await fetch(GOOGLE_JWKS_URL, { redirect: 'error', signal: AbortSignal.timeout(10_000) });
        if (!response.ok) throw new Error();
        const body = await response.json() as { keys?: Array<Record<string, unknown>> };
        if (!Array.isArray(body.keys)) throw new Error();
        this.keys = body.keys;
        const maxAge = Number(response.headers.get('cache-control')?.match(/max-age=(\d+)/)?.[1] ?? 300);
        this.keysExpireAt = Date.now() + Math.min(maxAge, 3600) * 1000;
      }
      const jwk = this.keys.find(k => k['kid'] === header['kid'] && k['kty'] === 'RSA' &&
        (!k['alg'] || k['alg'] === 'RS256') && (!k['use'] || k['use'] === 'sig'));
      if (!jwk || typeof jwk['n'] !== 'string' || typeof jwk['e'] !== 'string') throw new Error();
      // Never trust jku/x5u/jwk supplied in the JWT; only the fixed Google HTTPS JWKS endpoint.
      const key = createPublicKey({ key: { kty: 'RSA', n: jwk['n'], e: jwk['e'] }, format: 'jwk' });
      if (!verify('RSA-SHA256', Buffer.from(`${headerPart}.${payloadPart}`), key, Buffer.from(signaturePart, 'base64url'))) throw new Error();
      const payload = JSON.parse(Buffer.from(payloadPart, 'base64url').toString()) as Record<string, unknown>;
      const clientId = process.env['GOOGLE_CLIENT_ID'];
      const aud = payload['aud'];
      if (!clientId || !(aud === clientId || (Array.isArray(aud) && aud.every(value => typeof value === 'string') && aud.includes(clientId)))) throw new Error();
      if ((Array.isArray(aud) && aud.length > 1 && payload['azp'] !== clientId) ||
          (payload['azp'] !== undefined && payload['azp'] !== clientId)) throw new Error();
      if (payload['iss'] !== 'accounts.google.com' && payload['iss'] !== 'https://accounts.google.com') throw new Error();
      const exp = payload['exp'];
      if (typeof exp !== 'number' || !Number.isFinite(exp) || exp <= Math.floor(Date.now() / 1000)) throw new Error();
      if (typeof payload['sub'] !== 'string' || !payload['sub'].trim() || typeof payload['email'] !== 'string') throw new Error();
      if (expectedNonce !== undefined && payload['nonce'] !== expectedNonce) throw new Error();
      return { sub: payload['sub'], email: payload['email'], emailVerified: payload['email_verified'] === true,
        name: typeof payload['name'] === 'string' ? payload['name'] : undefined,
        picture: typeof payload['picture'] === 'string' ? payload['picture'] : undefined,
        aud: clientId, iss: String(payload['iss']), exp };
    } catch { throw new UnauthorizedException('Google ID token verification failed.'); }
  }

  public async exchangeAuthorizationCode(code: string, redirectUri?: string, state?: string, cookie?: string): Promise<GoogleTokenExchangeResult> {
    if (typeof code !== 'string' || !code || code.length > 4096) throw new UnauthorizedException('Invalid OAuth code.');
    const tx = await this.consumeOAuth(state, cookie, redirectUri);
    const clientId = process.env['GOOGLE_CLIENT_ID'];
    const clientSecret = process.env['GOOGLE_CLIENT_SECRET'];
    if (!clientId || !clientSecret) throw new UnauthorizedException('Google OAuth is not configured.');
    try {
      const response = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', redirect: 'error',
        signal: AbortSignal.timeout(10_000), headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret,
          redirect_uri: tx.redirectUri, code_verifier: tx.verifier, grant_type: 'authorization_code' }).toString() });
      if (!response.ok) throw new Error();
      const data = await response.json() as Record<string, unknown>;
      if (typeof data['id_token'] !== 'string' || typeof data['access_token'] !== 'string') throw new Error();
      await this.verifyIdToken(data['id_token'], tx.nonce);
      return { accessToken: data['access_token'], refreshToken: typeof data['refresh_token'] === 'string' ? data['refresh_token'] : undefined,
        expiresInSeconds: Number(data['expires_in']), scope: String(data['scope'] ?? ''), idToken: data['id_token'] };
    } catch { throw new UnauthorizedException('Google OAuth code exchange failed.'); }
  }

  public async refreshAccessToken(refreshToken: string): Promise<string> {
    try {
      const response = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', redirect: 'error',
        signal: AbortSignal.timeout(10_000), headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ client_id: process.env['GOOGLE_CLIENT_ID'] ?? '', client_secret: process.env['GOOGLE_CLIENT_SECRET'] ?? '',
          refresh_token: refreshToken, grant_type: 'refresh_token' }).toString() });
      if (!response.ok) throw new Error();
      const data = await response.json() as Record<string, unknown>;
      if (typeof data['access_token'] !== 'string') throw new Error();
      return data['access_token'];
    } catch { throw new UnauthorizedException('Google token refresh failed.'); }
  }
}
