# Milestone 24 Implementation Report: Landmark History Plaques

**Status:** COMPLETE — VERIFIED  
**Date:** 23 November 2026

## Summary
Press **E** near a discovered landmark (no NPC/econ in range) to read plaque toast + source note status.

## Files
- `packages/game-core/src/landmarks.ts` — `findNearestDiscoveredLandmark`
- `packages/game-core/src/engine.ts` — `getNearestDiscoveredLandmark`
- `apps/web/src/engine/GameEngine.ts` — talkInteract plaque branch
