import { describe, it, expect } from 'vitest';
import {
  validateSaveEnvelopeV1,
  validateSaveEnvelopeV2,
  InvalidSaveSchemaError,
} from '../src/index.js';
import { SaveEnvelopeV1, SaveEnvelopeV2 } from '@dhamrai/shared-contracts';

function createValidSaveEnvelopeV1(): SaveEnvelopeV1 {
  return {
    saveSchemaVersion: 1,
    saveId: 'save_v1_001',
    slotName: 'Slot 1',
    createdAtIso: '2026-11-02T12:00:00.000Z',
    updatedAtIso: '2026-11-02T12:05:00.000Z',
    player: {
      roleId: 'rickshaw_driver',
      position: { x: -73.1, y: 1.0, z: -221.3 },
      headingRadians: 1.57,
      isInVehicle: true,
      vehicleState: {
        id: 'rickshaw_01',
        speedMps: 4.2,
        steeringAngleRad: 0.05,
        damagePercent: 12,
      },
      cashPence: 23000,
      reputation: 15,
    },
    missions: {
      mission_1_first_fare: {
        state: 'COMPLETED',
        completedObjectiveIds: ['obj_m1_pickup', 'obj_m1_dropoff'],
        startedAtMs: 1000,
        completedAtMs: 4000,
      },
    },
    ledger: [
      {
        id: 'tx_01',
        timestampMs: 1000,
        category: 'INITIAL_BALANCE',
        deltaPence: 25000,
        description: 'Starting cash',
        runningBalancePence: 25000,
      },
      {
        id: 'tx_02',
        timestampMs: 2000,
        category: 'VEHICLE_RENTAL',
        deltaPence: -5000,
        description: 'Daily rickshaw rent',
        runningBalancePence: 20000,
      },
      {
        id: 'tx_03',
        timestampMs: 4000,
        category: 'FARE_PAYMENT',
        deltaPence: 3000,
        description: 'Fare payout',
        runningBalancePence: 23000,
      },
    ],
    worldFlags: {
      tutorialCompleted: true,
      weatherCondition: 'monsoon_clear',
    },
    checksumSha256: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
  };
}

function createValidSaveEnvelopeV2(): SaveEnvelopeV2 {
  return {
    saveSchemaVersion: 2,
    saveId: 'save_v2_001',
    slotName: 'Slot 1',
    createdAtIso: '2026-11-02T12:00:00.000Z',
    updatedAtIso: '2026-11-02T12:05:00.000Z',
    player: {
      roleId: 'rickshaw_driver',
      position: { x: -73.1, y: 1.0, z: -221.3 },
      headingRadians: 1.57,
      isInVehicle: true,
      vehicleState: {
        id: 'rickshaw_01',
        speedMps: 4.2,
        steeringAngleRad: 0.05,
        damagePercent: 12,
      },
      cashMinorUnits: 23000,
      currency: 'BDT',
      reputation: 15,
    },
    inventory: [
      {
        id: 'rickshaw_license_slip',
        nameBn: 'রিকশা চালানোর অনুমতিপত্র',
        nameEn: 'Rickshaw License Slip',
        category: 'DOCUMENT',
        quantity: 1,
        isStackable: false,
        maxStackSize: 1,
        descriptionBn: 'ধামরাই পৌরসভা কর্তৃক অনুমোদিত লাইসেন্স স্লিপ।',
        descriptionEn: 'Authorized permit issued by Dhamrai Pourashava.',
        metadata: { issuedYear: 2026 },
      },
      {
        id: 'brass_casket',
        nameBn: 'পিতলের কৌটা',
        nameEn: 'Brass Casket',
        category: 'CARGO',
        quantity: 3,
        isStackable: true,
        maxStackSize: 10,
        descriptionBn: 'ঐতিহ্যবাহী কাঁসা-পিতলের কাজ',
        descriptionEn: 'Handcrafted Dhamrai brass cargo',
      },
    ],
    missions: {
      mission_1_first_fare: {
        state: 'COMPLETED',
        completedObjectiveIds: ['obj_m1_pickup', 'obj_m1_dropoff'],
        startedAtMs: 1000,
        completedAtMs: 4000,
      },
    },
    ledger: [
      {
        id: 'tx_01',
        timestampMs: 1000,
        category: 'INITIAL_BALANCE',
        deltaMinorUnits: 25000,
        currency: 'BDT',
        description: 'Starting cash',
        runningBalanceMinorUnits: 25000,
      },
      {
        id: 'tx_02',
        timestampMs: 2000,
        category: 'VEHICLE_RENTAL',
        deltaMinorUnits: -5000,
        currency: 'BDT',
        description: 'Daily rickshaw rent',
        runningBalanceMinorUnits: 20000,
      },
      {
        id: 'tx_03',
        timestampMs: 4000,
        category: 'FARE_PAYMENT',
        deltaMinorUnits: 3000,
        currency: 'BDT',
        description: 'Fare payout',
        runningBalanceMinorUnits: 23000,
      },
    ],
    worldFlags: {
      tutorialCompleted: true,
      weatherCondition: 'monsoon_clear',
    },
    checksumSha256: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
  };
}

