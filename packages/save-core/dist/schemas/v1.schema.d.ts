/**
 * Dhamrai Life — SaveEnvelopeV1 Zod Validation Schema (Preserved Legacy Model)
 * =============================================================================
 * Strict schema validation for original Version 1 save envelopes from Milestone 2.
 * Validates legacy Pence currency and historical schema fields without inventory.
 */
import { z } from 'zod';
import { SaveEnvelopeV1 } from '@dhamrai/shared-contracts';
export declare const worldPositionSchemaV1: z.ZodObject<{
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
export declare const vehicleStateSchemaV1: z.ZodObject<{
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
export declare const playerStateSchemaV1: z.ZodObject<{
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
    cashPence: z.ZodNumber;
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
    reputation: number;
    cashPence: number;
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
    reputation: number;
    cashPence: number;
    vehicleState?: {
        id: string;
        speedMps: number;
        steeringAngleRad: number;
        damagePercent: number;
    } | undefined;
}>;
export declare const missionStateSchemaV1: z.ZodEnum<["UNAVAILABLE", "AVAILABLE", "ACTIVE", "COMPLETED", "FAILED"]>;
export declare const missionInstanceSchemaV1: z.ZodObject<{
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
export declare const transactionCategorySchemaV1: z.ZodEnum<["INITIAL_BALANCE", "FARE_PAYMENT", "DELIVERY_PAYMENT", "VEHICLE_RENTAL", "MAINTENANCE_COST", "FINE_PENALTY", "REPUTATION_BONUS"]>;
export declare const economyTransactionSchemaV1: z.ZodObject<{
    id: z.ZodString;
    timestampMs: z.ZodNumber;
    category: z.ZodEnum<["INITIAL_BALANCE", "FARE_PAYMENT", "DELIVERY_PAYMENT", "VEHICLE_RENTAL", "MAINTENANCE_COST", "FINE_PENALTY", "REPUTATION_BONUS"]>;
    deltaPence: z.ZodNumber;
    description: z.ZodString;
    runningBalancePence: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    id: string;
    category: "INITIAL_BALANCE" | "FARE_PAYMENT" | "DELIVERY_PAYMENT" | "VEHICLE_RENTAL" | "MAINTENANCE_COST" | "FINE_PENALTY" | "REPUTATION_BONUS";
    timestampMs: number;
    description: string;
    deltaPence: number;
    runningBalancePence: number;
}, {
    id: string;
    category: "INITIAL_BALANCE" | "FARE_PAYMENT" | "DELIVERY_PAYMENT" | "VEHICLE_RENTAL" | "MAINTENANCE_COST" | "FINE_PENALTY" | "REPUTATION_BONUS";
    timestampMs: number;
    description: string;
    deltaPence: number;
    runningBalancePence: number;
}>;
export declare const isoDateTimeRegexV1: RegExp;
export declare const saveEnvelopeV1Schema: z.ZodObject<{
    saveSchemaVersion: z.ZodLiteral<1>;
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
        cashPence: z.ZodNumber;
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
        reputation: number;
        cashPence: number;
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
        reputation: number;
        cashPence: number;
        vehicleState?: {
            id: string;
            speedMps: number;
            steeringAngleRad: number;
            damagePercent: number;
        } | undefined;
    }>;
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
        deltaPence: z.ZodNumber;
        description: z.ZodString;
        runningBalancePence: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        id: string;
        category: "INITIAL_BALANCE" | "FARE_PAYMENT" | "DELIVERY_PAYMENT" | "VEHICLE_RENTAL" | "MAINTENANCE_COST" | "FINE_PENALTY" | "REPUTATION_BONUS";
        timestampMs: number;
        description: string;
        deltaPence: number;
        runningBalancePence: number;
    }, {
        id: string;
        category: "INITIAL_BALANCE" | "FARE_PAYMENT" | "DELIVERY_PAYMENT" | "VEHICLE_RENTAL" | "MAINTENANCE_COST" | "FINE_PENALTY" | "REPUTATION_BONUS";
        timestampMs: number;
        description: string;
        deltaPence: number;
        runningBalancePence: number;
    }>, "many">;
    worldFlags: z.ZodRecord<z.ZodString, z.ZodUnion<[z.ZodBoolean, z.ZodNumber, z.ZodString]>>;
    checksumSha256: z.ZodString;
}, "strip", z.ZodTypeAny, {
    saveSchemaVersion: 1;
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
        reputation: number;
        cashPence: number;
        vehicleState?: {
            id: string;
            speedMps: number;
            steeringAngleRad: number;
            damagePercent: number;
        } | undefined;
    };
    missions: Record<string, {
        state: "UNAVAILABLE" | "AVAILABLE" | "ACTIVE" | "COMPLETED" | "FAILED";
        completedObjectiveIds: string[];
        startedAtMs?: number | undefined;
        completedAtMs?: number | undefined;
    }>;
    ledger: {
        id: string;
        category: "INITIAL_BALANCE" | "FARE_PAYMENT" | "DELIVERY_PAYMENT" | "VEHICLE_RENTAL" | "MAINTENANCE_COST" | "FINE_PENALTY" | "REPUTATION_BONUS";
        timestampMs: number;
        description: string;
        deltaPence: number;
        runningBalancePence: number;
    }[];
    worldFlags: Record<string, string | number | boolean>;
    checksumSha256: string;
}, {
    saveSchemaVersion: 1;
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
        reputation: number;
        cashPence: number;
        vehicleState?: {
            id: string;
            speedMps: number;
            steeringAngleRad: number;
            damagePercent: number;
        } | undefined;
    };
    missions: Record<string, {
        state: "UNAVAILABLE" | "AVAILABLE" | "ACTIVE" | "COMPLETED" | "FAILED";
        completedObjectiveIds: string[];
        startedAtMs?: number | undefined;
        completedAtMs?: number | undefined;
    }>;
    ledger: {
        id: string;
        category: "INITIAL_BALANCE" | "FARE_PAYMENT" | "DELIVERY_PAYMENT" | "VEHICLE_RENTAL" | "MAINTENANCE_COST" | "FINE_PENALTY" | "REPUTATION_BONUS";
        timestampMs: number;
        description: string;
        deltaPence: number;
        runningBalancePence: number;
    }[];
    worldFlags: Record<string, string | number | boolean>;
    checksumSha256: string;
}>;
/**
 * Validates any raw value against the legacy SaveEnvelopeV1 schema.
 * Throws InvalidSaveSchemaError on validation failure with formatted issues.
 */
export declare function validateSaveEnvelopeV1(raw: unknown): SaveEnvelopeV1;
//# sourceMappingURL=v1.schema.d.ts.map