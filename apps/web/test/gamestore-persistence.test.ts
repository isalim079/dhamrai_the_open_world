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
});
