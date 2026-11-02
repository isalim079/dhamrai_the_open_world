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

export class InventoryDomain {
  private readonly _maxSlots: number;
  private readonly _items: InventoryItem[] = [];

  constructor(maxSlots: number = 20, initialItems: InventoryItem[] = []) {
    if (!Number.isSafeInteger(maxSlots) || maxSlots <= 0) {
      throw new RangeError(`maxSlots must be a positive integer, got: ${maxSlots}`);
    }
    this._maxSlots = maxSlots;

    for (const item of initialItems) {
      this.addItem(item);
    }
  }

  public get maxSlots(): number {
    return this._maxSlots;
  }

  public get usedSlots(): number {
    return this._items.length;
  }

  public get availableSlots(): number {
    return this._maxSlots - this._items.length;
  }

  public get items(): readonly InventoryItem[] {
    return this._items.map((it) => ({ ...it, metadata: it.metadata ? { ...it.metadata } : undefined }));
  }

  public hasItem(itemId: string, minQuantity: number = 1): boolean {
    const total = this.getTotalQuantity(itemId);
    return total >= minQuantity;
  }

  public getTotalQuantity(itemId: string): number {
    return this._items
      .filter((it) => it.id === itemId)
      .reduce((sum, it) => sum + it.quantity, 0);
  }

  public getItem(itemId: string): InventoryItem | undefined {
    const found = this._items.find((it) => it.id === itemId);
    return found ? { ...found, metadata: found.metadata ? { ...found.metadata } : undefined } : undefined;
  }

  /**
   * Adds an item into the inventory.
   * If item is stackable, fills existing stacks before creating new slots.
   */
  public addItem(item: InventoryItem): void {
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
          if (remainingToAdd === 0) break;
        }
      }
    }

    while (remainingToAdd > 0) {
      if (this._items.length >= this._maxSlots) {
        throw new Error(
          `Inventory full: Cannot add item "${item.id}". Max slots (${this._maxSlots}) reached.`
        );
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
  public removeItem(itemId: string, quantity: number = 1): void {
    if (!Number.isSafeInteger(quantity) || quantity <= 0) {
      throw new RangeError(`Removal quantity must be a positive integer: ${quantity}`);
    }

    const available = this.getTotalQuantity(itemId);
    if (available < quantity) {
      throw new RangeError(
        `Cannot remove ${quantity} of "${itemId}". Only ${available} available in inventory.`
      );
    }

    let remainingToRemove = quantity;

    for (let i = this._items.length - 1; i >= 0 && remainingToRemove > 0; i--) {
      const current = this._items[i];
      if (current && current.id === itemId) {
        if (current.quantity <= remainingToRemove) {
          remainingToRemove -= current.quantity;
          this._items.splice(i, 1);
        } else {
          current.quantity -= remainingToRemove;
          remainingToRemove = 0;
        }
      }
    }
  }

  public clear(): void {
    this._items.length = 0;
  }
}
