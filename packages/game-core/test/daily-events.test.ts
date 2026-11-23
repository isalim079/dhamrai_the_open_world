import { describe, it, expect } from 'vitest';
import {
  createDailyErrandDefinition,
  dayBucket,
  pickEmergentEvent,
  isEventActive,
  EMERGENT_EVENT_CATALOG,
} from '../src/daily-events.js';
import { GameCoreEngine } from '../src/engine.js';

describe('Daily events (M33)', () => {
  it('creates stable daily errand ids per day bucket', () => {
    const day = dayBucket(1_700_000_000_000);
    const def = createDailyErrandDefinition(day);
    expect(def.id).toBe(`daily_errand_${day}`);
    expect(def.objectives).toHaveLength(2);
  });

  it('picks emergent events and tracks activity window', () => {
    expect(EMERGENT_EVENT_CATALOG.length).toBeGreaterThanOrEqual(4);
    const ev = pickEmergentEvent(1_700_000_000_000, 0);
    expect(ev.id).toBeTruthy();
    expect(isEventActive(ev.id, 1000, 1000 + ev.durationMs - 1)).toBe(true);
    expect(isEventActive(ev.id, 1000, 1000 + ev.durationMs + 1)).toBe(false);
  });

  it('engine registers daily errand and refreshes emergent event', () => {
    const engine = GameCoreEngine.createNewGame(1000);
    const id = engine.ensureDailyErrand(1_700_000_000_000);
    expect(engine.missions.getDefinition(id)).toBeDefined();
    const started = engine.startOrRefreshEmergentEvent(1_700_000_000_000);
    expect(engine.getActiveEmergentEvent(1_700_000_000_000)?.id).toBe(started.id);
  });
});
