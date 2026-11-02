/**
 * Dhamrai Life — SaveEnvelopeV2 Zod Validation Schema (Canonical Current Model)
 * ==============================================================================
 * Strict schema validation for Version 2 save envelopes.
 * Requires explicit Bangladeshi Taka (BDT) currency, integer minor units (Poisha),
 * and full inventory state preservation.
 */
import { z } from 'zod';
import { SaveEnvelopeV2 } from '@dhamrai/shared-contracts';
export declare const worldPositionSchemaV2: z.ZodObject<{
    x: z.ZodNumber;
    y: z.ZodNumber;
    z: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    x: number;
    y: number;
    z: number;
}, {
    x: number;
    y: number;
    z: number;
}>;
export declare const vehicleStateSchemaV2: z.ZodObject<{
    id: z.ZodString;
    speedMps: z.ZodNumber;
    steeringAngleRad: z.ZodNumber;
    damagePercent: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    id: string;
    speedMps: number;
    steeringAngleRad: number;
    damagePercent: number;
}, {
    id: string;
    speedMps: number;
    steeringAngleRad: number;
    damagePercent: number;
}>;
export declare const playerStateSchemaV2: z.ZodObject<{
    roleId: z.ZodLiteral<"rickshaw_driver">;
    position: z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
        z: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        x: number;
        y: number;
        z: number;
    }, {
        x: number;
        y: number;
        z: number;
    }>;
    headingRadians: z.ZodNumber;
    isInVehicle: z.ZodBoolean;
    vehicleState: z.ZodOptional<z.ZodObject<{
        id: z.ZodString;
        speedMps: z.ZodNumber;
        steeringAngleRad: z.ZodNumber;
        damagePercent: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        id: string;
        speedMps: number;
        steeringAngleRad: number;
        damagePercent: number;
    }, {
        id: string;
        speedMps: number;
        steeringAngleRad: number;
        damagePercent: number;
    }>>;
    cashMinorUnits: z.ZodNumber;
    currency: z.ZodLiteral<"BDT">;
    reputation: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    roleId: "rickshaw_driver";
    position: {
        x: number;
        y: number;
        z: number;
    };
    headingRadians: number;
    isInVehicle: boolean;
    cashMinorUnits: number;
    currency: "BDT";
    reputation: number;
    vehicleState?: {
        id: string;
        speedMps: number;
        steeringAngleRad: number;
        damagePercent: number;
    } | undefined;
}, {
    roleId: "rickshaw_driver";
    position: {
        x: number;
        y: number;
        z: number;
    };
    headingRadians: number;
    isInVehicle: boolean;
    cashMinorUnits: number;
    currency: "BDT";
    reputation: number;
    vehicleState?: {
        id: string;
        speedMps: number;
        steeringAngleRad: number;
        damagePercent: number;
    } | undefined;
}>;
export declare const itemCategorySchemaV2: z.ZodEnum<["DOCUMENT", "TOOL", "CARGO", "VALUABLE", "CONSUMABLE"]>;
export declare const inventoryItemSchemaV2: z.ZodObject<{
    id: z.ZodString;
    nameBn: z.ZodString;
    nameEn: z.ZodString;
    category: z.ZodEnum<["DOCUMENT", "TOOL", "CARGO", "VALUABLE", "CONSUMABLE"]>;
    quantity: z.ZodNumber;
    isStackable: z.ZodBoolean;
    maxStackSize: z.ZodNumber;
    descriptionBn: z.ZodString;
    descriptionEn: z.ZodString;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodBoolean]>>>;
}, "strip", z.ZodTypeAny, {
    id: string;
    nameBn: string;
    nameEn: string;
    category: "DOCUMENT" | "TOOL" | "CARGO" | "VALUABLE" | "CONSUMABLE";
    quantity: number;
    isStackable: boolean;
    maxStackSize: number;
    descriptionBn: string;
    descriptionEn: string;
    metadata?: Record<string, string | number | boolean> | undefined;
}, {
    id: string;
    nameBn: string;
    nameEn: string;
    category: "DOCUMENT" | "TOOL" | "CARGO" | "VALUABLE" | "CONSUMABLE";
    quantity: number;
    isStackable: boolean;
    maxStackSize: number;
    descriptionBn: string;
    descriptionEn: string;
    metadata?: Record<string, string | number | boolean> | undefined;
}>;
export declare const missionStateSchemaV2: z.ZodEnum<["UNAVAILABLE", "AVAILABLE", "ACTIVE", "COMPLETED", "FAILED"]>;
export declare const missionInstanceSchemaV2: z.ZodObject<{
    state: z.ZodEnum<["UNAVAILABLE", "AVAILABLE", "ACTIVE", "COMPLETED", "FAILED"]>;
    completedObjectiveIds: z.ZodArray<z.ZodString, "many">;
    startedAtMs: z.ZodOptional<z.ZodNumber>;
    completedAtMs: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    state: "UNAVAILABLE" | "AVAILABLE" | "ACTIVE" | "COMPLETED" | "FAILED";
    completedObjectiveIds: string[];
    startedAtMs?: number | undefined;
    completedAtMs?: number | undefined;
}, {
    state: "UNAVAILABLE" | "AVAILABLE" | "ACTIVE" | "COMPLETED" | "FAILED";
    completedObjectiveIds: string[];
    startedAtMs?: number | undefined;
    completedAtMs?: number | undefined;
}>;
export declare const transactionCategorySchemaV2: z.ZodEnum<["INITIAL_BALANCE", "FARE_PAYMENT", "DELIVERY_PAYMENT", "VEHICLE_RENTAL", "MAINTENANCE_COST", "FINE_PENALTY", "REPUTATION_BONUS"]>;
export declare const economyTransactionSchemaV2: z.ZodObject<{
    id: z.ZodString;
    timestampMs: z.ZodNumber;
    category: z.ZodEnum<["INITIAL_BALANCE", "FARE_PAYMENT", "DELIVERY_PAYMENT", "VEHICLE_RENTAL", "MAINTENANCE_COST", "FINE_PENALTY", "REPUTATION_BONUS"]>;
    deltaMinorUnits: z.ZodNumber;
    currency: z.ZodLiteral<"BDT">;
    description: z.ZodString;
    runningBalanceMinorUnits: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    id: string;
    currency: "BDT";
    category: "INITIAL_BALANCE" | "FARE_PAYMENT" | "DELIVERY_PAYMENT" | "VEHICLE_RENTAL" | "MAINTENANCE_COST" | "FINE_PENALTY" | "REPUTATION_BONUS";
    timestampMs: number;
    deltaMinorUnits: number;
    description: string;
    runningBalanceMinorUnits: number;
}, {
    id: string;
    currency: "BDT";
    category: "INITIAL_BALANCE" | "FARE_PAYMENT" | "DELIVERY_PAYMENT" | "VEHICLE_RENTAL" | "MAINTENANCE_COST" | "FINE_PENALTY" | "REPUTATION_BONUS";
    timestampMs: number;
    deltaMinorUnits: number;
    description: string;
    runningBalanceMinorUnits: number;
}>;
export declare const isoDateTimeRegexV2: RegExp;
export declare const saveEnvelopeV2Schema: z.ZodObject<{
    saveSchemaVersion: z.ZodLiteral<2>;
    saveId: z.ZodString;
    slotName: z.ZodString;
    createdAtIso: z.ZodString;
    updatedAtIso: z.ZodString;
    player: z.ZodObject<{
        roleId: z.ZodLiteral<"rickshaw_driver">;
        position: z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
            z: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            x: number;
            y: number;
            z: number;
        }, {
            x: number;
            y: number;
            z: number;
        }>;
        headingRadians: z.ZodNumber;
        isInVehicle: z.ZodBoolean;
        vehicleState: z.ZodOptional<z.ZodObject<{
            id: z.ZodString;
            speedMps: z.ZodNumber;
            steeringAngleRad: z.ZodNumber;
            damagePercent: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            id: string;
            speedMps: number;
            steeringAngleRad: number;
            damagePercent: number;
        }, {
            id: string;
            speedMps: number;
            steeringAngleRad: number;
            damagePercent: number;
        }>>;
        cashMinorUnits: z.ZodNumber;
        currency: z.ZodLiteral<"BDT">;
        reputation: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        roleId: "rickshaw_driver";
        position: {
            x: number;
            y: number;
            z: number;
        };
        headingRadians: number;
        isInVehicle: boolean;
        cashMinorUnits: number;
        currency: "BDT";
        reputation: number;
        vehicleState?: {
            id: string;
            speedMps: number;
            steeringAngleRad: number;
            damagePercent: number;
        } | undefined;
    }, {
        roleId: "rickshaw_driver";
        position: {
            x: number;
            y: number;
            z: number;
        };
        headingRadians: number;
        isInVehicle: boolean;
        cashMinorUnits: number;
        currency: "BDT";
        reputation: number;
        vehicleState?: {
            id: string;
            speedMps: number;
            steeringAngleRad: number;
            damagePercent: number;
        } | undefined;
    }>;
    inventory: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        nameBn: z.ZodString;
        nameEn: z.ZodString;
        category: z.ZodEnum<["DOCUMENT", "TOOL", "CARGO", "VALUABLE", "CONSUMABLE"]>;
        quantity: z.ZodNumber;
        isStackable: z.ZodBoolean;
        maxStackSize: z.ZodNumber;
        descriptionBn: z.ZodString;
        descriptionEn: z.ZodString;
        metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodBoolean]>>>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        nameBn: string;
        nameEn: string;
        category: "DOCUMENT" | "TOOL" | "CARGO" | "VALUABLE" | "CONSUMABLE";
        quantity: number;
        isStackable: boolean;
        maxStackSize: number;
        descriptionBn: string;
        descriptionEn: string;
        metadata?: Record<string, string | number | boolean> | undefined;
    }, {
        id: string;
        nameBn: string;
        nameEn: string;
        category: "DOCUMENT" | "TOOL" | "CARGO" | "VALUABLE" | "CONSUMABLE";
        quantity: number;
        isStackable: boolean;
        maxStackSize: number;
        descriptionBn: string;
        descriptionEn: string;
        metadata?: Record<string, string | number | boolean> | undefined;
    }>, "many">;
    missions: z.ZodRecord<z.ZodString, z.ZodObject<{
        state: z.ZodEnum<["UNAVAILABLE", "AVAILABLE", "ACTIVE", "COMPLETED", "FAILED"]>;
        completedObjectiveIds: z.ZodArray<z.ZodString, "many">;
        startedAtMs: z.ZodOptional<z.ZodNumber>;
        completedAtMs: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        state: "UNAVAILABLE" | "AVAILABLE" | "ACTIVE" | "COMPLETED" | "FAILED";
        completedObjectiveIds: string[];
        startedAtMs?: number | undefined;
        completedAtMs?: number | undefined;
    }, {
        state: "UNAVAILABLE" | "AVAILABLE" | "ACTIVE" | "COMPLETED" | "FAILED";
        completedObjectiveIds: string[];
        startedAtMs?: number | undefined;
        completedAtMs?: number | undefined;
    }>>;
    ledger: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        timestampMs: z.ZodNumber;
        category: z.ZodEnum<["INITIAL_BALANCE", "FARE_PAYMENT", "DELIVERY_PAYMENT", "VEHICLE_RENTAL", "MAINTENANCE_COST", "FINE_PENALTY", "REPUTATION_BONUS"]>;
        deltaMinorUnits: z.ZodNumber;
        currency: z.ZodLiteral<"BDT">;
        description: z.ZodString;
        runningBalanceMinorUnits: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        id: string;
        currency: "BDT";
        category: "INITIAL_BALANCE" | "FARE_PAYMENT" | "DELIVERY_PAYMENT" | "VEHICLE_RENTAL" | "MAINTENANCE_COST" | "FINE_PENALTY" | "REPUTATION_BONUS";
        timestampMs: number;
        deltaMinorUnits: number;
        description: string;
        runningBalanceMinorUnits: number;
    }, {
        id: string;
        currency: "BDT";
        category: "INITIAL_BALANCE" | "FARE_PAYMENT" | "DELIVERY_PAYMENT" | "VEHICLE_RENTAL" | "MAINTENANCE_COST" | "FINE_PENALTY" | "REPUTATION_BONUS";
        timestampMs: number;
        deltaMinorUnits: number;
        description: string;
        runningBalanceMinorUnits: number;
    }>, "many">;
    worldFlags: z.ZodRecord<z.ZodString, z.ZodUnion<[z.ZodBoolean, z.ZodNumber, z.ZodString]>>;
    checksumSha256: z.ZodString;
}, "strip", z.ZodTypeAny, {
    saveSchemaVersion: 2;
    saveId: string;
    slotName: string;
    createdAtIso: string;
    updatedAtIso: string;
    player: {
        roleId: "rickshaw_driver";
        position: {
            x: number;
            y: number;
            z: number;
        };
        headingRadians: number;
        isInVehicle: boolean;
        cashMinorUnits: number;
        currency: "BDT";
        reputation: number;
        vehicleState?: {
            id: string;
            speedMps: number;
            steeringAngleRad: number;
            damagePercent: number;
        } | undefined;
    };
    inventory: {
        id: string;
        nameBn: string;
        nameEn: string;
        category: "DOCUMENT" | "TOOL" | "CARGO" | "VALUABLE" | "CONSUMABLE";
        quantity: number;
        isStackable: boolean;
        maxStackSize: number;
        descriptionBn: string;
        descriptionEn: string;
        metadata?: Record<string, string | number | boolean> | undefined;
    }[];
    missions: Record<string, {
        state: "UNAVAILABLE" | "AVAILABLE" | "ACTIVE" | "COMPLETED" | "FAILED";
        completedObjectiveIds: string[];
        startedAtMs?: number | undefined;
        completedAtMs?: number | undefined;
    }>;
    ledger: {
        id: string;
        currency: "BDT";
        category: "INITIAL_BALANCE" | "FARE_PAYMENT" | "DELIVERY_PAYMENT" | "VEHICLE_RENTAL" | "MAINTENANCE_COST" | "FINE_PENALTY" | "REPUTATION_BONUS";
        timestampMs: number;
        deltaMinorUnits: number;
        description: string;
        runningBalanceMinorUnits: number;
    }[];
    worldFlags: Record<string, string | number | boolean>;
    checksumSha256: string;
}, {
    saveSchemaVersion: 2;
    saveId: string;
    slotName: string;
    createdAtIso: string;
    updatedAtIso: string;
    player: {
        roleId: "rickshaw_driver";
        position: {
            x: number;
            y: number;
            z: number;
        };
        headingRadians: number;
        isInVehicle: boolean;
        cashMinorUnits: number;
        currency: "BDT";
        reputation: number;
        vehicleState?: {
            id: string;
            speedMps: number;
            steeringAngleRad: number;
            damagePercent: number;
        } | undefined;
    };
    inventory: {
        id: string;
        nameBn: string;
        nameEn: string;
        category: "DOCUMENT" | "TOOL" | "CARGO" | "VALUABLE" | "CONSUMABLE";
        quantity: number;
        isStackable: boolean;
        maxStackSize: number;
        descriptionBn: string;
        descriptionEn: string;
        metadata?: Record<string, string | number | boolean> | undefined;
    }[];
    missions: Record<string, {
        state: "UNAVAILABLE" | "AVAILABLE" | "ACTIVE" | "COMPLETED" | "FAILED";
        completedObjectiveIds: string[];
        startedAtMs?: number | undefined;
        completedAtMs?: number | undefined;
    }>;
    ledger: {
        id: string;
        currency: "BDT";
        category: "INITIAL_BALANCE" | "FARE_PAYMENT" | "DELIVERY_PAYMENT" | "VEHICLE_RENTAL" | "MAINTENANCE_COST" | "FINE_PENALTY" | "REPUTATION_BONUS";
        timestampMs: number;
        deltaMinorUnits: number;
        description: string;
        runningBalanceMinorUnits: number;
    }[];
    worldFlags: Record<string, string | number | boolean>;
    checksumSha256: string;
}>;
/**
 * Validates any raw value against the SaveEnvelopeV2 schema.
 * Throws InvalidSaveSchemaError on validation failure with formatted issues.
 */
export declare function validateSaveEnvelopeV2(raw: unknown): SaveEnvelopeV2;
//# sourceMappingURL=v2.schema.d.ts.map