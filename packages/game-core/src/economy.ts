/**
 * Dhamrai Life — Economy Domain & Append-Only Cash Ledger
 * ========================================================
 * Strict integer-based currency domain operating in minor units (Poisha).
 * 1 Taka (৳) = 100 Poisha.
 *
 * Guarantees:
 * 1. Strict integer arithmetic (no floating-point rounding errors).
 * 2. Immutable, append-only transaction ledger.
 * 3. Invariant: Current balance must strictly equal the algebraic sum of all ledger events.
 * 4. Insufficient fund guards (prevents illegal overdrafts).
 */

import { EconomyTransaction, TransactionCategory } from '@dhamrai/shared-contracts';

/**
 * Converts whole Bangladeshi Taka (৳) to Poisha (integer pence/cents).
 */
export function takaToPoisha(taka: number): number {
  if (!Number.isFinite(taka)) {
    throw new TypeError(`Invalid Taka value: ${taka}. Must be a finite number.`);
  }
  return Math.round(taka * 100);
}

/**
 * Converts Poisha to fractional Taka.
 */
export function poishaToTaka(poisha: number): number {
  assertSafeInteger(poisha, 'poisha');
  return poisha / 100;
}

/**
 * Formats Poisha as a standard Bengali Taka currency string (e.g. "৳250.00").
 */
export function formatPoishaAsTaka(poisha: number): string {
  assertSafeInteger(poisha, 'poisha');
  const sign = poisha < 0 ? '-' : '';
  const abs = Math.abs(poisha);
  const taka = Math.floor(abs / 100);
  const paisa = abs % 100;
  return `${sign}৳${taka}.${paisa.toString().padStart(2, '0')}`;
}

function assertSafeInteger(value: number, paramName: string): void {
  if (!Number.isSafeInteger(value)) {
    throw new TypeError(`Invalid ${paramName}: ${value}. Must be a safe integer.`);
  }
}

let txSequenceCounter = 0;

export function generateDeterministicTxId(category: TransactionCategory, timestampMs: number): string {
  txSequenceCounter += 1;
  return `tx_${timestampMs}_${category.toLowerCase()}_${txSequenceCounter}`;
}

export class EconomyDomain {
  private _balancePence: number = 0;
  private readonly _ledger: EconomyTransaction[] = [];
  private readonly _txIdSet: Set<string> = new Set();

  constructor(initialLedger: EconomyTransaction[] = [], startingCashPence: number = 0) {
    if (initialLedger.length > 0) {
      // Hydrate from existing ledger
      let runningSum = 0;
      for (const tx of initialLedger) {
        assertSafeInteger(tx.deltaPence, 'transaction deltaPence');
        assertSafeInteger(tx.timestampMs, 'transaction timestampMs');
        if (this._txIdSet.has(tx.id)) {
          throw new Error(`Duplicate transaction ID detected in ledger: ${tx.id}`);
        }
        runningSum += tx.deltaPence;
        if (tx.runningBalancePence !== runningSum) {
          throw new Error(
            `Ledger integrity check failed for transaction ${tx.id}. Expected running balance ${runningSum}, found ${tx.runningBalancePence}.`
          );
        }
        this._ledger.push(Object.freeze({ ...tx }));
        this._txIdSet.add(tx.id);
      }
      this._balancePence = runningSum;
    } else if (startingCashPence > 0) {
      assertSafeInteger(startingCashPence, 'startingCashPence');
      const now = Date.now();
      const initTx: EconomyTransaction = {
        id: `tx_init_${now}`,
        timestampMs: now,
        category: 'INITIAL_BALANCE',
        deltaPence: startingCashPence,
        description: 'Starting cash balance',
        runningBalancePence: startingCashPence,
      };
      this._balancePence = startingCashPence;
      this._ledger.push(Object.freeze(initTx));
      this._txIdSet.add(initTx.id);
    }
  }

  /**
   * Current liquid cash balance in Poisha.
   */
  public get balancePence(): number {
    return this._balancePence;
  }

  /**
   * Current balance in Taka.
   */
  public get balanceTaka(): number {
    return poishaToTaka(this._balancePence);
  }

  /**
   * Returns an immutable read-only view of the transaction ledger.
   */
  public get ledger(): readonly EconomyTransaction[] {
    return this._ledger;
  }

  /**
   * Checks whether a transaction with the given ID is recorded in the ledger.
   */
  public hasTransaction(id: string): boolean {
    return this._txIdSet.has(id);
  }

  /**
   * Checks whether the player can afford a given expense in Poisha.
   */
  public hasSufficientFunds(amountPence: number): boolean {
    assertSafeInteger(amountPence, 'amountPence');
    if (amountPence < 0) {
      throw new RangeError(`Amount to check cannot be negative: ${amountPence}`);
    }
    return this._balancePence >= amountPence;
  }

  /**
   * Credits the player's account with a positive amount.
   */
  public credit(
    amountPence: number,
    category: TransactionCategory,
    description: string,
    timestampMs: number = Date.now(),
    customId?: string
  ): EconomyTransaction {
    assertSafeInteger(amountPence, 'amountPence');
    if (amountPence < 0) {
      throw new RangeError(`Credit amount must be non-negative: ${amountPence}. Use debit() for expenses.`);
    }

    const txId = customId ?? generateDeterministicTxId(category, timestampMs);
    if (this._txIdSet.has(txId)) {
      throw new Error(`Transaction with ID "${txId}" already exists. Payouts must be idempotent.`);
    }

    this._balancePence += amountPence;
    const tx: EconomyTransaction = Object.freeze({
      id: txId,
      timestampMs,
      category,
      deltaPence: amountPence,
      description,
      runningBalancePence: this._balancePence,
    });

    this._ledger.push(tx);
    this._txIdSet.add(tx.id);
    return tx;
  }

  /**
   * Debits the player's account with a negative delta.
   * Throws RangeError if balance is insufficient unless allowOverdraft is explicitly enabled.
   */
  public debit(
    amountPence: number,
    category: TransactionCategory,
    description: string,
    timestampMs: number = Date.now(),
    customId?: string,
    allowOverdraft: boolean = false
  ): EconomyTransaction {
    assertSafeInteger(amountPence, 'amountPence');
    if (amountPence < 0) {
      throw new RangeError(`Debit amount must be non-negative: ${amountPence}. Passed amount is subtracted.`);
    }

    if (!allowOverdraft && this._balancePence < amountPence) {
      throw new RangeError(
        `Insufficient funds: Attempted to debit ${amountPence} Poisha (${formatPoishaAsTaka(
          amountPence
        )}), but current balance is only ${this._balancePence} Poisha (${formatPoishaAsTaka(this._balancePence)}).`
      );
    }

    const txId = customId ?? generateDeterministicTxId(category, timestampMs);
    if (this._txIdSet.has(txId)) {
      throw new Error(`Transaction with ID "${txId}" already exists.`);
    }

    this._balancePence -= amountPence;
    const tx: EconomyTransaction = Object.freeze({
      id: txId,
      timestampMs,
      category,
      deltaPence: -amountPence,
      description,
      runningBalancePence: this._balancePence,
    });

    this._ledger.push(tx);
    this._txIdSet.add(tx.id);
    return tx;
  }

  /**
   * Evaluates the fundamental ledger invariant:
   * Current Balance == Sum of all Delta Events in the Ledger.
   */
  public verifyIntegrity(): boolean {
    let calculated = 0;
    for (const tx of this._ledger) {
      calculated += tx.deltaPence;
      if (tx.runningBalancePence !== calculated) {
        return false;
      }
    }
    return calculated === this._balancePence;
  }
}
