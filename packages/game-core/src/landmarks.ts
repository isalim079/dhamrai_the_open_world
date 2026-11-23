/**
 * Milestone 21 — Landmark discovery definitions (fiction-safe blurbs + source notes).
 * Discovery state persists via worldFlags.discoveredLandmarks (CSV of ids).
 */

import { PHASE_1_ANCHORS, type WorldPosition } from '@dhamrai/shared-contracts';

export const LANDMARK_DISCOVER_RADIUS_M = 18;

export interface LandmarkDefinition {
  id: string;
  nameBn: string;
  nameEn: string;
  blurbBn: string;
  blurbEn: string;
  /** Provenance note for journal — not a legal/historical certification claim. */
  sourceNote: string;
  position: WorldPosition;
  discoverRadiusM: number;
}

export const LANDMARK_DEFINITIONS: readonly LandmarkDefinition[] = [
  {
    id: 'lm_rathkhola',
    nameBn: 'রথখোলা মোড়',
    nameEn: 'Rathkhola Stand',
    blurbBn: 'ধামরাইয়ের রথযাত্রা ও যাত্রী সমাগমের কেন্দ্র। রিকশা স্ট্যান্ড এখানেই।',
    blurbEn: 'Hub of Dhamrai’s Rath procession lore and daily passenger traffic. Rickshaw stand lives here.',
    sourceNote: 'Project fiction + local place-name orientation; not a certified history text.',
    position: PHASE_1_ANCHORS.RATHKHOLA_ORIGIN,
    discoverRadiusM: LANDMARK_DISCOVER_RADIUS_M,
  },
  {
    id: 'lm_hardinge',
    nameBn: 'হার্ডিঞ্জ / হরগোবিন্দ উচ্চ বিদ্যালয়',
    nameEn: 'Hardinge High School Gate',
    blurbBn: 'শতবর্ষী বিদ্যাপীঠের গেট — মিশন ১-এর গন্তব্য।',
    blurbEn: 'Century-old school gate — Mission 1 drop-off landmark.',
    sourceNote: 'Named landmark from Phase 1 mission anchors; founding-year anecdotes are atmospheric fiction.',
    position: PHASE_1_ANCHORS.HARDINGE_HIGH_SCHOOL,
    discoverRadiusM: LANDMARK_DISCOVER_RADIUS_M,
  },
  {
    id: 'lm_thana',
    nameBn: 'থানা জংশন চেকপোস্ট',
    nameEn: 'Thana Junction Checkpoint',
    blurbBn: 'পুলিশ চেকপোস্ট — জরিমানা ও হিট এখানে জীবন্ত।',
    blurbEn: 'Police checkpoint — fines and heat loop live here.',
    sourceNote: 'Gameplay civic fiction anchored at Phase 1 Thana junction coordinates.',
    position: PHASE_1_ANCHORS.THANA_JUNCTION_CHECKPOINT,
    discoverRadiusM: LANDMARK_DISCOVER_RADIUS_M,
  },
  {
    id: 'lm_police_station',
    nameBn: 'ধামরাই থানা',
    nameEn: 'Dhamrai Police Station',
    blurbBn: 'থানা ভবন — সফট অ্যারেস্ট হোল্ডিংয়ের কাছাকাছি।',
    blurbEn: 'Police station building — near soft-arrest holding fiction.',
    sourceNote: 'Phase 1 anchor DHAMRAI_POLICE_STATION; interior not modeled.',
    position: PHASE_1_ANCHORS.DHAMRAI_POLICE_STATION,
    discoverRadiusM: LANDMARK_DISCOVER_RADIUS_M,
  },
  {
    id: 'lm_kayetpara',
    nameBn: 'কায়েতপাড়া কাঁসা পল্লী',
    nameEn: 'Kayetpara Metal Workshop',
    blurbBn: 'কাঁসা-পিতল কর্মশালা — মিশন ৩-এর উৎস।',
    blurbEn: 'Brass/bell-metal workshop — origin of Mission 3 cargo.',
    sourceNote: 'Craft-district atmosphere; artisan NPC is fictional.',
    position: PHASE_1_ANCHORS.KAYETPARA_METAL_WORKSHOP,
    discoverRadiusM: LANDMARK_DISCOVER_RADIUS_M,
  },
  {
    id: 'lm_mandir',
    nameBn: 'শ্রী শ্রী যশোমাধব মন্দির',
    nameEn: 'Sri Sri Yashomadhab Mandir',
    blurbBn: 'ঐতিহ্যবাহী মন্দির প্রাঙ্গণ — দূরবর্তী ল্যান্ডমার্ক।',
    blurbEn: 'Heritage temple grounds — distant landmark discovery.',
    sourceNote: 'Place-name from Phase 1 anchors; ritual detail intentionally omitted.',
    position: PHASE_1_ANCHORS.SRI_SRI_YASHOMADHAB_MANDIR,
    discoverRadiusM: LANDMARK_DISCOVER_RADIUS_M,
  },
  {
    id: 'lm_pourashava',
    nameBn: 'ধামরাই পৌরসভা',
    nameEn: 'Dhamrai Pourashava',
    blurbBn: 'পৌরসভা ভবন — নাগরিক সেবার প্রতীকী স্থান।',
    blurbEn: 'Municipal building — symbolic civic landmark.',
    sourceNote: 'Municipal place-name orientation only.',
    position: PHASE_1_ANCHORS.DHAMRAI_POURASHAVA,
    discoverRadiusM: LANDMARK_DISCOVER_RADIUS_M,
  },
  {
    id: 'lm_college',
    nameBn: 'ধামরাই সরকারি কলেজ',
    nameEn: 'Dhamrai Govt. College',
    blurbBn: 'কলেজ গেট — মিশন ৪ পার্সেল ডেলিভারির গন্তব্য।',
    blurbEn: 'College gate — Mission 4 parcel drop-off.',
    sourceNote: 'Phase 1 college anchor; campus interiors not modeled.',
    position: PHASE_1_ANCHORS.DHAMRAI_GOVT_COLLEGE,
    discoverRadiusM: LANDMARK_DISCOVER_RADIUS_M,
  },
] as const;

