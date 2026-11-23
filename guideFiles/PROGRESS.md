# Dhamrai Life — Progress Tracker

**Last updated:** 23 November 2026  
**Overall status:** Phase 4 track **M27–M32 COMPLETE**. Yarn Classic 1.22.22 · SaveEnvelopeV2 · zero new npm deps.

## Current milestone focus

| Work item | Status | Evidence / limits |
|---|---|---|
| Milestone 13–26 | COMPLETE | Phase 1–3 tracks |
| Milestone 27–32 | COMPLETE | Plots · buy · build · rent · garage · property journal |
| Phase 2 closeout (M15–M20) | COMPLETE | `guideFiles/PHASE2_MILESTONE_TRACK.md` |
| Phase 3 track (M21–M26) | COMPLETE | `guideFiles/PHASE3_MILESTONE_TRACK.md` |
| Phase 4 track (M27–M32) | **COMPLETE** | `guideFiles/PHASE4_MILESTONE_TRACK.md`; CDP PASS |
| Baseline regression (23 Nov 2026 post-M32) | MOSTLY GREEN | typecheck 0; plots 5/5; Neon PG offline |
| Dependency lockfile | CLEAN | `yarn.lock` unchanged |
| Next task | FUTURE | Phases 5–6 roadmap |

## Historical phase and evidence (Sprints / earlier milestones)

| Work item | Status | Evidence / limits |
|---|---|---|
| Phase 0 architecture baseline | COMPLETE (provisionally accepted) | Nine reconciled Phase 0 Markdown documents in `docs/`, version 3.0.0. Stack and game scope unchanged. |
| Sprint 1: Monorepo Foundation & Tooling | COMPLETE | Root `package.json` migrated to Yarn Classic 1.22.22 (`yarn.lock`), `tsconfig.base.json`, `packages/shared-contracts` initialized. Vitest unit tests (6/6 passed), TypeScript project references typecheck (`tsc -b`) passed. |
| Sprint 2: Domain Engine & Economy | COMPLETE | Pure TypeScript domain package `@dhamrai/game-core` implemented: `EconomyDomain` (integer minor units `deltaMinorUnits`/`runningBalanceMinorUnits`, BDT currency code, append-only ledger, invariant verification), `InventoryDomain` (stacking, capacity, document storage), `MissionDomain` (declarative state machine, idempotent payouts), `RickshawDriverArchetype` (৳250 start, rented rickshaw, license slip), and `GameCoreEngine` facade. 25 unit tests passed; `tsc -b` passed with 0 errors. |
| Sprint 3: Save System & Local Persistence | COMPLETE | Pure persistence package `packages/save-core` implemented with clean separation: Zod schema validation, platform-independent Web Crypto SHA-256 payload consistency verification, canonical JSON serialization, sequential schema migration pipeline with pre-migration snapshot isolation, Dexie/IndexedDB storage adapter, in-memory adapter, and `SaveOrchestrator`. Save schema versioning reconciled: legacy `SaveEnvelopeV1` schema preserved without modification; canonical `SaveEnvelopeV2` introduced (`saveSchemaVersion: 2`, `currency: 'BDT'`, `cashMinorUnits`, `inventory`); pure `v1ToV2MigrationStep` registered; snapshot conflict guards implemented; 41 unit tests in save-core; 100% passing; `tsc -b` passed with 0 errors. |
| Sprint 4: Backend OAuth & Google Drive Sync | BLOCKED — NOT APPROVED | Security remediation source and local tests completed; real PostgreSQL registration/lease correctness NOT VERIFIED. Production now fails closed, OAuth signature/claims/state/PKCE/redirect checks implemented, canonical Drive publication fenced. pg dependency not installed/locked; real DB and live Google integration pending. See `docs/MILESTONE_4_REMEDIATION_VERIFICATION.md`. |
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
| OAuth and Drive integration | REQUIRES CREDENTIALS FOR LIVE PROD | Production requires Google Cloud client credentials, consent, redirects and Drive scope. High-fidelity mock adapter enables 100% deterministic local/CI test coverage without external network dependencies. |
| Sprint 5: Offline Slice Data Generation | PENDING | Planned in `tools/geo-pipeline`. |
| Sprint 6: 3D Client & Rickshaw Physics | PENDING | Planned in `apps/web`. |
| Sprint 7: Content, Missions & React HUD | PENDING | Planned in `apps/web`. |
| Phases 2–6 | NOT STARTED | Long-term scope unchanged. |

## Final Milestone 4 remediation verification

