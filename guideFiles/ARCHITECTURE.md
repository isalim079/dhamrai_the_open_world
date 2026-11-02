# Technical Architecture — Dhamrai Life

**Current status:** Architecture baseline complete; ESRI:102954 provisionally adopted; mathematical tests pass; independent Survey of Bangladesh ground-control validation and ODbL legal review pending; OAuth integration requires credentials. Phase 1 not started; explicit authorization required. See [current evidence](../docs/FINAL_PHASE_0_VALIDATION_REPORT.md).

## 1. Architecture principles

1. **Rendering is not game logic.** Three.js renders a world; it does not own money, mission rules, save decisions or account identity.
2. **Local-first gameplay.** Input and simulation continue without network access after successful sign-in/onboarding.
3. **Cloud-backed identity and recovery.** Google login is mandatory; Google Drive stores player save payloads in the player's appDataFolder.
4. **Data-driven content.** Roles, missions, NPC dialogue, vehicles, prices, POIs and building variants are definitions, not UI conditionals.
5. **Chunked world.** Geographic data is processed offline into versioned game chunks; the browser does not query a public OSM endpoint every frame.
6. **Multiplayer boundary from day one.** Player input is a command; gameplay rules produce events/state changes. In single-player the local runtime executes rules; a future server can validate the same command contract.
7. **Non-destructive updates.** Application cache and save database have different lifecycle/versioning rules.

## 2. Recommended technology baseline

| Concern | Choice | Notes |
|---|---|---|
| Web app | React + TypeScript + Vite | UI shell, menus, HUD, PWA |
| 3D runtime | Three.js | WebGL 2 renderer; own render loop |
| Physics | Rapier 3D JS/WASM | Character controller and raycast vehicle controller are available; game-specific tuning still required |
| UI/game state | Zustand (UI/session state only) | Do not push per-frame transforms through React state |
| Domain rules | Pure TypeScript packages | Commands, rules, reducers, events, economy and mission state |
| Local persistence | IndexedDB via Dexie | Transactions, schema versioning, indexes |
| Runtime validation | Zod or equivalent schema validator | Validate external/save/content payloads at boundaries |
| Map overview | MapLibre GL JS or custom minimap | MapLibre renders vector-tile maps; use a controlled tile/style source |
| Asset authoring | Blender; export GLB | Custom rickshaw/CNG/easy bike/vehicles/buildings/characters |
| Compression | Meshopt or Draco for geometry; KTX2/Basis for textures | Verify loader/decoder support and download cost |
| API | Node.js + TypeScript; NestJS recommended | Google OAuth code exchange, account, Drive token and sync gateway |
| Metadata DB | PostgreSQL | Account ID, Google subject, encrypted token, sync lock/status; no game-save body in v1 |
| Future multiplayer | Colyseus candidate | Validate with a prototype/load test before commitment |
| Tests | Vitest + Playwright | Domain/unit tests and browser end-to-end tests |
| Workspace | pnpm monorepo | Commit lockfile; pin exact dependency versions in the implementation repo |

Do not assume a library version from this document. At implementation start, check the current official docs, select mutually compatible stable versions, pin them in the lockfile and record the decision in an ADR.

## 3. Runtime layers

### 3.1 Presentation layer

- React routes: login, onboarding, character select, loading, game, pause, inventory, map, journal, settings, save manager.
- React owns forms, accessible UI, menus, dialogue panels and HUD presentation.
- The Three.js canvas is mounted as a dedicated runtime surface.
- Do not set player transforms in React state on every animation frame.

### 3.2 Game client/runtime

- `GameRuntime`: owns renderer, scene, cameras, input map, fixed-step scheduler and active world.
- `WorldStreamer`: loads/unloads chunk manifests and assets around player location.
- `EntityRegistry`: runtime entities such as player, vehicles, NPCs and props.
- `PhysicsWorld`: Rapier bodies/colliders, character/vehicle control and collision queries.
- `CameraDirector`: third-person and first-person modes, camera collision and vehicle camera profiles.
- `AudioDirector`: ambient loops, vehicle audio, UI/dialogue cues.
- `PerformanceManager`: capability profile, quality settings, frame timing and adaptive decisions.

### 3.3 Domain/simulation layer (rendering independent)

- `PlayerDomain`: role, attributes, inventory and progression.
- `EconomyDomain`: wallet/bank/ledger, purchases, rewards, maintenance and business income.
- `MissionDomain`: prerequisites, objectives, branch states and rewards.
- `CrimeLawDomain`: wanted state, evidence flags, fines, arrest and jail simulation.
- `VehicleDomain`: ownership, condition, fuel/energy and driving configuration.
- `PropertyDomain`: fictional plot ownership, buildings, upgrades, rent and maintenance.
- `NpcDomain`: schedules, relationships and dialogue conditions.
- `WorldClockDomain`: game time, weather and offline accrual limits.

