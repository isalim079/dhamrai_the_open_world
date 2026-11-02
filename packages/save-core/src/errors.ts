/**
 * Dhamrai Life — Save Core Errors
 * =================================
 * Explicit error types for validation, checksum verification, migration, and storage operations.
 */

export class SaveSystemError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SaveSystemError';
  }
}

export class InvalidSaveSchemaError extends SaveSystemError {
  public readonly issues: unknown[];

  constructor(message: string, issues: unknown[] = []) {
    super(message);
    this.name = 'InvalidSaveSchemaError';
    this.issues = issues;
  }
}

export class ChecksumMismatchError extends SaveSystemError {
  public readonly expected: string;
  public readonly actual: string;

  constructor(expected: string, actual: string) {
    super(
      `Save payload consistency verification failed: Checksum mismatch. Expected: "${expected}", Computed: "${actual}". Possible accidental file corruption, truncation, or payload inconsistency detected. (Note: ordinary unkeyed SHA-256 verifies internal payload consistency and detects accidental corruption; it does not protect against deliberate malicious modification).`
    );
    this.name = 'ChecksumMismatchError';
    this.expected = expected;
    this.actual = actual;
  }
}

export class UnsupportedFutureVersionError extends SaveSystemError {
  public readonly detectedVersion: number;
  public readonly maxSupportedVersion: number;

  constructor(detectedVersion: number, maxSupportedVersion: number) {
    super(
      `Save schema version ${detectedVersion} is newer than the highest supported version (${maxSupportedVersion}). Please update Dhamrai Life to load this save.`
    );
    this.name = 'UnsupportedFutureVersionError';
    this.detectedVersion = detectedVersion;
    this.maxSupportedVersion = maxSupportedVersion;
  }
}

export class InvalidSaveVersionError extends SaveSystemError {
  constructor(message: string) {
    super(`Invalid save version: ${message}`);
    this.name = 'InvalidSaveVersionError';
  }
}

export class MigrationFailedError extends SaveSystemError {
  public readonly fromVersion: number;
  public readonly toVersion: number;
  public override readonly cause?: Error;

  constructor(fromVersion: number, toVersion: number, reason: string, cause?: Error) {
    super(`Migration failed from schema v${fromVersion} to v${toVersion}: ${reason}`);
    this.name = 'MigrationFailedError';
    this.fromVersion = fromVersion;
    this.toVersion = toVersion;
    this.cause = cause;
  }
}

export class SaveSlotNotFoundError extends SaveSystemError {
  public readonly slotName: string;

  constructor(slotName: string) {
    super(`Save slot "${slotName}" was not found.`);
    this.name = 'SaveSlotNotFoundError';
    this.slotName = slotName;
  }
}

export class SnapshotRestorationConflictError extends SaveSystemError {
  public readonly slotName: string;
  public readonly reason: string;

  constructor(slotName: string, reason: string) {
    super(`Cannot restore snapshot to slot "${slotName}": ${reason}`);
    this.name = 'SnapshotRestorationConflictError';
    this.slotName = slotName;
    this.reason = reason;
  }
}
