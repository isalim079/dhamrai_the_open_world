# AI Coding Agent Instructions — Dhamrai Life

These instructions apply to Cursor, Claude Code, Gemini, Antigravity, Codex or another coding agent working in this repository.

## 1. Start-of-session procedure

1. Read `README.md`, `MASTER_SPEC.md`, `ARCHITECTURE.md`, `ROADMAP.md` and `PROGRESS.md`.
2. Inspect the actual repository, package manager, scripts, git status, existing tests and current phase.
3. Do not assume the repository matches this plan; report differences before making changes.
4. Identify the single highest-priority task from `PROGRESS.md` and the phase acceptance criteria.
5. Propose a concise execution plan with expected files, tests and risks. For a pre-approved phase task, proceed without asking for redundant confirmation.
6. Do not start a later phase while a dependency phase is incomplete unless the product owner explicitly changes the roadmap.

## 2. Core engineering rules

- TypeScript strict mode. Avoid `any`; if unavoidable, contain and explain it.
- Use small modules with explicit ownership and typed interfaces.
- Keep React UI, Three.js runtime, pure game rules, persistence and backend authorization separate.
- Never put per-frame transforms into React/Zustand UI state.
- Use fixed-step simulation and render interpolation.
- No unbounded loops, uncontrolled NPC spawning or loading all world chunks at startup.
- Use deterministic IDs/seeds for content and tests.
- Treat external data, save files, API requests and mission definitions as untrusted input; validate them at boundaries.
- Use commands/domain rules to change money, inventory, vehicle ownership, mission completion and property. Do not expose direct arbitrary state setters.
- All critical save writes are transactional and idempotent.
- Never clear IndexedDB on deploy, version update, logout or Service Worker cache cleanup.
- Do not store Google refresh tokens, client secrets or raw OAuth credentials in browser storage or logs.
- Never claim cloud sync succeeded until the backend/Drive API confirms it.
- Never use Google Maps content as a data source for map reconstruction.
- Every geographic/art asset must have source/author/licence information.

## 3. Implementation discipline

- Implement the smallest vertical slice that proves a requirement.
- Add tests before or alongside non-trivial domain rules.
- Do not create empty placeholder systems and call them complete.
- Do not silently change schemas, coordinate transforms, chunk IDs, save IDs or account semantics.
- For architecture changes, write an ADR with context, options, decision, consequences and migration path.
- Avoid overengineering multiplayer in MVP; build the command/domain boundary, not a premature MMO backend.
- Pin dependencies and commit the lockfile. Avoid unbounded version ranges in the production build.
- Keep environment variables documented in `.env.example`; never commit real secrets.

## 4. Required task workflow

For every substantial task:
1. State the requirement and acceptance criteria being addressed.
2. Inspect current implementation.
3. Implement only the scoped work.
4. Run relevant typecheck, lint, unit, integration and E2E tests.
5. Test browser rendering and save behaviour where applicable.
6. Update docs and `PROGRESS.md`.
7. Report actual results, including tests not run and known limitations.

## 5. Geographic pipeline rules

- Do not hard-code guessed Dhamrai bounds or assume 306.33 vs 307.4 km² resolves the boundary.
- Inspect the authoritative GIS source metadata, licence and CRS before coordinate conversion.
- Keep raw source files separate from reviewed correction overlays and generated assets.
- Every generated feature should retain source ID/confidence and processing version.
- Check topology, chunk seams, connectivity and landmark routes automatically.
- Use fallback building height/road width only with explicit estimated metadata.
- Never represent an OSM footprint as a legally surveyed plot.

## 6. Game logic rules

- All cash changes must write a ledger event in the same transaction.
- Rewards must be idempotent.
- Mission state must be stable by ID, never title text.
- Crime/police characters are fictional; do not assign wrongdoing to identifiable real people.
- Historical facts require a source entry in `RESEARCH_AND_SOURCES.md` or a dedicated content provenance file.
- Keep dialogue in content files and support Bengali Unicode correctly.

## 7. Save system rules

- Google sign-in is mandatory; Drive authorization is a separate scope/consent.
- Use Google `sub` as immutable provider identity; email is not an account primary key.
- Backend validates ID tokens; do not trust a browser-supplied email.
- Use the backend OAuth authorization-code flow for Drive access and keep refresh tokens encrypted server-side.
- Store the save payload in the player's appDataFolder using `drive.appdata` scope.
- Use IndexedDB as the local source for immediate gameplay durability.
- Never overwrite a cloud save if the base revision has changed; return a conflict.
- Never merge balance, property ownership, inventory or mission branches automatically without a reviewed deterministic strategy.
- Before any save migration, create a backup and verify invariants.
- Provide export/import, disconnect and account deletion semantics.

## 8. Graphics and world performance rules

- Test Low graphics on an integrated-GPU machine, not only a developer workstation.
- Use chunk streaming, LOD, instancing, simplified collision, texture budgeting and entity distance tiers.
- Dispose Three.js geometries, materials, textures, render targets and GPU resources on chunk unload.
- Do not spawn full-physics vehicles or full-AI NPCs outside the active bubble.
- Collect measurements before optimizing; report actual FPS/frame time, draw calls, active chunks and asset sizes.
- Provide feature detection and a graceful unsupported-WebGL2 message.

## 9. Multiplayer readiness rules

- Client sends intents/commands; domain rules decide outcomes.
- Do not trust client money, inventory, rewards, location teleport, property or mission flags in future multiplayer.
- Keep game core free of DOM, Three.js and browser APIs so it can run on Node.
- Treat Colyseus as a candidate to validate in the dedicated multiplayer spike, not a mandatory dependency in MVP.

## 10. Progress reporting format

At the end of each work session, update `PROGRESS.md` and report:

```text
Phase:
Task:
Status:
Files changed:
Tests run:
Test results:
Manual verification:
Known limitations:
Open risks:
Next task:
```

Do not mark `DONE` if tests were not run or acceptance criteria are only partially met. Use `BLOCKED` with a specific blocker when external credentials, geographic data, licence approval or human validation is missing.

## 11. Stop conditions

Stop and report rather than guessing if:
- A source dataset's licence or CRS is unclear.
- An OAuth callback or token flow would require exposing a secret.
- A save migration would discard unknown fields or player progress.
- A map change would move or erase player-owned game property.
- A task depends on a real landmark or historical fact that cannot be verified.
- Performance target cannot be met after measurements and scope needs a product decision.
