/**
 * Dhamrai Life — Session Management Service
 * ==========================================
 * Issues and validates signed session bearer tokens for authenticated clients.
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
import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as crypto from 'crypto';
let SessionService = class SessionService {
    _sessionSecret;
    constructor() {
        const configured = process.env['SESSION_SECRET'];
        if (process.env['NODE_ENV'] === 'production' && (!configured || configured.length < 32 || configured === 'dhamrai_life_session_signing_secret_key_32_bytes!'))
            throw new Error('Production session secret is missing or insecure.');
        this._sessionSecret = configured ?? crypto.randomBytes(32).toString('hex');
    }
    /**
     * Signs a new session bearer token valid for 7 days.
     */
    createSessionToken(userId, googleSub, email) {
        const exp = Math.floor(Date.now() / 1000) + 7 * 24 * 3600;
        const payload = { userId, googleSub, email, exp };
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
    verifySessionToken(token) {
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
            .update(payloadBase64)
            .digest('base64url');
        const sigBuf = Buffer.from(signature);
        const expBuf = Buffer.from(expectedSignature);
        if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
            throw new UnauthorizedException('Invalid session token signature.');
        }
        let payload;
        try {
            payload = JSON.parse(Buffer.from(payloadBase64, 'base64url').toString('utf8'));
        }
        catch {
            throw new UnauthorizedException('Failed to parse session token payload.');
        }
        if (!Number.isFinite(payload.exp) || payload.exp <= Math.floor(Date.now() / 1000) || typeof payload.userId !== 'string' || typeof payload.googleSub !== 'string') {
            throw new UnauthorizedException('Session token has expired. Please re-authenticate.');
        }
        return payload;
    }
};
SessionService = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [])
], SessionService);
export { SessionService };
//# sourceMappingURL=session.service.js.map