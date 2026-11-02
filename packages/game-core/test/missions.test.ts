import { describe, it, expect } from 'vitest';
import { EconomyDomain } from '../src/economy.js';
import { MissionDomain, PHASE_1_MISSIONS } from '../src/missions.js';

describe('MissionDomain — Lifecycle State Machine & Idempotent Payouts', () => {
  it('initializes with all three Phase 1 missions in AVAILABLE state', () => {
    const missions = new MissionDomain();
    const all = missions.getAllInstances();

    expect(all['mission_1_first_fare']).toBeDefined();
    expect(all['mission_2_police_checkpoint']).toBeDefined();
    expect(all['mission_3_artisan_order']).toBeDefined();

    expect(all['mission_1_first_fare']!.state).toBe('AVAILABLE');
    expect(all['mission_2_police_checkpoint']!.state).toBe('AVAILABLE');
    expect(all['mission_3_artisan_order']!.state).toBe('AVAILABLE');
  });

  it('progresses Mission 1 from AVAILABLE -> ACTIVE -> COMPLETED and awards ৳30', () => {
    const missions = new MissionDomain();
    const economy = new EconomyDomain([], 25000); // ৳250 start
    let reputationGain = 0;

    // 1. Activate
    missions.activateMission('mission_1_first_fare', 1000);
    expect(missions.getInstance('mission_1_first_fare')!.state).toBe('ACTIVE');

    // 2. Complete objectives
    missions.completeObjective('mission_1_first_fare', 'obj_m1_pickup');
    expect(missions.areAllObjectivesCompleted('mission_1_first_fare')).toBe(false);

    missions.completeObjective('mission_1_first_fare', 'obj_m1_dropoff');
    expect(missions.areAllObjectivesCompleted('mission_1_first_fare')).toBe(true);

    // 3. Complete mission & claim payout
    const res = missions.completeMission(
      'mission_1_first_fare',
      economy,
      (rep) => {
        reputationGain += rep;
      },
      2000
    );

    expect(res.success).toBe(true);
    expect(res.payoutApplied).toBe(true);
    expect(res.payoutPence).toBe(3000); // ৳30
    expect(res.reputationDelta).toBe(5);
    expect(reputationGain).toBe(5);

    // Economy balance increases from ৳250 (25000) to ৳280 (28000)
    expect(economy.balancePence).toBe(28000);
    expect(economy.balanceTaka).toBe(280);
    expect(economy.verifyIntegrity()).toBe(true);
    expect(missions.getInstance('mission_1_first_fare')!.state).toBe('COMPLETED');
  });

  it('guarantees IDEMPOTENCY: Repeated completion calls NEVER award duplicate payouts', () => {
    const missions = new MissionDomain();
    const economy = new EconomyDomain([], 25000);
    let reputationGained = 0;

    missions.activateMission('mission_1_first_fare', 1000);
    missions.completeObjective('mission_1_first_fare', 'obj_m1_pickup');
    missions.completeObjective('mission_1_first_fare', 'obj_m1_dropoff');

    // First completion call: awards ৳30
    const res1 = missions.completeMission(
      'mission_1_first_fare',
      economy,
      (rep) => {
        reputationGained += rep;
      },
      2000
    );
    expect(res1.payoutApplied).toBe(true);
    expect(economy.balancePence).toBe(28000);
    expect(reputationGained).toBe(5);

    // Second completion call (e.g. simulated network retry, UI double-click, or reload loop)
    const res2 = missions.completeMission(
      'mission_1_first_fare',
      economy,
      (rep) => {
        reputationGained += rep;
      },
      3000
    );

    // Must be rejected as already completed without any extra cash or reputation
    expect(res2.success).toBe(true);
    expect(res2.payoutApplied).toBe(false);
    expect(res2.reason).toBe('ALREADY_COMPLETED');
    expect(economy.balancePence).toBe(28000); // Still exactly 28,000! No double payout!
    expect(reputationGained).toBe(5); // Reputation did not increase!

    // Third completion call
    const res3 = missions.completeMission(
      'mission_1_first_fare',
      economy,
      (rep) => {
        reputationGained += rep;
      },
      4000
    );
    expect(res3.payoutApplied).toBe(false);
    expect(economy.balancePence).toBe(28000);
    expect(economy.ledger.length).toBe(2); // Initial balance + 1 payout only
  });

  it('rejects completing a mission when mandatory objectives are incomplete', () => {
    const missions = new MissionDomain();
    const economy = new EconomyDomain([], 25000);

    missions.activateMission('mission_1_first_fare');
    // Only completed pickup, dropoff is still pending
    missions.completeObjective('mission_1_first_fare', 'obj_m1_pickup');

    const res = missions.completeMission('mission_1_first_fare', economy);
    expect(res.success).toBe(false);
    expect(res.payoutApplied).toBe(false);
    expect(res.reason).toMatch(/Incomplete objectives/);
    expect(economy.balancePence).toBe(25000);
    expect(missions.getInstance('mission_1_first_fare')!.state).toBe('ACTIVE');
  });

  it('handles Mission 2 police checkpoint: awards civic reputation with 0 cash payout', () => {
    const missions = new MissionDomain();
    const economy = new EconomyDomain([], 25000);
    let civicRep = 0;

    missions.activateMission('mission_2_police_checkpoint', 1000);
    missions.completeObjective('mission_2_police_checkpoint', 'obj_m2_approach');
    missions.completeObjective('mission_2_police_checkpoint', 'obj_m2_show_docs');

    const res = missions.completeMission(
      'mission_2_police_checkpoint',
      economy,
      (rep) => {
        civicRep += rep;
      },
      1500
    );

    expect(res.success).toBe(true);
    expect(res.payoutPence).toBe(0);
    expect(civicRep).toBe(5);
    expect(economy.balancePence).toBe(25000); // ৳0 reward leaves balance unchanged
  });

  it('handles Mission 3 brass artisan order: awards ৳75 and artisan guild trust', () => {
    const missions = new MissionDomain();
    const economy = new EconomyDomain([], 25000);
    let artisanRep = 0;

    missions.activateMission('mission_3_artisan_order', 1000);
    missions.completeObjective('mission_3_artisan_order', 'obj_m3_collect_cargo');
    missions.completeObjective('mission_3_artisan_order', 'obj_m3_deliver_cargo');

    const res = missions.completeMission(
      'mission_3_artisan_order',
      economy,
      (rep) => {
        artisanRep += rep;
      },
      2500
    );

    expect(res.success).toBe(true);
    expect(res.payoutPence).toBe(7500); // ৳75
    expect(artisanRep).toBe(10);
    expect(economy.balancePence).toBe(32500); // 25000 + 7500 = 32500 (৳325.00)
    expect(economy.verifyIntegrity()).toBe(true);
  });
});
