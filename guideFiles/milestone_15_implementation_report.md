# Milestone 15 Implementation Report: Mission Wayfinding & Objective Beacon

**Status:** COMPLETE — VERIFIED  
**Date:** 23 November 2026

## Summary
World-space golden objective beacon + HUD compass bearing/distance to the active mission objective. No save schema changes. Zero new deps.

## Files
- `apps/web/src/engine/ObjectiveMarker.ts` (new)
- `apps/web/src/engine/GameEngine.ts` — wayfinding tick
- `apps/web/src/state/useSessionStore.ts` — bearing/distance HUD
- `apps/web/src/components/HUD.tsx` — compass ring
- `apps/web/test/objective-marker.test.ts`
- `scratch/m15_live_verification.cjs`

## Gates
| Gate | Result |
|---|---|
| Typecheck | 0 |
| Vitest | 325+ passed (Neon offline as usual) |
| CDP | 3/3 |
| FPS | 60 |

## Next
M16 NPC Day–Night Schedules
