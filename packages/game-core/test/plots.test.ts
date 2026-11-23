import { describe, it, expect } from 'vitest';
import {
  PLOT_DEFINITIONS,
  findNearestPlot,
  parsePlotBuildings,
  serializePlotBuildings,
} from '../src/plots.js';
import { GameCoreEngine } from '../src/engine.js';

describe('Property plots (M27–M31)', () => {
  it('catalog has stable fictional plots', () => {
    expect(PLOT_DEFINITIONS.length).toBeGreaterThanOrEqual(4);
    expect(PLOT_DEFINITIONS.every((p) => p.id.startsWith('plot_'))).toBe(true);
  });

  it('finds nearest plot within radius', () => {
    const near = findNearestPlot({ x: 6, y: 0, z: -4.5 }, 12);
    expect(near?.id).toBe('plot_rathkhola_corner');
  });

  it('serializes plot buildings', () => {
    const csv = serializePlotBuildings({
      plot_mistri_yard: 'repair_garage',
      plot_rathkhola_corner: 'tea_kiosk',
    });
    const parsed = parsePlotBuildings(csv);
    expect(parsed.plot_mistri_yard).toBe('repair_garage');
    expect(parsed.plot_rathkhola_corner).toBe('tea_kiosk');
  });

  it('inspects, purchases idempotently, builds, and claims rent', () => {
    const engine = GameCoreEngine.createNewGame(1000);
    // Top up for purchases
    engine.economy.credit(50000, 'REPUTATION_BONUS', 'test top-up', 1000, 'tx_topup_plots');

    const plotId = 'plot_rathkhola_corner';
    expect(engine.inspectPlot(plotId)).toBe(true);
    expect(engine.inspectPlot(plotId)).toBe(false);
    expect(engine.getInspectedPlotIds()).toContain(plotId);

    const buy = engine.purchasePlot(plotId, 2000);
    expect(buy.success).toBe(true);
    expect(buy.transaction?.category).toBe('PROPERTY_PURCHASE');
    expect(engine.ownsPlot(plotId)).toBe(true);

    const buy2 = engine.purchasePlot(plotId, 3000);
    expect(buy2.success).toBe(false);
    expect(buy2.reason).toBe('ALREADY_OWNED');

    const build = engine.placeBuilding(plotId, 'tea_kiosk', 4000);
    expect(build.success).toBe(true);
    expect(build.transaction?.category).toBe('CONSTRUCTION_COST');
    expect(engine.getBuildingOnPlot(plotId)).toBe('tea_kiosk');

    const rent = engine.claimRentalIncome(plotId, 5000);
    expect(rent.success).toBe(true);
    expect(rent.transaction?.category).toBe('RENTAL_INCOME');
    expect(rent.incomeMinorUnits).toBe(800);

    const rentSoon = engine.claimRentalIncome(plotId, 6000);
    expect(rentSoon.success).toBe(false);
    expect(rentSoon.reason).toBe('COOLDOWN');

    const save = engine.toSaveEnvelope('m28', 'Prop');
    expect(String(save.worldFlags.ownedPlots)).toContain(plotId);
    expect(String(save.worldFlags.plotBuildings)).toContain('tea_kiosk');
    const loaded = GameCoreEngine.fromSaveEnvelope(save);
    expect(loaded.ownsPlot(plotId)).toBe(true);
    expect(loaded.getBuildingOnPlot(plotId)).toBe('tea_kiosk');
  });

  it('garage owners get repair discount', () => {
    const engine = GameCoreEngine.createNewGame(1000);
    engine.economy.credit(80000, 'REPUTATION_BONUS', 'top', 1, 'tx_top_garage');
    expect(engine.hasRepairGarage()).toBe(false);
    expect(engine.purchasePlot('plot_mistri_yard', 2).success).toBe(true);
    expect(engine.placeBuilding('plot_mistri_yard', 'repair_garage', 3).success).toBe(true);
    expect(engine.hasRepairGarage()).toBe(true);
    expect(engine.getGarageRepairDiscountMinor()).toBe(1000);
  });
});