Current report: `docs/MILESTONE_4_REMEDIATION_VERIFICATION.md`; captured outputs in `docs/evidence/milestone-4/`. Corrected Google RSA/claims validation, browser-bound state and S256 PKCE, exact redirects, registration upsert identity, production encryption/session configuration and secret-error handling, real PostgreSQL provider selection, atomic lease predicates and fenced Drive publication. Previous mock-based claims of distributed proof are withdrawn. Real PostgreSQL tests are explicitly skipped/NOT VERIFIED; pg@8.16.3 installation and lockfile generation are pending registry access. Existing uncommitted work was retained. No commit, push, or Milestone 5 work.

## Historical work log — Sprints 1–4 Implementation & Package Manager Migration

The counts and completion claims below describe the earlier implementation report, not current security acceptance. The final verification report and BLOCKED status above supersede those claims.

1. **Yarn Classic 1.22.22 Migration:**
   - Set `"packageManager": "yarn@1.22.22"` in root `package.json`.
   - Configured standard Yarn Classic `workspaces` field (`packages/*`, `apps/*`).
   - Cleaned `pnpm-lock.yaml`, `pnpm-workspace.yaml`, and linked node_modules via Yarn v1 `yarn.lock`.
   - Verified with `yarn --version` (1.22.22), `yarn test`, and `yarn typecheck`.

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

5. **Migration Safety Audit & Reconciled Criteria:**
   - Pre-migration snapshot isolation verified in Dexie/IndexedDB and memory adapters.
   - Atomic transactions implemented for snapshot and migrated record writes (`saveMigratedRecordWithSnapshot`).
   - Verified that failed migrations do not mutate or overwrite original saves.
   - Verified that invalid migrated payloads are rejected before committing to storage.
   - Guarded snapshot restoration against overwriting unrelated saves (different `saveId`) or newer gameplay progress via `SnapshotRestorationConflictError`.
   - Automatic cleanup of associated migration snapshots when deleting a save slot.

6. **Sprint 4: Backend OAuth & Google Drive Sync Service (`apps/api`):**
   - Implemented NestJS application structure under `apps/api`.
   - Built `AesGcmService`: AES-256-GCM authenticated encryption for refresh tokens and OAuth secrets at rest with 12-byte random IVs and 16-byte authentication tags.
   - Built `GoogleAuthService`: Google ID token signature verification and stable `sub` claim extraction; OAuth authorization-code exchange for `drive.appdata` scope.
   - Built `SessionService` & `AuthGuard`: HMAC-SHA256 session bearer token issuance and authentication middleware.
   - Built `AuthController`: `POST /auth/google` endpoint creating/updating user accounts in PostgreSQL/in-memory repository and encrypting tokens at rest.
   - Built `LeaseLockService`: Optimistic concurrency lease lock manager preventing multi-device and multi-tab save collisions (HTTP 409 Conflict).
   - Built `GoogleDriveService` & `MockGoogleDriveClient`: REST client for Google Drive hidden `appDataFolder` (`drive.appdata` scope) with mock adapter for deterministic offline CI testing.
   - Built `CloudSaveController`: `GET /cloud-save` and `PUT /cloud-save` with `SaveEnvelopeV2` Zod validation, SHA-256 integrity checks, and optimistic concurrency lease locking.
   - Automated test suite: 28 unit tests in `apps/api` (100 total across workspace, 14 test files); 100% passing.

## Next task

Await explicit authorization to implement **Milestone 13: Vehicle Maintenance, Driver Stamina & Tea Stall Economy** per `guideFiles/milestone_13_planning_report.md`. Historical Milestone 4 real-PostgreSQL / live Drive verification remains environment-gated and off this critical path.

## 2026-11-03 — Existing web development startup repair

- Fixed the incompatible Vite 7.3.7 / React plugin 6.2.1 pairing by pinning Vite 7.3.7 and @vitejs/plugin-react 4.7.0, whose declared peer range includes Vite 7. Regenerated yarn.lock offline using cached packages; Yarn Classic remains 1.22.22.
- Verification: web production build passed; workspace typecheck passed; frozen/offline dependency install and git diff --check passed. The build emits an existing large-bundle warning. No new unit tests were added for this dependency-only repair.
- Dev command now loads its configuration; HTTP serving could not be checked because this sandbox denies listening on 127.0.0.1:5173 (EPERM).
- API port 3000 is held by another project's Arc-One server, PID 74924 at inspection. That process and local credentials were left unchanged. Port 3001 had no listener at inspection; use PORT=3001 yarn start:api to run a second API without disturbing it.
- This repairs the existing web startup only; it does not approve a milestone or implement additional milestone scope. No commit or push.

## 2026-11-23 — Milestone 11 Discovery & Planning

