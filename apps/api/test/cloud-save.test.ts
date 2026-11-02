import { describe, it, expect, beforeEach } from 'vitest';
import { ConflictException, BadRequestException } from '@nestjs/common';
import {
  CloudSaveController,
  MockGoogleDriveClient,
  LeaseLockService,
  InMemoryUserRepository,
  AesGcmService,
  AuthenticatedRequest,
} from '../src/index.js';
import { SaveEnvelopeV2 } from '@dhamrai/shared-contracts';
import { attachChecksum, InvalidSaveSchemaError } from '@dhamrai/save-core';

function createValidSaveEnvelopeV2(slotName: string = 'QuickSave'): SaveEnvelopeV2 {
  return {
    saveSchemaVersion: 2,
    saveId: 'save_slot_01',
    slotName,
    createdAtIso: '2026-11-02T12:00:00.000Z',
    updatedAtIso: '2026-11-02T12:05:00.000Z',
    player: {
      roleId: 'rickshaw_driver',
      position: { x: -73.1, y: 1.0, z: -221.3 },
      headingRadians: 0,
      isInVehicle: true,
      vehicleState: {
        id: 'rickshaw_01',
        speedMps: 0,
        steeringAngleRad: 0,
        damagePercent: 0,
      },
      cashMinorUnits: 23000,
      currency: 'BDT',
      reputation: 15,
    },
    inventory: [
      {
        id: 'rickshaw_license_slip',
        nameBn: 'রিকশার লাইসেন্স স্লিপ',
        nameEn: 'Rickshaw License Slip',
        category: 'DOCUMENT',
        quantity: 1,
        isStackable: false,
        maxStackSize: 1,
        descriptionBn: 'ধামরাই পৌরসভা অনুমোদিত প্যাডেল রিকশা চালানোর বৈধ্য কাগজ।',
        descriptionEn: 'Valid municipal permit issued for operating a pedal rickshaw in Dhamrai.',
      },
    ],
    missions: {
      mission_1_first_fare: {
        state: 'COMPLETED',
        completedObjectiveIds: ['obj_m1_pickup', 'obj_m1_dropoff'],
        startedAtMs: 3000,
        completedAtMs: 4000,
      },
    },
    ledger: [
      {
        id: 'tx_init',
        timestampMs: 1000,
        category: 'INITIAL_BALANCE',
        deltaMinorUnits: 25000,
        currency: 'BDT',
        description: 'Starting cash',
        runningBalanceMinorUnits: 25000,
      },
      {
        id: 'tx_rent',
        timestampMs: 2000,
        category: 'VEHICLE_RENTAL',
        deltaMinorUnits: -5000,
        currency: 'BDT',
        description: 'Daily rental fee',
        runningBalanceMinorUnits: 20000,
      },
      {
        id: 'tx_fare',
        timestampMs: 4000,
        category: 'FARE_PAYMENT',
        deltaMinorUnits: 3000,
        currency: 'BDT',
        description: 'First fare payout',
        runningBalanceMinorUnits: 23000,
      },
    ],
    worldFlags: {
      tutorialCompleted: true,
    },
    checksumSha256: '0000000000000000000000000000000000000000000000000000000000000000',
  };
}

