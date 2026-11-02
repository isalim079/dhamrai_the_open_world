import { describe, it, expect } from 'vitest';
import { InventoryDomain, InventoryItem } from '../src/inventory.js';

describe('InventoryDomain — Items & Documents Management', () => {
  const licenseSlip: InventoryItem = {
    id: 'rickshaw_license_slip',
    nameBn: 'রিকশার লাইসেন্স স্লিপ',
    nameEn: 'Rickshaw License Slip',
    category: 'DOCUMENT',
    quantity: 1,
    isStackable: false,
    maxStackSize: 1,
    descriptionBn: 'ধামরাই পৌরসভা অনুমোদিত প্যাডেল রিকশা চালানোর বৈধ্য কাগজ।',
    descriptionEn: 'Valid municipal permit.',
    metadata: { reg: 'DHAM-402' },
  };

  const brassBell: InventoryItem = {
    id: 'brass_bell_cargo',
    nameBn: 'কাঁসার ঘণ্টা',
    nameEn: 'Brass Bell Cargo',
    category: 'CARGO',
    quantity: 1,
    isStackable: true,
    maxStackSize: 5,
    descriptionBn: 'ধামরাইয়ের ঐতিহ্যবাহী কাঁসার ঘণ্টা।',
    descriptionEn: 'Traditional Dhamrai cast-brass bell.',
  };

  it('initializes with capacity and optional items', () => {
    const inv = new InventoryDomain(10, [licenseSlip]);
    expect(inv.maxSlots).toBe(10);
    expect(inv.usedSlots).toBe(1);
    expect(inv.availableSlots).toBe(9);
    expect(inv.hasItem('rickshaw_license_slip')).toBe(true);
    expect(inv.getTotalQuantity('rickshaw_license_slip')).toBe(1);
  });

  it('stacks stackable items within maxStackSize', () => {
    const inv = new InventoryDomain(5);
    inv.addItem({ ...brassBell, quantity: 3 });
    expect(inv.usedSlots).toBe(1);
    expect(inv.getTotalQuantity('brass_bell_cargo')).toBe(3);

    // Adding 2 more fills the stack of 5
    inv.addItem({ ...brassBell, quantity: 2 });
    expect(inv.usedSlots).toBe(1);
    expect(inv.getTotalQuantity('brass_bell_cargo')).toBe(5);

    // Adding 1 more spills into a second slot
    inv.addItem({ ...brassBell, quantity: 1 });
    expect(inv.usedSlots).toBe(2);
    expect(inv.getTotalQuantity('brass_bell_cargo')).toBe(6);
  });

  it('creates separate slots for non-stackable items', () => {
    const inv = new InventoryDomain(5);
    inv.addItem({ ...licenseSlip, id: 'doc_1' });
    inv.addItem({ ...licenseSlip, id: 'doc_2' });

    expect(inv.usedSlots).toBe(2);
    expect(inv.hasItem('doc_1')).toBe(true);
    expect(inv.hasItem('doc_2')).toBe(true);
  });

  it('enforces slot capacity limits and rejects excess items', () => {
    const inv = new InventoryDomain(2);
    inv.addItem({ ...licenseSlip, id: 'item_1' });
    inv.addItem({ ...licenseSlip, id: 'item_2' });

    expect(() => inv.addItem({ ...licenseSlip, id: 'item_3' })).toThrow(/Inventory full/);
    expect(inv.usedSlots).toBe(2);
  });

  it('removes specified quantities cleanly across stacks', () => {
    const inv = new InventoryDomain(5);
    inv.addItem({ ...brassBell, quantity: 5 });
    inv.addItem({ ...brassBell, quantity: 3 });
    expect(inv.getTotalQuantity('brass_bell_cargo')).toBe(8);
    expect(inv.usedSlots).toBe(2);

    // Remove 4: reduces second slot from 3 to 0 (slot deleted) and first slot from 5 to 4
    inv.removeItem('brass_bell_cargo', 4);
    expect(inv.getTotalQuantity('brass_bell_cargo')).toBe(4);
    expect(inv.usedSlots).toBe(1);

    // Remove remaining 4: slot deleted
    inv.removeItem('brass_bell_cargo', 4);
    expect(inv.getTotalQuantity('brass_bell_cargo')).toBe(0);
    expect(inv.usedSlots).toBe(0);
  });

  it('rejects removing more items than available or negative quantities', () => {
    const inv = new InventoryDomain(5, [licenseSlip]);
    expect(() => inv.removeItem('rickshaw_license_slip', 2)).toThrow(RangeError);
    expect(() => inv.removeItem('rickshaw_license_slip', -1)).toThrow(RangeError);
    expect(() => inv.removeItem('non_existent', 1)).toThrow(RangeError);
  });
});