Use deterministic inputs where possible. Avoid calling `Date.now()` inside core rules; pass a simulation timestamp/tick.

### 3.4 Persistence layer

- `LocalSaveRepository`: IndexedDB transaction boundary.
- `CloudSaveRepository`: calls authenticated API sync endpoints; it does not call Drive with raw refresh tokens from the browser.
- `SaveCoordinator`: debounce, queue, retries, conflict resolution and status.
- `MigrationRegistry`: schema-version transforms and pre-migration snapshots.
- `BackupService`: JSON export/import and integrity validation.

### 3.5 Backend layer

Initial backend is deliberately small:
- Verify Google sign-in ID tokens and establish an application session.
- Run OAuth authorization-code flow for `drive.appdata` when user grants Drive access.
- Exchange auth code server-side, encrypt refresh token at rest and associate it with stable Google `sub`.
- Refresh access tokens and call Google Drive API on behalf of the user.
- Store only minimum metadata in PostgreSQL: internal account ID, Google subject, token ciphertext/key version, authorization status, save file ID, last sync revision/time, lease/lock and audit/security metadata.
- Never log ID tokens, access tokens, refresh tokens, save bodies or full personal profile payloads.

## 4. Command/event contract

Model actions as intent, then validate and produce outcomes.

Example command:

```ts
export type GameCommand =
  | { id: string; type: "vehicle.enter"; vehicleId: string; issuedAtTick: number }
  | { id: string; type: "mission.accept"; missionId: string; issuedAtTick: number }
  | { id: string; type: "economy.purchase"; productId: string; quantity: number; issuedAtTick: number }
  | { id: string; type: "property.purchase"; plotId: string; issuedAtTick: number };
```

Domain execution returns a typed result/event list. Command IDs are unique and idempotent. The UI cannot call arbitrary setters like `setCash(999999)`; it submits a purchase/reward command and domain rules calculate the new value.

```ts
export type DomainEvent =
  | { id: string; type: "economy.transaction-recorded"; amount: number; reason: string; tick: number }
  | { id: string; type: "mission.completed"; missionId: string; tick: number }
  | { id: string; type: "vehicle.owned"; vehicleId: string; tick: number };
```

The exact schema will evolve, but maintain the command/event boundary.

## 5. World streaming model

- Use a documented projected coordinate reference system for authoring and preprocessing.
- Convert geographic coordinates to local metric game coordinates once in the asset pipeline.
- Partition the world into square chunks; the accepted baseline is 256 m × 256 m, anchored at Rathkhola local x,z=0. Changes require a reviewed future decision.
- Store chunk manifest with chunk ID, bounds, neighbours, road graph references, static geometry, collision data, POIs, environment props and asset dependencies.
- Load a small active ring around the player; prefetch the next chunk in the travel direction; unload only when safe.
- Do not unload persistent entities with player-owned state; world-owned entity state must be stored separately from transient render objects.
- Preserve stable entity IDs across app builds. Chunk IDs must not depend on non-deterministic array ordering.

## 6. Graphics/performance strategy

- Use instancing for repeated geometry (trees, bollards, lamps, fences, repeated shop props) where geometry/material match.
- Use LOD for buildings/vegetation and impostors or simplified skyline meshes in distant views.
- Frustum culling, distance culling, occlusion strategy only when measurement justifies it.
- Batch static environment meshes by material/chunk where it reduces draw calls without breaking culling.
- Use texture atlases and trim texture variants. Prefer 1K/512 textures for common props; reserve larger textures for hero assets.
- Bake static lighting/ambient occlusion where suitable; use a limited number of dynamic shadow casters.
- Use compressed GLB geometry and KTX2 textures only after checking target GPU/browser support and providing a fallback asset path.
- Cap active NPC/vehicle counts and simulation update frequency by distance/importance.
- Separate visual detail from collision geometry; use simplified colliders.
- Track draw calls, triangles, texture memory estimates, chunk load times, CPU frame time, GPU frame time where available and long tasks.
- Consider Web Workers for preprocessing, pathfinding and world data decoding. OffscreenCanvas is optional and must be feature-detected; it is not required for the first version.

## 7. Physics strategy

