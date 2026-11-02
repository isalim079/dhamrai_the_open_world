/**
 * Dhamrai Life — SaveEnvelopeV1 Zod Validation Schema (Preserved Legacy Model)
 * =============================================================================
 * Strict schema validation for original Version 1 save envelopes from Milestone 2.
 * Validates legacy Pence currency and historical schema fields without inventory.
 */
import { z } from 'zod';
import { InvalidSaveSchemaError } from '../errors.js';
export const worldPositionSchemaV1 = z.object({
    x: z.number({ required_error: 'Position x coordinate is required' }),
    y: z.number({ required_error: 'Position y coordinate is required' }),
    z: z.number({ required_error: 'Position z coordinate is required' }),
});
export const vehicleStateSchemaV1 = z.object({
    id: z.string().min(1, 'Vehicle id cannot be empty'),
    speedMps: z.number(),
    steeringAngleRad: z.number(),
    damagePercent: z.number().min(0).max(100),
});
export const playerStateSchemaV1 = z.object({
    roleId: z.literal('rickshaw_driver'),
    position: worldPositionSchemaV1,
    headingRadians: z.number(),
    isInVehicle: z.boolean(),
    vehicleState: vehicleStateSchemaV1.optional(),
    cashPence: z.number().int({ message: 'Player cashPence must be an integer minor currency unit (Poisha)' }),
    reputation: z.number(),
});
export const missionStateSchemaV1 = z.enum([
    'UNAVAILABLE',
    'AVAILABLE',
    'ACTIVE',
    'COMPLETED',
    'FAILED',
]);
export const missionInstanceSchemaV1 = z.object({
    state: missionStateSchemaV1,
    completedObjectiveIds: z.array(z.string()),
    startedAtMs: z.number().int().optional(),
    completedAtMs: z.number().int().optional(),
});
export const transactionCategorySchemaV1 = z.enum([
    'INITIAL_BALANCE',
    'FARE_PAYMENT',
    'DELIVERY_PAYMENT',
    'VEHICLE_RENTAL',
    'MAINTENANCE_COST',
    'FINE_PENALTY',
    'REPUTATION_BONUS',
]);
export const economyTransactionSchemaV1 = z.object({
    id: z.string().min(1),
    timestampMs: z.number().int(),
    category: transactionCategorySchemaV1,
    deltaPence: z.number().int({ message: 'Transaction deltaPence must be an integer' }),
    description: z.string(),
    runningBalancePence: z.number().int({ message: 'runningBalancePence must be an integer' }),
});
export const isoDateTimeRegexV1 = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;
export const saveEnvelopeV1Schema = z.object({
    saveSchemaVersion: z.literal(1, {
        invalid_type_error: 'saveSchemaVersion must be 1 for v1 schema',
    }),
    saveId: z.string().min(1, 'saveId cannot be empty'),
    slotName: z.string().min(1, 'slotName cannot be empty'),
    createdAtIso: z.string().regex(isoDateTimeRegexV1, 'createdAtIso must be a valid ISO 8601 timestamp string'),
    updatedAtIso: z.string().regex(isoDateTimeRegexV1, 'updatedAtIso must be a valid ISO 8601 timestamp string'),
    player: playerStateSchemaV1,
    missions: z.record(missionInstanceSchemaV1),
    ledger: z.array(economyTransactionSchemaV1),
    worldFlags: z.record(z.union([z.boolean(), z.number(), z.string()])),
    checksumSha256: z.string().regex(/^[0-9a-f]{64}$/, 'checksumSha256 must be a 64-character lowercase hexadecimal SHA-256 string'),
});
/**
 * Validates any raw value against the legacy SaveEnvelopeV1 schema.
 * Throws InvalidSaveSchemaError on validation failure with formatted issues.
 */
export function validateSaveEnvelopeV1(raw) {
    const result = saveEnvelopeV1Schema.safeParse(raw);
    if (!result.success) {
        const errorDetails = result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ');
        throw new InvalidSaveSchemaError(`SaveEnvelopeV1 validation failed: ${errorDetails}`, result.error.errors);
    }
    return result.data;
}
//# sourceMappingURL=v1.schema.js.map