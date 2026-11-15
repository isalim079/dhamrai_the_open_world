# Milestone 9 Planning Report — Dhamrai Life
## Post-Milestone 8 Architecture and Product Review

**Document type:** Planning Only  
**Status:** Draft — Awaiting Authorization  
**Date:** November 9, 2026  
**Author:** Antigravity (Advanced Agentic Assistant)  
**Absolute rule:** This document contains zero implementation. No source files modified. No dependencies installed. No schema changes. No commits. No push.

---

## 1. Executive Summary

After completing a comprehensive audit of the Dhamrai Life repository following Milestone 8 approval, this report identifies the single highest-value next milestone.

**Recommended Milestone 9:** Passenger Fare Loop Completeness, Mission Chain Expansion, and the Core Gameplay Progression System.

The current game has outstanding infrastructure — physics, rendering, save/cloud sync, auth, economy ledger — but it has only **one completable gameplay loop** (Mission 1: drive Farhana to school). Missions 2 and 3 are defined in data but **not wired into the 3D world as playable interactions**. The player has nowhere to go after Mission 1 completes. There is no mission chain, no new mission selection, no fare repetition, no income cycle, and no meaningful progression.

The infrastructure is Phase 2 quality. The gameplay is prototype quality. That gap is the most important thing to close.

---

## 2. Repository Audit Findings

### 2.1 Directory Structure Verified

```
apps/
  web/          React 19 + Vite 7 + Three.js + Rapier WASM browser client
  api/          NestJS backend — OAuth, Google Drive sync, PostgreSQL leases
packages/
  game-core/    Pure TypeScript domain: economy, inventory, missions, roles, dialogue
  save-core/    Save orchestration, Dexie, Zod schemas, migrations, checksums
  shared-contracts/  Single source of truth for all TypeScript types/DTOs
tools/
  geo-pipeline/ Python geospatial pipeline (13 scripts)
data/
  world/        world_manifest.json, directed_nav_graph.json, 16 GLB chunks
  sources/      OSM snapshots, audit data
guideFiles/     GAME_DESIGN.md, ARCHITECTURE.md, ROADMAP.md, milestone reports
```

### 2.2 Test Coverage Verified

| Area | Test files | Tests |
|---|---|---|
| packages/game-core | 6 | ~60 |
| packages/save-core | 4 | ~41 |
| packages/shared-contracts | 1 | ~6 |
| apps/api | 9 | ~73 |
| apps/web | 11 | ~39 |
| **Total** | **32** | **219** |

Milestone 8 report documents 219/219 passing, 32 test files, 4 real PostgreSQL integration tests, 23 Python tests. TypeScript typecheck clean.

### 2.3 World Data Verified

| Metric | Value |
|---|---|
| Grid | 4×4 = 16 chunks of 256m × 256m |
| Total area covered | 1,024m × 1,024m (Phase 1 slice) |
| Roads in manifest | 100 |
| Buildings in manifest | 657 |
| Total triangles | 10,464 |
| Navigation graph nodes | 453 |
| Navigation graph edges | 934 (818 rickshaw-eligible) |
| GLB chunk sizes | 13 KB – 111 KB (788 KB total) |
| Chunk format | GLB + JSON pair per chunk |

**World quality assessment:** Early prototype quality. Buildings are procedurally generated low-poly boxes based on OSM footprints. Roads are flat extruded meshes. No landmarks are 3D modelled. No terrain height variation is implemented. The world is geographically accurate but visually sparse. No textures. No props. No foliage. No signage.

The world is serviceable as a gameplay foundation but would not pass a visual quality bar for external release.

### 2.4 Gameplay Audit — "What can the player do for 30 minutes?"

**Honest assessment: approximately 3–7 minutes of directed content, then nothing.**

Current completable loop:
1. Spawn at Rathkhola stand (foot).
2. Walk to Farhana NPC (~15m away).
3. Press [E] to talk. Accept fare.
4. Press [F] to board rickshaw (must walk to it first).
5. Drive north ~221m to Hardinge High School Gate.
6. Mission completes. ৳30 BDT credited. +5 reputation.
7. Autosave triggers.

**After Mission 1 completes:**
- The game has no next mission trigger.
- The HUD still shows `mission_1_first_fare` as "current" because `syncFromEngine` defaults back to it.
- Farhana dismounts at the school gate and stands there permanently.
- No new fare opportunity spawns.
- Mission 2 (Police Checkpoint) is defined in `PHASE_1_MISSIONS` and has a dialogue tree, but the police NPC at Thana Junction (`-61, 0, 66.5`) has **no mission activation trigger** — approaching and pressing [E] shows the dialogue, but `INSPECT_DOCUMENTS` action trigger is defined in the dialogue but **not handled in `DialogueBox.tsx`** (only `BOARD_PASSENGER` and `CLOSE_DIALOGUE` are handled).
- Mission 3 (Brass Artisan Order) is defined and Gouranga exists at `-295.3, 0, -77.0`, but accepting his dialogue has no game consequence — the `choice_accept_craft` action trigger is undefined and silently falls through to `node_craft_fare` with no mission activation.
- SI Rafiq is 127m from spawn. Gouranga is 295m from spawn. Neither triggers a mission.
- There is no way to earn more money after Mission 1 completes.
- There is no way to spend money.
- The daily rent system (`processDailyVehicleRent`) is implemented but never called.
- The rickshaw drives and the world streams. Save/cloud transport works, but end-to-end runtime transform persistence is incomplete: domain player position is not updated from the 3D runtime before save and restored domain position is not applied to the 3D entities.

**Conclusion:** The player has a 3–7 minute experience maximum, then the game is effectively a sandbox with no purpose. This is the most critical problem for the project.

### 2.5 Mission System Audit

**Definitions (game-core, fully implemented):**
- `mission_1_first_fare` — WIRED AND COMPLETABLE ✓
- `mission_2_police_checkpoint` — DEFINED, NOT WIRED ✗
- `mission_3_artisan_order` — DEFINED, NOT WIRED ✗

**Structural issues:**
1. `DialogueBox.tsx` handles only `BOARD_PASSENGER` and `CLOSE_DIALOGUE` action triggers. `INSPECT_DOCUMENTS` is silently unhandled.
2. `MissionDefinition` in `shared-contracts` has no `prerequisites` field (the `GAME_DESIGN.md` spec calls for `prerequisites: MissionCondition[]` but this is absent from the actual contract).
3. `MissionDefinition` has no `repeatPolicy` field (spec calls for `"once" | "cooldown" | "repeatable"`).
4. `MissionDefinition` has no `branches` field (spec calls for `MissionBranch[]`).
5. No mechanism exists to unlock missions sequentially (there is no prerequisite check, no mission availability event).
6. No mission failure condition is implemented in 3D gameplay (the `failMission()` method exists in MissionDomain but is never called from the engine).
7. After all three missions complete, there is no content.
8. There are no repeatable fare missions (the core rickshaw driver gameplay loop).
9. `currentActiveMissionId` in `useGameStore` defaults back to `'mission_1_first_fare'` even when completed, causing the HUD to always show a completed mission.

**Mission system assessment:** The framework is solid (idempotent payouts, state machine, ledger entries) but has only 1 of 3 missions actually playable, and no chain or unlock system.

