/**
 * Dhamrai Life — Cloud Save Controller
 * =====================================
 * Handles cloud save retrieval, optimistic concurrency lease locking,
 * Zod validation against SaveEnvelopeV2, and Google Drive `appDataFolder` persistence.
 */
import { AuthenticatedRequest } from '../auth/auth.guard.js';
import { IGoogleDriveClient } from './google-drive.interface.js';
import { LeaseLockService } from './lease-lock.service.js';
import { IUserRepository } from '../database/user.repository.interface.js';
import { AesGcmService } from '../crypto/aes-gcm.service.js';
import { SaveEnvelopeV2 } from '@dhamrai/shared-contracts';
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
export declare class CloudSaveController {
    private readonly _driveClient;
    private readonly _leaseLockService;
    private readonly _userRepository;
    private readonly _aesGcmService;
    constructor(_driveClient: IGoogleDriveClient, _leaseLockService: LeaseLockService, _userRepository: IUserRepository, _aesGcmService: AesGcmService);
    /**
     * Retrieves player save envelope from Google Drive hidden appDataFolder.
     */
    getCloudSave(req: AuthenticatedRequest, customFileName?: string): Promise<{
        found: boolean;
        fileName: string;
        save: null;
        version?: undefined;
        checksumSha256?: undefined;
    } | {
        found: boolean;
        fileName: string;
        save: SaveEnvelopeV2;
        version: string;
        checksumSha256: string;
    }>;
    /**
     * Acquires an optimistic concurrency lease lock for a save slot.
     */
    acquireLease(req: AuthenticatedRequest, body: AcquireLeaseDto): Promise<{
        slotName: string;
        leaseToken: string;
        acquiredAtMs: number;
        expiresAtMs: number;
    }>;
    /**
     * Uploads or updates a validated SaveEnvelopeV2 in Google Drive appDataFolder.
     * Enforces optimistic concurrency lease locking to prevent overwriting concurrent saves.
     */
    putCloudSave(req: AuthenticatedRequest, body: PutCloudSaveDto): Promise<{
        success: boolean;
        fileId: string;
        fileName: string;
        modifiedTime: string;
        sizeBytes: number;
        version: string;
        checksumSha256: string;
    }>;
    private resolveUserAccessToken;
}
//# sourceMappingURL=cloud-save.controller.d.ts.map