describe('API Cloud Save — Google Drive Sync Service & Concurrency Control', () => {
  let mockDriveClient: MockGoogleDriveClient;
  let leaseLockService: LeaseLockService;
  let userRepository: InMemoryUserRepository;
  let aesGcmService: AesGcmService;
  let controller: CloudSaveController;

  const mockUserRequest: AuthenticatedRequest = {
    user: {
      userId: 'usr_test_user_01',
      googleSub: 'mock_sub_102030',
      email: 'driver@dhamrai.bd',
      exp: Math.floor(Date.now() / 1000) + 3600,
    },
    headers: { authorization: 'Bearer mock_session_token' },
  };

  beforeEach(async () => {
    mockDriveClient = new MockGoogleDriveClient();
    leaseLockService = new LeaseLockService();
    userRepository = new InMemoryUserRepository();
    aesGcmService = new AesGcmService();

    // Register user in repo
    await userRepository.save({
      id: 'usr_test_user_01',
      googleSub: 'mock_sub_102030',
      email: 'driver@dhamrai.bd',
      name: 'Dhamrai Puller',
      encryptedRefreshToken: 'no_refresh_token_provided',
      encryptionIv: '000000000000000000000000',
      encryptionTag: '00000000000000000000000000000000',
      createdAtIso: new Date().toISOString(),
      updatedAtIso: new Date().toISOString(),
    });

    controller = new CloudSaveController(
      mockDriveClient,
      leaseLockService,
      userRepository,
      aesGcmService
    );
  });

  it('GET /cloud-save returns found: false when no save exists in Drive appDataFolder', async () => {
    const response = await controller.getCloudSave(mockUserRequest);

    expect(response.found).toBe(false);
    expect(response.save).toBeNull();
  });

  it('PUT /cloud-save uploads valid SaveEnvelopeV2 to Drive and subsequent GET retrieves identical state', async () => {
    const rawEnvelope = createValidSaveEnvelopeV2('QuickSave');
    const validWithChecksum = await attachChecksum(rawEnvelope);

    const putResult = await controller.putCloudSave(mockUserRequest, {
      save: validWithChecksum,
    });

    expect(putResult.success).toBe(true);
    expect(putResult.fileId).toBeDefined();
    expect(putResult.checksumSha256).toBe(validWithChecksum.checksumSha256);

    // GET /cloud-save retrieves the uploaded envelope
    const getResult = await controller.getCloudSave(mockUserRequest);
    expect(getResult.found).toBe(true);
    expect(getResult.save).not.toBeNull();
    expect(getResult.save!.saveSchemaVersion).toBe(2);
    expect(getResult.save!.player.cashMinorUnits).toBe(23000);
    expect(getResult.save!.player.currency).toBe('BDT');
    expect(getResult.save!.inventory.length).toBe(1);
    expect(getResult.save!.inventory[0]?.id).toBe('rickshaw_license_slip');
    expect(getResult.save!.ledger.length).toBe(3);
    expect(getResult.checksumSha256).toBe(validWithChecksum.checksumSha256);
  });

  it('PUT /cloud-save rejects invalid save envelope violating canonical V2 schema', async () => {
    const invalid: any = createValidSaveEnvelopeV2();
    invalid.player.currency = 'USD'; // Invalid currency!

    await expect(
      controller.putCloudSave(mockUserRequest, {
        save: invalid,
      })
    ).rejects.toThrowError(InvalidSaveSchemaError);
  });

  it('PUT /cloud-save rejects payload with missing required fields with BadRequestException', async () => {
    await expect(
      controller.putCloudSave(mockUserRequest, {} as any)
    ).rejects.toThrowError(BadRequestException);
  });

  it('prevents concurrent save overwrites via optimistic lease locking', async () => {
    const rawEnvelope = createValidSaveEnvelopeV2('Slot_Alpha');
    const validWithChecksum = await attachChecksum(rawEnvelope);

    // Client Worker A acquires a lease lock for Slot_Alpha
    const lease = await controller.acquireLease(mockUserRequest, {
      slotName: 'Slot_Alpha',
      ttlMs: 15000,
    });
    expect(lease.leaseToken).toBeDefined();

    // Client Worker B attempts to write without a valid lease token while Worker A holds the lock
    await expect(
      controller.putCloudSave(mockUserRequest, {
        save: validWithChecksum,
        leaseToken: 'invalid_unauthorized_lease_token',
      })
    ).rejects.toThrowError(ConflictException);

    // Client Worker A completes write with the valid lease token
    const successResult = await controller.putCloudSave(mockUserRequest, {
      save: validWithChecksum,
      leaseToken: lease.leaseToken,
    });
    expect(successResult.success).toBe(true);
  });

  it('detects mid-air collision when expectedVersion is stale', async () => {
    const envelopeV1 = await attachChecksum(createValidSaveEnvelopeV2('Slot_Beta'));
    await controller.putCloudSave(mockUserRequest, { save: envelopeV1 });

    // Client B attempts to save expecting an obsolete version
    const envelopeV2 = await attachChecksum({
      ...createValidSaveEnvelopeV2('Slot_Beta'),
      updatedAtIso: '2026-11-02T13:00:00.000Z',
    });

    await expect(
      controller.putCloudSave(mockUserRequest, {
        save: envelopeV2,
        expectedVersion: 'stale_pre_historic_version_timestamp',
      })
    ).rejects.toThrowError(ConflictException);
  });
});
