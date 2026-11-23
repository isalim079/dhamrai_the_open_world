import { describe, it, expect } from 'vitest';
import { GameCoreEngine } from '@dhamrai/game-core';
import { PHASE_1_ANCHORS } from '@dhamrai/shared-contracts';
import { CivicEnforcementBridge } from '../src/engine/CivicEnforcementBridge.js';

describe('CivicEnforcementBridge — M14', () => {
  it('opens a speeding stop near Thana', () => {
    const engine = GameCoreEngine.createNewGame(1000);
    const bridge = new CivicEnforcementBridge();
    const thana = PHASE_1_ANCHORS.THANA_JUNCTION_CHECKPOINT;

    const result = bridge.tick(engine, {
      playerPos: { x: thana.x + 2, y: 0, z: thana.z + 2 },
      speedKph: 18,
      inVehicle: true,
      dayPhase: 'day',
      nowMs: 200_000,
    });

    expect(result.stopOpened).toBe(true);
    expect(result.shouldOpenDialogue).toBe(true);
    expect(result.fineMinorUnits).toBeGreaterThan(0);
    expect(engine.activePoliceStop).not.toBeNull();
    expect(engine.policeHeat).toBeGreaterThan(0);
  });

  it('stacks flee penalty when leaving stop radius', () => {
    const engine = GameCoreEngine.createNewGame(1000);
    const bridge = new CivicEnforcementBridge();
    const thana = PHASE_1_ANCHORS.THANA_JUNCTION_CHECKPOINT;

    bridge.tick(engine, {
      playerPos: { ...thana },
      speedKph: 18,
      inVehicle: true,
      dayPhase: 'day',
      nowMs: 200_000,
    });
    const fineBefore = engine.activePoliceStop!.currentFineMinorUnits;
    const heatBefore = engine.policeHeat;

    const fled = bridge.tick(engine, {
      playerPos: { x: thana.x + 20, y: 0, z: thana.z + 20 },
      speedKph: 10,
      inVehicle: true,
      dayPhase: 'day',
      nowMs: 200_500,
    });

    expect(fled.fled).toBe(true);
    expect(engine.activePoliceStop!.fleeing).toBe(true);
    expect(engine.activePoliceStop!.currentFineMinorUnits).toBeGreaterThan(fineBefore);
    expect(engine.policeHeat).toBeGreaterThan(heatBefore);
  });

  it('reports distance helpers', () => {
    const bridge = new CivicEnforcementBridge();
    const thana = PHASE_1_ANCHORS.THANA_JUNCTION_CHECKPOINT;
    expect(bridge.distanceToThana(thana)).toBe(0);
    expect(bridge.isNearThana(thana)).toBe(true);
  });
});
