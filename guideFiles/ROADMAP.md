# Development Roadmap — Dhamrai Life

## Delivery approach

Build vertical slices and prove the risky foundations early: geographic data quality, low-end browser performance, physics, and durable save/cloud synchronization. The whole world, all five storylines and multiplayer are not first-sprint tasks.

A phase is complete only when its code, tests, evidence, documentation and `PROGRESS.md` status are updated.

## Phase 0 — Architecture and geographic evidence baseline

**Status:** Architecture baseline complete, provisionally accepted. Mathematical tests pass; independent SoB ground-control validation and ODbL legal review remain pending. The exact Upazila grid count is blocked by the absent polygon; mission courtyard/access evidence is also pending. See [current correction log](../docs/PHASE_0_CORRECTION_REPORT.md) and [execution report](../docs/FINAL_PHASE_0_VALIDATION_REPORT.md).

Deliverables: nine architecture/research documents, mathematical coordinate tests, preserved OSM snapshots and clipped audit metrics, mission road-node route polylines, raw/evidence manifests, and explicit external blockers. Runtime, monorepo/CI, GLB/physics benchmarks and OAuth/Drive prototypes are future Phase 1 work under the seven-sprint plan, not completed Phase 0 deliverables. Architecture completion does not certify geodetic ground truth or legal clearance.

Phase 1 has not started. Explicit user authorization is required before implementation. Live OAuth integration additionally requires Google Cloud credentials and consent setup.

## Phase 1 — Game foundation and first playable slice

**Goal:** Play a small part of Dhamrai end-to-end.

Deliverables:
- Login/onboarding and profile binding.
- Rickshaw Driver is the sole playable Phase 1 role; other starting roles remain later-phase scope.
- Third-person and first-person camera switching.
- Player walk/run and interaction system.
- One central Dhamrai chunk set, road graph, key buildings and POIs.
- One fully working pedal rickshaw; enter/exit and basic fare activity.
- Basic NPC dialogue and three simple missions.
- One police dialogue/checkpoint encounter.
- HUD with location text, money, mission and minimap.
- IndexedDB local save and Drive cloud save for profile/mission/economy state.
- JSON export/import.

Acceptance:
- Player can sign in, start as rickshaw driver, walk/ride, complete three missions and reload without loss.
- Cloud save can be restored in a separate browser profile after login.
- Low profile runs on the agreed integrated-GPU machine at the agreed target or benchmark evidence documents the gap.

## Phase 2 — Core transport, traffic and economy

**Goal:** Make the world feel like local road life.

Deliverables:
- CNG and easy bike vehicle archetypes.
- Road-following traffic agents, intersections, yielding and basic congestion.
- Vehicle ownership/lease, condition, fuel/charge and repair.
- Cash/bank and append-only transaction ledger.
- Additional job/delivery mission types.
- Police stop, fine, wanted, arrest and jail simulation (fictional).
- Expanded road/building/prop set for high-detail area.

Acceptance:
- No negative or duplicated transaction from repeated mission triggers/reloads.
- Traffic can traverse all approved road graph paths in the slice without systematic deadlocks.
- Vehicles do not routinely clip through road edges/buildings in the approved test suite.

## Phase 3 — Character storylines and world expansion

**Goal:** Open the wider world and deliver role identity.

Deliverables:
- All five role intro chains and distinct starting conditions.
- Role-specific dialogue and mission definitions.
- More Dhamrai unions, markets, waterways and landmark regions at tiered detail.
- Landmark discovery, history content and collectibles.
- Expanded NPC schedules, pedestrian paths and relationship data.
- Rain/day-night cycle and audio ambience.
- Savar/Jahangirnagar University extension data package after independent location/hall verification.

Acceptance:
- Each role can complete an intro chain and access shared world systems.
- World chunk transitions preserve player position, vehicle state and mission state.
- Every historical fact included in dialogue/collectibles has a recorded source.

## Phase 4 — Property, construction and business

**Goal:** Let players build an economic empire.

Deliverables:
- Curated fictional plot layer.
- Plot inspection, purchase and ownership persistence.
- Building placement/templates and construction process.
- Rental income, repair/maintenance and business operations.
- Shops, garage/workshop and transport business.
- Property UI and journal history.

Acceptance:
- Property IDs remain stable across world data updates.
- A purchase cannot be duplicated by retry/reload.
- Build placement follows game zoning/access rules and does not break critical road traversal.

## Phase 5 — Content depth and optimization

**Goal:** Improve replayability, polish and performance.

Deliverables:
- More main/side/daily missions and emergent events.
- More vehicle models and handling profiles.
- Optimized LOD, instancing, texture compression and asset streaming.
- Accessibility settings, key binding and full UI polish.
- Save migration matrix and cross-browser regression suite.
- Telemetry/diagnostics only if privacy and consent design is approved.

Acceptance:
- Current supported desktop browsers pass the E2E suite.
- Performance measured on low, medium and high reference devices.
- Upgrade from each supported save version tested without deletion/reset.

## Phase 6 — Multiplayer feasibility spike (not full launch)

**Goal:** Prove the single-player domain can move to an authoritative server.

Deliverables:
- Small Colyseus room prototype with two clients.
- Server-authoritative player movement and one interaction.
- Shared command/event contracts from `game-core`.
- Reconnect, disconnect, room ownership, basic rate limit and cheat attempt tests.
- Architecture decision: continue with Colyseus or choose another server model.

Acceptance:
- Clients cannot directly set money, mission completion or ownership.
- Server rejects invalid commands and emits consistent state.
- Local single-player mode remains independent and functional.

## Cross-phase definition of done

- Acceptance criteria met and evidence recorded.
- Unit, integration and E2E tests added/updated.
- No new console errors, leaked WebGL resources or unhandled promise rejections in tested flow.
- Save compatibility considered and tested whenever persisted data changes.
- Asset provenance/licence metadata complete.
- `PROGRESS.md` updated with completed tasks, open risks and next task.
- Agent reports files changed, tests run, results, known limitations and manual checks still required.
