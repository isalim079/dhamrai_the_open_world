import { IPgClient } from '../database/postgres-user.repository.js';
export interface GoogleIdTokenPayload {
    sub: string;
    email: string;
    emailVerified: boolean;
    name?: string;
    picture?: string;
    aud: string;
    iss: string;
    exp: number;
}
export interface GoogleTokenExchangeResult {
    accessToken: string;
    refreshToken?: string;
    expiresInSeconds: number;
    scope: string;
    idToken?: string;
}
interface OAuthTransaction {
    state: string;
    verifier: string;
    nonce: string;
    redirectUri: string;
    expires: number;
}
export declare const OAUTH_STATE_SCHEMA_SQL = "CREATE TABLE IF NOT EXISTS oauth_used_states (\n  state_hash TEXT PRIMARY KEY, expires_at_ms BIGINT NOT NULL\n);";
export declare class GoogleAuthService {
    private readonly db?;
    private readonly aes;
    private readonly usedStates;
    private keys;
    private keysExpireAt;
    constructor(db?: IPgClient | undefined);
    private redirect;
    beginOAuth(redirectUri?: string): Promise<{
        authorizationUrl: string;
        cookie: string;
    }>;
    consumeOAuth(state?: string, cookie?: string, redirectUri?: string): Promise<OAuthTransaction>;
    verifyIdToken(token: string, expectedNonce?: string): Promise<GoogleIdTokenPayload>;
    exchangeAuthorizationCode(code: string, redirectUri?: string, state?: string, cookie?: string): Promise<GoogleTokenExchangeResult>;
    refreshAccessToken(refreshToken: string): Promise<string>;
}
export {};
//# sourceMappingURL=google-auth.service.d.ts.map