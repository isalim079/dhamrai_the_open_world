/**
 * Dhamrai Life — Schema Migration Pipeline
 * =========================================
 * Safe, sequential migration pipeline with pre-validation, future version rejection,
 * and isolated step execution.
 */
export interface MigrationStep<TFrom = unknown, TTo = unknown> {
    fromVersion: number;
    toVersion: number;
    description: string;
    migrate: (data: TFrom) => Promise<TTo> | TTo;
    validate: (data: TTo) => void;
}
export declare class SchemaMigrationPipeline {
    private readonly _maxSupportedVersion;
    private readonly _steps;
    constructor(maxSupportedVersion?: number, registerBuiltIns?: boolean);
    get maxSupportedVersion(): number;
    /**
     * Registers a sequential migration step.
     * Step must migrate from version N to N+1.
     */
    registerStep(step: MigrationStep<any, any>): void;
    /**
     * Inspects and validates the schema version of an arbitrary save payload.
     * Rejects malformed objects, missing versions, and unsupported future versions.
     */
    inspectSchemaVersion(raw: unknown): number;
    /**
     * Migrates a raw save payload up to the target version sequentially.
     * Guarantees pure transformations: original input data is not mutated.
     */
    migrateToTarget(raw: unknown, targetVersion?: number): Promise<{
        data: unknown;
        stepsApplied: number;
    }>;
}
//# sourceMappingURL=migration-pipeline.d.ts.map