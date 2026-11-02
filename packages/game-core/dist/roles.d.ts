/**
 * Dhamrai Life — Player Archetypes & Rickshaw Driver Role
 * =========================================================
 * Declares the initial archetype state, vehicle rental rules,
 * starting documents, and starting inventory for the Rickshaw Driver.
 */
import { WorldPosition } from '@dhamrai/shared-contracts';
import { InventoryItem } from './inventory.js';
export declare const RICKSHAW_STARTING_CASH_TAKAS = 250;
export declare const RICKSHAW_STARTING_CASH_MINOR_UNITS = 25000;
export declare const RICKSHAW_STARTING_CASH_POISHA = 25000;
export declare const RICKSHAW_DAILY_RENT_MINOR_UNITS = 5000;
export declare const RICKSHAW_DAILY_RENT_POISHA = 5000;
export declare const RICKSHAW_LICENSE_SLIP_ITEM: InventoryItem;
export interface PlayerReputationScores {
    transportReputation: number;
    civicTrust: number;
    policeHeat: number;
    artisanGuildTrust: number;
}
export interface RickshawDriverArchetype {
    roleId: 'rickshaw_driver';
    position: WorldPosition;
    headingRadians: number;
    isInVehicle: boolean;
    vehicleState: {
        id: string;
        model: string;
        isRented: boolean;
        dailyRentMinorUnits: number;
        dailyRentPoisha?: number;
        conditionPercent: number;
        speedMps: number;
        steeringAngleRad: number;
        damagePercent: number;
    };
    reputations: PlayerReputationScores;
}
export declare function createInitialRickshawDriverState(): RickshawDriverArchetype;
//# sourceMappingURL=roles.d.ts.map