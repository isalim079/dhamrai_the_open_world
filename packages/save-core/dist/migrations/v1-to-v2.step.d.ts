/**
 * Dhamrai Life — Migration Step: V1 to V2
 * =========================================
 * Pure sequential migration from legacy SaveEnvelopeV1 (Milestone 2)
 * to canonical SaveEnvelopeV2 (Milestone 3).
 *
 * Transformations:
 * 1. Explicitly sets currency to 'BDT' for player and transaction ledger.
 * 2. Renames legacy `cashPence` to `cashMinorUnits` (preserving 1:1 Poisha integer units).
 * 3. Renames `deltaPence` and `runningBalancePence` to `deltaMinorUnits` and `runningBalanceMinorUnits`.
 * 4. Initializes `inventory` array with standard Rickshaw Driver starting documents if missing.
 * 5. Updates `saveSchemaVersion` from 1 to 2.
 */
import { SaveEnvelopeV1, SaveEnvelopeV2, InventoryItem } from '@dhamrai/shared-contracts';
import { MigrationStep } from './migration-pipeline.js';
export declare const DEFAULT_V1_MIGRATION_INVENTORY: InventoryItem[];
export declare const v1ToV2MigrationStep: MigrationStep<SaveEnvelopeV1, SaveEnvelopeV2>;
//# sourceMappingURL=v1-to-v2.step.d.ts.map