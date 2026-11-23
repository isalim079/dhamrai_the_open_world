/**
 * Dhamrai Life — GameCoreEngine Aggregate Root
 * ============================================
 * Pure TypeScript domain engine facade orchestrating Economy,
 * Inventory, Missions, Player Role state, and Save Envelope serialization.
 */
import { CURRENCY_CODE_BDT, } from '@dhamrai/shared-contracts';
import { EconomyDomain } from './economy.js';
import { InventoryDomain } from './inventory.js';
import { MissionDomain } from './missions.js';
import { createInitialRickshawDriverState, RICKSHAW_LICENSE_SLIP_ITEM, RICKSHAW_STARTING_CASH_MINOR_UNITS, } from './roles.js';
import { applyTravelWear, applyRepair, computeSpeedModifiers, REPAIR_SERVICES, } from './vehicle-condition.js';
import { tickStamina, recoverStamina, canSprint, CONSUMABLES, TEA_BUFF_DURATION_MS, } from './stamina.js';
import { evaluateInfraction, openPoliceStop, applyLicenseDiscount, markFleeing, markPaid, applyPoliceHeat, decayPoliceHeat, HEAT_ON_PAY, } from './civic-enforcement.js';
export class GameCoreEngine {
    _economy;
    _inventory;
    _missions;
    _player;
    _worldFlags = new Map();
    _activePoliceStop = null;
    constructor(economy, inventory, missions, player, worldFlags = {}) {
        this._economy = economy;
        this._inventory = inventory;
        this._missions = missions;
        this._player = {
            ...player,
            position: { ...player.position },
            staminaPercent: player.staminaPercent ?? 100,
            vehicleState: {
                ...player.vehicleState,
                tirePressurePercent: player.vehicleState.tirePressurePercent ?? 100,
                isPunctured: player.vehicleState.isPunctured ?? false,
            },
            reputations: {
                ...player.reputations,
                policeHeat: player.reputations.policeHeat ?? 0,
                civicTrust: player.reputations.civicTrust ?? 10,
            },
        };
        for (const [k, v] of Object.entries(worldFlags)) {
            this._worldFlags.set(k, v);
        }
        // Mirror puncture into player state from world flag if present
        if (this._worldFlags.get('vehiclePunctured') === true) {
            this._player.vehicleState.isPunctured = true;
        }
    }
    /**
     * Initializes a brand new game session for the Rickshaw Driver role.
     */
    static createNewGame(timestampMs = Date.now()) {
        const economy = new EconomyDomain([], RICKSHAW_STARTING_CASH_MINOR_UNITS);
        const inventory = new InventoryDomain(20, [{ ...RICKSHAW_LICENSE_SLIP_ITEM }]);
        const missions = new MissionDomain();
        const player = createInitialRickshawDriverState();
        return new GameCoreEngine(economy, inventory, missions, player, {
            tutorialCompleted: false,
            gameStartedAtMs: timestampMs,
            vehiclePunctured: false,
            teaBuffExpiresAtMs: 0,
        });
    }
    /**
     * Hydrates the game engine from an existing SaveEnvelopeV2 payload.
     */
    static fromSaveEnvelope(save) {
        if (save.saveSchemaVersion !== 2) {
            throw new Error(`Unsupported save schema version: ${save.saveSchemaVersion}. Expected version 2.`);
        }
        const economy = new EconomyDomain(save.ledger);
        const inventory = new InventoryDomain(20, save.inventory ?? []);
        const missionInstances = {};
        for (const [id, m] of Object.entries(save.missions)) {
            missionInstances[id] = {
                missionId: id,
                state: m.state,
                completedObjectiveIds: [...m.completedObjectiveIds],
                startedAtMs: m.startedAtMs,
                completedAtMs: m.completedAtMs,
                payoutClaimed: m.state === 'COMPLETED',
            };
        }
        const missions = new MissionDomain(undefined, missionInstances);
        const damagePercent = save.player.vehicleState?.damagePercent ?? 0;
        const puncturedFlag = save.worldFlags?.['vehiclePunctured'] === true;
        const player = {
            roleId: 'rickshaw_driver',
            position: { ...save.player.position },
            headingRadians: save.player.headingRadians,
            isInVehicle: save.player.isInVehicle,
            staminaPercent: save.player.staminaPercent ?? 100,
            vehicleState: {
                id: save.player.vehicleState?.id ?? 'rickshaw_01',
                model: 'basic_pedal_rickshaw',
                isRented: true,
                dailyRentMinorUnits: 5000,
                dailyRentPoisha: 5000,
                conditionPercent: 100 - damagePercent,
                speedMps: save.player.vehicleState?.speedMps ?? 0,
                steeringAngleRad: save.player.vehicleState?.steeringAngleRad ?? 0,
                damagePercent,
                tirePressurePercent: save.player.vehicleState?.tirePressurePercent ?? 100,
                isPunctured: puncturedFlag,
            },
            reputations: {
                transportReputation: save.player.reputation,
                civicTrust: save.player.civicTrust ?? 10,
                policeHeat: save.player.policeHeat ?? 0,
                artisanGuildTrust: 0,
            },
        };
        return new GameCoreEngine(economy, inventory, missions, player, save.worldFlags);
    }
    get economy() {
        return this._economy;
    }
    get inventory() {
        return this._inventory;
    }
    get missions() {
        return this._missions;
    }
    get player() {
        return this._player;
    }
    get worldFlags() {
        const flags = {};
        for (const [k, v] of this._worldFlags.entries()) {
            flags[k] = v;
        }
        return flags;
    }
    updatePlayerPosition(newPos, headingRad) {
        this._player.position = { ...newPos };
        if (headingRad !== undefined) {
            this._player.headingRadians = headingRad;
        }
    }
    setInVehicle(inVehicle) {
        this._player.isInVehicle = inVehicle;
    }
    updateVehicleState(speedMps, steeringAngleRad, damagePercent) {
        if (speedMps !== undefined)
            this._player.vehicleState.speedMps = speedMps;
        if (steeringAngleRad !== undefined)
            this._player.vehicleState.steeringAngleRad = steeringAngleRad;
        if (damagePercent !== undefined) {
            this._player.vehicleState.damagePercent = damagePercent;
            this._player.vehicleState.conditionPercent = 100 - damagePercent;
        }
    }
    setWorldFlag(key, value) {
        this._worldFlags.set(key, value);
    }
    getWorldFlag(key) {
        return this._worldFlags.get(key);
    }
    get staminaPercent() {
        return this._player.staminaPercent;
    }
    get tirePressurePercent() {
        return this._player.vehicleState.tirePressurePercent;
    }
    get isPunctured() {
        return this._player.vehicleState.isPunctured;
    }
    get policeHeat() {
        return this._player.reputations.policeHeat;
    }
    get civicTrust() {
        return this._player.reputations.civicTrust;
    }
    get activePoliceStop() {
        return this._activePoliceStop;
    }
    get unpaidFineMinorUnits() {
        return this.getWorldFlag('unpaidFineMinorUnits') ?? 0;
    }
    /**
     * Evaluate traffic infractions (speeding / flee). Does not mutate state.
     */
    evaluateInfraction(ctx) {
        const lastStopMs = this.getWorldFlag('lastPoliceStopMs') ?? 0;
        return evaluateInfraction({
            ...ctx,
            policeHeat: this._player.reputations.policeHeat,
            lastStopMs,
            hasActiveStop: this._activePoliceStop !== null && !this._activePoliceStop.paid,
            activeStop: this._activePoliceStop,
        });
    }
    /**
     * Open a police stop from an infraction; applies heat immediately.
     */
    beginPoliceStop(infraction, stopPos, timestampMs = Date.now()) {
        const hasLicense = this._inventory.hasItem('rickshaw_license_slip');
        const { stop, heatDelta } = openPoliceStop(infraction, timestampMs, hasLicense, stopPos);
        this._activePoliceStop = stop;
        this._player.reputations.policeHeat = applyPoliceHeat(this._player.reputations.policeHeat, heatDelta);
        this._worldFlags.set('lastPoliceStopMs', timestampMs);
        this._worldFlags.set('activePoliceStopId', stop.id);
        this._worldFlags.set('unpaidFineMinorUnits', stop.currentFineMinorUnits);
        return stop;
    }
    applyLicenseDiscountToStop() {
        if (!this._activePoliceStop || this._activePoliceStop.paid)
            return null;
        if (!this._inventory.hasItem('rickshaw_license_slip'))
            return this._activePoliceStop;
        this._activePoliceStop = applyLicenseDiscount(this._activePoliceStop);
        this._worldFlags.set('unpaidFineMinorUnits', this._activePoliceStop.currentFineMinorUnits);
        return this._activePoliceStop;
    }
    payFine(timestampMs = Date.now(), customId) {
        const stop = this._activePoliceStop;
        if (!stop)
            return { success: false, reason: 'NO_ACTIVE_STOP' };
        if (stop.paid)
            return { success: false, reason: 'ALREADY_PAID' };
        const amount = stop.currentFineMinorUnits;
        if (!this._economy.hasSufficientFunds(amount)) {
            return { success: false, reason: 'INSUFFICIENT_FUNDS' };
        }
        const tx = this._economy.debit(amount, 'FINE_PENALTY', `Police fine: ${stop.primaryCode}`, timestampMs, customId ?? `tx_fine_${stop.id}`);
        this._activePoliceStop = markPaid(stop);
        this._player.reputations.policeHeat = applyPoliceHeat(this._player.reputations.policeHeat, HEAT_ON_PAY);
        this._worldFlags.set('unpaidFineMinorUnits', 0);
        this._worldFlags.set('activePoliceStopId', '');
        return {
            success: true,
            transaction: tx,
            policeHeat: this._player.reputations.policeHeat,
            fineMinorUnits: amount,
        };
    }
    markStopFleeing() {
        if (!this._activePoliceStop || this._activePoliceStop.paid)
            return null;
        this._activePoliceStop = markFleeing(this._activePoliceStop);
        return this._activePoliceStop;
    }
    /**
     * Apply flee penalties onto the active stop (extra fine + heat).
     */
    applyFleePenalty(extraFineMinor, heatDelta, nowMs = Date.now()) {
        if (!this._activePoliceStop || this._activePoliceStop.paid)
            return null;
        this._activePoliceStop = {
            ...markFleeing(this._activePoliceStop),
            currentFineMinorUnits: this._activePoliceStop.currentFineMinorUnits + extraFineMinor,
            baseFineMinorUnits: this._activePoliceStop.baseFineMinorUnits + extraFineMinor,
        };
        this._player.reputations.policeHeat = applyPoliceHeat(this._player.reputations.policeHeat, heatDelta);
        this._worldFlags.set('unpaidFineMinorUnits', this._activePoliceStop.currentFineMinorUnits);
        this._worldFlags.set('lastPoliceStopMs', nowMs);
        return this._activePoliceStop;
    }
    clearPoliceStop() {
        this._activePoliceStop = null;
        this._worldFlags.set('activePoliceStopId', '');
    }
    applyPoliceHeatDelta(delta) {
        this._player.reputations.policeHeat = applyPoliceHeat(this._player.reputations.policeHeat, delta);
        return this._player.reputations.policeHeat;
    }
    decayPoliceHeat(dtSec) {
        const fleeing = this._activePoliceStop?.fleeing === true;
        this._player.reputations.policeHeat = decayPoliceHeat(this._player.reputations.policeHeat, dtSec, fleeing);
        return this._player.reputations.policeHeat;
    }
    get isTeaBuffActive() {
        const expires = this.getWorldFlag('teaBuffExpiresAtMs') ?? 0;
        return Date.now() < expires;
    }
    canSprint() {
        return canSprint(this._player.staminaPercent);
    }
    getSpeedModifiers() {
        return computeSpeedModifiers({
            damagePercent: this._player.vehicleState.damagePercent,
            tirePressurePercent: this._player.vehicleState.tirePressurePercent,
            isPunctured: this._player.vehicleState.isPunctured,
        });
    }
    /**
     * Apply travel wear while mounted. Returns puncture event details.
     */
    applyTravelWear(distanceM, sprinting, rng01) {
        const result = applyTravelWear({
            damagePercent: this._player.vehicleState.damagePercent,
            tirePressurePercent: this._player.vehicleState.tirePressurePercent,
            isPunctured: this._player.vehicleState.isPunctured,
        }, distanceM, sprinting, rng01);
        this._player.vehicleState.damagePercent = result.damagePercent;
        this._player.vehicleState.conditionPercent = 100 - result.damagePercent;
        this._player.vehicleState.tirePressurePercent = result.tirePressurePercent;
        this._player.vehicleState.isPunctured = result.isPunctured;
        this._worldFlags.set('vehiclePunctured', result.isPunctured);
        return result;
    }
    /**
     * Tick driver stamina. Returns whether sprint should be blocked for this frame.
     */
    tickStamina(params) {
        const now = params.nowMs ?? Date.now();
        const buffExpires = this.getWorldFlag('teaBuffExpiresAtMs') ?? 0;
        const result = tickStamina({
            staminaPercent: this._player.staminaPercent,
            dtSec: params.dtSec,
            sprinting: params.sprinting,
            inVehicle: params.inVehicle,
            moving: params.moving,
            teaBuffActive: now < buffExpires,
        });
        this._player.staminaPercent = result.staminaPercent;
        return result;
    }
    spendStamina(amount) {
        this._player.staminaPercent = Math.max(0, Math.min(100, this._player.staminaPercent - amount));
        return this._player.staminaPercent;
    }
    recoverStamina(amount) {
        this._player.staminaPercent = recoverStamina(this._player.staminaPercent, amount);
        return this._player.staminaPercent;
    }
    /**
     * Purchase cha / biscuits at a tea stall. Debits CONSUMABLE_PURCHASE and restores stamina.
     */
    purchaseConsumable(itemId, timestampMs = Date.now(), customId) {
        const def = CONSUMABLES[itemId];
        if (!def) {
            return { success: false, reason: 'UNKNOWN_ITEM' };
        }
        if (!this._economy.hasSufficientFunds(def.priceMinorUnits)) {
            return { success: false, reason: 'INSUFFICIENT_FUNDS' };
        }
        const tx = this._economy.debit(def.priceMinorUnits, 'CONSUMABLE_PURCHASE', `${def.nameEn} purchase (${def.nameBn})`, timestampMs, customId);
        this._player.staminaPercent = recoverStamina(this._player.staminaPercent, def.staminaRestore);
        if (def.grantsTeaBuff) {
            this._worldFlags.set('teaBuffExpiresAtMs', timestampMs + TEA_BUFF_DURATION_MS);
        }
        // Optional inventory stack for cha/biscuits receipt
        const invItem = {
            id: def.id,
            nameBn: def.nameBn,
            nameEn: def.nameEn,
            category: 'CONSUMABLE',
            quantity: 1,
            isStackable: true,
            maxStackSize: 20,
            descriptionBn: def.descriptionBn,
            descriptionEn: def.descriptionEn,
        };
        try {
            this._inventory.addItem(invItem);
        }
        catch {
            // Inventory full — purchase still succeeds (consumed immediately)
        }
        return {
            success: true,
            transaction: tx,
            staminaPercent: this._player.staminaPercent,
        };
    }
    /**
     * Purchase a repair service. Debits MAINTENANCE_COST and mutates vehicle stats.
     */
    purchaseRepair(serviceId, timestampMs = Date.now(), customId) {
        const def = REPAIR_SERVICES[serviceId];
        if (!def) {
            return { success: false, reason: 'UNKNOWN_SERVICE' };
        }
        if (!this._economy.hasSufficientFunds(def.priceMinorUnits)) {
            return { success: false, reason: 'INSUFFICIENT_FUNDS' };
        }
        const tx = this._economy.debit(def.priceMinorUnits, 'MAINTENANCE_COST', `${def.nameEn} (${def.nameBn})`, timestampMs, customId);
        const next = applyRepair({
            damagePercent: this._player.vehicleState.damagePercent,
            tirePressurePercent: this._player.vehicleState.tirePressurePercent,
            isPunctured: this._player.vehicleState.isPunctured,
        }, serviceId);
        this._player.vehicleState.damagePercent = next.damagePercent;
        this._player.vehicleState.conditionPercent = 100 - next.damagePercent;
        this._player.vehicleState.tirePressurePercent = next.tirePressurePercent;
        this._player.vehicleState.isPunctured = next.isPunctured;
        this._worldFlags.set('vehiclePunctured', next.isPunctured);
        return {
            success: true,
            transaction: tx,
            damagePercent: next.damagePercent,
            tirePressurePercent: next.tirePressurePercent,
            isPunctured: next.isPunctured,
        };
    }
    /**
     * Processes the daily rental fee for the rented pedal rickshaw (৳50 = 5,000 Poisha BDT).
     */
    processDailyVehicleRent(timestampMs = Date.now()) {
        if (!this._player.vehicleState.isRented) {
            throw new Error('Vehicle is owned; no rental fee applicable.');
        }
        const rentAmount = this._player.vehicleState.dailyRentMinorUnits;
        return this._economy.debit(rentAmount, 'VEHICLE_RENTAL', 'Daily rental fee for pedal rickshaw', timestampMs);
    }
    /**
     * Completes a mission and credits rewards and reputation.
     */
    completeMission(missionId, timestampMs = Date.now()) {
        return this._missions.completeMission(missionId, this._economy, (repDelta) => {
            const def = this._missions.getDefinition(missionId);
            const category = def?.reputationCategory;
            if (category === 'artisan' || (!category && missionId.includes('artisan'))) {
                this._player.reputations.artisanGuildTrust += repDelta;
            }
            else if (category === 'civic' || (!category && missionId.includes('police'))) {
                this._player.reputations.civicTrust += repDelta;
            }
            else {
                this._player.reputations.transportReputation += repDelta;
            }
        }, timestampMs);
    }
    /**
     * Exports the complete engine state into a standard SaveEnvelopeV2 structure.
     */
    toSaveEnvelope(saveId = 'primary', slotName = 'Autosave') {
        const nowIso = new Date().toISOString();
        const missionInstances = this._missions.getAllInstances();
        const missionsData = {};
        for (const [id, inst] of Object.entries(missionInstances)) {
            missionsData[id] = {
                state: inst.state,
                completedObjectiveIds: [...inst.completedObjectiveIds],
                startedAtMs: inst.startedAtMs,
                completedAtMs: inst.completedAtMs,
            };
        }
        // Ensure puncture flag is current before serialize
        this._worldFlags.set('vehiclePunctured', this._player.vehicleState.isPunctured);
        const playerState = {
            roleId: 'rickshaw_driver',
            position: { ...this._player.position },
            headingRadians: this._player.headingRadians,
            isInVehicle: this._player.isInVehicle,
            staminaPercent: this._player.staminaPercent,
            vehicleState: {
                id: this._player.vehicleState.id,
                speedMps: this._player.vehicleState.speedMps,
                steeringAngleRad: this._player.vehicleState.steeringAngleRad,
                damagePercent: this._player.vehicleState.damagePercent,
                tirePressurePercent: this._player.vehicleState.tirePressurePercent,
            },
            cashMinorUnits: this._economy.balanceMinorUnits,
            currency: CURRENCY_CODE_BDT,
            reputation: this._player.reputations.transportReputation,
            policeHeat: this._player.reputations.policeHeat,
            civicTrust: this._player.reputations.civicTrust,
        };
        return {
            saveSchemaVersion: 2,
            saveId,
            slotName,
            createdAtIso: this.getWorldFlag('createdAtIso') ?? nowIso,
            updatedAtIso: nowIso,
            player: playerState,
            inventory: this._inventory.items.map((it) => ({
                id: it.id,
                nameBn: it.nameBn,
                nameEn: it.nameEn,
                category: it.category,
                quantity: it.quantity,
                isStackable: it.isStackable,
                maxStackSize: it.maxStackSize,
                descriptionBn: it.descriptionBn,
                descriptionEn: it.descriptionEn,
                metadata: it.metadata ? { ...it.metadata } : undefined,
            })),
            missions: missionsData,
            ledger: [...this._economy.ledger],
            worldFlags: this.worldFlags,
            checksumSha256: 'placeholder_checksum', // Filled by save-core hasher
        };
    }
}
//# sourceMappingURL=engine.js.map