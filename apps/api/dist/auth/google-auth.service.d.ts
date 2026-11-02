/**
 * Dhamrai Life — Google OAuth & ID Token Verification Service
 * ============================================================
 * Handles Google ID token signature verification, stable subject (sub) resolution,
 * and OAuth authorization code exchange for the `drive.appdata` scope.
 */
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
export declare class GoogleAuthService {
    private readonly _clientId;
    private readonly _clientSecret;
    private readonly _mockUsers;
    constructor();
    /**
     * Registers a mock user for testing/offline environments.
     */
    registerMockUser(sub: string, payload: Partial<GoogleIdTokenPayload>): void;
    /**
     * Verifies a Google ID token.
     * In production, verifies Google RSA-SHA256 signatures against Google public keys (certs).
     * Supports base64url-encoded JWT inspection and deterministic mock test tokens.
     */
    verifyIdToken(idTokenString: string): Promise<GoogleIdTokenPayload>;
    /**
     * Exchanges an OAuth authorization code for Google access and refresh tokens.
     */
    exchangeAuthorizationCode(code: string, redirectUri?: string): Promise<GoogleTokenExchangeResult>;
}
//# sourceMappingURL=google-auth.service.d.ts.map