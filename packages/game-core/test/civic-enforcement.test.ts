import { describe, it, expect } from 'vitest';
import {
  evaluateInfraction,
  openPoliceStop,
  applyLicenseDiscount,
  applyPoliceHeat,
  decayPoliceHeat,
  computeFineForCodes,
  SPEEDING_THRESHOLD_KPH,
  THANA_ENFORCE_RADIUS_M,
  STOP_COOLDOWN_MS,
  FINE_SPEEDING_MINOR,
  FINE_NIGHT_ADDON_MINOR,
  FINE_FLEE_MINOR,
  LICENSE_DISCOUNT_MINOR,
  HEAT_ON_PAY,
} from '../src/civic-enforcement.js';
import { GameCoreEngine } from '../src/engine.js';
import { PHASE_1_ANCHORS } from '@dhamrai/shared-contracts';

describe('CivicEnforcement — fines, heat, stops', () => {
  it('detects speeding near Thana', () => {
    const inf = evaluateInfraction({
      speedKph: SPEEDING_THRESHOLD_KPH,
      distanceToThanaM: THANA_ENFORCE_RADIUS_M - 1,
      inVehicle: true,
      isNightOrDusk: false,
      hasLicense: true,
      policeHeat: 0,
      nowMs: 100_000,
      lastStopMs: 0,
      hasActiveStop: false,
    });
    expect(inf).not.toBeNull();
    expect(inf!.code).toBe('SPEEDING');
    expect(inf!.fineMinorUnits).toBe(FINE_SPEEDING_MINOR);
  });

  it('adds night reckless surcharge', () => {
    const inf = evaluateInfraction({
      speedKph: 18,
      distanceToThanaM: 10,
      inVehicle: true,
      isNightOrDusk: true,
      hasLicense: true,
      policeHeat: 0,
      nowMs: 100_000,
      lastStopMs: 0,
      hasActiveStop: false,
    });
    expect(inf).not.toBeNull();
    expect(inf!.fineMinorUnits).toBe(FINE_SPEEDING_MINOR + FINE_NIGHT_ADDON_MINOR);
  });

  it('respects stop cooldown', () => {
    const inf = evaluateInfraction({
      speedKph: 20,
      distanceToThanaM: 5,
      inVehicle: true,
      isNightOrDusk: false,
      hasLicense: true,
      policeHeat: 0,
      nowMs: STOP_COOLDOWN_MS - 1,
      lastStopMs: 0,
      hasActiveStop: false,
    });
    expect(inf).toBeNull();
  });

  it('detects flee beyond radius during active stop', () => {
    const opened = openPoliceStop(
      {
        code: 'SPEEDING',
        fineMinorUnits: FINE_SPEEDING_MINOR,
        heatDelta: 8,
        descriptionBn: 'x',
        descriptionEn: 'x',
      },
      1000,
      true,
      { x: 0, z: 0 }
    );
    const flee = evaluateInfraction({
      speedKph: 0,
      distanceToThanaM: 5,
      inVehicle: true,
      isNightOrDusk: false,
      hasLicense: true,
      policeHeat: 10,
      nowMs: 2000,
      lastStopMs: 1000,
      hasActiveStop: true,
      activeStop: opened.stop,
      playerDistanceFromStopM: 15,
    });
    expect(flee).not.toBeNull();
    expect(flee!.code).toBe('FLEE_STOP');
    expect(flee!.fineMinorUnits).toBe(FINE_FLEE_MINOR);
  });

  it('applies license discount once', () => {
    const { stop } = openPoliceStop(
      {
        code: 'SPEEDING',
        fineMinorUnits: FINE_SPEEDING_MINOR,
        heatDelta: 8,
        descriptionBn: 'x',
        descriptionEn: 'x',
      },
      1,
      true,
      { x: 0, z: 0 }
    );
    const discounted = applyLicenseDiscount(stop);
    expect(discounted.currentFineMinorUnits).toBe(FINE_SPEEDING_MINOR - LICENSE_DISCOUNT_MINOR);
    const again = applyLicenseDiscount(discounted);
    expect(again.currentFineMinorUnits).toBe(discounted.currentFineMinorUnits);
  });

  it('clamps heat and decays when not fleeing', () => {
    expect(applyPoliceHeat(95, 20)).toBe(100);
    expect(applyPoliceHeat(5, HEAT_ON_PAY)).toBe(0);
    const decayed = decayPoliceHeat(30, 60, false);
    expect(decayed).toBeLessThan(30);
    expect(decayPoliceHeat(30, 60, true)).toBe(30);
  });

  it('computeFineForCodes aggregates', () => {
    const c = computeFineForCodes(['SPEEDING', 'NIGHT_RECKLESS']);
    expect(c.fineMinorUnits).toBe(FINE_SPEEDING_MINOR + FINE_NIGHT_ADDON_MINOR);
  });
});