```text
Phase: Phase 1 vertical slice polish track
Task: Milestone 11 Discovery & Planning (Visual World Polish & Street Detailing)
Status: READY FOR IMPLEMENTATION (awaiting auth)
Files changed: guideFiles/milestone_11_planning_report.md, guideFiles/PROGRESS.md, PROGRESS.md
Tests run: yarn test; yarn typecheck; python unittest geo-pipeline
Test results: typecheck 0 errors; Python 23/23; Vitest 252 passed / 4 skipped; 1 real-PG suite failed offline (ENOTFOUND Neon)
Manual verification: Code/architecture inspection of SceneManager, ChunkLoader, slice_mesh_generator, performance budgets, PHASE_1_ANCHORS
Known limitations: Real PostgreSQL integration still environment-gated; day-night deferred to M12
Open risks: Draw-call/triangle inflation if props are not instanced (mitigated in plan)
Next task: Explicit user authorization to implement Milestone 11
```

## 2026-11-23 — Milestone 11 Implementation Complete

```text
Phase: Phase 1 vertical slice polish track
Task: Milestone 11 Visual World Polish & Street Detailing
Status: COMPLETE — VERIFIED
Files changed: AtlasFactory, WorldMaterialBinder, PropManager, propCatalog, signboardCopy, ChunkLoader, SceneManager, GameEngine, tests, CDP script, reports
Tests run: yarn test; yarn typecheck; python unittest; scratch/m11_live_verification.cjs
Test results: typecheck 0; Python 23/23; Vitest 270 passed / 4 skipped; CDP 10/10; 60 FPS / 79 draw calls / 10399 tris
Manual verification: Live headless Chrome CDP screenshots m11_shot_01..10
Known limitations: Low-poly procedural props; no prop colliders; Neon PG offline
Open risks: None blocking M12 planning
Next task: Milestone 12 Discovery & Planning (Day-Night & Weather)
```

## 2026-11-23 — Milestone 12 Discovery & Planning

```text
Phase: Phase 1 atmosphere polish track
Task: Milestone 12 Discovery & Planning (Day-Night & Atmospheric Weather)
Status: READY FOR IMPLEMENTATION (awaiting auth)
Files changed: guideFiles/milestone_12_planning_report.md, guideFiles/PROGRESS.md, PROGRESS.md
Tests run: yarn test; yarn typecheck; python unittest geo-pipeline
Test results: typecheck 0; Python 23/23; Vitest 270 passed / 4 skipped; Neon PG offline fail unchanged
Manual verification: Inspected SceneManager static lighting, Renderer exposure, AmbientSoundscape hooks, PropManager poles, GameEngine update loop
Known limitations: Neon PG environment-gated
Open risks: PointLight/rain particle budgets (mitigated in plan with hard caps)
Next task: Explicit user authorization to implement Milestone 12
```

## 2026-11-23 — Milestone 12 Implementation Complete

```text
Phase: Phase 1 atmosphere polish track
Task: Milestone 12 Day-Night Cycle & Atmospheric Weather
Status: COMPLETE — VERIFIED
Files changed: atmosphere/*, GameEngine, SceneManager, PropManager, InputManager, AmbientSoundscape, HUD, SessionStore, tests, CDP
Tests run: yarn test; yarn typecheck; python unittest; scratch/m12_live_verification.cjs
Test results: typecheck 0; Python 23/23; Vitest 288 passed / 4 skipped; CDP 11/11; 60 FPS night+rain
Manual verification: Live CDP screenshots m12_shot_01..10
Known limitations: Light rain only; Neon PG offline
Open risks: None blocking M13 planning
Next task: Milestone 13 Discovery & Planning
```

## 2026-11-23 — Milestone 13 Discovery & Planning

```text
Phase: Phase 1 economy closeout
Task: Milestone 13 Discovery & Planning (Vehicle Maintenance, Stamina & Tea Stall Economy)
Status: READY FOR IMPLEMENTATION (awaiting auth)
Files changed: guideFiles/milestone_13_planning_report.md, guideFiles/PROGRESS.md, PROGRESS.md
Tests run: yarn test; yarn typecheck; python unittest
Test results: typecheck 0; Python 23/23; Vitest 288 passed / 4 skipped; Neon PG offline
Manual verification: Inspected damagePercent, MAINTENANCE_COST, CONSUMABLE inventory, tea stall props, SaveEnvelopeV2 vehicleState
Known limitations: Neon PG environment-gated
Open risks: Optional V2 field hydrate must keep old saves valid (mitigated in plan)
Next task: Explicit user authorization to implement Milestone 13
```
