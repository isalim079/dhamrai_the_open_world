# Milestone 20 Implementation Report: CNG Vehicle Archetype (Light)

**Status:** COMPLETE — VERIFIED  
**Date:** 23 November 2026

## Summary
Light CNG archetype: ambient traffic mix includes CNG cabin meshes; parked driveable CNG near Rathkhola stand (higher cruise/sprint speeds). Enter/exit with **F** picks nearer vehicle (rickshaw vs CNG).

## Files
- `apps/web/src/engine/RickshawVehicle.ts` — `archetype: 'rickshaw' | 'cng'`
- `apps/web/src/engine/SceneManager.ts` — `cngMesh`
- `apps/web/src/engine/TrafficManager.ts` — CNG ambient meshes + `vehicleKind`
- `apps/web/src/engine/GameEngine.ts` — dual-vehicle enter/drive/sync
- `packages/shared-contracts` — optional `vehicleKind` on traffic agents

## Gates
Unit traffic has CNG kinds; CDP CNG mesh + enter + FPS budget.