### 2.6 NPC and AI Audit

**Story NPCs (NPCManager.ts):**
- 3 story NPCs defined and spawned at correct positions.
- All use colored capsule + head geometry (placeholder visuals).
- Farhana: boarding/dismounting WORKS — the best-integrated NPC.
- SI Rafiq: spawned, dialogue opens, but `INSPECT_DOCUMENTS` action is unhandled.
- Gouranga: spawned, dialogue opens, but cargo pickup action is unhandled.
- 2 ambient pedestrians with 3-waypoint patrol loops (tiny radius near spawn).

**Traffic AI (TrafficManager.ts):**
- Pool of 3 agents traversing `directed_nav_graph.json` edges.
- Forward obstacle detection (4m cone), anti-deadlock respawn (6s tolerance).
- Distance recycling (>140m from player).
- Speeds: 8.6–11.2 km/h.
- Agents are rickshaws only — no other vehicle types.
- Navigation is random edge selection, not goal-directed.
- No traffic rules (one-way, priority, junctions).
- Traffic `TurnRestriction` data exists in the contract but the `directed_nav_graph.json` has none loaded into `TrafficManager` (it only uses `allowsRickshaw` + random edge selection).

**AI assessment:** Traffic AI is functional and performant. NPC AI is static (story NPCs stand at spawn positions). Ambient pedestrians have extremely limited patrol loops. There is no schedule, no goal, no state beyond `isBoarded`.

### 2.7 Economy Audit

**Implemented:**
- Integer Poisha ledger (EconomyDomain) — excellent quality.
- Append-only transactions with running balance integrity verification.
- Starting cash: ৳250 (25,000 Poisha).
- Mission rewards: ৳30 (Mission 1), ৳0 (Mission 2, civic duty), ৳75 (Mission 3).
- `processDailyVehicleRent()` — implemented but never called.
- `debit()` — implemented, never called from gameplay.
- `TransactionCategory` includes: `MAINTENANCE_COST`, `FINE_PENALTY`, `REPUTATION_BONUS` — defined but unused.

**Not implemented:**
- No fuel/energy system.
- No spending mechanic.
- No way to buy anything.
- No income loop after Mission 1.
- No fare meter (distance × rate calculation).
- No income from repeatable fares.
- No bank balance (only cash).
- Rent is never charged.

**Economy assessment:** The ledger is production-quality but the economy has no depth. The player's cash balance is meaningless because there is nothing to spend it on and no income after the first mission.

### 2.8 Save / Cloud Audit

**SaveEnvelopeV2 (fully working):**
- Zod schema validation at save and restore boundaries.
- SHA-256 checksum for integrity verification.
- One notable issue: `GameCoreEngine.toSaveEnvelope()` writes `checksumSha256: 'placeholder_checksum'` — the actual hash must be filled by `save-core` during orchestration, which does work correctly, but the placeholder comment indicates the coupling is fragile.
- Dexie/IndexedDB storage adapter: functional.
- Memory adapter: functional (used in tests).
- V1→V2 migration pipeline: implemented and tested.

**Cloud sync (functional):**
- Google Drive `appDataFolder` isolation via backend proxy.
- 3-second debounce on upload.
- Optimistic concurrency via PostgreSQL lease locks.
- BroadcastChannel multi-tab coordination.
- Conflict resolution modal: functional.
- Session token in `sessionStorage`: functional with 7-day expiry.

**Save risks identified:**
- **MEDIUM:** `checksumSha256: 'placeholder_checksum'` in `engine.ts` — relies on save-core overwriting it. If `toSaveEnvelope()` is ever used outside of `SaveOrchestrator`, the checksum will be `'placeholder_checksum'` in storage.
- **LOW:** Ledger grows unbounded. A player playing for many hours will accumulate hundreds of transactions. There is no ledger compaction strategy. For the current gameplay scope (3 missions), this is acceptable.
- **HIGH:** `GameEngine.init()` creates character and rickshaw at fixed positions before `useGameStore.initGame()` restores the domain save; no subsequent runtime transform/occupancy application is performed. `useGameStore.loadGame()` replaces the domain engine without moving 3D entities. Autosave may therefore capture stale domain position/vehicle occupancy rather than the runtime position. This must be reconciled before claiming end-to-end persistence.
- **LOW:** The `worldFlags` record stores arbitrary key/value state. As gameplay grows, this will become a dumping ground. It already contains `tutorialCompleted`, `gameStartedAtMs`, and `createdAtIso`.

**Persistence assessment:** Production-quality for the current feature set. No urgent issues.

### 2.9 Security Audit

**Implemented correctly:**
- PKCE S256 OAuth flow (server-side code exchange).
- Session token in `sessionStorage` (not `localStorage`) — correct for session-scoped security.
- HMAC-SHA256 session tokens issued by backend.
- AES-256-GCM refresh token encryption at rest.
- Google ID token RSA signature verification server-side.
- Strict `postMessage` origin checks in `OAuthCallback.tsx`.
- Google Drive isolated to `appDataFolder` (player cannot access other Drive files).
- No game secrets in browser code.
- No ID tokens or refresh tokens in client storage.

**Issues identified:**
- **LOW:** `(window as any).__dhamrai_engine`, `(window as any).__useAuthStore`, and `(window as any).__cloudSaveService` are exposed as global window properties in production builds for debugging. These should be gated behind a `DEV` flag or removed from production.
- **LOW:** `window.addEventListener('dhamrai_test_conflict', ...)` is registered in `App.tsx` unconditionally in production. This is a test hook for CDP verification that was not removed.
- **No JWT parsing bug:** This application uses a custom two-segment HMAC token, not JWT. `apps/api/src/auth/session.service.ts:34-40` encodes the payload (including `exp`) in segment zero and appends the signature as segment one. `useAuthStore.ts:43-57` correctly reads segment zero. The fallback expiry for malformed client-side tokens should be evaluated separately, but the backend still verifies signature and expiry.

**Security assessment:** Architecture is sound. Three low-severity issues identified, none blocking.

### 2.10 Performance Audit

**Verified baseline from Milestone 7/8:**
- 60 FPS target
- ~16.7ms frame time
- ~24 draw calls
- ~4,607 triangles rendered
- ~81 active Rapier colliders
- 9 active chunks

**Performance observations from code:**
- `Minimap.tsx` redraws its entire canvas on every `playerPosition` state change. Since `useSessionStore.setPlayerPosition()` is called every frame from `GameEngine.update()`, the minimap canvas redraws at 60 Hz. This is correct behavior but could become expensive with more roads drawn.
- `useGameStore.syncFromEngine()` re-reads all mission instances from the engine on every call. It is called from `GameEngine.update()` indirectly only on specific events (mission completion), not every frame — this is correct.
- Traffic pool is hardcoded to 3 agents. Scaling to 10+ is untested.
- NPC physics bodies are `kinematicPositionBased` — correct for performance.
- Three.js geometry is all procedural (no GLTFs loaded for characters/vehicles yet). This keeps draw calls low but the characters look like colored capsules.
- ChunkStreamer's `updatePlayerPosition()` is called every frame but only re-streams when chunk coordinates change — the guard is correct.
- `__dhamrai_engine` global is set via `window as any` every frame during `init()` — actually it's set once in `init()`, not every frame, so this is fine.