export function parseDiscoveredLandmarkIds(csv: string | undefined | null): string[] {
  if (!csv || typeof csv !== 'string' || !csv.trim()) return [];
  return csv
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export function serializeDiscoveredLandmarkIds(ids: readonly string[]): string {
  return [...new Set(ids)].sort().join(',');
}

export function distanceToLandmarkM(pos: WorldPosition, lm: LandmarkDefinition): number {
  return Math.hypot(pos.x - lm.position.x, pos.z - lm.position.z);
}

export function findDiscoverableLandmark(
  pos: WorldPosition,
  alreadyDiscovered: ReadonlySet<string>
): LandmarkDefinition | null {
  for (const lm of LANDMARK_DEFINITIONS) {
    if (alreadyDiscovered.has(lm.id)) continue;
    if (distanceToLandmarkM(pos, lm) <= lm.discoverRadiusM) return lm;
  }
  return null;
}

/** Milestone 24 — nearest already-discovered landmark within read radius */
export function findNearestDiscoveredLandmark(
  pos: WorldPosition,
  discoveredIds: ReadonlySet<string>,
  readRadiusM = 8
): LandmarkDefinition | null {
  let best: LandmarkDefinition | null = null;
  let bestDist = Infinity;
  for (const lm of LANDMARK_DEFINITIONS) {
    if (!discoveredIds.has(lm.id)) continue;
    const d = distanceToLandmarkM(pos, lm);
    if (d <= readRadiusM && d < bestDist) {
      best = lm;
      bestDist = d;
    }
  }
  return best;
}
