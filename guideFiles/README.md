# Dhamrai Life — Master Project Pack

**Project type:** Desktop-first browser-based 3D open-world life simulator  
**Working title:** Dhamrai Life  
**Specification date:** 2 November 2026  
**Document status:** Product and architecture baseline for implementation planning; not a claim that the game has been built.

## Vision

Build an optimized, semi-realistic 3D open-world Bangladesh life simulator in the browser. The first major world is Dhamrai Upazila, Dhaka, with a separately scoped connected Savar/Jahangirnagar University region. Players choose a starting role, explore roads and alleys, use locally familiar vehicles, speak with Bengali-speaking NPCs, complete missions, work, earn and spend Bangladeshi taka, acquire fictional in-game land and property, build businesses, and experience consequences from police and other world systems.

The game is desktop-first and uses Three.js. Both first-person and third-person camera modes are required. Graphics must scale down for integrated GPUs and modest desktop computers. The first release is single-player and offline-tolerant, but the core gameplay rules and account model must not block a future authoritative multiplayer server.

## Fixed decisions from the product owner

| Area | Decision |
|---|---|
| Visual style | Optimized semi-realistic graphics; performance before photorealism |
| Camera | First-person and third-person; player can switch at runtime |
| Platform | Modern desktop browsers; WebGL 2 required by the selected Three.js renderer |
| World | Whole Dhamrai Upazila as the long-term main region; selected Savar/JU extension region |
| Starting roles | Rickshaw driver, CNG driver, police, dakat, chor |
| Vehicles | Pedal rickshaw, CNG, easy bike, motorcycle, private car, truck; extensible registry |
| Multiplayer | Not in MVP; architecture must support a later server-authoritative multiplayer mode |
| Authentication | Google sign-in mandatory before starting a new game or loading a profile |
| Cloud save | Each player's Google Drive hidden `appDataFolder`; request `drive.appdata` scope |
| Local save | IndexedDB is the immediate gameplay save and offline cache |
| Backup | Cloud sync plus downloadable JSON export/import; never depend on only one copy |
| Save safety | Application updates must not reset or silently delete player saves |
| Language | Bengali-first in-world dialogue; UI can be localized later |
| Economy | BDT/taka, integer values, append-only transaction history |

## Non-negotiable product constraints

1. Never use Google Maps tiles, imagery, extracted content, or scraped Google Maps data as the source for a copied game map. Use appropriately licensed geographic data and original assets.
2. Treat OpenStreetMap as one important source, not as proof that every road, alley, building, width, surface, or landmark is mapped accurately.
3. Do not ship an entire high-detail 306 km² world in one scene. Stream small world chunks around the player.
4. Keep save data independent from the app build, asset cache and Service Worker cache versions.
5. Never clear IndexedDB as part of a normal app update, logout or cache cleanup.
6. Never store Google OAuth client secrets or long-lived refresh tokens in browser JavaScript.
7. Do not put game-save content in the server database in the initial cloud-save design. Google Drive is the canonical cloud save store; the server stores only account/token/sync metadata needed to access it securely.
8. Do not claim that “any browser” means every legacy browser or every GPU. Target current desktop browsers with WebGL 2 and show a compatibility explanation when unsupported.
9. Use fictional NPC identities and fictionalized organizations for crime/corruption storylines. Do not attribute fictional misconduct to identifiable real officers or private individuals.
10. In-game land/property is fictional game property, not a representation of real cadastral ownership or legal title.

## Documents in this pack

- [`MASTER_SPEC.md`](MASTER_SPEC.md) — product goals, scope, functional requirements and acceptance gates.
- [`ARCHITECTURE.md`](ARCHITECTURE.md) — technology choices, runtime boundaries, proposed repository and multiplayer-ready structure.
- [`GAME_DESIGN.md`](GAME_DESIGN.md) — player roles, world loop, economy, vehicles, NPCs, police, crime, missions and controls.
- [`WORLD_DATA_SPEC.md`](WORLD_DATA_SPEC.md) — Dhamrai geography, map licensing, GIS pipeline, chunks, landmarks and content verification.
- [`SAVE_SYSTEM.md`](SAVE_SYSTEM.md) — mandatory Google login, Drive appDataFolder, local saves, sync, migrations, backup and conflict handling.
- [`ROADMAP.md`](ROADMAP.md) — phased development plan, deliverables, dependencies and definition of done.
- [`AGENT_INSTRUCTIONS.md`](AGENT_INSTRUCTIONS.md) — rules for Cursor, Claude Code, Gemini, Antigravity or another coding agent.
- [`PROGRESS.md`](PROGRESS.md) — durable task board and progress log template.
- [`RESEARCH_AND_SOURCES.md`](RESEARCH_AND_SOURCES.md) — research notes and source links checked on 2 November 2026.

## Recommended first playable milestone

Do not begin by modelling the entire upazila. Build a vertical slice in a verified central Dhamrai area: one small connected road network, one character (rickshaw driver), one vehicle, a few NPCs, basic traffic, one police interaction, three missions, a minimap, first-/third-person camera switching, Google login, local save and Google Drive cloud save. Prove performance and save recovery before expanding.

## How to hand this to an AI coding agent

1. Give the agent the entire folder, not just this README.
2. Ask it to read `AGENT_INSTRUCTIONS.md`, `MASTER_SPEC.md`, and `ROADMAP.md` first.
3. Require a repository audit and a proposed implementation plan before code changes.
4. Have it implement one roadmap phase at a time and update `PROGRESS.md` in every substantial work session.
5. Do not accept “done” without tests, manual verification notes, and the phase acceptance criteria.

## Current status

This is a researched plan and implementation specification. The actual OSM coverage for each Dhamrai road, the authoritative boundary polygon, local road widths, building completeness, and the exact first playable bounding box still require a GIS audit. No production game assets or code are included in this pack.
