/**
 * Dhamrai Life — Save Core Errors
 * =================================
 * Explicit error types for validation, checksum verification, migration, and storage operations.
 */
export declare class SaveSystemError extends Error {
    constructor(message: string);
}
export declare class InvalidSaveSchemaError extends SaveSystemError {
    readonly issues: unknown[];
    constructor(message: string, issues?: unknown[]);
}
export declare class ChecksumMismatchError extends SaveSystemError {
    readonly expected: string;
    readonly actual: string;
    constructor(expected: string, actual: string);
}
export declare class UnsupportedFutureVersionError extends SaveSystemError {
    readonly detectedVersion: number;
    readonly maxSupportedVersion: number;
    constructor(detectedVersion: number, maxSupportedVersion: number);
}
export declare class InvalidSaveVersionError extends SaveSystemError {
    constructor(message: string);
}
export declare class MigrationFailedError extends SaveSystemError {
    readonly fromVersion: number;
    readonly toVersion: number;
    readonly cause?: Error;
    constructor(fromVersion: number, toVersion: number, reason: string, cause?: Error);
}
export declare class SaveSlotNotFoundError extends SaveSystemError {
    readonly slotName: string;
    constructor(slotName: string);
}
export declare class SnapshotRestorationConflictError extends SaveSystemError {
    readonly slotName: string;
    readonly reason: string;
    constructor(slotName: string, reason: string);
}
//# sourceMappingURL=errors.d.ts.map