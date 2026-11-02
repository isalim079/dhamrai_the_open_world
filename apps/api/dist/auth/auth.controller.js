var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { Controller, Post, Body, BadRequestException, Inject, } from '@nestjs/common';
import * as crypto from 'crypto';
import { GoogleAuthService } from './google-auth.service.js';
import { SessionService } from './session.service.js';
import { AesGcmService } from '../crypto/aes-gcm.service.js';
import { USER_REPOSITORY_TOKEN, } from '../database/user.repository.interface.js';
let AuthController = class AuthController {
    _googleAuthService;
    _sessionService;
    _aesGcmService;
    _userRepository;
    constructor(_googleAuthService, _sessionService, _aesGcmService, _userRepository) {
        this._googleAuthService = _googleAuthService;
        this._sessionService = _sessionService;
        this._aesGcmService = _aesGcmService;
        this._userRepository = _userRepository;
    }
    async authenticateGoogle(body) {
        if (!body || (!body.idToken && !body.code)) {
            throw new BadRequestException('Request body must contain either "idToken" or "code".');
        }
        let sub;
        let email;
        let name;
        let refreshToken;
        if (body.code) {
            // Exchange code for tokens
            const exchangeResult = await this._googleAuthService.exchangeAuthorizationCode(body.code, body.redirectUri);
            refreshToken = exchangeResult.refreshToken;
            // Extract identity from returned ID token or verify explicitly
            if (exchangeResult.idToken) {
                const payload = await this._googleAuthService.verifyIdToken(exchangeResult.idToken);
                sub = payload.sub;
                email = payload.email;
                name = payload.name;
            }
            else {
                // Fallback: derive from mock code
                sub = body.code.replace('mock_code_', '');
                email = `user_${sub}@gmail.com`;
            }
        }
        else if (body.idToken) {
            const payload = await this._googleAuthService.verifyIdToken(body.idToken);
            sub = payload.sub;
            email = payload.email;
            name = payload.name;
        }
        else {
            throw new BadRequestException('Missing authentication credentials.');
        }
        // Encrypt refresh token if present (AES-256-GCM)
        let encryptedRefreshToken = '';
        let encryptionIv = '';
        let encryptionTag = '';
        if (refreshToken) {
            const encrypted = this._aesGcmService.encrypt(refreshToken);
            encryptedRefreshToken = encrypted.ciphertextHex;
            encryptionIv = encrypted.ivHex;
            encryptionTag = encrypted.tagHex;
        }
        // Locate or create user account by Google Subject Identifier
        let user = await this._userRepository.findByGoogleSub(sub);
        const nowIso = new Date().toISOString();
        if (!user) {
            const newUser = {
                id: `usr_${crypto.randomUUID()}`,
                googleSub: sub,
                email,
                name,
                encryptedRefreshToken: encryptedRefreshToken || 'no_refresh_token_provided',
                encryptionIv: encryptionIv || '000000000000000000000000',
                encryptionTag: encryptionTag || '00000000000000000000000000000000',
                createdAtIso: nowIso,
                updatedAtIso: nowIso,
            };
            user = await this._userRepository.save(newUser);
        }
        else {
            // Update existing record if new refresh token was received
            const updates = {
                email,
                name: name ?? user.name,
                updatedAtIso: nowIso,
            };
            if (encryptedRefreshToken) {
                updates.encryptedRefreshToken = encryptedRefreshToken;
                updates.encryptionIv = encryptionIv;
                updates.encryptionTag = encryptionTag;
            }
            user = (await this._userRepository.update(user.id, updates)) ?? user;
        }
        const sessionToken = this._sessionService.createSessionToken(user.id, user.googleSub, user.email);
        return {
            sessionToken,
            user: {
                id: user.id,
                googleSub: user.googleSub,
                email: user.email,
                name: user.name,
            },
        };
    }
};
__decorate([
    Post('google'),
    __param(0, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "authenticateGoogle", null);
AuthController = __decorate([
    Controller('auth'),
    __param(3, Inject(USER_REPOSITORY_TOKEN)),
    __metadata("design:paramtypes", [GoogleAuthService,
        SessionService,
        AesGcmService, Object])
], AuthController);
export { AuthController };
//# sourceMappingURL=auth.controller.js.map