- Rapier owns rigid bodies, colliders, raycasts and character/vehicle controller calculations.
- Use fixed time step for simulation; render interpolated transforms.
- Player character: kinematic controller with capsule collider, stair/step tuning and wall/edge handling.
- Vehicles: begin with arcade/semi-realistic handling; use raycast wheels/suspension where beneficial. Do not implement a full wheel rigid-body stack for every vehicle in MVP.
- Traffic agents may use simplified kinematic route following rather than full physics.
- Validate narrow roads, collision seams, vehicle turning radius, rickshaw stability, CNG clearance and pedestrian collisions.
- Do not run high-cost rigid-body simulation for distant traffic.

## 8. Proposed monorepo

```text
/apps
  /web                 # React/Vite game client and PWA
  /api                 # NestJS auth, account and Drive sync gateway
  /multiplayer         # reserved for later authoritative rooms; absent/disabled in MVP
/packages
  /game-core           # pure domain types, commands, events and rules
  /game-client         # Three.js runtime, camera, input, physics integration
  /world-runtime       # chunk streaming, roads, POIs and world entities
  /content             # role, vehicle, mission, NPC and dialogue definitions
  /save-core           # schemas, migrations, validation and serialization
  /shared-contracts    # API DTOs and versioned shared types
/tools
  /geo-pipeline        # OSM/GIS import, validation and world chunk export
  /asset-pipeline      # GLB processing, optimization and manifest checks
  /map-editor          # future internal road/POI/plot correction tool
/data
  /sources             # source manifests and licensed source references; no unlicensed bulk imagery
  /world               # generated and reviewed chunk metadata
  /content             # source-authored content data
/docs                  # this specification plus ADRs and operational notes
```

Generated build artefacts and source GIS files should not automatically be committed if they are large; use documented object storage/build artefacts and deterministic generation where practical.

## 9. API boundary (initial)

Candidate endpoints; exact naming may be adjusted in implementation ADR:

- `POST /auth/google` — verify Google ID token, create or resume app account.
- `POST /auth/google/drive/authorize` — start or accept authorization-code handoff for `drive.appdata`.
- `GET /account/me` — current account and Drive permission status.
- `GET /cloud-save/status` — cloud file existence/revision/last sync metadata.
- `GET /cloud-save` — fetch current player save from Google Drive.
- `PUT /cloud-save` — validate schema, acquire per-account sync lease, compare base revision, update Drive file, return new cloud revision.
- `POST /cloud-save/resolve` — explicit user resolution of a conflict after the latest cloud state is loaded.
- `POST /auth/logout` — revoke/clear local application session; do not silently delete cloud save.
- `DELETE /account/drive-connection` — revoke/delete stored refresh token as appropriate; preserve Drive data unless user separately requests data deletion.
- `DELETE /account/data` — clearly confirmed account/data deletion flow, including Drive file deletion where API semantics permit and verification passes.

Protect state-changing endpoints with CSRF controls, origin checks, rate limits, session auth and request validation.

## 10. Multiplayer evolution

- Phase 1: single-player runtime executes domain rules locally.
- Phase 2: account and save service already use stable player IDs and commands.
- Multiplayer spike: run `game-core` rules in a Node server process, create one small Colyseus room, verify player movement replication, server validation, reconnect and persistence.
- Later: server authoritative money, property, mission completion, anti-cheat checks, shared world events, moderation and room sharding.
- Google Drive should become a portable player backup/export or recovery target, not the authoritative live multiplayer state. A live shared world needs a server-owned canonical state.

## 11. Technical risks and mitigations

| Risk | Mitigation |
|---|---|
| Large geography overloads browser | Chunk streaming, tiered detail, LOD, active simulation bubble |
| OSM incomplete or wrong for alleys/buildings | Coverage audit, field references, correction tool and data provenance |
| OAuth/Drive complexity | Separate sign-in from authorization, server code flow, integration tests and consent status UI |
| Browser storage removed | Google Drive backup, export/import, persistent-storage request and clear warnings |
| Two devices overwrite same save | Per-account write lease, base revision check and conflict screen |
| Future multiplayer exploit risk | Domain commands, authoritative server boundary, no arbitrary client state writes |
| Physics tuning costs time | Arcade handling first; validate one vehicle/road slice before adding whole fleet |
| Asset licensing issue | Asset register, source/author/license fields and release gate |

## 12. Architecture decision records required

Before implementation, write ADRs for:
- Coordinate reference system and map boundary source.
- Chunk dimensions and active streaming radius.
- API framework and token encryption/key-management approach.
- Direct vs backend-proxied Google Drive access (recommended backend-proxied auth-code flow).
- Cloud save file format and revision/conflict protocol.
- Asset compression/texture formats and fallback rules.
- Physics timestep and vehicle handling model.
- Multiplayer framework choice after a prototype, not before.
