/**
 * Dhamrai Life — Cloud Save Controller
 * =====================================
 * Handles cloud save retrieval, optimistic concurrency lease locking,
 * Zod validation against SaveEnvelopeV2, and Google Drive `appDataFolder` persistence.
 */

import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  Query,
  UseGuards,
  Req,
  Inject,
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { randomUUID, createHash } from 'node:crypto';
import { GoogleAuthService } from '../auth/google-auth.service.js';
import { MockGoogleDriveClient } from './mock-google-drive.client.js';
import { AuthGuard, AuthenticatedRequest } from '../auth/auth.guard.js';
import {
  IGoogleDriveClient,
  GOOGLE_DRIVE_CLIENT_TOKEN,
} from './google-drive.interface.js';
import { LeaseLockService } from './lease-lock.service.js';
import {
  IUserRepository,
  USER_REPOSITORY_TOKEN,
} from '../database/user.repository.interface.js';
import { AesGcmService } from '../crypto/aes-gcm.service.js';
import { validateSaveEnvelopeV2, verifySaveIntegrity } from '@dhamrai/save-core';
import { SaveEnvelopeV2 } from '@dhamrai/shared-contracts';

const DEFAULT_SAVE_FILENAME = 'dhamrai_life_save.json';

export interface PutCloudSaveDto {
  save: SaveEnvelopeV2;
  leaseToken?: string;
  expectedVersion?: string;
  fileName?: string;
}

export interface AcquireLeaseDto {
  slotName: string;
  expectedVersion?: string;
  ttlMs?: number;
}

@Controller('cloud-save')
@UseGuards(AuthGuard)
export class CloudSaveController {
  constructor(
    @Inject(GOOGLE_DRIVE_CLIENT_TOKEN) private readonly _driveClient: IGoogleDriveClient,
    private readonly _leaseLockService: LeaseLockService,
    @Inject(USER_REPOSITORY_TOKEN) private readonly _userRepository: IUserRepository,
    private readonly _aesGcmService: AesGcmService,
    private readonly _googleAuthService: GoogleAuthService = new GoogleAuthService()
  ) {}

  /**
   * Retrieves player save envelope from Google Drive hidden appDataFolder.
   */
  @Get()
  public async getCloudSave(
    @Req() req: AuthenticatedRequest,
    @Query('fileName') customFileName?: string,
    @Query('slotName') slotName: string = 'QuickSave'
  ) {
    const fileName = customFileName || DEFAULT_SAVE_FILENAME;
    const committed = await this._leaseLockService.getCommittedSave(req.user.userId, slotName);
    const committedFile = committed?.fileName;
    if (!committedFile) return { found: false, fileName, save: null };
    const accessToken = await this.resolveUserAccessToken(req.user.userId);

    const rawJson = await this._driveClient.getAppDataFile(accessToken, committedFile);
    if (!rawJson) {
      return {
        found: false,
        fileName,
        save: null,
      };
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawJson);
    } catch {
      throw new BadRequestException('Remote Drive save payload is not valid JSON.');
    }

    // Validate structure against canonical SaveEnvelopeV2
    const validatedSave = validateSaveEnvelopeV2(parsed);

    // Verify SHA-256 payload integrity
    await verifySaveIntegrity(validatedSave as unknown as Record<string, unknown>);

    if (validatedSave.slotName !== slotName) throw new BadRequestException('Remote save slot mismatch.');

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
  @Post('lease')
  public async acquireLease(
    @Req() req: AuthenticatedRequest,
    @Body() body: AcquireLeaseDto
  ) {
    if (!body || !body.slotName) {
      throw new BadRequestException('slotName is required to acquire a save lease.');
    }

    const lease = await this._leaseLockService.acquireLease(
      req.user.userId,
      body.slotName,
      undefined,
      body.expectedVersion,
      body.ttlMs
    );

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
  @Put()
  public async putCloudSave(
    @Req() req: AuthenticatedRequest,
    @Body() body: PutCloudSaveDto
  ) {
    if (!body || !body.save) {
      throw new BadRequestException('Request body must contain a "save" envelope.');
    }

    // 1. Strictly validate the incoming save envelope against canonical V2 schema
    const validatedSave = validateSaveEnvelopeV2(body.save);

    // 2. Verify SHA-256 integrity
    await verifySaveIntegrity(validatedSave as unknown as Record<string, unknown>);

    const slotName = validatedSave.slotName;

    // 3. Optimistic concurrency check: verify lease and prevent mid-air collisions
    const isValidLease = await this._leaseLockService.verifyLease(
      req.user.userId,
      slotName,
      body.leaseToken
    );
    if (!isValidLease) {
      throw new ConflictException(
        `Cloud save slot "${slotName}" is currently locked by another active session, or lease token is invalid/expired.`
      );
    }

    if (body.expectedVersion) {
      const knownVersion = await this._leaseLockService.getKnownVersion(req.user.userId, slotName);
      if (knownVersion && knownVersion !== body.expectedVersion) {
        throw new ConflictException(
          `Concurrent save collision on slot "${slotName}". Remote version is "${knownVersion}", but client expected "${body.expectedVersion}".`
        );
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
    const result = await this._driveClient.uploadAppDataFile(
      accessToken,
      stagedFileName,
      serializedSave
    );

    // 6. Commit version and release lease
    await this._leaseLockService.commitVersionAndRelease(
      req.user.userId,
      slotName,
      body.leaseToken,
      version,
      stagedFileName
    );

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

  private async resolveUserAccessToken(userId: string): Promise<string> {
    const user = await this._userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException(`User record not found: ${userId}`);
    }

    if (this._driveClient instanceof MockGoogleDriveClient && process.env['NODE_ENV'] !== 'production') {
      return `test_drive_${user.id}`;
    }
    if (user.encryptedRefreshToken === 'no_refresh_token_provided') throw new UnauthorizedException('Drive authorization required.');
    let refreshToken: string;
    try {
      refreshToken = this._aesGcmService.decrypt({ ciphertextHex: user.encryptedRefreshToken,
        ivHex: user.encryptionIv, tagHex: user.encryptionTag });
    } catch { throw new UnauthorizedException('Stored Drive authorization is invalid.'); }
    return this._googleAuthService.refreshAccessToken(refreshToken);
  }
}
