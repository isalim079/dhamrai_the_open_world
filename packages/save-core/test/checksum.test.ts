import { describe, it, expect } from 'vitest';
import {
  canonicalizeJson,
  computeSaveChecksum,
  attachChecksum,
  verifySaveIntegrity,
  ChecksumMismatchError,
} from '../src/index.js';

describe('Save Core — SHA-256 Consistency Hasher & Canonical JSON', () => {
  it('guarantees deterministic JSON serialization regardless of key insertion order', () => {
    const objA = {
      saveSchemaVersion: 2,
      slotName: 'Slot 1',
      player: { cashMinorUnits: 25000, currency: 'BDT', reputation: 10 },
      flags: { a: 1, b: 2 },
    };

    const objB = {
      flags: { b: 2, a: 1 },
      player: { reputation: 10, currency: 'BDT', cashMinorUnits: 25000 },
      slotName: 'Slot 1',
      saveSchemaVersion: 2,
    };

    const canonicalA = canonicalizeJson(objA);
    const canonicalB = canonicalizeJson(objB);

    expect(canonicalA).toBe(canonicalB);
  });

  it('computes identical SHA-256 hashes for reordered objects', async () => {
    const objA = {
      saveSchemaVersion: 2,
      slotName: 'Slot 1',
      cashMinorUnits: 25000,
      currency: 'BDT',
      inventory: [{ id: 'slip', quantity: 1 }],
    };

    const objB = {
      inventory: [{ id: 'slip', quantity: 1 }],
      currency: 'BDT',
      cashMinorUnits: 25000,
      saveSchemaVersion: 2,
      slotName: 'Slot 1',
    };

    const hashA = await computeSaveChecksum(objA);
    const hashB = await computeSaveChecksum(objB);

    expect(hashA).toBe(hashB);
    expect(hashA).toMatch(/^[0-9a-f]{64}$/);
  });

  it('attaches checksum and verifies payload consistency successfully', async () => {
    const payload = {
      saveSchemaVersion: 2,
      saveId: 'save_001',
      slotName: 'QuickSave',
      cashMinorUnits: 25000,
      currency: 'BDT',
    };

    const withChecksum = await attachChecksum(payload);
    expect(withChecksum.checksumSha256).toBeDefined();
    expect(withChecksum.checksumSha256.length).toBe(64);

    const verification = await verifySaveIntegrity(withChecksum);
    expect(verification.valid).toBe(true);
    expect(verification.computed).toBe(withChecksum.checksumSha256);
  });

  it('detects accidental corruption or payload alteration and throws ChecksumMismatchError when cash is modified', async () => {
    const payload = {
      saveSchemaVersion: 2,
      saveId: 'save_001',
      slotName: 'QuickSave',
      player: { cashMinorUnits: 25000, currency: 'BDT' },
    };

    const withChecksum = await attachChecksum(payload);

    // Inconsistent payload modification
    (withChecksum.player as any).cashMinorUnits = 1000000;

    await expect(verifySaveIntegrity(withChecksum)).rejects.toThrowError(ChecksumMismatchError);

    try {
      await verifySaveIntegrity(withChecksum);
      expect.fail('Should have thrown ChecksumMismatchError');
    } catch (err) {
      expect(err).toBeInstanceOf(ChecksumMismatchError);
      const mismatch = err as ChecksumMismatchError;
      expect(mismatch.expected).not.toBe(mismatch.actual);
      expect(mismatch.message).toContain('consistency verification failed');
    }
  });

  it('detects corruption when inventory items are altered or removed', async () => {
    const payload = {
      saveSchemaVersion: 2,
      saveId: 'save_001',
      slotName: 'QuickSave',
      inventory: [{ id: 'rickshaw_license', quantity: 1 }],
    };

    const withChecksum = await attachChecksum(payload);

    // Corrupted item quantity
    withChecksum.inventory[0]!.quantity = 99;

    await expect(verifySaveIntegrity(withChecksum)).rejects.toThrowError(ChecksumMismatchError);
  });
});
