/**
 * Dhamrai Life — Schema Migration Pipeline
 * =========================================
 * Safe, sequential migration pipeline with pre-validation, future version rejection,
 * and isolated step execution.
 */

import {
  InvalidSaveVersionError,
  MigrationFailedError,
  UnsupportedFutureVersionError,
} from '../errors.js';
import { CURRENT_SAVE_SCHEMA_VERSION } from '../types.js';
import { v1ToV2MigrationStep } from './v1-to-v2.step.js';

export interface MigrationStep<TFrom = unknown, TTo = unknown> {
  fromVersion: number;
  toVersion: number;
  description: string;
  migrate: (data: TFrom) => Promise<TTo> | TTo;
  validate: (data: TTo) => void;
}

export class SchemaMigrationPipeline {
  private readonly _maxSupportedVersion: number;
  private readonly _steps: Map<number, MigrationStep<unknown, unknown>> = new Map();

  constructor(
    maxSupportedVersion: number = CURRENT_SAVE_SCHEMA_VERSION,
    registerBuiltIns: boolean = true
  ) {
    this._maxSupportedVersion = maxSupportedVersion;
    if (registerBuiltIns && maxSupportedVersion >= 2) {
      this.registerStep(v1ToV2MigrationStep);
    }
  }

  public get maxSupportedVersion(): number {
    return this._maxSupportedVersion;
  }

  /**
   * Registers a sequential migration step.
   * Step must migrate from version N to N+1.
   */
  public registerStep(step: MigrationStep<any, any>): void {
    if (step.toVersion !== step.fromVersion + 1) {
      throw new Error(
        `Non-sequential migration steps not permitted: from ${step.fromVersion} to ${step.toVersion}`
      );
    }
    this._steps.set(step.fromVersion, step);
  }

  /**
   * Inspects and validates the schema version of an arbitrary save payload.
   * Rejects malformed objects, missing versions, and unsupported future versions.
   */
  public inspectSchemaVersion(raw: unknown): number {
    if (raw === null || typeof raw !== 'object') {
      throw new InvalidSaveVersionError('Save payload must be a non-null object.');
    }

    const record = raw as Record<string, unknown>;
    const version = record['saveSchemaVersion'];

    if (version === undefined || version === null) {
      throw new InvalidSaveVersionError('Missing "saveSchemaVersion" property in save payload.');
    }

    if (!Number.isSafeInteger(version) || (version as number) < 0) {
      throw new InvalidSaveVersionError(
        `"saveSchemaVersion" must be a non-negative integer, got: ${String(version)}`
      );
    }

    const versionNum = version as number;

    if (versionNum > this._maxSupportedVersion) {
      throw new UnsupportedFutureVersionError(versionNum, this._maxSupportedVersion);
    }

    return versionNum;
  }

  /**
   * Migrates a raw save payload up to the target version sequentially.
   * Guarantees pure transformations: original input data is not mutated.
   */
  public async migrateToTarget(
    raw: unknown,
    targetVersion: number = this._maxSupportedVersion
  ): Promise<{ data: unknown; stepsApplied: number }> {
    const startVersion = this.inspectSchemaVersion(raw);

    if (startVersion === targetVersion) {
      return { data: raw, stepsApplied: 0 };
    }

    if (startVersion > targetVersion) {
      throw new Error(
        `Cannot downgrade save from schema v${startVersion} to v${targetVersion}. Downgrades are not supported.`
      );
    }

    // Deep clone to ensure original payload is isolated
    let currentData = JSON.parse(JSON.stringify(raw));
    let currentVersion = startVersion;
    let stepsApplied = 0;

    while (currentVersion < targetVersion) {
      const step = this._steps.get(currentVersion);
      if (!step) {
        throw new MigrationFailedError(
          currentVersion,
          currentVersion + 1,
          `No registered migration step found from v${currentVersion} to v${currentVersion + 1}.`
        );
      }

      try {
        const nextData = await step.migrate(currentData);
        step.validate(nextData);
        currentData = nextData;
        currentVersion = step.toVersion;
        stepsApplied++;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        throw new MigrationFailedError(
          step.fromVersion,
          step.toVersion,
          error.message,
          error
        );
      }
    }

    return { data: currentData, stepsApplied };
  }
}
