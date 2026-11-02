/**
 * Dhamrai Life — Save Core Errors
 * =================================
 * Explicit error types for validation, checksum verification, migration, and storage operations.
 */
export class SaveSystemError extends Error {
    constructor(message) {
        super(message);
        this.name = 'SaveSystemError';
    }
}
export class InvalidSaveSchemaError extends SaveSystemError {
    issues;
    constructor(message, issues = []) {
        super(message);
        this.name = 'InvalidSaveSchemaError';
        this.issues = issues;
    }
}
export class ChecksumMismatchError extends SaveSystemError {
    expected;
    actual;
    constructor(expected, actual) {
        super(`Save payload consistency verification failed: Checksum mismatch. Expected: "${expected}", Computed: "${actual}". Possible accidental file corruption, truncation, or payload inconsistency detected. (Note: ordinary unkeyed SHA-256 verifies internal payload consistency and detects accidental corruption; it does not protect against deliberate malicious modification).`);
        this.name = 'ChecksumMismatchError';
        this.expected = expected;
        this.actual = actual;
    }
}
export class UnsupportedFutureVersionError extends SaveSystemError {
    detectedVersion;
    maxSupportedVersion;
    constructor(detectedVersion, maxSupportedVersion) {
        super(`Save schema version ${detectedVersion} is newer than the highest supported version (${maxSupportedVersion}). Please update Dhamrai Life to load this save.`);
        this.name = 'UnsupportedFutureVersionError';
        this.detectedVersion = detectedVersion;
        this.maxSupportedVersion = maxSupportedVersion;
    }
}
export class InvalidSaveVersionError extends SaveSystemError {
    constructor(message) {
        super(`Invalid save version: ${message}`);
        this.name = 'InvalidSaveVersionError';
    }
}
export class MigrationFailedError extends SaveSystemError {
    fromVersion;
    toVersion;
    cause;
    constructor(fromVersion, toVersion, reason, cause) {
        super(`Migration failed from schema v${fromVersion} to v${toVersion}: ${reason}`);
        this.name = 'MigrationFailedError';
        this.fromVersion = fromVersion;
        this.toVersion = toVersion;
        this.cause = cause;
    }
}
export class SaveSlotNotFoundError extends SaveSystemError {
    slotName;
    constructor(slotName) {
        super(`Save slot "${slotName}" was not found.`);
        this.name = 'SaveSlotNotFoundError';
        this.slotName = slotName;
    }
}
export class SnapshotRestorationConflictError extends SaveSystemError {
    slotName;
    reason;
    constructor(slotName, reason) {
        super(`Cannot restore snapshot to slot "${slotName}": ${reason}`);
        this.name = 'SnapshotRestorationConflictError';
        this.slotName = slotName;
        this.reason = reason;
    }
}
//# sourceMappingURL=errors.js.map