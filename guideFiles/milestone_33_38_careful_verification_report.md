# Phase 5 careful verification report (M33–M38)

**Date:** 23 November 2026  
**Why:** Closeout was marked COMPLETE too fast — no CDP, thin reports. Re-audited milestone-by-milestone.

## Unit

| Suite | Result |
|---|---|
| `daily-events.test.ts` | 3 passed |
| `vehicle-profiles.test.ts` | 1 passed |
| `migration-matrix.test.ts` | 3 passed |

## CDP (`scratch/m33_m38_live_verification.cjs`)

| AC | Result |
|---|---|
| AC-M33-daily-errand | PASS |
| AC-M33-emergent-event | PASS |
| AC-M34-profiles-applied | PASS |
| AC-M35-lod-wired | PASS |
| AC-M36-settings-persist | PASS |
| AC-M36-reduce-motion-attr | PASS |
| AC-M38-diagnostics-default-off | PASS |
| AC-M38-overlay-gated | PASS |

Screenshot: `guideFiles/m33_m38_shot_01_phase5.png`

## Fixes required before PASS

- Wire `getVehicleProfile` into `RickshawVehicle` (M34)
- Announce daily/emergent events via toast/status (M33)
- Apply `showKeyHints` / `reduceMotion` outside SettingsModal (M36)
- Expose `useSettingsStore` on `window` for CDP (same as other stores)
