/**
 * Milestone 13 — Proximity volumes for tea stalls and repair services.
 */

import { PHASE_1_ANCHORS, type WorldPosition } from '@dhamrai/shared-contracts';

export type EconomyInteractKind = 'tea_stall' | 'mistri' | 'chain_oil';

export interface EconomyInteractable {
  id: string;
  kind: EconomyInteractKind;
  position: WorldPosition;
  radiusM: number;
  dialogueTreeId: string;
  promptBn: string;
  promptEn: string;
}

/** Matches PropManager Rathkhola tea stall offsets + market pickup stall. */
const RATHKHOLA_STALL_OFFSETS: Array<[number, number]> = [
  [3.2, -2.4],
  [-4.0, -3.0],
  [6.5, 1.8],
  [-2.2, 4.5],
];

export function buildEconomyInteractables(): EconomyInteractable[] {
  const o = PHASE_1_ANCHORS.RATHKHOLA_ORIGIN;
  const stalls: EconomyInteractable[] = RATHKHOLA_STALL_OFFSETS.map(([dx, dz], i) => ({
    id: `tea_stall_${i}`,
    kind: 'tea_stall' as const,
    position: { x: o.x + dx, y: 0, z: o.z + dz },
    radiusM: 2.5,
    dialogueTreeId: 'dialogue_tea_stall',
    promptBn: '[E] চা স্টল',
    promptEn: '[E] Tea stall',
  }));

  const pickup = PHASE_1_ANCHORS.RATHKHOLA_MARKET_PICKUP;
  stalls.push({
    id: 'tea_stall_pickup',
    kind: 'tea_stall',
    position: { x: pickup.x + 2.0, y: 0, z: pickup.z + 1.5 },
    radiusM: 2.5,
    dialogueTreeId: 'dialogue_tea_stall',
    promptBn: '[E] চা স্টল',
    promptEn: '[E] Tea stall',
  });

  const mistri: EconomyInteractable = {
    id: 'mistri_gautom',
    kind: 'mistri',
    position: { x: o.x - 6.5, y: 0, z: o.z + 2.0 },
    radiusM: 2.5,
    dialogueTreeId: 'dialogue_mistri_gautom',
    promptBn: '[E] মিস্ত্রি গৌতম (মেরামত)',
    promptEn: '[E] Mistri Gautom (repair)',
  };

  const chainOil: EconomyInteractable = {
    id: 'kayetpara_chain_oil',
    kind: 'chain_oil',
    position: {
      x: PHASE_1_ANCHORS.KAYETPARA_METAL_WORKSHOP.x + 3.0,
      y: 0,
      z: PHASE_1_ANCHORS.KAYETPARA_METAL_WORKSHOP.z + 2.5,
    },
    radiusM: 2.5,
    dialogueTreeId: 'dialogue_kayetpara_chain_oil',
    promptBn: '[E] চেইন অয়েল',
    promptEn: '[E] Chain oil',
  };

  return [...stalls, mistri, chainOil];
}

export class EconomyInteractables {
  public readonly items: EconomyInteractable[];

  constructor(items: EconomyInteractable[] = buildEconomyInteractables()) {
    this.items = items;
  }

  public findNearest(
    pos: WorldPosition,
    maxRadius = 2.5
  ): { item: EconomyInteractable; distanceM: number } | null {
    let best: { item: EconomyInteractable; distanceM: number } | null = null;
    for (const item of this.items) {
      const d = Math.hypot(pos.x - item.position.x, pos.z - item.position.z);
      if (d <= Math.min(maxRadius, item.radiusM)) {
        if (!best || d < best.distanceM) {
          best = { item, distanceM: d };
        }
      }
    }
    return best;
  }
}
