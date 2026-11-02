import { describe, it, expect } from 'vitest';
import { GameCoreEngine } from '../src/engine.js';
import { PHASE_1_ANCHORS } from '@dhamrai/shared-contracts';

describe('GameCoreEngine — Aggregate Root & Save Envelope Hydration', () => {
  it('creates a fresh game session for the Rickshaw Driver role', () => {
    const engine = GameCoreEngine.createNewGame(1000);

    // Economy
    expect(engine.economy.balancePence).toBe(25000); // ৳250
    expect(engine.economy.balanceTaka).toBe(250);
    expect(engine.economy.verifyIntegrity()).toBe(true);

    // Inventory
    expect(engine.inventory.hasItem('rickshaw_license_slip')).toBe(true);

    // Missions
    const m1 = engine.missions.getInstance('mission_1_first_fare');
    expect(m1?.state).toBe('AVAILABLE');

    // Player
    expect(engine.player.roleId).toBe('rickshaw_driver');
    expect(engine.player.position).toEqual(PHASE_1_ANCHORS.RATHKHOLA_ORIGIN);
    expect(engine.player.reputations.transportReputation).toBe(10);
  });

  it('deducts daily vehicle rent of ৳50 correctly', () => {
    const engine = GameCoreEngine.createNewGame(1000);
    const rentTx = engine.processDailyVehicleRent(2000);

    expect(rentTx.deltaPence).toBe(-5000); // -৳50
    expect(engine.economy.balancePence).toBe(20000); // ৳200 remaining
    expect(engine.economy.verifyIntegrity()).toBe(true);
  });

  it('supports full gameplay cycle: rent deduction, moving, mission 1 payout, and save serialization/hydration', () => {
    const engine = GameCoreEngine.createNewGame(1000);

    // 1. Pay rent: ৳250 -> ৳200
    engine.processDailyVehicleRent(2000);

    // 2. Start Mission 1
    engine.missions.activateMission('mission_1_first_fare', 3000);

    // 3. Drive to Market Pickup (+15, 0, -10)
    engine.updatePlayerPosition(PHASE_1_ANCHORS.RATHKHOLA_MARKET_PICKUP, Math.PI / 4);
    engine.missions.completeObjective('mission_1_first_fare', 'obj_m1_pickup');

    // 4. Drive to Hardinge High School (-73.1, 1.0, -221.3)
    engine.updatePlayerPosition(PHASE_1_ANCHORS.HARDINGE_HIGH_SCHOOL, 0);
    engine.missions.completeObjective('mission_1_first_fare', 'obj_m1_dropoff');

    // 5. Complete Mission: ৳30 payout -> ৳200 + ৳30 = ৳230 (23,000 Poisha)
    const result = engine.completeMission('mission_1_first_fare', 4000);
    expect(result.success).toBe(true);
    expect(result.payoutApplied).toBe(true);
    expect(engine.economy.balancePence).toBe(23000);
    expect(engine.player.reputations.transportReputation).toBe(15); // 10 + 5

    // 6. Export to Save Envelope v1
    const saveEnvelope = engine.toSaveEnvelope('save_slot_01', 'QuickSave');
    expect(saveEnvelope.saveSchemaVersion).toBe(1);
    expect(saveEnvelope.player.cashPence).toBe(23000);
    expect(saveEnvelope.player.position).toEqual(PHASE_1_ANCHORS.HARDINGE_HIGH_SCHOOL);
    expect(saveEnvelope.missions['mission_1_first_fare']?.state).toBe('COMPLETED');
    expect(saveEnvelope.ledger.length).toBe(3); // Initial (250) + Rent (-50) + Fare (+30)

    // 7. Hydrate new engine instance from the save envelope
    const restoredEngine = GameCoreEngine.fromSaveEnvelope(saveEnvelope);

    // 8. Assert state fidelity
    expect(restoredEngine.economy.balancePence).toBe(23000);
    expect(restoredEngine.economy.verifyIntegrity()).toBe(true);
    expect(restoredEngine.player.position).toEqual(PHASE_1_ANCHORS.HARDINGE_HIGH_SCHOOL);
    expect(restoredEngine.player.reputations.transportReputation).toBe(15);
    expect(restoredEngine.missions.getInstance('mission_1_first_fare')?.state).toBe('COMPLETED');

    // 9. Assert idempotency on hydrated engine: Attempting to complete Mission 1 again does nothing!
    const doubleRewardAttempt = restoredEngine.completeMission('mission_1_first_fare', 5000);
    expect(doubleRewardAttempt.payoutApplied).toBe(false);
    expect(restoredEngine.economy.balancePence).toBe(23000); // Balance remains exactly 23,000!
    expect(restoredEngine.player.reputations.transportReputation).toBe(15);
  });
});
