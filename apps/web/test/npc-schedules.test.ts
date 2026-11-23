import { describe, it, expect } from 'vitest';
import { presenceForRole, isEconomyKindOpen } from '../src/engine/npcSchedules.js';

describe('NPC schedules — M16', () => {
  it('hides vendors and mistri at night', () => {
    expect(presenceForRole('VENDOR', 'night').visible).toBe(false);
    expect(presenceForRole('VENDOR', 'night').interactable).toBe(false);
    expect(presenceForRole('MECHANIC', 'night').visible).toBe(false);
    expect(presenceForRole('ARTISAN', 'night').visible).toBe(false);
  });

  it('keeps police and story passengers available at night', () => {
    expect(presenceForRole('POLICE_PATROL', 'night').visible).toBe(true);
    expect(presenceForRole('STORY_PASSENGER', 'night').visible).toBe(true);
  });

  it('slows ambient pedestrians at night', () => {
    expect(presenceForRole('AMBIENT_PEDESTRIAN', 'night').walkSpeedMult).toBeLessThan(0.5);
    expect(presenceForRole('AMBIENT_PEDESTRIAN', 'day').walkSpeedMult).toBe(1);
  });

  it('closes economy kinds at night', () => {
    expect(isEconomyKindOpen('tea_stall', 'night')).toBe(false);
    expect(isEconomyKindOpen('mistri', 'night')).toBe(false);
    expect(isEconomyKindOpen('tea_stall', 'day')).toBe(true);
  });
});
