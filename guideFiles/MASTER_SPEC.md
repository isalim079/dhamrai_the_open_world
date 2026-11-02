# Master Product Specification — Dhamrai Life

## 1. Product summary

Dhamrai Life is a desktop browser 3D open-world life simulator set in a playable recreation of Dhamrai, Bangladesh. The world combines real geographic structure with original game-authored assets, fictional NPCs, jobs, missions, businesses and property. It is not a Google Maps clone and not a legal or cadastral map.

The player starts by selecting one of five role archetypes. Each role has a distinct starting condition and first mission chain, but players may later participate in common systems such as transport, business, exploration, property and community missions.

## 2. Product goals

- Make a recognizable, explorable Dhamrai road network, including main roads, market streets, lanes and alleys.
- Represent everyday Bangladesh transport and street life in an original, respectful, playable way.
- Offer meaningful role-based storylines and repeatable activities.
- Let players develop an economic life: earn money, maintain vehicles, buy fictional plots, build and rent property, operate businesses and grow an empire.
- Provide consequences and branching choices in police, crime, reputation and legal systems.
- Keep the game playable on modest modern desktop hardware through scalable graphics and streaming.
- Preserve progress across browser reloads and application updates, and support cross-device recovery through the player's Google Drive.
- Establish domain boundaries that allow a future server-authoritative multiplayer mode.

## 3. Non-goals for the first release

- Photorealistic graphics or a 1:1 reconstruction of every building interior.
- All of Dhamrai at high artistic detail on day one.
- Mobile gameplay optimization in the first release (responsive account/settings UI is still desirable).
- Multiplayer, voice chat, player trading or shared persistent world in MVP.
- Real-money transactions, crypto, gambling or cash-out economy.
- Real cadastral land purchase, real property valuation or real-world financial services.
- Real police records or real-person crime simulation.
- Google Maps imagery or scraped Google Maps datasets.

## 4. Target experience and quality bar

### 4.1 Visual direction

- Semi-realistic, stylized enough to keep meshes, textures and lighting economical.
- Authentic Bangladesh visual language: local road widths, roadside shops, signboards, boundary walls, tin roofs, concrete buildings, vegetation, rickshaw stands, market clutter and recognizable transport silhouettes.
- Use custom models and appropriately licensed assets. Avoid manufacturer logos unless separately licensed.
- Make the scene readable at low graphics settings; do not hide important mission cues in visual effects.

### 4.2 Browser support

Target current stable desktop versions of Chrome, Edge, Firefox and Safari where WebGL 2 is available. Three.js `WebGLRenderer` requires WebGL 2 in current releases; there is no promise of support for old browsers, unsupported GPUs, disabled hardware acceleration or all virtualized/remote desktop configurations. Show a capability check and actionable fallback message before loading the world.

### 4.3 Performance targets (targets, not guarantees)

| Profile | Resolution target | Frame-rate target | Features |
|---|---:|---:|---|
| Low | 1280×720 render target | Stable 30 FPS target | Low shadows or baked lighting, short view distance, aggressive LOD, low texture resolution |
| Medium | 1920×1080 render target | 60 FPS target | Selective dynamic shadows, medium view distance, standard textures |
| High | 1920×1080 or higher | 60 FPS target | Better shadows, longer view distance, higher texture quality, optional post-processing |

The team must measure on agreed reference machines, including at least one integrated-GPU laptop, before claiming a profile passes. Use adaptive render scale only after measuring GPU bottlenecks. Prefer stable frame pacing over peak FPS.

## 5. Geography and world scope

### 5.1 Main world

The long-term primary region is the full Dhamrai Upazila. A government portal page lists 306.33 km², 1 municipality, 16 unions, 305 mouzas and 408 villages; another page lists 307.4 km². Therefore, do not hard-code an area number as the definitive map boundary. Obtain and inspect a suitable authoritative administrative GIS boundary, compare it with OSM and other sources, record the source/date/CRS, and resolve discrepancies in the map data manifest.

### 5.2 Savar / Jahangirnagar University extension

Jahangirnagar University is in Savar, not Dhamrai. Treat the campus and selected connecting roads as a separate adjacent extension region, not as part of the Dhamrai administrative boundary. The official university profile states it was established on 20 August 1970, formally launched on 12 January 1971, is located in Savar, and lists a land area of 697.56 acres. Verify hall names, buildings, landmarks and current campus access from official university materials before adding them to the world.

