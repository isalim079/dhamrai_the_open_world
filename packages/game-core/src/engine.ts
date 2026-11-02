/**
 * Dhamrai Life — GameCoreEngine Aggregate Root
 * ============================================
 * Pure TypeScript domain engine facade orchestrating Economy,
 * Inventory, Missions, Player Role state, and Save Envelope serialization.
 */

import {
  EconomyTransaction,
  PlayerState,
  SaveEnvelopeV2,
  WorldPosition,
  CURRENCY_CODE_BDT,
} from '@dhamrai/shared-contracts';
import { EconomyDomain } from './economy.js';
import { InventoryDomain } from './inventory.js';
import { MissionDomain, MissionInstance, MissionCompletionResult } from './missions.js';
import {
  createInitialRickshawDriverState,
  RickshawDriverArchetype,
  RICKSHAW_LICENSE_SLIP_ITEM,
  RICKSHAW_STARTING_CASH_MINOR_UNITS,
} from './roles.js';

export class GameCoreEngine {
  private readonly _economy: EconomyDomain;
  private readonly _inventory: InventoryDomain;
  private readonly _missions: MissionDomain;
  private _player: RickshawDriverArchetype;
  private readonly _worldFlags: Map<string, boolean | number | string> = new Map();

  constructor(
    economy: EconomyDomain,
    inventory: InventoryDomain,
    missions: MissionDomain,
    player: RickshawDriverArchetype,
    worldFlags: Record<string, boolean | number | string> = {}
  ) {
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
  public static createNewGame(timestampMs: number = Date.now()): GameCoreEngine {
    const economy = new EconomyDomain([], RICKSHAW_STARTING_CASH_MINOR_UNITS);
    const inventory = new InventoryDomain(20, [{ ...RICKSHAW_LICENSE_SLIP_ITEM }]);
    const missions = new MissionDomain();
    const player = createInitialRickshawDriverState();

    return new GameCoreEngine(economy, inventory, missions, player, {
      tutorialCompleted: false,
      gameStartedAtMs: timestampMs,
    });
  }

  /**
   * Hydrates the game engine from an existing SaveEnvelopeV2 payload.
   */
  public static fromSaveEnvelope(save: SaveEnvelopeV2): GameCoreEngine {
    if (save.saveSchemaVersion !== 2) {
      throw new Error(`Unsupported save schema version: ${save.saveSchemaVersion}. Expected version 2.`);
    }

    const economy = new EconomyDomain(save.ledger);
    const inventory = new InventoryDomain(20, save.inventory ?? []);

    const missionInstances: Record<string, Partial<MissionInstance>> = {};
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

    const player: RickshawDriverArchetype = {
      roleId: 'rickshaw_driver',
      position: { ...save.player.position },
      headingRadians: save.player.headingRadians,
      isInVehicle: save.player.isInVehicle,
      vehicleState: {
        id: save.player.vehicleState?.id ?? 'rickshaw_01',
        model: 'basic_pedal_rickshaw',
        isRented: true,
        dailyRentMinorUnits: 5000,
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

  public get economy(): EconomyDomain {
    return this._economy;
  }

  public get inventory(): InventoryDomain {
    return this._inventory;
  }

  public get missions(): MissionDomain {
    return this._missions;
  }

  public get player(): Readonly<RickshawDriverArchetype> {
    return this._player;
  }

  public get worldFlags(): Record<string, boolean | number | string> {
    const flags: Record<string, boolean | number | string> = {};
    for (const [k, v] of this._worldFlags.entries()) {
      flags[k] = v;
    }
    return flags;
  }

  public updatePlayerPosition(newPos: WorldPosition, headingRad?: number): void {
    this._player.position = { ...newPos };
    if (headingRad !== undefined) {
      this._player.headingRadians = headingRad;
    }
  }

  public setInVehicle(inVehicle: boolean): void {
    this._player.isInVehicle = inVehicle;
  }

  public setWorldFlag(key: string, value: boolean | number | string): void {
    this._worldFlags.set(key, value);
  }

  public getWorldFlag<T extends boolean | number | string>(key: string): T | undefined {
    return this._worldFlags.get(key) as T | undefined;
  }

  /**
   * Processes the daily rental fee for the rented pedal rickshaw (৳50 = 5,000 Poisha BDT).
   */
  public processDailyVehicleRent(timestampMs: number = Date.now()): EconomyTransaction {
    if (!this._player.vehicleState.isRented) {
      throw new Error('Vehicle is owned; no rental fee applicable.');
    }
    const rentAmount = this._player.vehicleState.dailyRentMinorUnits;
    return this._economy.debit(
      rentAmount,
      'VEHICLE_RENTAL',
      'Daily rental fee for pedal rickshaw',
      timestampMs
    );
  }

  /**
   * Completes a mission and credits rewards and reputation.
   */
  public completeMission(missionId: string, timestampMs: number = Date.now()): MissionCompletionResult {
    return this._missions.completeMission(
      missionId,
      this._economy,
      (repDelta) => {
        if (missionId.includes('artisan')) {
          this._player.reputations.artisanGuildTrust += repDelta;
        } else if (missionId.includes('police')) {
          this._player.reputations.civicTrust += repDelta;
        } else {
          this._player.reputations.transportReputation += repDelta;
        }
      },
      timestampMs
    );
  }

  /**
   * Exports the complete engine state into a standard SaveEnvelopeV2 structure.
   */
  public toSaveEnvelope(saveId: string = 'primary', slotName: string = 'Autosave'): SaveEnvelopeV2 {
    const nowIso = new Date().toISOString();
    const missionInstances = this._missions.getAllInstances();
    const missionsData: SaveEnvelopeV2['missions'] = {};

    for (const [id, inst] of Object.entries(missionInstances)) {
      missionsData[id] = {
        state: inst.state,
        completedObjectiveIds: [...inst.completedObjectiveIds],
        startedAtMs: inst.startedAtMs,
        completedAtMs: inst.completedAtMs,
      };
    }

    const playerState: PlayerState = {
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
      cashMinorUnits: this._economy.balanceMinorUnits,
      currency: CURRENCY_CODE_BDT,
      reputation: this._player.reputations.transportReputation,
    };

    return {
      saveSchemaVersion: 2,
      saveId,
      slotName,
      createdAtIso: (this.getWorldFlag<string>('createdAtIso') as string) ?? nowIso,
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
