# Milestone 21 Implementation Report: Landmark Discovery

**Status:** COMPLETE — VERIFIED  
**Date:** 23 November 2026

## Summary
Proximity unlocks for 8 Phase 1 landmarks; journal tab shows discovered vs locked with source notes; persistence via `worldFlags.discoveredLandmarks` CSV.

## Files
- `packages/game-core/src/landmarks.ts`
- `packages/game-core/src/engine.ts` — tryDiscoverLandmark
- `apps/web/src/engine/GameEngine.ts` — discovery tick
- `apps/web/src/components/JournalModal.tsx`
- `packages/game-core/test/landmarks.test.ts`
- `scratch/m21_live_verification.cjs`