### 5.3 Region tiers

- Tier A — High detail: the first playable central Dhamrai town/market slice, curated by the map team after GIS and local-reference review.
- Tier B — Medium detail: key union centres, markets, road junctions, rivers and selected landmarks across the upazila.
- Tier C — Low detail: remaining road network and procedural background buildings/vegetation sufficient for traversal and continuity.
- Extension — selected Savar/JU region after main-world pipeline is proven.

Exact region polygons are phase-0 deliverables, not guessed in code.

## 6. Player roles and story

Required starting roles:

1. Rickshaw driver (`rickshaw_wala`)
2. CNG driver (`cng_wala`)
3. Police officer (`police`)
4. Dakat / robber archetype (`dakat`)
5. Chor / thief archetype (`chor`)

Each role needs:
- Unique start location and starting assets.
- Role-specific intro and first mission chain.
- Initial money, reputation and relationship state defined in data.
- Role-specific dialogue variants and contextual opportunities.
- At least one positive, neutral and risky decision path.
- Progression that does not permanently lock the player out of shared world systems.

Keep role content data-driven. Do not put mission dialogue, rewards and prerequisites inside rendering components.

## 7. Required game systems

### 7.1 Player and cameras

- Third-person default camera and first-person toggle.
- Camera collision to prevent clipping through walls/buildings.
- Context-aware camera controls on foot and while driving.
- Player movement, run/walk, jump only where level design supports it, interaction prompt and animation state.
- Character controller must respect collision, slope and step constraints.

### 7.2 Vehicles

Required types: pedal rickshaw, CNG auto-rickshaw, easy bike, motorcycle, private car and truck.

Each vehicle definition must include model asset, dimensions, mass/handling profile, top speed, acceleration, braking, steering response, passenger/cargo capacity, ownership state, fuel/energy rule, repair cost curve, audio profile and interaction rules. The first release may use an arcade/semi-realistic approximation instead of full simulation of every mechanical detail.

### 7.3 Traffic and pedestrians

- Road graph with lane/direction metadata where available.
- Route-following agents, intersection decisions, speed caps and basic collision avoidance.
- Vehicle mix weighted by district/road type and time of day.
- Spawn/despawn based on active area; deterministic seeds for repeatable testing.
- Never simulate every vehicle in the full region at once.
- Pedestrian simulation can begin as a simple waypoint/sidewalk system and expand later.

### 7.4 NPCs and Bengali dialogue

- NPC archetypes: shopkeeper, passenger, mechanic, vendor, student, local resident, guard, police, business owner and quest giver.
- Dialogue data includes speaker, Bengali line, optional transliteration/English translation, context, response choices, conditions and outcomes.
- Bengali dialogue should be reviewed by fluent speakers for tone, spelling and regional appropriateness.
- Avoid turning a single dialect or community into a stereotype. Make fictional characters varied and individual.
- NPCs can have schedules, simple needs, local destinations and relationship/reputation state.

### 7.5 Police, law, bribery and crime

- Fictional police NPCs and fictional jurisdictions only.
- Traffic stops, documentation checks, fines, warnings, arrest, investigation, jail time, wanted level and escape states.
- Bribery can exist as a fictional branching game mechanic with configurable amounts (for example ৳50, ৳100 and ৳200), character disposition, risk and consequences. It must not be framed as factual guidance about real officers or real procedures.
- Crime missions can include stealth, theft, escape and gang conflict; implement as game abstractions, not real-world instructional simulations.
- Police role can branch toward honest service, corruption investigation or corrupt behavior; consequences affect trust, income, risk and mission availability.
- Include non-violent alternatives and consequences, not only crime rewards.

### 7.6 Economy and progression

- Use BDT/taka as display currency. Store money as safe integers in whole taka unless a future feature requires paisa.
- Maintain cash, bank balance, income, expense, debt if enabled, vehicle ownership, property ownership and business state.
- Every financial change must be an immutable ledger event with unique ID, timestamp/game-time, reason, signed amount, resulting balance and associated mission/business/vehicle/property ID.
- Never update cash without writing the matching ledger event in the same local database transaction.
- Prevent negative balances except where a specific loan/debt rule explicitly allows it.
- Balance missions and prices using data tables, not hard-coded component logic.
- Skills/reputation/level progression should reward multiple play styles, not only high-risk actions.

### 7.7 Property and empire building

