# Dhamrai Life — Progress Tracker

**Last updated:** 2 November 2026  
**Overall status:** Phase 1 Authorized; Sprint 1 (Monorepo Foundation & Tooling Setup), Sprint 2 (Domain Engine & Economy), and Sprint 3 (Save System & Local Persistence) complete; migrated to Yarn Classic 1.22.22; save schema versioning reconciled (V1 legacy preserved, canonical V2 active, V1→V2 migration tested); all 72 TypeScript unit/integration tests and 10 Python verification tests passing.

## Current phase and evidence

| Work item | Status | Evidence / limits |
|---|---|---|
| Phase 0 architecture baseline | COMPLETE (provisionally accepted) | Nine reconciled Phase 0 Markdown documents in `docs/`, version 3.0.0. Stack and game scope unchanged. |
| Sprint 1: Monorepo Foundation & Tooling | COMPLETE | Root `package.json` migrated to Yarn Classic 1.22.22 (`yarn.lock`), `tsconfig.base.json`, `packages/shared-contracts` initialized. Vitest unit tests (6/6 passed), TypeScript project references typecheck (`tsc -b`) passed. |
| Sprint 2: Domain Engine & Economy | COMPLETE | Pure TypeScript domain package `@dhamrai/game-core` implemented: `EconomyDomain` (integer minor units `deltaMinorUnits`/`runningBalanceMinorUnits`, BDT currency code, append-only ledger, invariant verification), `InventoryDomain` (stacking, capacity, document storage), `MissionDomain` (declarative state machine, idempotent payouts), `RickshawDriverArchetype` (৳250 start, rented rickshaw, license slip), and `GameCoreEngine` facade. 25 unit tests passed; `tsc -b` passed with 0 errors. |
| Sprint 3: Save System & Local Persistence | COMPLETE | Pure persistence package `packages/save-core` implemented with clean separation: Zod schema validation, platform-independent Web Crypto SHA-256 payload consistency verification, canonical JSON serialization, sequential schema migration pipeline with pre-migration snapshot isolation, Dexie/IndexedDB storage adapter, in-memory adapter, and `SaveOrchestrator`. Save schema versioning reconciled: legacy `SaveEnvelopeV1` schema preserved without modification; canonical `SaveEnvelopeV2` introduced (`saveSchemaVersion: 2`, `currency: 'BDT'`, `cashMinorUnits`, `inventory`); pure `v1ToV2MigrationStep` registered; snapshot conflict guards implemented; 41 unit tests in save-core (72 total across workspace, 10 test files); 100% passing; `tsc -b` passed with 0 errors. |
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
| Sprint 4: Backend OAuth & Drive Sync | PENDING | Planned in `apps/api`. |
| Sprint 5: Offline Slice Data Generation | PENDING | Planned in `tools/geo-pipeline`. |
| Sprint 6: 3D Client & Rickshaw Physics | PENDING | Planned in `apps/web`. |
| Sprint 7: Content, Missions & React HUD | PENDING | Planned in `apps/web`. |
| Phases 2–6 | NOT STARTED | Long-term scope unchanged. |

## Work log — Package Manager Migration & Milestone 3 (Sprint 3) Save System

1. **Yarn Classic 1.22.22 Migration:**
   - Set `"packageManager": "yarn@1.22.22"` in root `package.json`.
   - Replaced pnpm workspace with standard Yarn Classic `workspaces` field (`packages/*`, `apps/*`).
   - Removed `pnpm-lock.yaml`, `pnpm-workspace.yaml`, and cleaned `node_modules`.
   - Generated Yarn v1 `yarn.lock` with standard `node_modules` installation strategy (zero Plug'n'Play, zero Yarn Berry).
   - Verified frozen lockfile installation (`yarn install --frozen-lockfile`).
   - Verified with `yarn --version` (1.22.22), `yarn test` (all tests passing), and `yarn typecheck` (0 errors).

2. **Currency Standardization (BDT & Minor Units):**
   - Replaced `cashPence` and `deltaPence` with `cashMinorUnits` and `deltaMinorUnits`.
   - Stored currency code explicitly as `currency: 'BDT'`.
   - Guaranteed strict integer arithmetic across all domain models, contracts, and Zod validation schemas.

3. **Checksum Security Clarification:**
   - Clarified in docstrings, error messages, and tests that unkeyed SHA-256 verifies payload consistency and detects accidental corruption (e.g. disk corruption, truncation, inadvertent edits), and does not claim protection against deliberate adversary tampering with recomputed hashes.

4. **Save Schema Versioning & Sequential V1 → V2 Migration:**
   - Preserved original `SaveEnvelopeV1` schema as immutable legacy model (`saveSchemaVersion: 1`, `cashPence`, `deltaPence`, no inventory).
   - Introduced canonical `SaveEnvelopeV2` (`saveSchemaVersion: 2`, `cashMinorUnits`, `deltaMinorUnits`, required `currency: 'BDT'`, `inventory: InventoryItem[]`).
   - Set `CURRENT_SAVE_SCHEMA_VERSION = 2` and `MIN_SUPPORTED_SAVE_SCHEMA_VERSION = 1`.
   - Implemented pure, immutable `v1ToV2MigrationStep` (maps cash and ledger units 1:1, populates starting documents if missing, sets schema version to 2).
   - Added realistic original V1 save fixture (`packages/save-core/test/fixtures/legacy-v1-save.json`).
   - Added automated tests verifying:
     - Pure V1 → V2 migration with the realistic fixture.
     - Failed migration preserves original V1 record in storage without corruption.
     - Unsupported future schema versions (e.g., V3, V5) rejected with `UnsupportedFutureVersionError`.
     - Newly created saves write canonical V2 (`saveSchemaVersion: 2`).

5. **Migration Safety Audit & Reconciled Criteria:**
   - Pre-migration snapshot isolation verified in Dexie/IndexedDB and memory adapters.
   - Atomic transactions implemented for snapshot and migrated record writes (`saveMigratedRecordWithSnapshot`).
   - Verified that failed migrations do not mutate or overwrite original saves.
   - Verified that invalid migrated payloads are rejected before committing to storage.
   - Guarded snapshot restoration against overwriting unrelated saves (different `saveId`) or newer gameplay progress via `SnapshotRestorationConflictError`.
   - Automatic cleanup of associated migration snapshots when deleting a save slot.
   - Added `restoreFromSnapshot` capability to recover original saves.
   - Verified that repeated failed migrations leave original data 100% uncorrupted.

6. **Automated Testing Suite:**
   - Monorepo totals: 72 TypeScript unit/integration tests passing (100%), 0 compiler errors across all packages.
   - 10 Python verification tests and 20 evidence files passing.

## Next task

Await user review before proceeding to Milestone 4.
