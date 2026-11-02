/**
 * Dhamrai Life — Economy Domain & Append-Only Cash Ledger
 * ========================================================
 * Strict integer-based currency domain operating in minor units (Poisha).
 * 1 Bangladeshi Taka (BDT) = 100 Poisha.
 *
 * Guarantees:
 * 1. Strict integer arithmetic (no floating-point rounding errors).
 * 2. Immutable, append-only transaction ledger with explicit BDT currency code.
 * 3. Invariant: Current balance must strictly equal the algebraic sum of all ledger deltaMinorUnits.
 * 4. Insufficient fund guards (prevents illegal overdrafts).
 */
import { CURRENCY_CODE_BDT, } from '@dhamrai/shared-contracts';
/**
 * Converts whole Bangladeshi Taka (৳) to Poisha (integer minor units).
 */
export function takaToPoisha(taka) {
    if (!Number.isFinite(taka)) {
        throw new TypeError(`Invalid Taka value: ${taka}. Must be a finite number.`);
    }
    return Math.round(taka * 100);
}
/**
 * Converts Poisha to fractional Taka.
 */
export function poishaToTaka(poisha) {
    assertSafeInteger(poisha, 'poisha');
    return poisha / 100;
}
/**
 * Formats Poisha as a standard Bengali Taka currency string (e.g. "৳250.00").
 */