- In-game plots are fictional purchasable parcels created from a curated game parcel layer; they do not imply actual ownership of real land.
- Player can inspect eligible plot, price, size class, access, zoning, build restrictions and expected yield.
- Building types: small house, family house, shop, garage/workshop, rental units and selected business premises.
- Construction has cost, build time, materials, upgrade levels and maintenance.
- Businesses can generate income on a simulation tick and require stock/maintenance/staff at later phases.
- Avoid treating OSM building footprints or public map polygons as legal parcel boundaries.

### 7.8 Missions and activities

- Main story, side quests, jobs, deliveries, transport fares, exploration, heritage learning, daily tasks and emergent incidents.
- Mission definitions are declarative data with ID, role gates, prerequisites, start/end triggers, objectives, dialogue, rewards, failure conditions, branching and save keys.
- Missions must be restart-safe and idempotent. Reloading during a mission cannot duplicate rewards.
- Landmark/history missions should use verified sources and clearly separate documented fact from fictional narrative.

### 7.9 Time, weather and ambient world

- Day/night cycle, weather variants, rain/fog and ambience are planned systems.
- Use a simulation clock independent of real wall-clock time and persist the clock state.
- Tune day length during prototype; do not make economy progress depend on the tab staying active or the PC clock changing.
- Background tab throttling must not create huge catch-up simulation spikes. Cap offline progress and compute only the systems designed for offline accrual.

### 7.10 UI and map

- HUD shows current named locality/road/nearby point of interest when data permits, current money, mission marker, vehicle condition and wanted state.
- Minimap shows player marker, nearby roads, mission markers and discovered locations.
- A full-map screen supports zoom, pan, legend and discovered/undiscovered POIs.
- Location labels must come from curated geographic names and aliases, not reverse-geocode every frame.
- Show OSM attribution and applicable data license information in the map/about screen.

## 8. Local and cloud persistence

See `SAVE_SYSTEM.md`. In summary:
- Mandatory Google sign-in establishes the player identity.
- Drive authorization is a separate consent to `drive.appdata`; request it in onboarding when the cloud-save benefit is explained.
- IndexedDB is the immediate local save and supports offline play.
- The cloud save payload belongs in the player's hidden Drive `appDataFolder`.
- The backend stores identity/token/sync metadata only; it does not store the actual game-save payload in its database in the first version.
- App updates must migrate saves, never reset them.
- Provide JSON export/import and clear cloud/local status.

## 9. Multiplayer-ready rules

Multiplayer is a future phase. The initial single-player implementation must still:
- Separate simulation/domain rules from Three.js rendering and React UI.
- Represent player actions as validated commands and resulting state transitions/events.
- Keep unique player/account identifiers independent from email addresses.
- Avoid trusting the client to set money, mission completion, inventory or property ownership in a future online mode.
- Define interfaces that can be run locally now and on an authoritative server later.
- Use a candidate authoritative room/state-sync service such as Colyseus only after a focused technical spike and load test.

## 10. Analytics, privacy and safety

- No third-party behavioural analytics by default in MVP. Add privacy-conscious telemetry only with an explicit product/privacy decision.
- Do not collect precise real-world player location; the game world is fictionalized and location derives from game coordinates.
- Avoid storing unnecessary Google profile fields. Use the stable Google `sub` as account identity; email is display/contact metadata and can change.
- Explain that `appDataFolder` is hidden from Drive UI and can be deleted if the user removes the app's Drive data or manually removes app data.
- Provide disconnect, export and account deletion flows with clear consequences.

## 11. Acceptance gates

A release candidate is not acceptable unless:
- All critical controls work on keyboard and mouse.
- Both camera modes work on foot and in supported vehicles.
- The map has no major disconnected roads caused by chunk seam errors in the validated slice.
- Player cannot pass through blocking building/road colliders in the tested core area.
- Money ledger and mission rewards remain consistent after reload.
- A save written by the prior supported app version survives an app update and migration.
- Google account identity is verified on the backend; no client-trusted email-only identity.
- Drive save can be created, read, updated and restored with the requested appData scope.
- Offline gameplay does not lose a locally committed save when cloud sync fails.
- Conflict detection prevents silent overwrite between two devices.
- At least one integrated-GPU desktop test profile meets the Low target or the team documents measured limitations and adjusts the target transparently.
- License/attribution records exist for every imported geographic or art asset.