describe('GameCoreEngine — M14 police stop integration', () => {
  it('opens stop, pays FINE_PENALTY, and persists heat', () => {
    const engine = GameCoreEngine.createNewGame(1000);
    const thana = PHASE_1_ANCHORS.THANA_JUNCTION_CHECKPOINT;
    engine.updatePlayerPosition(thana);

    const inf = engine.evaluateInfraction({
      speedKph: 18,
      distanceToThanaM: 5,
      inVehicle: true,
      isNightOrDusk: false,
      hasLicense: true,
      nowMs: 200_000,
      playerDistanceFromStopM: 0,
    });
    expect(inf).not.toBeNull();

    const stop = engine.beginPoliceStop(inf!, { x: thana.x, z: thana.z }, 200_000);
    expect(engine.policeHeat).toBeGreaterThan(0);
    expect(stop.currentFineMinorUnits).toBeGreaterThan(0);

    const before = engine.economy.balanceMinorUnits;
    const pay = engine.payFine(200_100, 'tx_m14_fine_1');
    expect(pay.success).toBe(true);
    expect(pay.transaction?.category).toBe('FINE_PENALTY');
    expect(engine.economy.balanceMinorUnits).toBe(before - stop.currentFineMinorUnits);

    const save = engine.toSaveEnvelope('m14', 'M14');
    expect(save.saveSchemaVersion).toBe(2);
    expect(save.player.policeHeat).toBe(engine.policeHeat);
    expect(save.player.civicTrust).toBe(engine.civicTrust);

    const loaded = GameCoreEngine.fromSaveEnvelope(save);
    expect(loaded.policeHeat).toBe(engine.policeHeat);
    expect(loaded.civicTrust).toBe(engine.civicTrust);
  });

  it('rejects pay when insolvent', () => {
    const engine = GameCoreEngine.createNewGame(1000);
    while (engine.economy.balanceMinorUnits >= 5000) {
      engine.processDailyVehicleRent(Date.now());
    }
    const bal = engine.economy.balanceMinorUnits;
    if (bal > 0) {
      engine.economy.debit(bal, 'FINE_PENALTY', 'drain', Date.now(), 'tx_drain_m14');
    }

    const stop = engine.beginPoliceStop(
      {
        code: 'SPEEDING',
        fineMinorUnits: FINE_SPEEDING_MINOR,
        heatDelta: 8,
        descriptionBn: 'x',
        descriptionEn: 'x',
      },
      { x: 0, z: 0 },
      50_000
    );
    expect(stop.currentFineMinorUnits).toBeGreaterThan(0);
    const pay = engine.payFine(50_100, 'tx_m14_fail');
    expect(pay.success).toBe(false);
    expect(pay.reason).toBe('INSUFFICIENT_FUNDS');
  });

  it('hydrates missing policeHeat/civicTrust defaults', () => {
    const engine = GameCoreEngine.createNewGame(1000);
    const save = engine.toSaveEnvelope('legacy', 'L');
    delete save.player.policeHeat;
    delete save.player.civicTrust;
    const loaded = GameCoreEngine.fromSaveEnvelope(save);
    expect(loaded.policeHeat).toBe(0);
    expect(loaded.civicTrust).toBe(10);
  });
});
