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
import { Infraction, PoliceStopState, SoftArrestState, InfractionContext } from './civic-enforcement.js';
import { LandmarkDefinition } from './landmarks.js';
import { PlotDefinition, BuildingTemplateId } from './plots.js';
import { type EmergentEvent } from './daily-events.js';
export interface PurchaseResult {
    success: boolean;
    reason?: 'INSUFFICIENT_FUNDS' | 'UNKNOWN_ITEM' | 'UNKNOWN_SERVICE';
    transaction?: EconomyTransaction;
    staminaPercent?: number;
    damagePercent?: number;
    tirePressurePercent?: number;
    isPunctured?: boolean;
}
export interface FinePaymentResult {
    success: boolean;
    reason?: 'NO_ACTIVE_STOP' | 'ALREADY_PAID' | 'INSUFFICIENT_FUNDS';
    transaction?: EconomyTransaction;
    policeHeat?: number;
    fineMinorUnits?: number;
}
export interface SoftArrestResult {
    success: boolean;
    reason?: 'NOT_ELIGIBLE' | 'INSUFFICIENT_FUNDS' | 'ALREADY_HELD';
    arrest?: SoftArrestState;
    transaction?: EconomyTransaction;
    policeHeat?: number;
}
export interface PropertyActionResult {
    success: boolean;
    reason?: 'UNKNOWN_PLOT' | 'ALREADY_OWNED' | 'NOT_OWNED' | 'INSUFFICIENT_FUNDS' | 'INVALID_BUILDING' | 'ALREADY_BUILT' | 'NO_BUILDING' | 'COOLDOWN' | 'DUPLICATE';
    transaction?: EconomyTransaction;
    plotId?: string;
    buildingId?: BuildingTemplateId;
    incomeMinorUnits?: number;
}
export declare class GameCoreEngine {
    private readonly _economy;
    private readonly _inventory;
    private readonly _missions;
    private _player;
    private readonly _worldFlags;
    private _activePoliceStop;
    private _activeSoftArrest;
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
    /** Milestone 21 — discovered landmark ids from worldFlags CSV */
    getDiscoveredLandmarkIds(): string[];
    hasDiscoveredLandmark(id: string): boolean;
    /**
     * Try to discover a nearby landmark. Returns the definition if newly unlocked.
     */
    tryDiscoverLandmark(pos: WorldPosition): LandmarkDefinition | null;
    get landmarkCatalog(): readonly LandmarkDefinition[];
    /** Milestone 24 — plaque read at discovered landmark */
    getNearestDiscoveredLandmark(pos: WorldPosition, readRadiusM?: number): LandmarkDefinition | null;
    get plotCatalog(): readonly PlotDefinition[];
    getOwnedPlotIds(): string[];
    ownsPlot(plotId: string): boolean;
    getPlotBuildings(): Record<string, BuildingTemplateId>;
    getBuildingOnPlot(plotId: string): BuildingTemplateId;
    getNearestPlot(pos: WorldPosition, radiusM?: number): PlotDefinition | null;
    /** M27 — inspect marks plot as seen (journal hint); does not purchase. */
    inspectPlot(plotId: string): boolean;
    getInspectedPlotIds(): string[];
    /**
     * M28 — idempotent plot purchase (stable tx id per plot).
     */
    purchasePlot(plotId: string, timestampMs?: number): PropertyActionResult;
    /**
     * M29 — place an allowed building template on an owned plot (idempotent tx).
     */
    placeBuilding(plotId: string, buildingId: Exclude<BuildingTemplateId, 'none'>, timestampMs?: number): PropertyActionResult;
    /**
     * M30 — claim rental income if building present and cooldown elapsed.
     */
    claimRentalIncome(plotId: string, timestampMs?: number): PropertyActionResult;
    /** M31 — garage owners get a soft repair discount flag (৳10 off next mistri bill via worldFlag). */
    hasRepairGarage(): boolean;
    getGarageRepairDiscountMinor(): number;
    /** Ensure today's daily errand definition is registered (idempotent). */
    ensureDailyErrand(timestampMs?: number): string;
    startOrRefreshEmergentEvent(timestampMs?: number, seed?: number): EmergentEvent;
    getActiveEmergentEvent(nowMs?: number): EmergentEvent | null;
    setWorldFlag(key: string, value: boolean | number | string): void;
    getWorldFlag<T extends boolean | number | string>(key: string): T | undefined;
    get staminaPercent(): number;
    get tirePressurePercent(): number;
    get isPunctured(): boolean;
    get policeHeat(): number;
    get civicTrust(): number;
    get activePoliceStop(): Readonly<PoliceStopState> | null;
    get activeSoftArrest(): Readonly<SoftArrestState> | null;
    get unpaidFineMinorUnits(): number;
    isSoftArrestHolding(nowMs?: number): boolean;
    /**
     * Evaluate traffic infractions (speeding / flee). Does not mutate state.
     */
    evaluateInfraction(ctx: Omit<InfractionContext, 'hasActiveStop' | 'activeStop' | 'policeHeat' | 'lastStopMs'>): Infraction | null;
    /**
     * Open a police stop from an infraction; applies heat immediately.
     */
    beginPoliceStop(infraction: Infraction, stopPos: {
        x: number;
        z: number;
    }, timestampMs?: number): PoliceStopState;
    applyLicenseDiscountToStop(): PoliceStopState | null;
    payFine(timestampMs?: number, customId?: string): FinePaymentResult;
    markStopFleeing(): PoliceStopState | null;
    /**
     * Apply flee penalties onto the active stop (extra fine + heat).
     */
    applyFleePenalty(extraFineMinor: number, heatDelta: number, nowMs?: number): PoliceStopState | null;
    clearPoliceStop(): void;
    /**
     * Milestone 19 — soft arrest when heat is critical near Thana.
     * Debits ARREST fine if funds allow; otherwise still holds and sets heatAfter.
     */
    trySoftArrest(distanceToThanaM: number, nowMs?: number): SoftArrestResult;
    releaseSoftArrestIfDue(nowMs?: number): boolean;
    applyPoliceHeatDelta(delta: number): number;
    decayPoliceHeat(dtSec: number): number;
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