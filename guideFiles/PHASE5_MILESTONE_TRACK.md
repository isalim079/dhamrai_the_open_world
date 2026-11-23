# Phase 5 Milestone Track

**“All complete” for this run = M33–M38 done** — only after unit + CDP acceptance (same bar as Phase 4).

| ID | Title | Status | Evidence |
|---|---|---|---|
| M33 | Daily Missions & Emergent Events | **PASS** | unit `daily-events.test.ts` (3) · CDP `AC-M33-*` · toast/status wiring |
| M34 | Vehicle Handling Profiles Registry | **PASS** | unit `vehicle-profiles.test.ts` · CDP `AC-M34-profiles-applied` (rickshaw/cng/easy_bike mass+speed from registry) |
| M35 | Distance LOD for Props / Traffic | **PASS** | CDP `AC-M35-lod-wired` · `PropManager`/`TrafficManager.updateLod` called from tick |
| M36 | Accessibility Settings | **PASS** | CDP `AC-M36-*` · `[O]` settings · key hints gated · reduceMotion attr · high contrast / font scale |
| M37 | Save Migration Matrix & Regression Suite | **PASS** | unit `migration-matrix.test.ts` (3) V1→V2 + round-trip |
| M38 | Opt-in Diagnostics (privacy-safe) | **PASS** | CDP `AC-M38-*` · default consent off · overlay gated |

**Careful re-verification:** 23 November 2026  
**Script:** `scratch/m33_m38_live_verification.cjs` → screenshot `guideFiles/m33_m38_shot_01_phase5.png`  
**Unit filter:** `yarn vitest run packages/game-core/test/daily-events.test.ts packages/game-core/test/vehicle-profiles.test.ts packages/save-core/test/migration-matrix.test.ts` → 7 passed  

**Gaps found during careful review (fixed before PASS):**
1. M34 profiles existed in `game-core` but were **not** applied by `RickshawVehicle` (hardcoded speeds/mass) — wired to `getVehicleProfile`.
2. M33 emergent/daily events registered in tick but **not** announced to player — toast + status added.
3. M36 `showKeyHints` / `reduceMotion` toggles existed in modal but **did not affect HUD/DOM** — gated key hints + `data-reduce-motion`.

Yarn Classic 1.22.22 · SaveEnvelopeV2 additive · zero new third-party npm deps.
