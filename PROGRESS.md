# Dhamrai Life — Progress Tracker

**Last updated:** 2 November 2026  
**Overall status:** Phase 1 Authorized; Sprint 1 (Monorepo Foundation & Tooling Setup) complete; mathematical and contract tests passing; independent Survey of Bangladesh ground-control validation pending; OAuth integration requires credentials; ODbL legal review pending.

## Current phase and evidence

| Work item | Status | Evidence / limits |
|---|---|---|
| Phase 0 architecture baseline | COMPLETE (provisionally accepted) | Nine reconciled Phase 0 Markdown documents in `docs/`, version 3.0.0. Stack and game scope unchanged. |
| Sprint 1: Monorepo Foundation & Tooling | COMPLETE | Root `package.json` (pnpm 11.2.2), `pnpm-workspace.yaml`, `tsconfig.base.json`, `packages/shared-contracts` initialized. Vitest unit tests (4/4 passed), TypeScript project references typecheck (`tsc -b`) passed. |
| Coordinate/route mathematical suite | PASSED | Ten tests rerun in existing `.venv` (including full-precision origin constants verification); outputs in `data/sources/test_execution.json` and final validation report. These are not independent ground-control tests. |
| Synthetic grid algorithm checks | PASSED | Three tests exercise partial cells, closed-boundary touches and holes. They do not validate Dhamrai geometry. |
| Offline OSM audit | REPRODUCED | Four actual XML snapshots, raw manifest, clipped rectangle metrics A16.731/B9.706/C6.024/D28.531km, checksum verification. Counts cover returned objects. |
| Mission 1 semantics | ORIGIN-TO-SCHOOL ONLY; PICKUP DEFERRED | 552.67m road graph fixture connects nearest road vertices between Rathkhola Stand and Hardinge High School Gate. Intermediate market pickup (+14.997, 0.0, -9.998) in open plaza is off tagged road network. Complete passenger journey route validation is formally deferred and Phase 1 acceptance criteria adjusted accordingly. Complete passenger mission navigation is not claimed as route-validated. |
| Mission 3 semantics | RECONCILED, ACCESS EVIDENCE PENDING | Horizontal anchor distance 60.77m; snapped-node graph legs 42.38m and 573.12m, direct 534.16m, detour 615.50m. Polylines and offsets preserved. Courtyard traversal unknown for both routes. Undirected snapshot road-graph route fixtures; direction/turn/access restrictions not enforced; legal rickshaw access not validated. |
| Mission 2 context | CORRECTED | Thana Junction about 83.3m ESE of station; 149.44m snapped-node road route excludes access offsets. |
| Phase 1 envelope | PASSED | Outward four-corner envelope `[90.212361,23.910168,90.222439,23.919432]`; historical Sample B query rectangle preserved separately. |
| Actual Upazila grid count | BLOCKED: POLYGON ABSENT | Acquisition failed (DNS/web). Intersecting, outside, partial counts and coverage area null in `chunk_grid_audit.json`. Area-equivalent arithmetic: 306.84 / 0.065536 = 4,682.0068359375 cells (historic 4,685 was an unvalidated rounded area estimate). Bounding envelope of 24km × 24km gives 8,789.0625 area-equivalent cells, or ⌈24,000/256⌉² = 94² = 8,836 cells for a rectangular grid covering 24.064km. |
| Independent SoB validation | PENDING EXTERNAL DATA | No certified control-point/leveling sheets. ESRI:102954 remains provisionally adopted; mathematical consistency and round trips pass. |
| ODbL/source legal review | PENDING COUNSEL | Intended classification is not legal clearance; actual source files/terms require review before distribution. |
| OAuth and Drive integration | REQUIRES CREDENTIALS; NOT IMPLEMENTED | Google Cloud client credentials, consent, redirects and Drive scope needed for future E2E integration. |
| Sprint 2: Domain Engine & Economy | COMPLETE | Pure TypeScript domain package `@dhamrai/game-core` implemented: `EconomyDomain` (integer Poisha math, append-only ledger, invariant verification), `InventoryDomain` (stacking, capacity, document storage), `MissionDomain` (declarative state machine, idempotent payouts), `RickshawDriverArchetype` (৳250 start, rented rickshaw, license slip), and `GameCoreEngine` facade. 25 unit tests passed (29 total across workspace); `tsc -b` passed with 0 errors. |
| Sprint 3: Save System & Local Persistence | PENDING | Planned in `packages/save-core`. |
| Sprint 4: Backend OAuth & Drive Sync | PENDING | Planned in `apps/api`. |
| Sprint 5: Offline Slice Data Generation | PENDING | Planned in `tools/geo-pipeline`. |
| Sprint 6: 3D Client & Rickshaw Physics | PENDING | Planned in `apps/web`. |
| Sprint 7: Content, Missions & React HUD | PENDING | Planned in `apps/web`. |
| Phases 2–6 | NOT STARTED | Long-term scope unchanged. |

## Work log — Phase 1 Sprint 2 Domain Engine & Economy

1. Implemented `@dhamrai/game-core` as a pure TypeScript domain package with zero DOM, Three.js, React, or Node-specific dependencies.
2. Built `EconomyDomain`: integer Poisha arithmetic (1 Taka = 100 Poisha), append-only ledger, balance invariant verification (`balance == sum(ledger.deltaPence)`), and overdraft prevention.
3. Built `InventoryDomain`: slot-capacity enforcement, stackable vs non-stackable items, document storage (`rickshaw_license_slip`).
4. Built `MissionDomain`: declarative Phase 1 missions (First Fare ৳30, Police Checkpoint +5 civic trust, Brass Artisan Order ৳75), state machine (`AVAILABLE` -> `ACTIVE` -> `COMPLETED`), and mathematically guaranteed idempotent payouts (zero duplicate payouts on multiple triggers or reload).
5. Built `RickshawDriverArchetype`: ৳250 (25,000 Poisha) starting cash, rented pedal rickshaw with ৳50 daily rent, license slip, starting coordinates at Rathkhola `(0, 0, 0)`.
6. Built `GameCoreEngine` aggregate root: seamless game loop orchestration, daily rent processing, and complete bidirectional hydration with `SaveEnvelopeV1`.
7. Created 25 comprehensive unit tests across 5 test suites in `packages/game-core/test/` (29 total tests in workspace), testing edge cases, non-integer rejections, capacity overflow, and reload idempotency. All passed.
8. Ran TypeScript composite project typecheck (`tsc -b`), passing with 0 errors.

## Next task

Await user review of Milestone 2 before proceeding to Milestone 3 (Sprint 3: Save System & Local Persistence in `packages/save-core`).
