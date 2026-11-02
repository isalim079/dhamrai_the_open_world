import { describe, it, expect } from 'vitest';
import {
  EconomyDomain,
  takaToPoisha,
  poishaToTaka,
  formatPoishaAsTaka,
} from '../src/economy.js';

describe('EconomyDomain — Currency & Append-Only Ledger', () => {
  it('converts correctly between whole/fractional Taka and Poisha', () => {
    expect(takaToPoisha(250)).toBe(25000);
    expect(takaToPoisha(30)).toBe(3000);
    expect(takaToPoisha(0.5)).toBe(50);
    expect(poishaToTaka(25000)).toBe(250);
    expect(poishaToTaka(3000)).toBe(30);

    expect(formatPoishaAsTaka(25000)).toBe('৳250.00');
    expect(formatPoishaAsTaka(3050)).toBe('৳30.50');
    expect(formatPoishaAsTaka(75)).toBe('৳0.75');
  });

  it('rejects non-finite, NaN, and non-integer inputs in conversion functions', () => {
    expect(() => takaToPoisha(NaN)).toThrow(TypeError);
    expect(() => takaToPoisha(Infinity)).toThrow(TypeError);
    expect(() => poishaToTaka(12.34)).toThrow(TypeError);
  });

  it('initializes starting balance with an immutable INITIAL_BALANCE ledger entry', () => {
    const economy = new EconomyDomain([], 25000);
    expect(economy.balancePence).toBe(25000);
    expect(economy.balanceTaka).toBe(250);
    expect(economy.ledger.length).toBe(1);

    const firstTx = economy.ledger[0]!;
    expect(firstTx.category).toBe('INITIAL_BALANCE');
    expect(firstTx.deltaPence).toBe(25000);
    expect(firstTx.runningBalancePence).toBe(25000);
    expect(economy.verifyIntegrity()).toBe(true);
  });

  it('credits fare payments and calculates running balance deterministically', () => {
    const economy = new EconomyDomain([], 25000); // ৳250

    // Earn ৳30 from Mission 1
    const tx = economy.credit(3000, 'FARE_PAYMENT', 'Mission 1: First Fare payout', 1000);
    expect(tx.deltaPence).toBe(3000);
    expect(tx.runningBalancePence).toBe(28000);
    expect(economy.balancePence).toBe(28000);
    expect(economy.balanceTaka).toBe(280);
    expect(economy.verifyIntegrity()).toBe(true);
  });

  it('debits vehicle rental fees and prevents illegal overdrafts', () => {
    const economy = new EconomyDomain([], 1000); // ৳10

    // Attempting to pay ৳50 rental fee with only ৳10 must fail
    expect(economy.hasSufficientFunds(5000)).toBe(false);
    expect(() =>
      economy.debit(5000, 'VEHICLE_RENTAL', 'Daily rickshaw rent')
    ).toThrow(RangeError);

    // Balance remains intact after failed transaction
    expect(economy.balancePence).toBe(1000);
    expect(economy.verifyIntegrity()).toBe(true);

    // If allowed overdraft, transaction succeeds
    const overdraftTx = economy.debit(
      5000,
      'VEHICLE_RENTAL',
      'Daily rickshaw rent with overdraft',
      2000,
      'tx_overdraft_01',
      true
    );
    expect(overdraftTx.runningBalancePence).toBe(-4000);
    expect(economy.balancePence).toBe(-4000);
    expect(economy.verifyIntegrity()).toBe(true);
  });

  it('strictly rejects duplicate transaction IDs', () => {
    const economy = new EconomyDomain([], 10000);
    economy.credit(1000, 'FARE_PAYMENT', 'Fare 1', 100, 'tx_fixed_id_100');

    expect(() =>
      economy.credit(1000, 'FARE_PAYMENT', 'Duplicate Fare', 101, 'tx_fixed_id_100')
    ).toThrow(/already exists/);

    expect(economy.ledger.length).toBe(2);
    expect(economy.balancePence).toBe(11000);
  });

  it('detects tampering or corruption when hydrating a ledger', () => {
    const corruptedLedger = [
      {
        id: 'tx_1',
        timestampMs: 1000,
        category: 'INITIAL_BALANCE' as const,
        deltaPence: 25000,
        description: 'Start',
        runningBalancePence: 25000,
      },
      {
        id: 'tx_2',
        timestampMs: 2000,
        category: 'FARE_PAYMENT' as const,
        deltaPence: 3000,
        description: 'Fare',
        runningBalancePence: 99999, // Tampered running balance
      },
    ];

    expect(() => new EconomyDomain(corruptedLedger)).toThrow(/Ledger integrity check failed/);
  });
});
