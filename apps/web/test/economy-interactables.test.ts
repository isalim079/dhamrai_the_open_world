import { describe, it, expect } from 'vitest';
import {
  EconomyInteractables,
  buildEconomyInteractables,
} from '../src/engine/EconomyInteractables.js';
import { PHASE_1_ANCHORS } from '@dhamrai/shared-contracts';

describe('EconomyInteractables — M13 proximity', () => {
  it('builds tea stalls near Rathkhola and mistri + chain oil anchors', () => {
    const items = buildEconomyInteractables();
    expect(items.some((i) => i.kind === 'tea_stall')).toBe(true);
    expect(items.some((i) => i.kind === 'mistri')).toBe(true);
    expect(items.some((i) => i.kind === 'chain_oil')).toBe(true);
  });

  it('finds nearest tea stall within radius', () => {
    const econ = new EconomyInteractables();
    const near = econ.findNearest({ x: 3.2, y: 0, z: -2.4 }, 2.5);
    expect(near).not.toBeNull();
    expect(near!.item.kind).toBe('tea_stall');
    expect(near!.item.dialogueTreeId).toBe('dialogue_tea_stall');
  });

  it('finds mistri near Rathkhola stand offset', () => {
    const econ = new EconomyInteractables();
    const near = econ.findNearest({ x: -6.5, y: 0, z: 2.0 }, 2.5);
    expect(near).not.toBeNull();
    expect(near!.item.kind).toBe('mistri');
  });

  it('returns null when far from all interactables', () => {
    const econ = new EconomyInteractables();
    const far = econ.findNearest(PHASE_1_ANCHORS.DHAMRAI_GOVT_COLLEGE, 2.5);
    expect(far).toBeNull();
  });
});
