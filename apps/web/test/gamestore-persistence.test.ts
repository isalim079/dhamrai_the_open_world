import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from '../src/state/useGameStore.js';
import { RICKSHAW_STARTING_CASH_MINOR_UNITS } from '@dhamrai/game-core';

describe('useGameStore & Persistence Bridge', () => {
  beforeEach(async () => {
    await useGameStore.getState().initGame();
  });

  it('should initialize game state with default starting cash and inventory', () => {
    const state = useGameStore.getState();
    expect(state.isInitialized).toBe(true);
    expect(state.cashMinorUnits).toBe(RICKSHAW_STARTING_CASH_MINOR_UNITS);
    expect(state.cashFormattedBdt).toBe('৳250.00');
    expect(state.reputation).toBe(10);
    expect(state.inventoryItems.length).toBeGreaterThan(0);
    expect(state.inventoryItems[0]?.id).toBe('rickshaw_license_slip');
  });

  it('should support saving and restoring game state from storage', async () => {
    const store = useGameStore.getState();
    const saved = await store.saveGame('TestSlot');
    expect(saved).toBe(true);

    const slots = useGameStore.getState().saveSlots;
    const testSlot = slots.find((s) => s.slotName === 'TestSlot');
    expect(testSlot).toBeDefined();
    expect(testSlot?.cashMinorUnits).toBe(25000);

    // Modify in-memory state
    store.engine?.economy.credit(5000, 'FARE_PAYMENT', 'Fare payment test');
    store.syncFromEngine();
    expect(useGameStore.getState().cashMinorUnits).toBe(30000);

    // Restore from save
    const loaded = await store.loadGame('TestSlot');
    expect(loaded).toBe(true);
    expect(useGameStore.getState().cashMinorUnits).toBe(25000);
  });

  it('should export and re-import save envelope JSON with integrity validation', async () => {
    const store = useGameStore.getState();
    await store.saveGame('Autosave');
    const jsonStr = await store.exportSaveJson('Autosave');
    expect(jsonStr).toBeTruthy();
    expect(jsonStr).toContain('"saveSchemaVersion": 2');

    const imported = await store.importSaveJson(jsonStr!);
    expect(imported).toBe(true);
    expect(useGameStore.getState().cashMinorUnits).toBe(25000);
  });

  it('should complete mission and award payouts and reputation', () => {
    const store = useGameStore.getState();
    store.activateMission('mission_1_first_fare');
    store.completeObjective('mission_1_first_fare', 'obj_m1_pickup');
    store.completeObjective('mission_1_first_fare', 'obj_m1_dropoff');
    store.finishMission('mission_1_first_fare');

    const updated = useGameStore.getState();
    // 25000 + 3000 = 28000 minor units = ৳280.00
    expect(updated.cashMinorUnits).toBe(28000);
    expect(updated.cashFormattedBdt).toBe('৳280.00');
    expect(updated.reputation).toBe(15);
  });

  it('charges daily rent once per session on resume when > 20h elapsed (AC-M9-06, AC-M9-07)', async () => {
    const store = useGameStore.getState();
    const engine = store.engine!;

    // Create save envelope where last rent was charged 25 hours ago
    const envelope = engine.toSaveEnvelope('slot_rent_test', 'Rent Test');
    envelope.worldFlags['lastRentChargedMs'] = Date.now() - 25 * 3600 * 1000;

    // Resuming this non-fresh save triggers rent debit of exactly 5,000 Poisha (৳50.00)
    await store.initGame(envelope);
    const restored = useGameStore.getState();
    expect(restored.cashMinorUnits).toBe(20000); // 25000 - 5000 = 20000 (৳200.00)
    const rentTx = restored.engine?.economy.ledger.find((t) => t.category === 'VEHICLE_RENTAL');
    expect(rentTx).toBeDefined();
    expect(rentTx?.deltaMinorUnits).toBe(-5000);

    // Immediate second resume within 20 hours does NOT debit rent again
    const currentEnvelope = restored.engine!.toSaveEnvelope('slot_rent_test2', 'Rent Guard Test');
    await store.initGame(currentEnvelope);
    expect(useGameStore.getState().cashMinorUnits).toBe(20000); // Still 20000!
  });

  it('defers daily rent without going negative when balance is below ৳50', async () => {
    const store = useGameStore.getState();
    const engine = store.engine!;

    // Debit most cash so balance is only ৳30 (3000 Poisha)
    engine.economy.debit(22000, 'MAINTENANCE_COST', 'Drain cash for test');
    expect(engine.economy.balanceMinorUnits).toBe(3000);

    const envelope = engine.toSaveEnvelope('low_balance', 'Low Balance');
    envelope.worldFlags['lastRentChargedMs'] = Date.now() - 25 * 3600 * 1000;

    await store.initGame(envelope);
    // Balance remains 3000 — NOT negative!
    expect(useGameStore.getState().cashMinorUnits).toBe(3000);
  });

  it('transitions currentActiveMissionId from M1 -> M2/M3/M4 -> repeatable fares (AC-M9-08)', () => {
    const store = useGameStore.getState();
    expect(store.currentActiveMissionId).toBe('mission_1_first_fare');

    // Complete M1
    store.activateMission('mission_1_first_fare');
    store.completeObjective('mission_1_first_fare', 'obj_m1_pickup');
    store.completeObjective('mission_1_first_fare', 'obj_m1_dropoff');
    store.finishMission('mission_1_first_fare');

    // Transitions to next available mission (M2)
    expect(useGameStore.getState().currentActiveMissionId).toBe('mission_2_police_checkpoint');

    // Complete M2
    store.activateMission('mission_2_police_checkpoint');
    store.completeObjective('mission_2_police_checkpoint', 'obj_m2_approach');
    store.completeObjective('mission_2_police_checkpoint', 'obj_m2_show_docs');
    store.finishMission('mission_2_police_checkpoint');

    // Transitions to M3
    expect(useGameStore.getState().currentActiveMissionId).toBe('mission_3_artisan_order');

    // Complete M3
    store.activateMission('mission_3_artisan_order');
    store.completeObjective('mission_3_artisan_order', 'obj_m3_collect_cargo');
    store.completeObjective('mission_3_artisan_order', 'obj_m3_deliver_cargo');
    store.finishMission('mission_3_artisan_order');

    // Milestone 18 — M4 parcel
    expect(useGameStore.getState().currentActiveMissionId).toBe('mission_4_market_parcel');
    store.activateMission('mission_4_market_parcel');
    store.completeObjective('mission_4_market_parcel', 'obj_m4_collect_parcel');
    store.completeObjective('mission_4_market_parcel', 'obj_m4_deliver_parcel');
    store.finishMission('mission_4_market_parcel');

    // Milestone 26 — M5 vendor day before repeatable fares
    expect(useGameStore.getState().currentActiveMissionId).toBe('mission_5_vendor_day');
    store.activateMission('mission_5_vendor_day');
    store.completeObjective('mission_5_vendor_day', 'obj_m5_fetch_stock');
    store.completeObjective('mission_5_vendor_day', 'obj_m5_return_stall');
    store.finishMission('mission_5_vendor_day');

    // When M1–M5 are complete, transitions to repeatable fares loop prompt
    expect(useGameStore.getState().currentActiveMissionId).toBe('repeatable_fares');
  });
});