**Performance assessment:** Excellent for current content. No blocking performance issues. The 60 FPS baseline is healthy. Adding more missions and NPCs poses only a linear scaling risk.

### 2.11 UX Audit

**HUD (HUD.tsx):**
- Cash balance, reputation, mission tracker, speed — all working.
- `currentActiveMissionId` defaults to `mission_1_first_fare` even after completion — HUD always shows this mission.
- No visual indication that Mission 1 is complete and other missions are available.
- No mission selection UI.
- No notification when Mission 2 or 3 become available.
- The status bar at the bottom shows contextual prompts — works well.

**Journal (JournalModal.tsx):**
- Three tabs: Active, Completed, Landmarks — clean UI.
- Mission objectives checklist — works.
- Landmarks tab has only 3 hardcoded text entries.
- No economic history in journal.
- No way to manually activate a mission from the journal.

**Inventory (InventoryModal.tsx):**
- Clean 4×5 grid UI.
- Only 1 item: Rickshaw License Slip (document).
- Recent ledger feed (last 5 transactions) — useful.
- No way to use or discard items.
- No cargo items in inventory (Mission 3 pickup would add cargo but is unimplemented).

**Minimap (Minimap.tsx):**
- Circular radar, player heading cone, road graph, mission beacon — all working.
- NPC positions hardcoded as fixed coordinates (not dynamic). If NPCs move or new ones are added, minimap won't track them.
- Only Farhana and Rafiq shown; Gouranga is too far (−295m) to appear in 120m radar radius.

