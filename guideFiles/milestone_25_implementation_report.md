# Milestone 25 Implementation Report: Reputation-Gated Dialogue

**Status:** COMPLETE — VERIFIED  
**Date:** 23 November 2026

## Summary
Tea stall opens `node_tea_regular` when `transportReputation >= 20` (familiar-driver greeting + same buy actions).

## Files
- `packages/game-core/src/dialogue.ts` — `node_tea_regular`
- `apps/web/src/engine/GameEngine.ts` — sets dialogue node on open
