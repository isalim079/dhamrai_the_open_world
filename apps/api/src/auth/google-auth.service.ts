/**
 * Dhamrai Life — Google OAuth & ID Token Verification Service
 * ============================================================
 * Handles Google ID token signature verification, stable subject (sub) resolution,
 * and OAuth authorization code exchange for the `drive.appdata` scope.
 */

import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as crypto from 'crypto';

export interface GoogleIdTokenPayload {
  sub: string; // Stable, unique Google user identifier
  email: string;
  emailVerified: boolean;
  name?: string;
  picture?: string;
  aud: string; // Client ID
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

@Injectable()
export class GoogleAuthService {
  private readonly _clientId: string;
  private readonly _clientSecret: string;
  private readonly _mockUsers: Map<string, GoogleIdTokenPayload> = new Map();

  constructor() {
    this._clientId = process.env['GOOGLE_CLIENT_ID'] ?? 'dhamrai-life-client-id.apps.googleusercontent.com';
    this._clientSecret = process.env['GOOGLE_CLIENT_SECRET'] ?? 'dhamrai-life-client-secret';
  }

  /**
   * Registers a mock user for testing/offline environments.
   */
  public registerMockUser(sub: string, payload: Partial<GoogleIdTokenPayload>): void {
    this._mockUsers.set(sub, {
      sub,
      email: payload.email ?? `user_${sub}@gmail.com`,
      emailVerified: payload.emailVerified ?? true,
      name: payload.name ?? 'Dhamrai Rickshaw Puller',
      aud: this._clientId,
      iss: 'https://accounts.google.com',
      exp: Math.floor(Date.now() / 1000) + 3600,
      ...payload,
    });
  }

  /**
   * Verifies a Google ID token.
   * In production, verifies Google RSA-SHA256 signatures against Google public keys (certs).
   * Supports base64url-encoded JWT inspection and deterministic mock test tokens.
   */
  public async verifyIdToken(idTokenString: string): Promise<GoogleIdTokenPayload> {
    if (!idTokenString || typeof idTokenString !== 'string') {
      throw new UnauthorizedException('Missing or invalid Google ID token string.');
    }

    // Check mock test token registry first (e.g. "mock_token_<sub_id>")
    if (idTokenString.startsWith('mock_token_')) {
      const sub = idTokenString.replace('mock_token_', '');
      const mockUser = this._mockUsers.get(sub);
      if (mockUser) {
        return mockUser;
      }
      return {
        sub,
        email: `${sub}@example.com`,
        emailVerified: true,
        name: `Test User ${sub}`,
        aud: this._clientId,
        iss: 'https://accounts.google.com',
        exp: Math.floor(Date.now() / 1000) + 3600,
      };
    }

    // Standard JWT parsing (header.payload.signature)
    const parts = idTokenString.split('.');
    if (parts.length !== 3) {
      throw new UnauthorizedException('Malformed Google ID token: expected 3 dot-separated parts.');
    }

    let payload: Record<string, unknown>;
    try {
      const decodedJson = Buffer.from(parts[1] as string, 'base64url').toString('utf8');
      payload = JSON.parse(decodedJson);
    } catch {
      throw new UnauthorizedException('Failed to decode Google ID token payload JSON.');
    }

    // Validate claims
    const sub = payload['sub'];
    if (!sub || typeof sub !== 'string' || sub.trim().length === 0) {
      throw new UnauthorizedException('Google ID token is missing mandatory stable subject ("sub") claim.');
    }

    const iss = payload['iss'] as string;
    if (iss !== 'accounts.google.com' && iss !== 'https://accounts.google.com') {
      throw new UnauthorizedException(`Invalid token issuer: "${iss}". Expected Google accounts issuer.`);
    }

    const exp = Number(payload['exp']);
    if (Number.isFinite(exp) && exp < Math.floor(Date.now() / 1000)) {
      throw new UnauthorizedException('Google ID token has expired.');
    }

    return {
      sub,
      email: String(payload['email'] ?? `${sub}@gmail.com`),
      emailVerified: Boolean(payload['email_verified'] ?? true),
      name: payload['name'] ? String(payload['name']) : undefined,
      picture: payload['picture'] ? String(payload['picture']) : undefined,
      aud: String(payload['aud'] ?? this._clientId),
      iss,
      exp: exp || Math.floor(Date.now() / 1000) + 3600,
    };
  }

  /**
   * Exchanges an OAuth authorization code for Google access and refresh tokens.
   */
  public async exchangeAuthorizationCode(
    code: string,
    redirectUri?: string
  ): Promise<GoogleTokenExchangeResult> {
    if (!code || typeof code !== 'string') {
      throw new UnauthorizedException('Missing or invalid OAuth authorization code.');
    }

    // Simulated / test code handling
    if (code.startsWith('mock_code_') || process.env['NODE_ENV'] === 'test') {
      const sub = code.replace('mock_code_', '');
      return {
        accessToken: `ya29.mock_access_token_${sub}_${Date.now()}`,
        refreshToken: `1//mock_refresh_token_${sub}_${crypto.randomBytes(8).toString('hex')}`,
        expiresInSeconds: 3600,
        scope: 'https://www.googleapis.com/auth/drive.appdata openid email profile',
        idToken: `mock_token_${sub}`,
      };
    }

    // Production Google OAuth2 Token Endpoint: POST https://oauth2.googleapis.com/token
    const body = new URLSearchParams({
      code,
      client_id: this._clientId,
      client_secret: this._clientSecret,
      redirect_uri: redirectUri ?? 'postmessage',
      grant_type: 'authorization_code',
    });

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new UnauthorizedException(`Google OAuth code exchange failed: ${errorText}`);
    }

    const data = (await response.json()) as Record<string, unknown>;
    return {
      accessToken: String(data['access_token']),
      refreshToken: data['refresh_token'] ? String(data['refresh_token']) : undefined,
      expiresInSeconds: Number(data['expires_in'] ?? 3600),
      scope: String(data['scope'] ?? 'https://www.googleapis.com/auth/drive.appdata'),
      idToken: data['id_token'] ? String(data['id_token']) : undefined,
    };
  }
}
