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
/**
 * Deterministically serializes any JavaScript value to a canonical JSON string
 * with lexicographically sorted object keys to guarantee identical digests.
 */
export declare function canonicalizeJson(value: unknown, excludeChecksumKey?: boolean): string;
/**
 * Computes a SHA-256 hex digest for a save envelope or any JavaScript object.
 * Excludes the `checksumSha256` field from the hash payload.
 */
export declare function computeSaveChecksum(saveObject: Record<string, unknown>): Promise<string>;
/**
 * Attaches a computed SHA-256 checksum to a save object, returning a fresh copy.
 */
export declare function attachChecksum<T extends object>(saveObject: T): Promise<T & {
    checksumSha256: string;
}>;
/**
 * Verifies that the save object's `checksumSha256` matches the computed digest of its contents.
 * Detects payload inconsistency or accidental corruption.
 * Throws ChecksumMismatchError if the checksum does not match.
 */
export declare function verifySaveIntegrity(saveObject: Record<string, unknown>): Promise<{
    valid: boolean;
    computed: string;
    expected: string;
}>;
//# sourceMappingURL=checksum.d.ts.map