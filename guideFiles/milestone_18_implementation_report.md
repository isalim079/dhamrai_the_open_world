# Milestone 18 Implementation Report: Additional Delivery Jobs

**Status:** COMPLETE — VERIFIED  
**Date:** 23 November 2026

## Summary
New story mission **`mission_4_market_parcel`**: pickup sealed parcel from courier Salma at Rathkhola Market, deliver to Dhamrai Govt. College (৳45). Factory **`createRepeatableDeliveryDefinition`** for future grocery/parcel trips.

## Files
- `packages/game-core/src/missions.ts` — mission_4 + factory
- `packages/game-core/src/roles.ts` — `MARKET_PARCEL_ITEM`
- `packages/game-core/src/dialogue.ts` — `dialogue_courier_salma`
- `apps/web/src/engine/NPCManager.ts` — Salma NPC
- `apps/web/src/components/DialogueBox.tsx` — `PICKUP_PARCEL`
- `apps/web/src/engine/GameEngine.ts` — college drop-off
- `packages/shared-contracts` — `PICKUP_PARCEL` actionTrigger

## Gates
Unit payout ৳45; CDP courier / mission active / inventory parcel.
