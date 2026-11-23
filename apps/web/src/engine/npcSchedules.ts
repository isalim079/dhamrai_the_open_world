/**
 * Milestone 16 — Day-phase presence rules for NPCs / vendors.
 */

export type SchedulePhase = 'dawn' | 'day' | 'dusk' | 'night';

export type ScheduleRole =
  | 'STORY_PASSENGER'
  | 'POLICE_PATROL'
  | 'ARTISAN'
  | 'AMBIENT_PEDESTRIAN'
  | 'VENDOR'
  | 'MECHANIC';

export interface PresenceRule {
  visible: boolean;
  walkSpeedMult: number;
  interactable: boolean;
}

const ALWAYS_ON: PresenceRule = { visible: true, walkSpeedMult: 1, interactable: true };

/**
 * Returns presence for a role at a day phase.
 * Fiction schedule only — not real-person claims.
 */
export function presenceForRole(role: ScheduleRole, phase: SchedulePhase): PresenceRule {
  switch (role) {
    case 'AMBIENT_PEDESTRIAN':
      if (phase === 'night') return { visible: true, walkSpeedMult: 0.35, interactable: false };
      if (phase === 'dusk') return { visible: true, walkSpeedMult: 0.7, interactable: false };
      return ALWAYS_ON;

    case 'VENDOR':
      // Tea stalls close late night
      if (phase === 'night') return { visible: false, walkSpeedMult: 0, interactable: false };
      if (phase === 'dusk') return { visible: true, walkSpeedMult: 0, interactable: true };
      return ALWAYS_ON;

    case 'MECHANIC':
      // Mistri works day + dusk; off deep night
      if (phase === 'night') return { visible: false, walkSpeedMult: 0, interactable: false };
      return ALWAYS_ON;

    case 'ARTISAN':
      if (phase === 'night') return { visible: false, walkSpeedMult: 0, interactable: false };
      return ALWAYS_ON;

    case 'POLICE_PATROL':
      // Always on duty; night slightly more "present" (full speed)
      return ALWAYS_ON;

    case 'STORY_PASSENGER':
      // Story NPCs remain for mission continuity
      return ALWAYS_ON;

    default:
      return ALWAYS_ON;
  }
}

export function isEconomyKindOpen(
  kind: 'tea_stall' | 'mistri' | 'chain_oil',
  phase: SchedulePhase
): boolean {
  if (phase === 'night') {
    if (kind === 'tea_stall') return false;
    if (kind === 'mistri') return false;
    if (kind === 'chain_oil') return false;
  }
  return true;
}
