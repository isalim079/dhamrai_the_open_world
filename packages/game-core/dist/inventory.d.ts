/**
 * Dhamrai Life — Inventory Domain
 * ================================
 * Pure TypeScript inventory management for player items, documents, and cargo.
 */
import { ItemCategory, InventoryItem } from '@dhamrai/shared-contracts';
export type { ItemCategory, InventoryItem };
export declare class InventoryDomain {
    private readonly _maxSlots;
    private readonly _items;
    constructor(maxSlots?: number, initialItems?: InventoryItem[]);
    get maxSlots(): number;
    get usedSlots(): number;
    get availableSlots(): number;
    get items(): readonly InventoryItem[];
    hasItem(itemId: string, minQuantity?: number): boolean;
    getTotalQuantity(itemId: string): number;
    getItem(itemId: string): InventoryItem | undefined;
    /**
     * Adds an item into the inventory.
     * If item is stackable, fills existing stacks before creating new slots.
     */
    addItem(item: InventoryItem): void;
    /**
     * Removes a specified quantity of an item from the inventory.
     */
    removeItem(itemId: string, quantity?: number): void;
    clear(): void;
}
//# sourceMappingURL=inventory.d.ts.map