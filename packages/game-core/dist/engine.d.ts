/**
 * Dhamrai Life — GameCoreEngine Aggregate Root
 * ============================================
 * Pure TypeScript domain engine facade orchestrating Economy,
 * Inventory, Missions, Player Role state, and Save Envelope serialization.
 */
import { EconomyTransaction, SaveEnvelopeV2, WorldPosition } from '@dhamrai/shared-contracts';
import { EconomyDomain } from './economy.js';
import { InventoryDomain } from './inventory.js';
import { MissionDomain, MissionCompletionResult } from './missions.js';
import { RickshawDriverArchetype } from './roles.js';
import { RepairServiceId, SpeedModifiers, TravelWearResult } from './vehicle-condition.js';
import { ConsumableItemId, StaminaTickResult } from './stamina.js';
export interface PurchaseResult {
    success: boolean;
    reason?: 'INSUFFICIENT_FUNDS' | 'UNKNOWN_ITEM' | 'UNKNOWN_SERVICE';
    transaction?: EconomyTransaction;
    staminaPercent?: number;
    damagePercent?: number;
    tirePressurePercent?: number;
    isPunctured?: boolean;
}
export declare class GameCoreEngine {
    private readonly _economy;
    private readonly _inventory;
    private readonly _missions;
    private _player;
    private readonly _worldFlags;
    constructor(economy: EconomyDomain, inventory: InventoryDomain, missions: MissionDomain, player: RickshawDriverArchetype, worldFlags?: Record<string, boolean | number | string>);
    /**
     * Initializes a brand new game session for the Rickshaw Driver role.
     */
    static createNewGame(timestampMs?: number): GameCoreEngine;
    /**
     * Hydrates the game engine from an existing SaveEnvelopeV2 payload.
     */
    static fromSaveEnvelope(save: SaveEnvelopeV2): GameCoreEngine;
    get economy(): EconomyDomain;
    get inventory(): InventoryDomain;
    get missions(): MissionDomain;
    get player(): Readonly<RickshawDriverArchetype>;
    get worldFlags(): Record<string, boolean | number | string>;
    updatePlayerPosition(newPos: WorldPosition, headingRad?: number): void;
    setInVehicle(inVehicle: boolean): void;
    updateVehicleState(speedMps?: number, steeringAngleRad?: number, damagePercent?: number): void;
    setWorldFlag(key: string, value: boolean | number | string): void;
    getWorldFlag<T extends boolean | number | string>(key: string): T | undefined;
    get staminaPercent(): number;
    get tirePressurePercent(): number;
    get isPunctured(): boolean;
    get isTeaBuffActive(): boolean;
    canSprint(): boolean;
    getSpeedModifiers(): SpeedModifiers;
    /**
     * Apply travel wear while mounted. Returns puncture event details.
     */
    applyTravelWear(distanceM: number, sprinting: boolean, rng01?: () => number): TravelWearResult;
    /**
     * Tick driver stamina. Returns whether sprint should be blocked for this frame.
     */
    tickStamina(params: {
        dtSec: number;
        sprinting: boolean;
        inVehicle: boolean;
        moving: boolean;
        nowMs?: number;
    }): StaminaTickResult;
    spendStamina(amount: number): number;
    recoverStamina(amount: number): number;
    /**
     * Purchase cha / biscuits at a tea stall. Debits CONSUMABLE_PURCHASE and restores stamina.
     */
    purchaseConsumable(itemId: ConsumableItemId, timestampMs?: number, customId?: string): PurchaseResult;
    /**
     * Purchase a repair service. Debits MAINTENANCE_COST and mutates vehicle stats.
     */
    purchaseRepair(serviceId: RepairServiceId, timestampMs?: number, customId?: string): PurchaseResult;
    /**
     * Processes the daily rental fee for the rented pedal rickshaw (৳50 = 5,000 Poisha BDT).
     */
    processDailyVehicleRent(timestampMs?: number): EconomyTransaction;
    /**
     * Completes a mission and credits rewards and reputation.
     */
    completeMission(missionId: string, timestampMs?: number): MissionCompletionResult;
    /**
     * Exports the complete engine state into a standard SaveEnvelopeV2 structure.
     */
    toSaveEnvelope(saveId?: string, slotName?: string): SaveEnvelopeV2;
}
//# sourceMappingURL=engine.d.ts.map