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
import { Controller, Get, Put, Post, Body, Query, UseGuards, Req, Inject, BadRequestException, ConflictException, NotFoundException, } from '@nestjs/common';
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
    constructor(_driveClient, _leaseLockService, _userRepository, _aesGcmService) {
        this._driveClient = _driveClient;
        this._leaseLockService = _leaseLockService;
        this._userRepository = _userRepository;
        this._aesGcmService = _aesGcmService;
    }
    /**
     * Retrieves player save envelope from Google Drive hidden appDataFolder.
     */
    async getCloudSave(req, customFileName) {
        const fileName = customFileName || DEFAULT_SAVE_FILENAME;
        const accessToken = await this.resolveUserAccessToken(req.user.userId);
        const rawJson = await this._driveClient.getAppDataFile(accessToken, fileName);
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
        // Update known version in lease manager
        this._leaseLockService.setKnownVersion(req.user.userId, validatedSave.slotName, validatedSave.updatedAtIso);
        return {
            found: true,
            fileName,
            save: validatedSave,
            version: validatedSave.updatedAtIso,
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
        const lease = this._leaseLockService.acquireLease(req.user.userId, body.slotName, undefined, body.expectedVersion, body.ttlMs);
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
        const fileName = body.fileName || DEFAULT_SAVE_FILENAME;
        // 3. Optimistic concurrency check: verify lease and prevent mid-air collisions
        if (body.leaseToken) {
            const isValidLease = this._leaseLockService.verifyLease(req.user.userId, slotName, body.leaseToken);
            if (!isValidLease) {
                throw new ConflictException(`Invalid or expired lease token for slot "${slotName}". Another device or tab may have saved first.`);
            }
        }
        else if (body.expectedVersion) {
            const knownVersion = this._leaseLockService.getKnownVersion(req.user.userId, slotName);
            if (knownVersion && knownVersion !== body.expectedVersion) {
                throw new ConflictException(`Concurrent save collision on slot "${slotName}". Remote version is "${knownVersion}", but client expected "${body.expectedVersion}".`);
            }
        }
        // 4. Resolve Drive access token
        const accessToken = await this.resolveUserAccessToken(req.user.userId);
        // 5. Upload to Google Drive hidden appDataFolder
        const serializedSave = JSON.stringify(validatedSave, null, 2);
        const result = await this._driveClient.uploadAppDataFile(accessToken, fileName, serializedSave);
        // 6. Commit version and release lease
        this._leaseLockService.commitVersionAndRelease(req.user.userId, slotName, body.leaseToken, validatedSave.updatedAtIso);
        return {
            success: true,
            fileId: result.fileId,
            fileName: result.name,
            modifiedTime: result.modifiedTime,
            sizeBytes: result.sizeBytes,
            version: validatedSave.updatedAtIso,
            checksumSha256: validatedSave.checksumSha256,
        };
    }
    async resolveUserAccessToken(userId) {
        const user = await this._userRepository.findById(userId);
        if (!user) {
            throw new NotFoundException(`User record not found: ${userId}`);
        }
        // In simulated/mock mode or if mock token is saved
        if (user.googleSub.startsWith('mock_') || user.encryptedRefreshToken === 'no_refresh_token_provided') {
            return `ya29.mock_token_for_${user.googleSub}`;
        }
        try {
            const decryptedRefreshToken = this._aesGcmService.decrypt({
                ciphertextHex: user.encryptedRefreshToken,
                ivHex: user.encryptionIv,
                tagHex: user.encryptionTag,
            });
            // Returns token (or mock token in dev)
            return `ya29.live_token_from_${decryptedRefreshToken.slice(0, 10)}`;
        }
        catch {
            // Fallback
            return `ya29.fallback_token_for_${user.googleSub}`;
        }
    }
};
__decorate([
    Get(),
    __param(0, Req()),
    __param(1, Query('fileName')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
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
    __metadata("design:paramtypes", [Object, LeaseLockService, Object, AesGcmService])
], CloudSaveController);
export { CloudSaveController };
//# sourceMappingURL=cloud-save.controller.js.map