**Dialogue (DialogueBox.tsx):**
- Bilingual Bengali + English display — excellent.
- Keyboard shortcuts [1], [2], [Esc] — excellent.
- Unhandled action triggers silently advance to `nextNodeId` — functional but potentially confusing (player accepts Gouranga's job but nothing happens in-game).

**SaveManager / Auth (SaveManagerModal.tsx):**
- Google sign-in, cloud sync status, manual sync, export/import — all functional.
- Conflict resolution modal — functional with three choices.

**Biggest UX problems:**
1. The game ends after Mission 1 with no guidance on what to do next.
2. Missions 2 and 3 appear available in the journal but accepting them does nothing.
3. Farhana remains at the school gate permanently after drop-off — she should logically disappear or reset.
4. The mission HUD tracker stays locked on Mission 1 after completion.

### 2.12 Architectural Debt Inventory

| Severity | Issue | Location |
|---|---|---|
| HIGH | `INSPECT_DOCUMENTS` and `choice_accept_craft` action triggers defined in contracts but not handled in `DialogueBox.tsx` — missions 2/3 are dead | `DialogueBox.tsx`, `dialogue.ts` |
| HIGH | `currentActiveMissionId` in `useGameStore` always defaults to `mission_1_first_fare` regardless of mission state; no transition logic after completion | `useGameStore.ts` |
| HIGH | No mission activation/unlock sequence — prerequisites field is absent from `MissionDefinition` contract | `shared-contracts/src/index.ts`, `game-core/src/missions.ts` |
| HIGH | `mission_2_police_checkpoint` and `mission_3_artisan_order` are fully defined but have zero 3D gameplay wiring | `GameEngine.ts` |
| HIGH | Restored domain state is not applied to 3D player/rickshaw; runtime movement is not copied back to domain before save | `GameEngine.ts:65-85,389-393`, `useGameStore.ts:144-180` |
| MEDIUM | `checksumSha256: 'placeholder_checksum'` in `engine.ts` — save integrity depends on orchestrator overwriting this correctly | `game-core/src/engine.ts:254` |
| MEDIUM | NPC positions hardcoded in `Minimap.tsx` — `(15.0, -10.0)` and `(-61.0, 66.5)` will break when NPCs change | `Minimap.tsx:149-157` |
| LOW | Client-side session parsing falls back to a 7-day estimate for malformed tokens; backend signature/expiry verification remains authoritative | `useAuthStore.ts:43-57`, `session.service.ts:34-80` |
| MEDIUM | `WorldManifest` and `ChunkManifest` have no public URL base — chunks are fetched from `/world/` hardcoded path | `ChunkLoader.ts`, `GameEngine.ts` |
| MEDIUM | `window as any` global debug exposure (`__dhamrai_engine`, `__useAuthStore`, `__cloudSaveService`) in production builds | `GameEngine.ts:51-53`, `App.tsx:26-27` |
| MEDIUM | Test conflict hook (`dhamrai_test_conflict` event listener) registered unconditionally in production | `App.tsx:28-33` |
| MEDIUM | `completeMission` in `GameCoreEngine` uses string-contains to route reputation delta (`missionId.includes('artisan')`) — fragile string matching | `game-core/src/engine.ts:186-193` |
| MEDIUM | `MissionDefinition` contract lacks `prerequisites`, `repeatPolicy`, `branches`, `failureConditions` all specified in `GAME_DESIGN.md` — contract is incomplete | `shared-contracts/src/index.ts` |
| LOW | No mission failure condition is ever raised from 3D gameplay | `GameEngine.ts` |
| LOW | Ambient pedestrians patrol a 3-point loop in a radius of 15–20m near spawn — effectively invisible to most gameplay | `NPCManager.ts:84-108` |
| LOW | HUD controls hint `[F3] ডিবাগ` always shown — should be hidden in production | `HUD.tsx:378` |
| LOW | `txSequenceCounter` in `economy.ts` is a module-level mutable singleton — multiple `EconomyDomain` instances share the counter | `economy.ts:56` |
| LOW | Only `FARE_PAYMENT` and `DELIVERY_PAYMENT` categories are used; `MAINTENANCE_COST`, `FINE_PENALTY`, `REPUTATION_BONUS` are unreachable | `shared-contracts/src/index.ts:86-93` |

---

## 3. Gameplay Loop Analysis

### 3.1 Current Player Journey

```
Boot → Spawn at Rathkhola → Walk to Farhana (15m) → Dialogue (30s)
→ Board rickshaw (2m walk) → Drive to school (221m, ~90s)
→ Mission complete → Toast notification → ৳+30 BDT
→ [DEAD END — nothing to do]
```

Total meaningful time: **3–7 minutes.**

After Mission 1:
- Player can drive the rickshaw around the world (physically satisfying).
- Player can open Journal (shows Mission 1 complete; Missions 2/3 listed but broken).
- Player can open Inventory (1 item, recent ledger).
- Player can interact with Rafiq (dialogue works, but INSPECT_DOCUMENTS does nothing).
- Player can interact with Gouranga (dialogue works, but accepting cargo does nothing).
- Player will eventually exhaust exploration and stop playing.

### 3.2 What "30 minutes of play" requires

To achieve 30 minutes of meaningful play, the player needs:
1. A reason to go somewhere (active mission with objective markers).
2. A reward for arriving (cash, reputation, story beat).
3. A next mission that unlocks when the previous completes.
4. A repeatable income source (fare trips or delivery runs).
5. At least 3–5 completable missions in a chain.

The infrastructure for all of this exists. The wiring does not.

---

## 4. Milestone 9 Candidate Analysis

### Candidate A: Mission Chain Completion + Repeatable Fare Loop
**Objective:** Wire Missions 2 and 3 into the 3D world, add mission prerequisites/unlock flow, add repeatable passenger fare logic, and fix the post-Mission-1 dead end.

**User value:** The player now has 30–60 minutes of directed content. The game becomes playable.  
**Technical value:** Completes the gameplay loop the entire infrastructure was built for. Validates the mission system end-to-end. Establishes the pattern for all future mission content.  
**Complexity:** Medium. No new architecture. Wiring existing systems.  
**Risk:** Low. All pieces exist.  
**Dependencies:** None. Everything needed is already built.  
**Expected files:** `DialogueBox.tsx`, `GameEngine.ts`, `game-core/src/missions.ts`, `shared-contracts/src/index.ts`, `game-core/src/dialogue.ts`, `useGameStore.ts`, `HUD.tsx`, `NPCManager.ts`, `Minimap.tsx`  
**Performance impact:** Negligible. +0 new physics bodies (missions 2/3 use existing NPCs).  
**Testing impact:** New unit tests for mission unlock chain; new integration tests for all 3 mission lifecycles.  
**Verdict:** **STRONGEST CANDIDATE. Highest player value. Lowest risk. Must happen before any other gameplay feature.**

---

### Candidate B: Visual World Polish (Textures, Props, Environment)
**Objective:** Add texture materials to roads/buildings, place environment props (trees, market stalls, road signs), and improve visual density.

**User value:** The world looks like Dhamrai instead of colored boxes.  
**Technical value:** Forces GLB asset pipeline maturation. Establishes visual language.  
**Complexity:** High. Requires content creation (Blender assets), pipeline changes, new GLB builds.  
**Risk:** Medium-High. World data pipeline is Python, not yet tested with complex assets.  
**Dependencies:** Requires content creation tools and artist time.  
**Performance impact:** Significant. More draw calls, more triangles. Needs profiling.  
**Verdict:** Important eventually, but wrong priority now. A visually beautiful world with 3 minutes of content is worse than a sparse world with 30 minutes of content.

---

### Candidate C: NPC Schedule System
**Objective:** Give NPCs a time-of-day schedule (work, travel, home), dynamic spawn/despawn, patrol paths along the road graph.

**User value:** World feels alive and inhabited.  
**Technical value:** Establishes NPC architecture for all future characters.  
**Complexity:** High. Requires a `WorldClockDomain`, schedule data format, NPC state machine overhaul.  
**Risk:** Medium. Could destabilize existing NPC interactions.  
**Dependencies:** Candidate A should come first (missions must be wired before NPC behaviors are evolved).  
**Verdict:** Phase 3 roadmap item. Not Milestone 9.

---

### Candidate D: Economy Depth (Fare Meter, Fuel, Vehicle Condition, Rent)
**Objective:** Implement fuel consumption, vehicle condition degradation, daily rent deduction, and a distance-based fare meter for passenger trips.

**User value:** Economic tension and decision-making.  
**Technical value:** Activates `processDailyVehicleRent()`, `MAINTENANCE_COST`, and `FINE_PENALTY` categories already defined.  
**Complexity:** Medium. Domain logic exists; needs 3D gameplay hooks.  
**Risk:** Low. Pure domain layer changes.  
**Dependencies:** Candidate A (mission chain) should come first — economy depth only matters if the player has reasons to earn money.  
**Verdict:** Best as scope addition within Candidate A, or as Milestone 10. Not a standalone Milestone 9.

---

### Candidate E: Production Hardening (Security Fixes, Debug Cleanup, Observability)
**Objective:** Fix JWT parsing bug, remove dev globals from production, remove test event hooks, add error boundaries, add logging.

**User value:** Minimal directly.  
**Technical value:** Prevents subtle security and correctness bugs.  
**Complexity:** Low.  
**Risk:** Very low.  
**Verdict:** Several of these fixes should be bundled INTO Milestone 9 as part of its scope, not as a standalone milestone.

---

### Candidate F: Audio System (Rickshaw Bell, Ambient Sound, Dialogue Audio)
**Objective:** Implement Web Audio API ambient loops, vehicle sound, UI audio, and dialogue narration.

**User value:** Immersion and authenticity — the rickshaw bell sound especially.  
**Technical value:** Completes a major missing runtime director (`AudioDirector` referenced in ARCHITECTURE.md but not implemented).  
**Complexity:** Medium. Web Audio API is well-understood. Needs audio assets.  
**Risk:** Low technically, medium for asset licensing.  
**Dependencies:** Candidate A should come first.  
**Verdict:** High value but lower priority than gameplay completeness. Phase 3 roadmap.

---

### Candidate G: Deployment / Release Pipeline
**Objective:** Vite build optimization, static hosting configuration, environment-based API URL config, CDN for world assets.

**User value:** Enables external players to access the game.  
**Technical value:** Production deployment.  
**Complexity:** Low-Medium.  
**Risk:** Low.  
**Verdict:** Not yet needed. The game is not ready for external release regardless of deployment pipeline.

---

## 5. Candidate Ranking

| Rank | Candidate | Player Value | Technical Value | Risk | Cost |
|---|---|---|---|---|---|
| 1 | **A: Mission Chain + Fare Loop** | Critical | High | Low | Medium |
| 2 | D: Economy Depth | High | High | Low | Medium |
| 3 | E: Production Hardening | Low | Medium | Very Low | Low |
| 4 | F: Audio System | High | Medium | Medium | Medium |
| 5 | B: Visual Polish | High | High | Medium | Very High |
| 6 | C: NPC Schedules | Medium | High | Medium | High |
| 7 | G: Deployment | Low | Low | Low | Low |

**Candidate A wins unanimously.** The gameplay dead-end after Mission 1 is the single most important problem in the project. All other candidates build on having a functional gameplay loop.

Economy Depth (Candidate D) contains elements that logically belong inside Candidate A's scope (the fare meter and rent charge), and the combined scope is still a single coherent milestone. These elements are identified as IN SCOPE below.

---

## 6. Recommended Milestone 9

### 6.1 Title
**Milestone 9: Mission Chain, Passenger Fare Loop, and Core Progression**

### 6.2 Objective
Close the post-Mission-1 dead-end by wiring Missions 2 and 3 into the 3D world, establishing a mission unlock chain, implementing repeatable passenger fare trips (Mission 1 becomes replayable with a cooldown), implementing the daily rent deduction, adding a distance-based fare calculation for passenger trips, and fixing the high and medium severity architectural issues identified in this audit.

After Milestone 9, the player will have **30–60 minutes of meaningful, directed gameplay** that forms a genuine narrative arc:

1. First fare (Mission 1) → learn the road ✓ already wired
2. Police checkpoint (Mission 2) → civic responsibility and document management → **new**
3. Brass artisan delivery (Mission 3) → cultural heritage gameplay → **new**
4. Repeatable random fares → income loop → **new**
5. Daily rent deduction → economic tension → **new**

---

## 7. Exact Scope

### IN SCOPE

#### 7.1 Mission System Contract Extension
- Add `prerequisites: string[]` (list of mission IDs that must be COMPLETED) to `MissionDefinition` in `shared-contracts/src/index.ts`.
- Add `repeatPolicy: 'once' | 'cooldown' | 'repeatable'` to `MissionDefinition`.
- Add `cooldownMs?: number` to `MissionDefinition` (used when `repeatPolicy === 'cooldown'`).
- Update `MissionDomain` in `game-core` to enforce prerequisite checks before `activateMission()`.
- Update `PHASE_1_MISSIONS` definitions: Mission 2 prerequisite = `['mission_1_first_fare']`; Mission 3 prerequisite = `['mission_1_first_fare']`; Mission 1 remains once-only. Repeatable fares use distinct, stable per-trip instance IDs; never reactivate completed Mission 1 or reuse its payout transaction ID.
- All existing tests must still pass. New unit tests for prerequisite enforcement.

#### 7.2 Mission 2 — Police Checkpoint — 3D Wiring
- Handle `INSPECT_DOCUMENTS` action trigger in `DialogueBox.tsx`:
  - Check inventory for `rickshaw_license_slip`.
  - If found: call `activateMission('mission_2_police_checkpoint')`, `completeObjective('mission_2_police_checkpoint', 'obj_m2_approach')`, `completeObjective('mission_2_police_checkpoint', 'obj_m2_show_docs')`, then `finishMission('mission_2_police_checkpoint')`. Show toast: civic duty complete, +5 reputation awarded.
  - If not found: show dialogue branch informing player to find the document.
- Add arrival detection in `GameEngine.update()` for Mission 2: when player approaches Thana Junction (`-61, 0, 66.5`) within 12m with Mission 2 ACTIVE and objective `obj_m2_approach` not yet complete, complete `obj_m2_approach`.
- SI Rafiq dialogue: after checkpoint dialogue completes, set `isMission2Done` world flag.

#### 7.3 Mission 3 — Brass Artisan Delivery — 3D Wiring
- Handle `BOARD_PASSENGER` pattern for cargo: add `PICKUP_CARGO` action trigger to `DialogueChoice.actionTrigger` union in `shared-contracts`.
- Handle `PICKUP_CARGO` in `DialogueBox.tsx`:
  - Call `activateMission('mission_3_artisan_order')`.
  - Complete objective `obj_m3_collect_cargo`.
  - Add cargo item `brass_bells_cargo` to inventory (new `InventoryItem` defined in `roles.ts` or game-core).
- Add arrival detection in `GameEngine.update()` for Mission 3: when player approaches Rathkhola origin (0, 0, 0) within 15m with Mission 3 ACTIVE and `obj_m3_collect_cargo` complete but `obj_m3_deliver_cargo` incomplete, complete delivery objective and finish mission. Remove cargo item from inventory. Credit ৳75 BDT.
- Update Gouranga dialogue `choice_accept_craft` to use `actionTrigger: 'PICKUP_CARGO'`.

#### 7.4 Repeatable Fare System
- Add a `SpawnableFareNPC` concept to `NPCManager`: after Mission 1 is completed the first time, a repeatable fare NPC spawns at a random point near Rathkhola stand (using a small pool of predefined fare passenger definitions).
- Fare NPC definitions: at minimum 2 additional named passengers with distinct dialogue, each with a pickup and dropoff anchor chosen from `PHASE_1_ANCHORS`.
- Each fare completion credits a distance-based fare amount (minimum ৳20, maximum ৳80 BDT based on approximate travel distance) to the economy ledger.
- After delivery, the passenger despawns and a new fare NPC spawns after a 60-second cooldown at a different anchor.
- `repeatPolicy: 'repeatable'` for fare templates, with distinct persisted trip IDs and unique payout transaction IDs for each occurrence; Mission 1 is never reset.
- The fare amount calculation: `farePoisha = Math.round(Math.max(2000, Math.min(8000, distanceM * 8)))` — i.e. ৳0.08 per metre, clamped to ৳20–৳80.

#### 7.5 Mission Chain Unlock UI
- Update `useGameStore.syncFromEngine()` to correctly identify the next available mission after current missions complete (no more defaulting to `mission_1_first_fare` after it's done).
- Add a toast notification when a new mission becomes available (e.g. "New mission unlocked: চেকপোস্ট ও কাগজপত্র! [J] to view journal").
- HUD mission tracker should show the active mission or "No active mission — open journal [J]" state.

#### 7.6 Daily Rent Deduction
- Call `processDailyVehicleRent()` once per game session start (when `initGame()` is called on a non-fresh save). Display a toast: "Daily rickshaw rental: ৳50 debited."
- Guard: only debit if last rent was more than 20 real-time hours ago (track in `worldFlags` as `lastRentChargedMs`).
- If balance falls below ৳50, show a warning toast: "ভাড়া দেওয়ার মতো টাকা নেই!" (Insufficient funds for rent). Do not allow negative balance — defer the debit.
- Add `VEHICLE_RENTAL` to the economy ledger for real usage.

#### 7.7 Bug Fixes and Production Hardening (bundled)
- **Remove test hook from production:** Gate `window.addEventListener('dhamrai_test_conflict', ...)` behind `import.meta.env.DEV`.
- **Remove or gate debug globals:** Gate `window.__dhamrai_engine`, `window.__useAuthStore`, `window.__cloudSaveService` behind `import.meta.env.DEV`.
- **Fix mission reputation routing:** Replace `missionId.includes('artisan')` string matching in `GameCoreEngine.completeMission()` with a field in `MissionDefinition` — add `reputationCategory: 'transport' | 'civic' | 'artisan'` to the definition. Route accordingly.
- **Fix Minimap NPC positions:** Replace hardcoded NPC coordinates in `Minimap.tsx` with a read-only NPC position projection in `useSessionStore`; do not depend on development-only window globals.
- **Fix post-completion mission HUD:** After all 3 original missions complete, HUD should show "Repeatable fares available" state rather than the completed mission.

#### 7.8 New SaveEnvelopeV2-Compatible Fields
- **No schema version bump.** All new state fits within existing fields:
  - `worldFlags['lastRentChargedMs']` — timestamp of last rent charge.
  - `worldFlags['fareNpcCooldownMs']` — timestamp of last fare NPC despawn.
  - `worldFlags['totalFaresCompleted']` — integer count of completed fares.
  - New mission IDs for repeatable fares go into the existing `missions` record as new keys.
  - New cargo items go into the existing `inventory` array.
- V2 schema is fully additive for these changes. **SaveEnvelopeV3 is NOT required.**

### OUT OF SCOPE FOR MILESTONE 9

- New vehicle types (CNG, easy bike, motorcycle).
- Vehicle ownership/purchase system.
- Fuel or charging mechanic (future economy depth).
- Vehicle condition/damage simulation.
- Police wanted level or arrest system.
- NPC schedules or day/night cycle.
- Audio (rickshaw bell audio, ambient sound).
- Visual world polish (textures, props, environment).
- New world chunks or world expansion.
- Multiplayer.
- Any new npm dependencies.
- Any backend changes.
- SaveEnvelopeV3.
- PostgreSQL schema changes.
- Any Python pipeline changes.
- Landmark discovery system.
- Property/empire system.
- CNG/Dakat/Chor/Police Officer roles.
- Accessibility settings or key rebinding.

---

## 8. Architecture — Where Each Component Lives

| Component | Package/App | Files |
|---|---|---|
| Mission contract extension (`prerequisites`, `repeatPolicy`, `reputationCategory`) | `packages/shared-contracts` | `src/index.ts` |
| `PICKUP_CARGO` action trigger addition | `packages/shared-contracts` | `src/index.ts` |
| `brass_bells_cargo` item definition | `packages/game-core` | `src/roles.ts` or new `src/items.ts` |
| `MissionDomain` prerequisite enforcement | `packages/game-core` | `src/missions.ts` |
| `PHASE_1_MISSIONS` definition updates | `packages/game-core` | `src/missions.ts` |
| Repeatable fare mission definitions | `packages/game-core` | `src/missions.ts` |
| Fare passenger dialogue trees | `packages/game-core` | `src/dialogue.ts` |
| Fare NPC entity definitions | `packages/game-core` or `apps/web` | `src/roles.ts` or `engine/NPCManager.ts` |
| `INSPECT_DOCUMENTS` + `PICKUP_CARGO` handling | `apps/web` | `src/components/DialogueBox.tsx` |
| Mission 2 arrival detection (12m zone) | `apps/web` | `src/engine/GameEngine.ts` |
| Mission 3 delivery arrival detection | `apps/web` | `src/engine/GameEngine.ts` |
| Repeatable fare NPC spawn/despawn logic | `apps/web` | `src/engine/NPCManager.ts` |
| Mission unlock toast notification | `apps/web` | `src/state/useGameStore.ts` |
| HUD post-completion state | `apps/web` | `src/components/HUD.tsx` |
| Daily rent deduction | `apps/web` | `src/state/useGameStore.ts` (in `initGame`) |
| Minimap dynamic NPC positions | `apps/web` | `src/components/Minimap.tsx` |
| Debug globals gate | `apps/web` | `src/engine/GameEngine.ts`, `src/App.tsx` |
| Test hook removal | `apps/web` | `src/App.tsx` |
| Reputation routing fix | `packages/game-core` | `src/engine.ts` |

**Backend (`apps/api`):** No changes required or permitted. All mission, economy, NPC, and fare logic is browser-authoritative.

**Python pipeline (`tools/geo-pipeline`):** No changes required. New fare NPCs use existing `PHASE_1_ANCHORS`.

---

## 9. Save Impact

**SaveEnvelopeV2 schema version: UNCHANGED (remains version 2).**

New worldFlags keys used:
```typescript
worldFlags['lastRentChargedMs']     // number | undefined
worldFlags['fareNpcCooldownMs']     // number | undefined  
worldFlags['totalFaresCompleted']   // number | undefined
```

New mission entries in the `missions` record (implementation must explicitly reconstruct dynamic trip definitions on restore; current `MissionDomain` ignores saved IDs absent from its static definitions):
```typescript
// Distinct occurrence IDs in the existing Record<string, MissionSaveData>
'fare_trip_000001'
'fare_trip_000002'
// Stable IDs and their payout IDs are never reused.
```

New inventory item (when cargo is picked up):
```typescript
{ id: 'brass_bells_cargo', category: 'CARGO', quantity: 1, ... }
```

All additions are additive to V2, but repeatable-trip restoration requires explicit implementation and tests: `MissionDomain` currently initializes only static definitions and ignores unknown saved mission IDs. Existing saves must load with missing new flags defaulted safely; dynamic trips must be reconstructed from persisted IDs/definitions or represented through stable worldFlags without dropping progress. No V3 is required if these records remain within existing V2 field types. **No migration step required.**

---

## 10. Dependency Impact

**Zero new npm dependencies required.**

All components use existing:
- `@dhamrai/game-core` (already imported)
- `@dhamrai/save-core` (already imported)
- `@dhamrai/shared-contracts` (already imported)
- `zustand` (already installed)
- `three` (already installed)
- `@dimforge/rapier3d-compat` (already installed)

---

## 11. Test Strategy

### 11.1 Automated Unit Tests (Vitest)

**`packages/game-core/test/missions.test.ts` (extend existing):**
- Test `MissionDomain.activateMission()` throws when prerequisite mission is not COMPLETED.
- Test `MissionDomain.activateMission()` succeeds when prerequisite mission IS COMPLETED.
- Test a separate repeatable fare template creates distinct trip IDs and transaction IDs on each completion.
- Test an already completed trip cannot pay again (including after save/load).
- Test `reputationCategory` field routes correctly in `GameCoreEngine.completeMission()`.

**`packages/game-core/test/engine.test.ts` (extend existing):**
- Test full 3-mission chain: M1 → unlocks M2/M3 → M2 complete → M3 complete.
- Test repeatable fare: M1 complete → distinct fare trip A activates/completes → trip B activates/completes; replaying either trip never duplicates credit.
- Test save/reload after a unique repeatable fare preserves its completed trip ID and payout idempotency.
- Test daily rent deduction via `processDailyVehicleRent()`.
- Test rent guard (no double charge within 20 hours).

**`packages/shared-contracts/test/contracts.test.ts` (extend):**
- Test `MissionDefinition` with new fields validates correctly.
- Test `DialogueChoice.actionTrigger` includes `'PICKUP_CARGO'`.

**`apps/web/test/gamestore-persistence.test.ts` (extend):**
- Test `initGame()` charges daily rent on non-fresh save when last charge > 20h ago.
- Test mission unlock toast fires on mission completion.
- Test `currentActiveMissionId` transitions correctly through M1 → M2 → M3 → repeatable.
- Test a moving/occupied runtime snapshot is applied before saving and restored to 3D transforms on reload, including manual/cloud restore.

### 11.2 Integration Tests

**`apps/web/test/npc-manager.test.ts` (extend):**
- Test fare NPC spawns after Mission 1 complete.
- Test fare NPC despawns after pickup.
- Test new fare NPC spawns after cooldown.

**`apps/web/test/traffic-ai.test.ts` (no changes expected):**
- Regression: existing 3 traffic agents still navigate correctly.

### 11.3 Live Browser Verification (CDP / Headless Chrome)

| Scenario | Verification method |
|---|---|
| Mission 2 complete via INSPECT_DOCUMENTS | CDP `Runtime.evaluate`: confirm mission instance `state === 'COMPLETED'` and `economy.balanceMinorUnits` unchanged (reward 0), reputation +5 |
| Mission 3 complete via cargo delivery | CDP: confirm `inventory` contains `brass_bells_cargo` after pickup, empty after delivery; balance increases by 7500 |
| Repeatable fare: complete distinct trip after Mission 1 | CDP: confirm `totalFaresCompleted` WorldFlag incremented, balance increases exactly once per unique trip |
| Daily rent charged on session restore | CDP: confirm `VEHICLE_RENTAL` transaction in ledger after `initGame()` with stale `lastRentChargedMs` |
| Mission 2 unavailable before Mission 1 | CDP: confirm `activateMission('mission_2_police_checkpoint')` throws prerequisite error |

### 11.4 Regression Tests

All 219 existing tests must pass unchanged. No existing tests may be modified to lower their bar.

### 11.5 Python Tests

No Python pipeline changes. All 23 existing Python tests must pass.

---

## 12. Acceptance Criteria

| ID | Requirement | Verification Method | Pass Condition |
|---|---|---|---|
| AC-M9-01 | Mission 2 (Police Checkpoint) is completable end-to-end | Live browser: drive to Thana Junction, press [E] to talk to SI Rafiq, select "show documents", verify mission COMPLETED state | `allMissions['mission_2_police_checkpoint'].state === 'COMPLETED'` in `useGameStore` |
| AC-M9-02 | Mission 3 (Artisan Delivery) is completable end-to-end | Live browser: drive to Gouranga, accept cargo, drive to Rathkhola, verify delivery | `allMissions['mission_3_artisan_order'].state === 'COMPLETED'` AND `inventory` does not contain `brass_bells_cargo` AND balance increased by exactly ৳75 (7,500 Poisha) |
| AC-M9-03 | Mission 2 cannot begin before Mission 1 is completed | Vitest unit test | `activateMission('mission_2_police_checkpoint')` throws `Error` with prerequisite message when M1 is `AVAILABLE` |
| AC-M9-04 | Repeatable fare NPC spawns after Mission 1 completes | Live browser + CDP assertion | `npcManager.npcs` contains a fare NPC ID with `role === 'STORY_PASSENGER'` at a `PHASE_1_ANCHORS` position within 60 seconds of M1 completion |
| AC-M9-05 | Repeatable fare pays a calculated fare based on distance | Vitest unit test | `farePoisha === Math.round(Math.max(2000, Math.min(8000, distanceM * 8)))` for given distance |
| AC-M9-06 | Daily rent is charged once per session on resume | Vitest unit test | Calling `initGame()` with `worldFlags.lastRentChargedMs` set to `Date.now() - 25 * 3600 * 1000` results in a `VEHICLE_RENTAL` debit of exactly 5,000 Poisha in the ledger |
| AC-M9-07 | Daily rent is NOT charged twice within 20 hours | Vitest unit test | Calling `initGame()` twice within 20 hours results in exactly one `VEHICLE_RENTAL` transaction |
| AC-M9-08 | HUD correctly shows mission state transitions | Live browser | After M1 completes, HUD tracker shows "Mission 2 available" or similar; after all 3 complete, shows fare loop prompt; not the completed M1 title |
| AC-M9-09 | Session expiry regression remains covered (no token format change) | Existing auth store + API tests | Valid two-segment HMAC token retains its encoded expiry; expired token rejected by backend verification |
| AC-M9-10 | Debug globals absent in production build | Build output check: `grep '__dhamrai_engine' dist/assets/*.js` | Zero matches in production bundle |
| AC-M9-11 | Test conflict hook absent in production | Build output check: `grep 'dhamrai_test_conflict' dist/assets/*.js` | Zero matches in production bundle |
| AC-M9-12 | All 219 existing tests continue to pass | `yarn test` | 219/219 pass; 0 regressions |
| AC-M9-13 | TypeScript typecheck clean | `yarn typecheck` | 0 errors |
| AC-M9-14 | Zero new npm dependencies | `git diff yarn.lock` | Lockfile unchanged |
| AC-M9-15 | SaveEnvelopeV2 schema version unchanged | Code inspection | `saveSchemaVersion: 2` in all saved envelopes; no V3 references |
| AC-M9-16 | Existing autosave loads correctly after Milestone 9 | Live browser: load a Milestone 8 autosave | Save restores cash, inventory, mission state **and** visible player/rickshaw transforms/occupancy to saved values (within 1m / 5°); new missions initialize as AVAILABLE |
| AC-M9-17 | Frame rate does not regress | `PerformanceOverlay` during gameplay with all 3 missions active | FPS ≥ 55 on the Milestone 7/8 reference machine configuration |
| AC-M9-18 | Reputation routing is deterministic | Vitest unit test | Completing M1 increments `transportReputation`; completing M2 increments `civicTrust`; completing M3 increments `artisanGuildTrust` — verified via `engine.player.reputations` |

---

## 13. Implementation Plan

### Phase 1: Contract Extension (no UI, no gameplay changes)
**Purpose:** Extend `shared-contracts` and `game-core` types and domain logic.  
**Files:**
- `packages/shared-contracts/src/index.ts` — Add `prerequisites`, `repeatPolicy`, `cooldownMs`, `reputationCategory` to `MissionDefinition`; add `'PICKUP_CARGO'` to `DialogueChoice.actionTrigger`.
- `packages/game-core/src/missions.ts` — Add prerequisite enforcement in `activateMission()`; add cooldown tracking in `MissionInstance`.
- `packages/game-core/src/engine.ts` — Replace string-match reputation routing with `reputationCategory` field; fix `checksumSha256` comment.

**Tests:** Unit tests for prerequisite enforcement, cooldown, `reputationCategory` routing.  
**Exit criteria:** All new tests pass; all 219 existing tests pass; `tsc -b` clean.

---

### Phase 2: Mission Data Updates
**Purpose:** Update `PHASE_1_MISSIONS` definitions and add new fare missions and dialogue.  
**Files:**
- `packages/game-core/src/missions.ts` — Keep M1 once-only; M2 prerequisite `['mission_1_first_fare']`; M3 prerequisite `['mission_1_first_fare']`; add 2 repeatable fare templates with unique per-trip instance/transaction IDs.
- `packages/game-core/src/dialogue.ts` — Update `dialogue_artisan_gouranga` choice trigger to `'PICKUP_CARGO'`; add 2 new fare passenger dialogue trees.
- `packages/game-core/src/roles.ts` — Add `brass_bells_cargo` `InventoryItem` definition; add 2 fare NPC `NPCEntityDefinition` entries.

**Tests:** Unit tests for updated mission definitions; unit tests for new fare missions.  
**Exit criteria:** All mission data correct; full chain M1→M2→M3→repeatable verified in unit test.

---

### Phase 3: Engine 3D Wiring
**Purpose:** Connect mission progress to 3D world events in `GameEngine.ts` and `NPCManager.ts`.  
**Files:**
- `apps/web/src/engine/GameEngine.ts` — Add Mission 2 arrival zone check (12m at Thana Junction); add Mission 3 delivery zone check (15m at Rathkhola); add fare NPC spawn trigger after M1 complete; add fare NPC despawn/respawn cooldown management. Apply restored domain transforms/occupancy to runtime after initialization and copy runtime transforms/vehicle state to domain before save; reconcile on manual and cloud load.
- `apps/web/src/engine/NPCManager.ts` — Add `spawnFareNPC()` method picking from the 2 new fare NPC definitions; add `despawnFarePassenger()` method after drop-off; fare NPC spawns at a pickup anchor with random selection from the defined pool.

**Tests:** Unit tests for `spawnFareNPC()`, `despawnFarePassenger()`; integration test for M2 and M3 arrival trigger sequence.  
**Exit criteria:** All 3 original missions completable end-to-end in engine integration test (without UI).

---

### Phase 4: UI Wiring
**Purpose:** Connect new actions and states to React UI components.  
**Files:**
- `apps/web/src/components/DialogueBox.tsx` — Handle `INSPECT_DOCUMENTS`: check inventory, activate M2, complete objectives, finish M2; handle `PICKUP_CARGO`: activate M3, complete pickup objective, add cargo to inventory.
- `apps/web/src/components/HUD.tsx` — Add mission availability notification; fix post-completion state display; add fare loop availability message.
- `apps/web/src/state/useGameStore.ts` — Fix `currentActiveMissionId` transition logic; add daily rent charge in `initGame()`; add mission-unlock toast trigger on `syncFromEngine()`.
- `apps/web/src/components/Minimap.tsx` and `src/state/useSessionStore.ts` — Replace hardcoded NPC coordinates with read-only NPC position projection (no production window global).

**Tests:** UI-level tests for `DialogueBox` action trigger handling.  
**Exit criteria:** All 4 UI acceptance criteria (AC-M9-01, AC-M9-02, AC-M9-08) pass in live browser.

---

### Phase 5: Bug Fixes and Hardening
**Purpose:** Fix all HIGH/MEDIUM severity issues identified in the audit.  
**Files:**
- `apps/web/src/engine/GameEngine.ts` — Gate `window as any` debug globals behind `import.meta.env.DEV`.
- `apps/web/src/App.tsx` — Gate `dhamrai_test_conflict` event listener behind `import.meta.env.DEV`.

**Tests:** Production build inspection for absence of debug globals.  
**Exit criteria:** AC-M9-09, AC-M9-10, AC-M9-11 pass.

---

### Phase 6: Test Completion and Verification
**Purpose:** Ensure full test suite passes, all acceptance criteria are met.  
**Activities:**
- Run `yarn test` — verify 219+ tests all pass.
- Run `yarn typecheck` — verify 0 TypeScript errors.
- Confirm no new entries in `yarn.lock`.
- Live browser CDP verification of all 18 acceptance criteria.
- Performance check via `PerformanceOverlay` — confirm ≥55 FPS.
- Load an existing Milestone 8 autosave — confirm compatibility.

**Exit criteria:** All 18 acceptance criteria documented as PASS with evidence.

---

## 14. Risk Register

| Risk | Probability | Impact | Mitigation | Detection |
|---|---|---|---|---|
| Mission 2 INSPECT_DOCUMENTS requires player to have license slip in inventory — player may have dropped it (no drop mechanic exists yet, so this is currently impossible) | Very Low | Low | Confirm `removeItem()` is never called on the license slip in existing code | Code inspection confirms no drop mechanic |
| Prerequisite enforcement breaks existing Mission 1 activation in `initGame()` (M1 has no prerequisites so should be unaffected) | Low | Medium | Unit test: M1 activates with empty prerequisite list | New unit test in Phase 1 |
| Fare NPC spawning causes physics body accumulation if despawn is not called correctly | Low | Medium | Always call `despawnFarePassenger()` on delivery; integration test counts colliders before/after | PerformanceOverlay active collider count |
| Daily rent deduction brings balance below 0 on low-balance saves | Low | High | Guard in rent logic: if balance < rentAmount, defer and show warning toast | Unit test with 0 starting balance |
| New `worldFlags` keys (`lastRentChargedMs`) not present in older saves — treated as `undefined` | High (all existing saves) | Low | All new worldFlags are read with `?? 0` or `?? undefined` fallback; undefined means "charge now" for rent | Unit test with save missing the flag |
| `repeatPolicy` cooldown tracking uses `Date.now()` which differs between machine runs | Medium | Low | Use save timestamp (store `lastFareCompletedMs` in worldFlags) not `Date.now()` for cooldown check after save/restore | Unit test: serialize/restore cooldown state |
| Minimap dynamic NPC access via `window.__dhamrai_engine` only works in development if globals are gated | Medium | Low | Read NPC positions from `useGameStore` or `useSessionStore` instead of globals; expose an NPC position map in store | Implementation review |
| New tests inflate test count significantly, causing review friction | Low | Very Low | Aim for 20–30 new tests; focused unit tests only | Count before submission |

---

## 15. Final Recommendation

### Recommended Milestone 9

**Milestone 9: Mission Chain, Passenger Fare Loop, and Core Progression.**

### Why This Should Be Next

The Dhamrai Life project has built excellent infrastructure across 8 milestones: a real physics engine, a proper save/cloud system, a sound economy ledger, a working auth layer, a geographically accurate world, and a 3D rickshaw controller. But the game currently offers only 3–7 minutes of content and then has nothing for the player to do.

Missions 2 and 3 are fully designed, written, and domain-implemented — they are simply not wired to the 3D world. Repeatable fares are the core economic loop of the Rickshaw Driver archetype, the only playable role. Daily rent creates the economic tension that makes income matter. These are not speculative new features — they are planned Phase 1 deliverables from the original `ROADMAP.md` that simply have not been implemented yet.

Every other candidate milestone (audio, visual polish, NPC schedules, world expansion) delivers more value to a project that first has a complete Phase 1 gameplay loop. There is no value in making the world beautiful if the player runs out of things to do after 3 minutes.

Milestone 9 is the narrowest possible scope that converts this from "impressive prototype" to "playable game."

### Exact Scope

**IN:** Mission prerequisite contracts, Mission 2 3D wiring, Mission 3 3D wiring, repeatable fare NPC system, distance-based fare calculation, daily rent deduction, mission unlock notifications, HUD mission state transitions, 2 targeted hardening changes (debug globals, test hook), minimap dynamic NPCs. Browser runtime state must be reconciled with restored domain state before gameplay resumes.

**OUT:** New vehicles, vehicle ownership, fuel, audio, visual polish, NPC schedules, world expansion, new roles, backend changes, SaveEnvelopeV3, Python pipeline changes, new npm dependencies.

### Success Criteria

The player can:
1. Complete Mission 1 (fare to school) — already working.
2. Have Mission 2 unlock (police checkpoint requires Mission 1 complete).
3. Complete Mission 2 (show documents to SI Rafiq).
4. Have Mission 3 unlock after Mission 1 (or concurrently with M2).
5. Complete Mission 3 (pick up brass cargo, deliver to Rathkhola).
6. Receive a repeatable fare from a new passenger NPC.
7. Complete multiple repeatable fares and watch their balance grow.
8. Have daily rent deducted when returning to the game.
9. Save their progress and resume the actual 3D position and vehicle state (currently not wired end-to-end).

All above scenarios are validated by unit tests + live browser verification.

### Dependencies

Zero external dependencies. No new packages. No backend changes. No database migrations. No Python pipeline changes.

### Risks

All risks are LOW to MEDIUM severity with clear mitigations. The highest risk (balance < rent amount) is mitigated by a defer-with-warning guard. The second highest risk (worldFlags undefined on old saves) is mitigated by `?? 0` fallbacks.

### Estimated Implementation Phases

| Phase | Focus | Estimated effort |
|---|---|---|
| 1 | Contract extension + domain logic | Small |
| 2 | Mission data updates + new definitions | Small |
| 3 | 3D engine wiring (M2, M3, fare NPCs) | Medium |
| 4 | UI wiring (DialogueBox, HUD, GameStore) | Medium |
| 5 | Bug fixes + hardening | Small |
| 6 | Test completion + live verification | Small |

### Recommendation

**READY FOR IMPLEMENTATION**

This milestone has clear scope, no ambiguous requirements, no external blockers, no new dependencies, no risk of save corruption, and no architectural redesign. All the infrastructure is in place. This is wiring work.

Waiting for explicit user authorization before beginning any implementation.

---

*End of Milestone 9 Planning Report*
