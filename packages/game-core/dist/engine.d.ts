/**
 * Dhamrai Life — GameCoreEngine Aggregate Root
 * ============================================
 * Pure TypeScript domain engine facade orchestrating Economy,
 * Inventory, Missions, Player Role state, and Save Envelope serialization.
 */
import { EconomyTransaction, SaveEnvelopeV1, WorldPosition } from '@dhamrai/shared-contracts';
import { EconomyDomain } from './economy.js';
import { InventoryDomain } from './inventory.js';
import { MissionDomain, MissionCompletionResult } from './missions.js';
import { RickshawDriverArchetype } from './roles.js';
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
     * Hydrates the game engine from an existing SaveEnvelopeV1 payload.
     */
    static fromSaveEnvelope(save: SaveEnvelopeV1): GameCoreEngine;
    get economy(): EconomyDomain;
    get inventory(): InventoryDomain;
    get missions(): MissionDomain;
    get player(): Readonly<RickshawDriverArchetype>;
    get worldFlags(): Record<string, boolean | number | string>;
    updatePlayerPosition(newPos: WorldPosition, headingRad?: number): void;
    setInVehicle(inVehicle: boolean): void;
    setWorldFlag(key: string, value: boolean | number | string): void;
    getWorldFlag<T extends boolean | number | string>(key: string): T | undefined;
    /**
     * Processes the daily rental fee for the rented pedal rickshaw (৳50 = 5,000 Poisha).
     */
    processDailyVehicleRent(timestampMs?: number): EconomyTransaction;
    /**
     * Completes a mission and credits rewards and reputation.
     */
    completeMission(missionId: string, timestampMs?: number): MissionCompletionResult;
    /**
     * Exports the complete engine state into a standard SaveEnvelopeV1 structure.
     */
    toSaveEnvelope(saveId?: string, slotName?: string): SaveEnvelopeV1;
}
//# sourceMappingURL=engine.d.ts.map