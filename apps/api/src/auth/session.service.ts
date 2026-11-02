/**
 * Dhamrai Life — Session Management Service
 * ==========================================
 * Issues and validates signed session bearer tokens for authenticated clients.
 */

import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as crypto from 'crypto';

export interface SessionPayload {
  userId: string;
  googleSub: string;
  email: string;
  exp: number; // Unix timestamp seconds
}

@Injectable()
export class SessionService {
  private readonly _sessionSecret: string;

  constructor() {
    this._sessionSecret =
      process.env['SESSION_SECRET'] ?? 'dhamrai_life_session_signing_secret_key_32_bytes!';
  }

  /**
   * Signs a new session bearer token valid for 7 days.
   */
  public createSessionToken(userId: string, googleSub: string, email: string): string {
    const exp = Math.floor(Date.now() / 1000) + 7 * 24 * 3600;
    const payload: SessionPayload = { userId, googleSub, email, exp };

    const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = crypto
      .createHmac('sha256', this._sessionSecret)
      .update(payloadBase64)
      .digest('base64url');

    return `${payloadBase64}.${signature}`;
  }

  /**
   * Validates a session bearer token and returns its payload.
   */
  public verifySessionToken(token: string): SessionPayload {
    if (!token || typeof token !== 'string') {
      throw new UnauthorizedException('Missing session authorization token.');
    }

    const parts = token.split('.');
    if (parts.length !== 2) {
      throw new UnauthorizedException('Malformed session token format.');
    }

    const [payloadBase64, signature] = parts;
    const expectedSignature = crypto
      .createHmac('sha256', this._sessionSecret)
      .update(payloadBase64 as string)
      .digest('base64url');

    if (signature !== expectedSignature) {
      throw new UnauthorizedException('Invalid session token signature.');
    }

    let payload: SessionPayload;
    try {
      payload = JSON.parse(Buffer.from(payloadBase64 as string, 'base64url').toString('utf8'));
    } catch {
      throw new UnauthorizedException('Failed to parse session token payload.');
    }

    if (payload.exp < Math.floor(Date.now() / 1000)) {
      throw new UnauthorizedException('Session token has expired. Please re-authenticate.');
    }

    return payload;
  }
}
