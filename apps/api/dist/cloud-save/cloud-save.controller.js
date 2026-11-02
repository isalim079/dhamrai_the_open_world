/**
 * Dhamrai Life — Cloud Save Controller
 * =====================================
 * Handles cloud save retrieval, optimistic concurrency lease locking,
 * Zod validation against SaveEnvelopeV2, and Google Drive `appDataFolder` persistence.
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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { Controller, Get, Put, Post, Body, Query, UseGuards, Req, Inject, BadRequestException, ConflictException, NotFoundException, UnauthorizedException, } from '@nestjs/common';
import { randomUUID, createHash } from 'node:crypto';
import { GoogleAuthService } from '../auth/google-auth.service.js';
import { MockGoogleDriveClient } from './mock-google-drive.client.js';
import { AuthGuard } from '../auth/auth.guard.js';
import { GOOGLE_DRIVE_CLIENT_TOKEN, } from './google-drive.interface.js';
import { LeaseLockService } from './lease-lock.service.js';
import { USER_REPOSITORY_TOKEN, } from '../database/user.repository.interface.js';
import { AesGcmService } from '../crypto/aes-gcm.service.js';
import { validateSaveEnvelopeV2, verifySaveIntegrity } from '@dhamrai/save-core';
const DEFAULT_SAVE_FILENAME = 'dhamrai_life_save.json';
let CloudSaveController = class CloudSaveController {
    _driveClient;
    _leaseLockService;
    _userRepository;
    _aesGcmService;
    _googleAuthService;
    constructor(_driveClient, _leaseLockService, _userRepository, _aesGcmService, _googleAuthService = new GoogleAuthService()) {
        this._driveClient = _driveClient;
        this._leaseLockService = _leaseLockService;
        this._userRepository = _userRepository;
        this._aesGcmService = _aesGcmService;
        this._googleAuthService = _googleAuthService;
    }
    /**
     * Retrieves player save envelope from Google Drive hidden appDataFolder.
     */
    async getCloudSave(req, customFileName, slotName = 'QuickSave') {
        const fileName = customFileName || DEFAULT_SAVE_FILENAME;
        const committed = await this._leaseLockService.getCommittedSave(req.user.userId, slotName);
        const committedFile = committed?.fileName;
        if (!committedFile)
            return { found: false, fileName, save: null };
        const accessToken = await this.resolveUserAccessToken(req.user.userId);
        const rawJson = await this._driveClient.getAppDataFile(accessToken, committedFile);
        if (!rawJson) {
            return {
                found: false,
                fileName,
                save: null,
            };
        }
        let parsed;
        try {
            parsed = JSON.parse(rawJson);
        }
        catch {
            throw new BadRequestException('Remote Drive save payload is not valid JSON.');
        }
        // Validate structure against canonical SaveEnvelopeV2
        const validatedSave = validateSaveEnvelopeV2(parsed);
        // Verify SHA-256 payload integrity
        await verifySaveIntegrity(validatedSave);
        if (validatedSave.slotName !== slotName)
            throw new BadRequestException('Remote save slot mismatch.');
        return {
            found: true,
            fileName,
            save: validatedSave,
            version: committed.version,
            checksumSha256: validatedSave.checksumSha256,
        };
    }
    /**
     * Acquires an optimistic concurrency lease lock for a save slot.
     */
    async acquireLease(req, body) {
        if (!body || !body.slotName) {
            throw new BadRequestException('slotName is required to acquire a save lease.');
        }
        const lease = await this._leaseLockService.acquireLease(req.user.userId, body.slotName, undefined, body.expectedVersion, body.ttlMs);
        return {
            slotName: lease.slotName,
            leaseToken: lease.leaseToken,
            acquiredAtMs: lease.acquiredAtMs,
            expiresAtMs: lease.expiresAtMs,
        };
    }
    /**
     * Uploads or updates a validated SaveEnvelopeV2 in Google Drive appDataFolder.
     * Enforces optimistic concurrency lease locking to prevent overwriting concurrent saves.
     */
    async putCloudSave(req, body) {
        if (!body || !body.save) {
            throw new BadRequestException('Request body must contain a "save" envelope.');
        }
        // 1. Strictly validate the incoming save envelope against canonical V2 schema
        const validatedSave = validateSaveEnvelopeV2(body.save);
        // 2. Verify SHA-256 integrity
        await verifySaveIntegrity(validatedSave);
        const slotName = validatedSave.slotName;
        // 3. Optimistic concurrency check: verify lease and prevent mid-air collisions
        const isValidLease = await this._leaseLockService.verifyLease(req.user.userId, slotName, body.leaseToken);
        if (!isValidLease) {
            throw new ConflictException(`Cloud save slot "${slotName}" is currently locked by another active session, or lease token is invalid/expired.`);
        }
        if (body.expectedVersion) {
            const knownVersion = await this._leaseLockService.getKnownVersion(req.user.userId, slotName);
            if (knownVersion && knownVersion !== body.expectedVersion) {
                throw new ConflictException(`Concurrent save collision on slot "${slotName}". Remote version is "${knownVersion}", but client expected "${body.expectedVersion}".`);
            }
        }
        // 4. Resolve Drive access token
        const accessToken = await this.resolveUserAccessToken(req.user.userId);
        // 5. Stage immutable content. A stale worker can leave an orphan, but it
        // cannot overwrite the canonical file or publish a superseded version.
        const version = randomUUID();
        const stagedFileName = `save_${req.user.userId}_${createHash('sha256').update(slotName).digest('hex').slice(0, 16)}_${version}.json`;
        // Upload to Google Drive hidden appDataFolder
        const serializedSave = JSON.stringify(validatedSave, null, 2);
        const result = await this._driveClient.uploadAppDataFile(accessToken, stagedFileName, serializedSave);
        // 6. Commit version and release lease
        await this._leaseLockService.commitVersionAndRelease(req.user.userId, slotName, body.leaseToken, version, stagedFileName);
        return {
            success: true,
            fileId: result.fileId,
            fileName: result.name,
            modifiedTime: result.modifiedTime,
            sizeBytes: result.sizeBytes,
            version,
            checksumSha256: validatedSave.checksumSha256,
        };
    }
    async resolveUserAccessToken(userId) {
        const user = await this._userRepository.findById(userId);
        if (!user) {
            throw new NotFoundException(`User record not found: ${userId}`);
        }
        if (this._driveClient instanceof MockGoogleDriveClient && process.env['NODE_ENV'] !== 'production') {
            return `test_drive_${user.id}`;
        }
        if (user.encryptedRefreshToken === 'no_refresh_token_provided')
            throw new UnauthorizedException('Drive authorization required.');
        let refreshToken;
        try {
            refreshToken = this._aesGcmService.decrypt({ ciphertextHex: user.encryptedRefreshToken,
                ivHex: user.encryptionIv, tagHex: user.encryptionTag });
        }
        catch {
            throw new UnauthorizedException('Stored Drive authorization is invalid.');
        }
        return this._googleAuthService.refreshAccessToken(refreshToken);
    }
};
__decorate([
    Get(),
    __param(0, Req()),
    __param(1, Query('fileName')),
    __param(2, Query('slotName')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], CloudSaveController.prototype, "getCloudSave", null);
__decorate([
    Post('lease'),
    __param(0, Req()),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], CloudSaveController.prototype, "acquireLease", null);
__decorate([
    Put(),
    __param(0, Req()),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], CloudSaveController.prototype, "putCloudSave", null);
CloudSaveController = __decorate([
    Controller('cloud-save'),
    UseGuards(AuthGuard),
    __param(0, Inject(GOOGLE_DRIVE_CLIENT_TOKEN)),
    __param(2, Inject(USER_REPOSITORY_TOKEN)),
    __metadata("design:paramtypes", [Object, LeaseLockService, Object, AesGcmService,
        GoogleAuthService])
], CloudSaveController);
export { CloudSaveController };
//# sourceMappingURL=cloud-save.controller.js.map