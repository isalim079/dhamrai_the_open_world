/**
 * Milestone 33 — Daily / emergent event definitions (deterministic, fiction).
 */

import { PHASE_1_ANCHORS, type WorldPosition } from '@dhamrai/shared-contracts';
import type { MissionDefinition } from '@dhamrai/shared-contracts';
import { CURRENCY_CODE_BDT } from '@dhamrai/shared-contracts';

export type EmergentEventKind = 'FARE_SURGE' | 'MARKET_RUSH' | 'RAIN_SLOWDOWN' | 'POLICE_SWEEP';

export interface EmergentEvent {
  id: string;
  kind: EmergentEventKind;
  nameBn: string;
  nameEn: string;
  durationMs: number;
  /** Soft gameplay multipliers / hints */
  fareMult?: number;
  walkSpeedMult?: number;
  heatDecayMult?: number;
}

export const EMERGENT_EVENT_CATALOG: readonly EmergentEvent[] = [
  {
    id: 'evt_fare_surge',
    kind: 'FARE_SURGE',
    nameBn: 'ভাড়া চাহিদা বাড়তি',
    nameEn: 'Fare Demand Surge',
    durationMs: 180_000,
    fareMult: 1.25,
  },
  {
    id: 'evt_market_rush',
    kind: 'MARKET_RUSH',
    nameBn: 'বাজার ভিড়',
    nameEn: 'Market Rush',
    durationMs: 120_000,
    walkSpeedMult: 0.85,
  },
  {
    id: 'evt_rain_slow',
    kind: 'RAIN_SLOWDOWN',
    nameBn: 'বৃষ্টির ধীর চলাচল',
    nameEn: 'Rain Slowdown',
    durationMs: 150_000,
    walkSpeedMult: 0.75,
  },
  {
    id: 'evt_police_sweep',
    kind: 'POLICE_SWEEP',
    nameBn: 'পুলিশ টহল জোর',
    nameEn: 'Police Sweep',
    durationMs: 120_000,
    heatDecayMult: 0.5,
  },
] as const;

/** Day bucket from timestamp (UTC day). */
export function dayBucket(timestampMs: number): number {
  return Math.floor(timestampMs / 86_400_000);
}

export function createDailyErrandDefinition(
  day: number,
  pickup: WorldPosition = PHASE_1_ANCHORS.RATHKHOLA_MARKET_PICKUP,
  dropoff: WorldPosition = PHASE_1_ANCHORS.THANA_JUNCTION_CHECKPOINT
): MissionDefinition {
  return {
    id: `daily_errand_${day}`,
    bengaliTitle: 'দৈনিক দৌড়',
    englishTitle: `Daily Errand #${day}`,
    description: 'A short daily errand between market and Thana junction.',
    rewardMinorUnits: 2500,
    currency: CURRENCY_CODE_BDT,
    reputationDelta: 2,
    repeatPolicy: 'once',
    reputationCategory: 'transport',
    objectives: [
      {
        id: 'obj_daily_pickup',
        bengaliTitle: 'বাজার থেকে নিন',
        description: 'Pick up the daily parcel at market.',
        targetPosition: pickup,
        completionRadiusM: 12,
        isCompleted: false,
      },
      {
        id: 'obj_daily_dropoff',
        bengaliTitle: 'থানা মোড়ে খালাস',
        description: 'Drop off at Thana junction.',
        targetPosition: dropoff,
        completionRadiusM: 12,
        isCompleted: false,
      },
    ],
  };
}

export function pickEmergentEvent(timestampMs: number, seed = 0): EmergentEvent {
  const idx = (dayBucket(timestampMs) + seed) % EMERGENT_EVENT_CATALOG.length;
  return EMERGENT_EVENT_CATALOG[idx]!;
}

export function isEventActive(
  eventId: string,
  startedAtMs: number,
  nowMs: number,
  catalog: readonly EmergentEvent[] = EMERGENT_EVENT_CATALOG
): boolean {
  const ev = catalog.find((e) => e.id === eventId);
  if (!ev || !(startedAtMs > 0)) return false;
  return nowMs - startedAtMs < ev.durationMs;
}
