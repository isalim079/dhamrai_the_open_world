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
import { evaluateInfraction, openPoliceStop, applyLicenseDiscount, markFleeing, markPaid, applyPoliceHeat, decayPoliceHeat, HEAT_ON_PAY, shouldSoftArrest, openSoftArrest, isArrestHoldActive, } from './civic-enforcement.js';
import { findDiscoverableLandmark, findNearestDiscoveredLandmark, parseDiscoveredLandmarkIds, serializeDiscoveredLandmarkIds, LANDMARK_DEFINITIONS, } from './landmarks.js';
import { PLOT_DEFINITIONS, BUILDING_TEMPLATES, parseCsvIds, serializeCsvIds, parsePlotBuildings, serializePlotBuildings, findNearestPlot, getPlotById, PLOT_INTERACT_RADIUS_M, RENTAL_COOLDOWN_MS, } from './plots.js';
import { createDailyErrandDefinition, dayBucket, pickEmergentEvent, isEventActive, EMERGENT_EVENT_CATALOG, } from './daily-events.js';
export class GameCoreEngine {
    _economy;
    _inventory;
    _missions;
    _player;
    _worldFlags = new Map();
    _activePoliceStop = null;
    _activeSoftArrest = null;
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
    /** Milestone 21 — discovered landmark ids from worldFlags CSV */
    getDiscoveredLandmarkIds() {
        return parseDiscoveredLandmarkIds(this.getWorldFlag('discoveredLandmarks'));
    }
    hasDiscoveredLandmark(id) {
        return this.getDiscoveredLandmarkIds().includes(id);
    }
    /**
     * Try to discover a nearby landmark. Returns the definition if newly unlocked.
     */
    tryDiscoverLandmark(pos) {
        const discovered = new Set(this.getDiscoveredLandmarkIds());
        const lm = findDiscoverableLandmark(pos, discovered);
        if (!lm)
            return null;
        discovered.add(lm.id);
        this._worldFlags.set('discoveredLandmarks', serializeDiscoveredLandmarkIds([...discovered]));
        return lm;
    }
    get landmarkCatalog() {
        return LANDMARK_DEFINITIONS;
    }
    /** Milestone 24 — plaque read at discovered landmark */
    getNearestDiscoveredLandmark(pos, readRadiusM = 8) {
        return findNearestDiscoveredLandmark(pos, new Set(this.getDiscoveredLandmarkIds()), readRadiusM);
    }
    // ── Milestone 27–31 Property domain ──────────────────────────────────
    get plotCatalog() {
        return PLOT_DEFINITIONS;
    }
    getOwnedPlotIds() {
        return parseCsvIds(this.getWorldFlag('ownedPlots'));
    }
    ownsPlot(plotId) {
        return this.getOwnedPlotIds().includes(plotId);
    }
    getPlotBuildings() {
        return parsePlotBuildings(this.getWorldFlag('plotBuildings'));
    }
    getBuildingOnPlot(plotId) {
        return this.getPlotBuildings()[plotId] ?? 'none';
    }
    getNearestPlot(pos, radiusM = PLOT_INTERACT_RADIUS_M) {
        return findNearestPlot(pos, radiusM);
    }
    /** M27 — inspect marks plot as seen (journal hint); does not purchase. */
    inspectPlot(plotId) {
        const plot = getPlotById(plotId);
        if (!plot)
            return false;
        const seen = new Set(parseCsvIds(this.getWorldFlag('inspectedPlots')));
        if (seen.has(plotId))
            return false;
        seen.add(plotId);
        this._worldFlags.set('inspectedPlots', serializeCsvIds([...seen]));
        return true;
    }
    getInspectedPlotIds() {
        return parseCsvIds(this.getWorldFlag('inspectedPlots'));
    }
    /**
     * M28 — idempotent plot purchase (stable tx id per plot).
     */
    purchasePlot(plotId, timestampMs = Date.now()) {
        const plot = getPlotById(plotId);
        if (!plot)
            return { success: false, reason: 'UNKNOWN_PLOT' };
        if (this.ownsPlot(plotId))
            return { success: false, reason: 'ALREADY_OWNED', plotId };
        const txId = `tx_property_${plotId}`;
        if (!this._economy.hasSufficientFunds(plot.priceMinorUnits)) {
            return { success: false, reason: 'INSUFFICIENT_FUNDS', plotId };
        }
        try {
            const transaction = this._economy.debit(plot.priceMinorUnits, 'PROPERTY_PURCHASE', `Purchase plot ${plot.nameEn}`, timestampMs, txId);
            const owned = new Set(this.getOwnedPlotIds());
            owned.add(plotId);
            this._worldFlags.set('ownedPlots', serializeCsvIds([...owned]));
            this.inspectPlot(plotId);
            return { success: true, transaction, plotId };
        }
        catch (err) {
            if (err instanceof Error && err.message.includes('already exists')) {
                // Idempotent replay — ensure ownership flag set
                const owned = new Set(this.getOwnedPlotIds());
                owned.add(plotId);
                this._worldFlags.set('ownedPlots', serializeCsvIds([...owned]));
                return { success: false, reason: 'DUPLICATE', plotId };
            }
            throw err;
        }
    }
    /**
     * M29 — place an allowed building template on an owned plot (idempotent tx).
     */
    placeBuilding(plotId, buildingId, timestampMs = Date.now()) {
        const plot = getPlotById(plotId);
        if (!plot)
            return { success: false, reason: 'UNKNOWN_PLOT' };
        if (!this.ownsPlot(plotId))
            return { success: false, reason: 'NOT_OWNED', plotId };
        if (!plot.allowedBuildings.includes(buildingId)) {
            return { success: false, reason: 'INVALID_BUILDING', plotId, buildingId };
        }
        const existing = this.getBuildingOnPlot(plotId);
        if (existing !== 'none')
            return { success: false, reason: 'ALREADY_BUILT', plotId, buildingId: existing };
        const template = BUILDING_TEMPLATES[buildingId];
        if (!this._economy.hasSufficientFunds(template.buildCostMinorUnits)) {
            return { success: false, reason: 'INSUFFICIENT_FUNDS', plotId, buildingId };
        }
        const txId = `tx_build_${plotId}_${buildingId}`;
        try {
            const transaction = this._economy.debit(template.buildCostMinorUnits, 'CONSTRUCTION_COST', `Build ${template.nameEn} on ${plot.nameEn}`, timestampMs, txId);
            const buildings = this.getPlotBuildings();
            buildings[plotId] = buildingId;
            this._worldFlags.set('plotBuildings', serializePlotBuildings(buildings));
            return { success: true, transaction, plotId, buildingId };
        }
        catch (err) {
            if (err instanceof Error && err.message.includes('already exists')) {
                return { success: false, reason: 'DUPLICATE', plotId, buildingId };
            }
            throw err;
        }
    }
    /**
     * M30 — claim rental income if building present and cooldown elapsed.
     */
    claimRentalIncome(plotId, timestampMs = Date.now()) {
        const plot = getPlotById(plotId);
        if (!plot)
            return { success: false, reason: 'UNKNOWN_PLOT' };
        if (!this.ownsPlot(plotId))
            return { success: false, reason: 'NOT_OWNED', plotId };
        const building = this.getBuildingOnPlot(plotId);
        if (building === 'none')
            return { success: false, reason: 'NO_BUILDING', plotId };
        const flagKey = `rentClaimMs_${plotId}`;
        const last = this.getWorldFlag(flagKey) ?? 0;
        // last === 0 means never claimed
        if (last > 0 && timestampMs - last < RENTAL_COOLDOWN_MS) {
            return { success: false, reason: 'COOLDOWN', plotId };
        }
        // Bucket claim window so retries in same window are idempotent
        const window = Math.floor(timestampMs / RENTAL_COOLDOWN_MS);
        const txId = `tx_rent_${plotId}_${window}`;
        try {
            const transaction = this._economy.credit(plot.rentalIncomeMinorUnits, 'RENTAL_INCOME', `Rental income: ${plot.nameEn} (${building})`, timestampMs, txId);
            this._worldFlags.set(flagKey, timestampMs);
            return {
                success: true,
                transaction,
                plotId,
                buildingId: building,
                incomeMinorUnits: plot.rentalIncomeMinorUnits,
            };
        }
        catch (err) {
            if (err instanceof Error && err.message.includes('already exists')) {
                return { success: false, reason: 'DUPLICATE', plotId };
            }
            throw err;
        }
    }
    /** M31 — garage owners get a soft repair discount flag (৳10 off next mistri bill via worldFlag). */
    hasRepairGarage() {
        const buildings = this.getPlotBuildings();
        return Object.values(buildings).includes('repair_garage');
    }
    getGarageRepairDiscountMinor() {
        return this.hasRepairGarage() ? 1000 : 0; // ৳10
    }
    // ── Milestone 33 — daily errand + emergent events ────────────────────
    /** Ensure today's daily errand definition is registered (idempotent). */
    ensureDailyErrand(timestampMs = Date.now()) {
        const day = dayBucket(timestampMs);
        const id = `daily_errand_${day}`;
        if (!this._missions.getDefinition(id)) {
            this._missions.registerDefinition(createDailyErrandDefinition(day));
        }
        const flag = `dailyErrandOffered_${day}`;
        if (!this.getWorldFlag(flag)) {
            this._worldFlags.set(flag, 1);
        }
        return id;
    }
    startOrRefreshEmergentEvent(timestampMs = Date.now(), seed = 0) {
        const currentId = this.getWorldFlag('activeEmergentEventId') ?? '';
        const started = this.getWorldFlag('activeEmergentEventStartedMs') ?? 0;
        if (currentId && isEventActive(currentId, started, timestampMs)) {
            return EMERGENT_EVENT_CATALOG.find((e) => e.id === currentId) ?? pickEmergentEvent(timestampMs, seed);
        }
        const next = pickEmergentEvent(timestampMs, seed);
        this._worldFlags.set('activeEmergentEventId', next.id);
        this._worldFlags.set('activeEmergentEventStartedMs', timestampMs);
        return next;
    }
    getActiveEmergentEvent(nowMs = Date.now()) {
        const id = this.getWorldFlag('activeEmergentEventId') ?? '';
        const started = this.getWorldFlag('activeEmergentEventStartedMs') ?? 0;
        if (!id || !isEventActive(id, started, nowMs))
            return null;
        return EMERGENT_EVENT_CATALOG.find((e) => e.id === id) ?? null;
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
    get activeSoftArrest() {
        return this._activeSoftArrest;
    }
    get unpaidFineMinorUnits() {
        return this.getWorldFlag('unpaidFineMinorUnits') ?? 0;
    }
    isSoftArrestHolding(nowMs = Date.now()) {
        return isArrestHoldActive(this._activeSoftArrest, nowMs);
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
    /**
     * Milestone 19 — soft arrest when heat is critical near Thana.
     * Debits ARREST fine if funds allow; otherwise still holds and sets heatAfter.
     */
    trySoftArrest(distanceToThanaM, nowMs = Date.now()) {
        const lastArrestMs = this.getWorldFlag('lastSoftArrestMs') ?? 0;
        const eligible = shouldSoftArrest({
            policeHeat: this._player.reputations.policeHeat,
            distanceToThanaM,
            nowMs,
            lastArrestMs,
            hasActiveStop: this._activePoliceStop !== null && !this._activePoliceStop.paid,
            alreadyHeld: isArrestHoldActive(this._activeSoftArrest, nowMs),
        });
        if (!eligible)
            return { success: false, reason: 'NOT_ELIGIBLE' };
        const arrest = openSoftArrest(nowMs);
        let transaction;
        if (this._economy.hasSufficientFunds(arrest.fineMinorUnits)) {
            transaction = this._economy.debit(arrest.fineMinorUnits, 'FINE_PENALTY', 'Soft arrest / Thana holding fine', nowMs, `tx_arrest_${arrest.id}`);
        }
        else if (this._economy.balanceMinorUnits > 0) {
            // Seize remaining cash
            const seize = this._economy.balanceMinorUnits;
            transaction = this._economy.debit(seize, 'FINE_PENALTY', 'Soft arrest — partial seize', nowMs, `tx_arrest_partial_${arrest.id}`);
        }
        this._activeSoftArrest = arrest;
        this._activePoliceStop = null;
        this._player.reputations.policeHeat = arrest.heatAfter;
        this._worldFlags.set('lastSoftArrestMs', nowMs);
        this._worldFlags.set('activePoliceStopId', '');
        this._worldFlags.set('unpaidFineMinorUnits', 0);
        this._worldFlags.set('jailHoldUntilMs', arrest.holdUntilMs);
        return {
            success: true,
            arrest,
            transaction,
            policeHeat: this._player.reputations.policeHeat,
        };
    }
    releaseSoftArrestIfDue(nowMs = Date.now()) {
        if (!this._activeSoftArrest || this._activeSoftArrest.released)
            return false;
        if (nowMs < this._activeSoftArrest.holdUntilMs)
            return false;
        this._activeSoftArrest = { ...this._activeSoftArrest, released: true };
        this._worldFlags.set('jailHoldUntilMs', 0);
        return true;
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
        // Milestone 31 — owned repair garage soft discount
        const discount = this.getGarageRepairDiscountMinor();
        const price = Math.max(0, def.priceMinorUnits - discount);
        if (!this._economy.hasSufficientFunds(price)) {
            return { success: false, reason: 'INSUFFICIENT_FUNDS' };
        }
        const tx = this._economy.debit(price, 'MAINTENANCE_COST', discount > 0
            ? `${def.nameEn} (${def.nameBn}) — garage discount ৳${(discount / 100).toFixed(0)}`
            : `${def.nameEn} (${def.nameBn})`, timestampMs, customId);
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