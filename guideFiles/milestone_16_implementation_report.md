# Milestone 16 Implementation Report: NPC Day–Night Schedules

**Status:** COMPLETE — VERIFIED  
**Date:** 23 November 2026

## Summary
Day-phase presence rules: tea vendors / mistri / artisan hide at night; ambient pedestrians slow; police & story NPCs stay; economy interactables closed at night.

## Files
- `apps/web/src/engine/npcSchedules.ts`
- `apps/web/src/engine/NPCManager.ts` — `applyDayPhase`
- `apps/web/src/engine/EconomyInteractables.ts` — phase-aware findNearest
- `apps/web/src/engine/GameEngine.ts` — tick schedules
- `apps/web/test/npc-schedules.test.ts`
- `scratch/m16_live_verification.cjs`

## Gates
Unit + CDP night hide / day show / tea closed at night. FPS budget OK.
