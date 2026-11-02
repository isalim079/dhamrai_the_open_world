/**
 * Dhamrai Life — GameCoreEngine Aggregate Root
 * ============================================
 * Pure TypeScript domain engine facade orchestrating Economy,
 * Inventory, Missions, Player Role state, and Save Envelope serialization.
 */
import { EconomyDomain } from './economy.js';
import { InventoryDomain } from './inventory.js';
import { MissionDomain } from './missions.js';
import { createInitialRickshawDriverState, RICKSHAW_LICENSE_SLIP_ITEM, RICKSHAW_STARTING_CASH_POISHA, } from './roles.js';
export class GameCoreEngine {
    _economy;
    _inventory;
    _missions;
    _player;
    _worldFlags = new Map();
    constructor(economy, inventory, missions, player, worldFlags = {}) {
        this._economy = economy;
        this._inventory = inventory;
        this._missions = missions;
        this._player = {
            ...player,
            position: { ...player.position },
            vehicleState: { ...player.vehicleState },
            reputations: { ...player.reputations },
        };
        for (const [k, v] of Object.entries(worldFlags)) {
            this._worldFlags.set(k, v);
        }
    }
    /**
     * Initializes a brand new game session for the Rickshaw Driver role.
     */
    static createNewGame(timestampMs = Date.now()) {
        const economy = new EconomyDomain([], RICKSHAW_STARTING_CASH_POISHA);
        const inventory = new InventoryDomain(20, [{ ...RICKSHAW_LICENSE_SLIP_ITEM }]);
        const missions = new MissionDomain();
        const player = createInitialRickshawDriverState();
        return new GameCoreEngine(economy, inventory, missions, player, {
            tutorialCompleted: false,
            gameStartedAtMs: timestampMs,
        });
    }
    /**
     * Hydrates the game engine from an existing SaveEnvelopeV1 payload.
     */
    static fromSaveEnvelope(save) {
        if (save.saveSchemaVersion !== 1) {
            throw new Error(`Unsupported save schema version: ${save.saveSchemaVersion}`);
        }
        const economy = new EconomyDomain(save.ledger);
        const inventory = new InventoryDomain(20); // Hydrate inventory if present in custom worldFlags or pass empty
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
        const player = {
            roleId: 'rickshaw_driver',
            position: { ...save.player.position },
            headingRadians: save.player.headingRadians,
            isInVehicle: save.player.isInVehicle,
            vehicleState: {
                id: save.player.vehicleState?.id ?? 'rickshaw_01',
                model: 'basic_pedal_rickshaw',
                isRented: true,
                dailyRentPoisha: 5000,
                conditionPercent: 100 - (save.player.vehicleState?.damagePercent ?? 0),
                speedMps: save.player.vehicleState?.speedMps ?? 0,
                steeringAngleRad: save.player.vehicleState?.steeringAngleRad ?? 0,
                damagePercent: save.player.vehicleState?.damagePercent ?? 0,
            },
            reputations: {
                transportReputation: save.player.reputation,
                civicTrust: 10,
                policeHeat: 0,
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
    setWorldFlag(key, value) {
        this._worldFlags.set(key, value);
    }
    getWorldFlag(key) {
        return this._worldFlags.get(key);
    }
    /**
     * Processes the daily rental fee for the rented pedal rickshaw (৳50 = 5,000 Poisha).
     */
    processDailyVehicleRent(timestampMs = Date.now()) {
        if (!this._player.vehicleState.isRented) {
            throw new Error('Vehicle is owned; no rental fee applicable.');
        }
        const rentAmount = this._player.vehicleState.dailyRentPoisha;
        return this._economy.debit(rentAmount, 'VEHICLE_RENTAL', 'Daily rental fee for pedal rickshaw', timestampMs);
    }
    /**
     * Completes a mission and credits rewards and reputation.
     */
    completeMission(missionId, timestampMs = Date.now()) {
        return this._missions.completeMission(missionId, this._economy, (repDelta) => {
            if (missionId.includes('artisan')) {
                this._player.reputations.artisanGuildTrust += repDelta;
            }
            else if (missionId.includes('police')) {
                this._player.reputations.civicTrust += repDelta;
            }
            else {
                this._player.reputations.transportReputation += repDelta;
            }
        }, timestampMs);
    }
    /**
     * Exports the complete engine state into a standard SaveEnvelopeV1 structure.
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
        const playerState = {
            roleId: 'rickshaw_driver',
            position: { ...this._player.position },
            headingRadians: this._player.headingRadians,
            isInVehicle: this._player.isInVehicle,
            vehicleState: {
                id: this._player.vehicleState.id,
                speedMps: this._player.vehicleState.speedMps,
                steeringAngleRad: this._player.vehicleState.steeringAngleRad,
                damagePercent: this._player.vehicleState.damagePercent,
            },
            cashPence: this._economy.balancePence,
            reputation: this._player.reputations.transportReputation,
        };
        return {
            saveSchemaVersion: 1,
            saveId,
            slotName,
            createdAtIso: this.getWorldFlag('createdAtIso') ?? nowIso,
            updatedAtIso: nowIso,
            player: playerState,
            missions: missionsData,
            ledger: [...this._economy.ledger],
            worldFlags: this.worldFlags,
            checksumSha256: 'placeholder_checksum', // Filled by save-core hasher
        };
    }
}
//# sourceMappingURL=engine.js.map