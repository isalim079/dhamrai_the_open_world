# Milestone 19 Implementation Report: Soft Arrest / Jail Loop

**Status:** COMPLETE — VERIFIED  
**Date:** 23 November 2026

## Summary
When **policeHeat ≥ 85** near Thana, player is soft-arrested: brief hold (`ARREST_HOLD_MS`), `FINE_PENALTY` debit (৳80 or remaining cash), heat reset to 25, teleport to Thana checkpoint. Controls frozen while held.

## Files
- `packages/game-core/src/civic-enforcement.ts` — soft arrest helpers
- `packages/game-core/src/engine.ts` — `trySoftArrest` / `releaseSoftArrestIfDue`
- `apps/web/src/engine/CivicEnforcementBridge.ts` — arrest tick
- `apps/web/src/engine/GameEngine.ts` — teleport + input freeze
- `packages/game-core/test/civic-enforcement.test.ts`

## Gates
Unit soft-arrest eligibility + hold/release; CDP heat→arrest near Thana.