describe('Save Core — Zod Schema Validation', () => {
  describe('Legacy SaveEnvelopeV1 Schema', () => {
    it('accepts a fully compliant legacy SaveEnvelopeV1 payload', () => {
      const valid = createValidSaveEnvelopeV1();
      const result = validateSaveEnvelopeV1(valid);
      expect(result.saveSchemaVersion).toBe(1);
      expect(result.player.cashPence).toBe(23000);
      expect(result.ledger.length).toBe(3);
      expect(result.ledger[0]?.deltaPence).toBe(25000);
    });

    it('rejects floating-point currency in legacy player cashPence', () => {
      const invalid: any = createValidSaveEnvelopeV1();
      invalid.player.cashPence = 23000.75;

      expect(() => validateSaveEnvelopeV1(invalid)).toThrowError(InvalidSaveSchemaError);
      expect(() => validateSaveEnvelopeV1(invalid)).toThrowError(/player\.cashPence/);
    });

    it('rejects floating-point delta in legacy transaction ledger', () => {
      const invalid: any = createValidSaveEnvelopeV1();
      invalid.ledger[0].deltaPence = 25000.5;

      expect(() => validateSaveEnvelopeV1(invalid)).toThrowError(InvalidSaveSchemaError);
      expect(() => validateSaveEnvelopeV1(invalid)).toThrowError(/ledger\.0\.deltaPence/);
    });
  });

  describe('Canonical SaveEnvelopeV2 Schema', () => {
    it('accepts a fully compliant SaveEnvelopeV2 payload', () => {
      const valid = createValidSaveEnvelopeV2();
      const result = validateSaveEnvelopeV2(valid);
      expect(result.saveSchemaVersion).toBe(2);
      expect(result.player.cashMinorUnits).toBe(23000);
      expect(result.player.currency).toBe('BDT');
      expect(result.inventory.length).toBe(2);
      expect(result.ledger.length).toBe(3);
      expect(result.ledger[0]?.currency).toBe('BDT');
    });

    it('rejects floating-point currency in player cashMinorUnits with explicit error', () => {
      const invalid: any = createValidSaveEnvelopeV2();
      invalid.player.cashMinorUnits = 23000.75; // Non-integer money!

      expect(() => validateSaveEnvelopeV2(invalid)).toThrowError(InvalidSaveSchemaError);
      expect(() => validateSaveEnvelopeV2(invalid)).toThrowError(/player\.cashMinorUnits/);
    });

    it('rejects currency other than BDT in player state', () => {
      const invalid: any = createValidSaveEnvelopeV2();
      invalid.player.currency = 'USD';

      expect(() => validateSaveEnvelopeV2(invalid)).toThrowError(InvalidSaveSchemaError);
      expect(() => validateSaveEnvelopeV2(invalid)).toThrowError(/player\.currency/);
    });

    it('rejects floating-point delta in transaction ledger', () => {
      const invalid: any = createValidSaveEnvelopeV2();
      invalid.ledger[0].deltaMinorUnits = 25000.5;

      expect(() => validateSaveEnvelopeV2(invalid)).toThrowError(InvalidSaveSchemaError);
      expect(() => validateSaveEnvelopeV2(invalid)).toThrowError(/ledger\.0\.deltaMinorUnits/);
    });

    it('rejects negative inventory quantity', () => {
      const invalid: any = createValidSaveEnvelopeV2();
      invalid.inventory[0].quantity = -1;

      expect(() => validateSaveEnvelopeV2(invalid)).toThrowError(InvalidSaveSchemaError);
      expect(() => validateSaveEnvelopeV2(invalid)).toThrowError(/inventory\.0\.quantity/);
    });

    it('rejects invalid item category enum values', () => {
      const invalid: any = createValidSaveEnvelopeV2();
      invalid.inventory[0].category = 'WEAPON'; // Not in ItemCategory enum

      expect(() => validateSaveEnvelopeV2(invalid)).toThrowError(InvalidSaveSchemaError);
      expect(() => validateSaveEnvelopeV2(invalid)).toThrowError(/inventory\.0\.category/);
    });

    it('rejects invalid mission state enum values', () => {
      const invalid: any = createValidSaveEnvelopeV2();
      invalid.missions['mission_1_first_fare'].state = 'IN_PROGRESS'; // Should be 'ACTIVE'

      expect(() => validateSaveEnvelopeV2(invalid)).toThrowError(InvalidSaveSchemaError);
      expect(() => validateSaveEnvelopeV2(invalid)).toThrowError(/missions\.mission_1_first_fare\.state/);
    });

    it('rejects malformed SHA-256 checksum strings', () => {
      const invalid: any = createValidSaveEnvelopeV2();
      invalid.checksumSha256 = 'not_a_valid_hex_hash';

      expect(() => validateSaveEnvelopeV2(invalid)).toThrowError(InvalidSaveSchemaError);
      expect(() => validateSaveEnvelopeV2(invalid)).toThrowError(/checksumSha256/);
    });

    it('rejects missing required fields like player or slotName', () => {
      const missingPlayer: any = createValidSaveEnvelopeV2();
      delete missingPlayer.player;

      expect(() => validateSaveEnvelopeV2(missingPlayer)).toThrowError(InvalidSaveSchemaError);

      const emptySlot: any = createValidSaveEnvelopeV2();
      emptySlot.slotName = '';
      expect(() => validateSaveEnvelopeV2(emptySlot)).toThrowError(InvalidSaveSchemaError);
    });
  });
});
