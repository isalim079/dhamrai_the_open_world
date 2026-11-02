/**
 * Dhamrai Life — Inventory Domain
 * ================================
 * Pure TypeScript inventory management for player items, documents, and cargo.
 */
export class InventoryDomain {
    _maxSlots;
    _items = [];
    constructor(maxSlots = 20, initialItems = []) {
        if (!Number.isSafeInteger(maxSlots) || maxSlots <= 0) {
            throw new RangeError(`maxSlots must be a positive integer, got: ${maxSlots}`);
        }
        this._maxSlots = maxSlots;
        for (const item of initialItems) {
            this.addItem(item);
        }
    }
    get maxSlots() {
        return this._maxSlots;
    }
    get usedSlots() {
        return this._items.length;
    }
    get availableSlots() {
        return this._maxSlots - this._items.length;
    }
    get items() {
        return this._items.map((it) => ({ ...it, metadata: it.metadata ? { ...it.metadata } : undefined }));
    }
    hasItem(itemId, minQuantity = 1) {
        const total = this.getTotalQuantity(itemId);
        return total >= minQuantity;
    }
    getTotalQuantity(itemId) {
        return this._items
            .filter((it) => it.id === itemId)
            .reduce((sum, it) => sum + it.quantity, 0);
    }
    getItem(itemId) {
        const found = this._items.find((it) => it.id === itemId);
        return found ? { ...found, metadata: found.metadata ? { ...found.metadata } : undefined } : undefined;
    }
    /**
     * Adds an item into the inventory.
     * If item is stackable, fills existing stacks before creating new slots.
     */
    addItem(item) {
        if (!Number.isSafeInteger(item.quantity) || item.quantity <= 0) {
            throw new RangeError(`Item quantity must be a positive integer: ${item.quantity}`);
        }
        let remainingToAdd = item.quantity;
        if (item.isStackable) {
            for (const existing of this._items) {
                if (existing.id === item.id && existing.quantity < existing.maxStackSize) {
                    const space = existing.maxStackSize - existing.quantity;
                    const toAdd = Math.min(space, remainingToAdd);
                    existing.quantity += toAdd;
                    remainingToAdd -= toAdd;
                    if (remainingToAdd === 0)
                        break;
                }
            }
        }
        while (remainingToAdd > 0) {
            if (this._items.length >= this._maxSlots) {
                throw new Error(`Inventory full: Cannot add item "${item.id}". Max slots (${this._maxSlots}) reached.`);
            }
            const stackQty = item.isStackable ? Math.min(item.maxStackSize, remainingToAdd) : 1;
            this._items.push({
                ...item,
                quantity: stackQty,
                metadata: item.metadata ? { ...item.metadata } : undefined,
            });
            remainingToAdd -= stackQty;
        }
    }
    /**
     * Removes a specified quantity of an item from the inventory.
     */
    removeItem(itemId, quantity = 1) {
        if (!Number.isSafeInteger(quantity) || quantity <= 0) {
            throw new RangeError(`Removal quantity must be a positive integer: ${quantity}`);
        }
        const available = this.getTotalQuantity(itemId);
        if (available < quantity) {
            throw new RangeError(`Cannot remove ${quantity} of "${itemId}". Only ${available} available in inventory.`);
        }
        let remainingToRemove = quantity;
        for (let i = this._items.length - 1; i >= 0 && remainingToRemove > 0; i--) {
            const current = this._items[i];
            if (current && current.id === itemId) {
                if (current.quantity <= remainingToRemove) {
                    remainingToRemove -= current.quantity;
                    this._items.splice(i, 1);
                }
                else {
                    current.quantity -= remainingToRemove;
                    remainingToRemove = 0;
                }
            }
        }
    }
    clear() {
        this._items.length = 0;
    }
}
//# sourceMappingURL=inventory.js.map