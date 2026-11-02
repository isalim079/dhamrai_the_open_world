/**
 * Dhamrai Life — SHA-256 Payload Consistency & Corruption Hasher
 * =================================================================
 * Platform-independent, deterministic SHA-256 hashing for save payload consistency
 * verification and accidental corruption detection (e.g. storage bit flips, truncation,
 * or inadvertent edits).
 *
 * Security & Integrity Note:
 * This module computes an unkeyed SHA-256 digest to verify payload consistency and
 * detect accidental data corruption. It does NOT protect against deliberate malicious
 * modification, because an adversary with access to the storage layer could modify
 * values and recompute the unkeyed hash.
 *
 * Uses standard Web Crypto (globalThis.crypto.subtle) available across modern browsers and Node 18+.
 */

import { ChecksumMismatchError } from '../errors.js';

/**
 * Deterministically serializes any JavaScript value to a canonical JSON string
 * with lexicographically sorted object keys to guarantee identical digests.
 */
export function canonicalizeJson(value: unknown, excludeChecksumKey: boolean = false): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value) ?? 'null';
  }

  if (Array.isArray(value)) {
    return '[' + value.map((item) => canonicalizeJson(item, false)).join(',') + ']';
  }

  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  const entries: string[] = [];

  for (const key of keys) {
    if (excludeChecksumKey && key === 'checksumSha256') {
      continue;
    }
    const val = obj[key];
    if (val === undefined) {
      continue;
    }
    entries.push(`${JSON.stringify(key)}:${canonicalizeJson(val, false)}`);
  }

  return '{' + entries.join(',') + '}';
}

/**
 * Computes a SHA-256 hex digest for a save envelope or any JavaScript object.
 * Excludes the `checksumSha256` field from the hash payload.
 */
export async function computeSaveChecksum(saveObject: Record<string, unknown>): Promise<string> {
  const canonicalString = canonicalizeJson(saveObject, true);
  const encoder = new TextEncoder();
  const data = encoder.encode(canonicalString);

  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    throw new Error('Web Crypto API (globalThis.crypto.subtle) is not available in this environment.');
  }

  const hashBuffer = await subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Attaches a computed SHA-256 checksum to a save object, returning a fresh copy.
 */
export async function attachChecksum<T extends object>(
  saveObject: T
): Promise<T & { checksumSha256: string }> {
  const checksumSha256 = await computeSaveChecksum(saveObject as unknown as Record<string, unknown>);
  return {
    ...saveObject,
    checksumSha256,
  };
}

/**
 * Verifies that the save object's `checksumSha256` matches the computed digest of its contents.
 * Detects payload inconsistency or accidental corruption.
 * Throws ChecksumMismatchError if the checksum does not match.
 */
export async function verifySaveIntegrity(
  saveObject: Record<string, unknown>
): Promise<{ valid: boolean; computed: string; expected: string }> {
  const expected = typeof saveObject['checksumSha256'] === 'string' ? saveObject['checksumSha256'] : '';
  const computed = await computeSaveChecksum(saveObject);

  if (!expected || expected !== computed) {
    throw new ChecksumMismatchError(expected, computed);
  }

  return { valid: true, computed, expected };
}
