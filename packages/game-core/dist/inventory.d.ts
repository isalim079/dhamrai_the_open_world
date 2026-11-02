/**
 * Dhamrai Life — Inventory Domain
 * ================================
 * Pure TypeScript inventory management for player items, documents, and cargo.
 */
export type ItemCategory = 'DOCUMENT' | 'TOOL' | 'CARGO' | 'VALUABLE' | 'CONSUMABLE';
export interface InventoryItem {
    id: string;
    nameBn: string;
    nameEn: string;
    category: ItemCategory;
    quantity: number;
    isStackable: boolean;
    maxStackSize: number;
    descriptionBn: string;
    descriptionEn: string;
    metadata?: Record<string, string | number | boolean>;
}
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