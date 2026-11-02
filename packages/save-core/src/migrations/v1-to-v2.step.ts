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

import {
  SaveEnvelopeV1,
  SaveEnvelopeV2,
  InventoryItem,
  CURRENCY_CODE_BDT,
} from '@dhamrai/shared-contracts';
import { MigrationStep } from './migration-pipeline.js';
import { validateSaveEnvelopeV1 } from '../schemas/v1.schema.js';
import { validateSaveEnvelopeV2 } from '../schemas/v2.schema.js';

export const DEFAULT_V1_MIGRATION_INVENTORY: InventoryItem[] = [
  {
    id: 'rickshaw_license_slip',
    nameBn: 'রিকশার লাইসেন্স স্লিপ',
    nameEn: 'Rickshaw License Slip',
    category: 'DOCUMENT',
    quantity: 1,
    isStackable: false,
    maxStackSize: 1,
    descriptionBn: 'ধামরাই পৌরসভা অনুমোদিত প্যাডেল রিকশা চালানোর বৈধ্য কাগজ।',
    descriptionEn: 'Valid municipal permit issued for operating a pedal rickshaw in Dhamrai.',
    metadata: {
      registrationNumber: 'DHAM-RICK-402',
      issuedLocality: 'Dhamrai Pourashava',
      isValid: true,
    },
  },
];

export const v1ToV2MigrationStep: MigrationStep<SaveEnvelopeV1, SaveEnvelopeV2> = {
  fromVersion: 1,
  toVersion: 2,
  description: 'Migrate legacy schema V1 to canonical V2 with explicit BDT currency and inventory',

  migrate: (v1Raw: SaveEnvelopeV1): SaveEnvelopeV2 => {
    // Validate source V1 schema before transformation
    const v1 = validateSaveEnvelopeV1(v1Raw);

    // 1. Explicit currency conversion (1 Poisha = 1 Poisha, strict integer preservation)
    const playerCashMinorUnits = v1.player.cashPence;

    // 2. Map transaction ledger
    const migratedLedger = v1.ledger.map((tx) => ({
      id: tx.id,
      timestampMs: tx.timestampMs,
      category: tx.category,
      deltaMinorUnits: tx.deltaPence,
      currency: CURRENCY_CODE_BDT,
      description: tx.description,
      runningBalanceMinorUnits: tx.runningBalancePence,
    }));

    // 3. Resolve inventory: preserve existing array if present, otherwise restore canonical starting documents
    const existingInventory = (v1Raw as any).inventory;
    const resolvedInventory: InventoryItem[] =
      Array.isArray(existingInventory) && existingInventory.length > 0
        ? existingInventory
        : DEFAULT_V1_MIGRATION_INVENTORY.map((it) => ({
            ...it,
            metadata: it.metadata ? { ...it.metadata } : undefined,
          }));

    const v2: SaveEnvelopeV2 = {
      saveSchemaVersion: 2,
      saveId: v1.saveId,
      slotName: v1.slotName,
      createdAtIso: v1.createdAtIso,
      updatedAtIso: new Date().toISOString(),
      player: {
        roleId: v1.player.roleId,
        position: { ...v1.player.position },
        headingRadians: v1.player.headingRadians,
        isInVehicle: v1.player.isInVehicle,
        vehicleState: v1.player.vehicleState
          ? { ...v1.player.vehicleState }
          : undefined,
        cashMinorUnits: playerCashMinorUnits,
        currency: CURRENCY_CODE_BDT,
        reputation: v1.player.reputation,
      },
      inventory: resolvedInventory,
      missions: { ...v1.missions },
      ledger: migratedLedger,
      worldFlags: { ...v1.worldFlags },
      checksumSha256: '0000000000000000000000000000000000000000000000000000000000000000',
    };

    return v2;
  },

  validate: (v2: SaveEnvelopeV2): void => {
    validateSaveEnvelopeV2(v2);
  },
};