export function formatPoishaAsTaka(poisha) {
    assertSafeInteger(poisha, 'poisha');
    const sign = poisha < 0 ? '-' : '';
    const abs = Math.abs(poisha);
    const taka = Math.floor(abs / 100);
    const paisa = abs % 100;
    return `${sign}৳${taka}.${paisa.toString().padStart(2, '0')}`;
}
function assertSafeInteger(value, paramName) {
    if (!Number.isSafeInteger(value)) {
        throw new TypeError(`Invalid ${paramName}: ${value}. Must be a safe integer.`);
    }
}
let txSequenceCounter = 0;
export function generateDeterministicTxId(category, timestampMs) {
    txSequenceCounter += 1;
    return `tx_${timestampMs}_${category.toLowerCase()}_${txSequenceCounter}`;
}
export class EconomyDomain {
    _balanceMinorUnits = 0;
    _ledger = [];
    _txIdSet = new Set();
    constructor(initialLedger = [], startingCashMinorUnits = 0) {
        if (initialLedger.length > 0) {
            // Hydrate from existing ledger
            let runningSum = 0;
            for (const tx of initialLedger) {
                assertSafeInteger(tx.deltaMinorUnits, 'transaction deltaMinorUnits');
                assertSafeInteger(tx.timestampMs, 'transaction timestampMs');
                if (this._txIdSet.has(tx.id)) {
                    throw new Error(`Duplicate transaction ID detected in ledger: ${tx.id}`);
                }
                runningSum += tx.deltaMinorUnits;
                if (tx.runningBalanceMinorUnits !== runningSum) {
                    throw new Error(`Ledger integrity check failed for transaction ${tx.id}. Expected running balance ${runningSum}, found ${tx.runningBalanceMinorUnits}.`);
                }
                this._ledger.push(Object.freeze({ ...tx, currency: CURRENCY_CODE_BDT }));
                this._txIdSet.add(tx.id);
            }
            this._balanceMinorUnits = runningSum;
        }
        else if (startingCashMinorUnits > 0) {
            assertSafeInteger(startingCashMinorUnits, 'startingCashMinorUnits');
            const now = Date.now();
            const initTx = {
                id: `tx_init_${now}`,
                timestampMs: now,
                category: 'INITIAL_BALANCE',
                deltaMinorUnits: startingCashMinorUnits,
                currency: CURRENCY_CODE_BDT,
                description: 'Starting cash balance',
                runningBalanceMinorUnits: startingCashMinorUnits,
            };
            this._balanceMinorUnits = startingCashMinorUnits;
            this._ledger.push(Object.freeze(initTx));
            this._txIdSet.add(initTx.id);
        }
    }
    /**
     * Current liquid cash balance in Poisha (integer minor units).
     */
    get balanceMinorUnits() {
        return this._balanceMinorUnits;
    }
    /**
     * Alias for balanceMinorUnits in Poisha.
     */
    get balancePoisha() {
        return this._balanceMinorUnits;
    }
    /**
     * Backwards-compatible alias for balanceMinorUnits.
     */
    get balancePence() {
        return this._balanceMinorUnits;
    }
    /**
     * Current balance in whole and fractional Taka.
     */
    get balanceTaka() {
        return poishaToTaka(this._balanceMinorUnits);
    }
    /**
     * Returns an immutable read-only view of the transaction ledger.
     */
    get ledger() {
        return this._ledger;
    }
    /**
     * Checks whether a transaction with the given ID is recorded in the ledger.
     */
    hasTransaction(id) {
        return this._txIdSet.has(id);
    }
    /**
     * Checks whether the player can afford a given expense in minor currency units (Poisha).
     */
    hasSufficientFunds(amountMinorUnits) {
        assertSafeInteger(amountMinorUnits, 'amountMinorUnits');
        if (amountMinorUnits < 0) {
            throw new RangeError(`Amount to check cannot be negative: ${amountMinorUnits}`);
        }
        return this._balanceMinorUnits >= amountMinorUnits;
    }
    /**
     * Credits the player's account with a positive minor unit amount.
     */
    credit(amountMinorUnits, category, description, timestampMs = Date.now(), customId) {
        assertSafeInteger(amountMinorUnits, 'amountMinorUnits');
        if (amountMinorUnits < 0) {
            throw new RangeError(`Credit amount must be non-negative: ${amountMinorUnits}. Use debit() for expenses.`);
        }
        const txId = customId ?? generateDeterministicTxId(category, timestampMs);
        if (this._txIdSet.has(txId)) {
            throw new Error(`Transaction with ID "${txId}" already exists. Payouts must be idempotent.`);
        }
        this._balanceMinorUnits += amountMinorUnits;
        const tx = Object.freeze({
            id: txId,
            timestampMs,
            category,
            deltaMinorUnits: amountMinorUnits,
            currency: CURRENCY_CODE_BDT,
            description,
            runningBalanceMinorUnits: this._balanceMinorUnits,
        });
        this._ledger.push(tx);
        this._txIdSet.add(tx.id);
        return tx;
    }
    /**
     * Debits the player's account with a negative delta.
     * Throws RangeError if balance is insufficient unless allowOverdraft is explicitly enabled.
     */
    debit(amountMinorUnits, category, description, timestampMs = Date.now(), customId, allowOverdraft = false) {
        assertSafeInteger(amountMinorUnits, 'amountMinorUnits');
        if (amountMinorUnits < 0) {
            throw new RangeError(`Debit amount must be non-negative: ${amountMinorUnits}. Passed amount is subtracted.`);
        }
        if (!allowOverdraft && this._balanceMinorUnits < amountMinorUnits) {
            throw new RangeError(`Insufficient funds: Attempted to debit ${amountMinorUnits} Poisha (${formatPoishaAsTaka(amountMinorUnits)}), but current balance is only ${this._balanceMinorUnits} Poisha (${formatPoishaAsTaka(this._balanceMinorUnits)}).`);
        }
        const txId = customId ?? generateDeterministicTxId(category, timestampMs);
        if (this._txIdSet.has(txId)) {
            throw new Error(`Transaction with ID "${txId}" already exists.`);
        }
        this._balanceMinorUnits -= amountMinorUnits;
        const tx = Object.freeze({
            id: txId,
            timestampMs,
            category,
            deltaMinorUnits: -amountMinorUnits,
            currency: CURRENCY_CODE_BDT,
            description,
            runningBalanceMinorUnits: this._balanceMinorUnits,
        });
        this._ledger.push(tx);
        this._txIdSet.add(tx.id);
        return tx;
    }
    /**
     * Evaluates the fundamental ledger invariant:
     * Current Balance == Sum of all deltaMinorUnits in the Ledger.
     */
    verifyIntegrity() {
        let calculated = 0;
        for (const tx of this._ledger) {
            calculated += tx.deltaMinorUnits;
            if (tx.runningBalanceMinorUnits !== calculated) {
                return false;
            }
        }
        return calculated === this._balanceMinorUnits;
    }
}
//# sourceMappingURL=economy.js.map