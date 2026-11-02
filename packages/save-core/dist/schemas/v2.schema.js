/**
 * Dhamrai Life — SaveEnvelopeV2 Zod Validation Schema (Canonical Current Model)
 * ==============================================================================
 * Strict schema validation for Version 2 save envelopes.
 * Requires explicit Bangladeshi Taka (BDT) currency, integer minor units (Poisha),
 * and full inventory state preservation.
 */
import { z } from 'zod';
import { InvalidSaveSchemaError } from '../errors.js';
export const worldPositionSchemaV2 = z.object({
    x: z.number({ required_error: 'Position x coordinate is required' }),
    y: z.number({ required_error: 'Position y coordinate is required' }),
    z: z.number({ required_error: 'Position z coordinate is required' }),
});
export const vehicleStateSchemaV2 = z.object({
    id: z.string().min(1, 'Vehicle id cannot be empty'),
    speedMps: z.number(),
    steeringAngleRad: z.number(),
    damagePercent: z.number().min(0).max(100),
});
export const playerStateSchemaV2 = z.object({
    roleId: z.literal('rickshaw_driver'),
    position: worldPositionSchemaV2,
    headingRadians: z.number(),
    isInVehicle: z.boolean(),
    vehicleState: vehicleStateSchemaV2.optional(),
    cashMinorUnits: z.number().int({
        message: 'Player cashMinorUnits must be an integer minor currency unit (Poisha)',
    }),
    currency: z.literal('BDT', {
        errorMap: () => ({ message: 'Player currency must explicitly be BDT' }),
    }),
    reputation: z.number(),
});
export const itemCategorySchemaV2 = z.enum([
    'DOCUMENT',
    'TOOL',
    'CARGO',
    'VALUABLE',
    'CONSUMABLE',
]);
export const inventoryItemSchemaV2 = z.object({
    id: z.string().min(1, 'Item id cannot be empty'),
    nameBn: z.string().min(1, 'Bengali item name is required'),
    nameEn: z.string().min(1, 'English item name is required'),
    category: itemCategorySchemaV2,
    quantity: z.number().int().positive('Item quantity must be a positive integer'),
    isStackable: z.boolean(),
    maxStackSize: z.number().int().positive('maxStackSize must be a positive integer'),
    descriptionBn: z.string(),
    descriptionEn: z.string(),
    metadata: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
});
export const missionStateSchemaV2 = z.enum([
    'UNAVAILABLE',
    'AVAILABLE',
    'ACTIVE',
    'COMPLETED',
    'FAILED',
]);
export const missionInstanceSchemaV2 = z.object({
    state: missionStateSchemaV2,
    completedObjectiveIds: z.array(z.string()),
    startedAtMs: z.number().int().optional(),
    completedAtMs: z.number().int().optional(),
});
export const transactionCategorySchemaV2 = z.enum([
    'INITIAL_BALANCE',
    'FARE_PAYMENT',
    'DELIVERY_PAYMENT',
    'VEHICLE_RENTAL',
    'MAINTENANCE_COST',
    'FINE_PENALTY',
    'REPUTATION_BONUS',
]);
export const economyTransactionSchemaV2 = z.object({
    id: z.string().min(1),
    timestampMs: z.number().int(),
    category: transactionCategorySchemaV2,
    deltaMinorUnits: z.number().int({ message: 'Transaction deltaMinorUnits must be an integer (Poisha)' }),
    currency: z.literal('BDT', {
        errorMap: () => ({ message: 'Transaction currency must explicitly be BDT' }),
    }),
    description: z.string(),
    runningBalanceMinorUnits: z.number().int({
        message: 'runningBalanceMinorUnits must be an integer (Poisha)',
    }),
});
export const isoDateTimeRegexV2 = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;
export const saveEnvelopeV2Schema = z.object({
    saveSchemaVersion: z.literal(2, {
        invalid_type_error: 'saveSchemaVersion must be 2 for canonical v2 schema',
    }),
    saveId: z.string().min(1, 'saveId cannot be empty'),
    slotName: z.string().min(1, 'slotName cannot be empty'),
    createdAtIso: z.string().regex(isoDateTimeRegexV2, 'createdAtIso must be a valid ISO 8601 timestamp string'),
    updatedAtIso: z.string().regex(isoDateTimeRegexV2, 'updatedAtIso must be a valid ISO 8601 timestamp string'),
    player: playerStateSchemaV2,
    inventory: z.array(inventoryItemSchemaV2),
    missions: z.record(missionInstanceSchemaV2),
    ledger: z.array(economyTransactionSchemaV2),
    worldFlags: z.record(z.union([z.boolean(), z.number(), z.string()])),
    checksumSha256: z.string().regex(/^[0-9a-f]{64}$/, 'checksumSha256 must be a 64-character lowercase hexadecimal SHA-256 string'),
});
/**
 * Validates any raw value against the SaveEnvelopeV2 schema.
 * Throws InvalidSaveSchemaError on validation failure with formatted issues.
 */
export function validateSaveEnvelopeV2(raw) {
    const result = saveEnvelopeV2Schema.safeParse(raw);
    if (!result.success) {
        const errorDetails = result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ');
        throw new InvalidSaveSchemaError(`SaveEnvelopeV2 validation failed: ${errorDetails}`, result.error.errors);
    }
    return result.data;
}
//# sourceMappingURL=v2.schema.js.map