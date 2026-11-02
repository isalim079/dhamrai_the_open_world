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
import { EconomyTransaction, TransactionCategory } from '@dhamrai/shared-contracts';
/**
 * Converts whole Bangladeshi Taka (৳) to Poisha (integer minor units).
 */
export declare function takaToPoisha(taka: number): number;
/**
 * Converts Poisha to fractional Taka.
 */
export declare function poishaToTaka(poisha: number): number;
/**
 * Formats Poisha as a standard Bengali Taka currency string (e.g. "৳250.00").
 */
export declare function formatPoishaAsTaka(poisha: number): string;
export declare function generateDeterministicTxId(category: TransactionCategory, timestampMs: number): string;
export declare class EconomyDomain {
    private _balanceMinorUnits;
    private readonly _ledger;
    private readonly _txIdSet;
    constructor(initialLedger?: EconomyTransaction[], startingCashMinorUnits?: number);
    /**
     * Current liquid cash balance in Poisha (integer minor units).
     */
    get balanceMinorUnits(): number;
    /**
     * Alias for balanceMinorUnits in Poisha.
     */
    get balancePoisha(): number;
    /**
     * Backwards-compatible alias for balanceMinorUnits.
     */
    get balancePence(): number;
    /**
     * Current balance in whole and fractional Taka.
     */
    get balanceTaka(): number;
    /**
     * Returns an immutable read-only view of the transaction ledger.
     */
    get ledger(): readonly EconomyTransaction[];
    /**
     * Checks whether a transaction with the given ID is recorded in the ledger.
     */
    hasTransaction(id: string): boolean;
    /**
     * Checks whether the player can afford a given expense in minor currency units (Poisha).
     */
    hasSufficientFunds(amountMinorUnits: number): boolean;
    /**
     * Credits the player's account with a positive minor unit amount.
     */
    credit(amountMinorUnits: number, category: TransactionCategory, description: string, timestampMs?: number, customId?: string): EconomyTransaction;
    /**
     * Debits the player's account with a negative delta.
     * Throws RangeError if balance is insufficient unless allowOverdraft is explicitly enabled.
     */
    debit(amountMinorUnits: number, category: TransactionCategory, description: string, timestampMs?: number, customId?: string, allowOverdraft?: boolean): EconomyTransaction;
    /**
     * Evaluates the fundamental ledger invariant:
     * Current Balance == Sum of all deltaMinorUnits in the Ledger.
     */
    verifyIntegrity(): boolean;
}
//# sourceMappingURL=economy.d.ts.map