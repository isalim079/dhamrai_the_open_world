# Dhamrai Life — Technical Architecture Decisions & Risk Analysis

**Document Version:** 3.0.0  
**Status:** Architecture baseline complete; mathematical tests passed; independent Survey of Bangladesh ground-control validation pending; OAuth integration requires credentials; ODbL legal review pending. Phase 1 not started; explicit authorization required.  
**Author:** Lead Technical Architect & Senior Game Development Engineer  

---

## Canonical reconciliation baseline — 2 November 2026

ESRI:102954 is **provisionally adopted**. Mathematical parameter consistency is documented and round-trip tests pass. Independent Survey of Bangladesh ground-control validation remains pending. Architecture baseline complete; OAuth/Drive integration requires credentials; ODbL legal review pending. Phase 1 has not started and requires explicit authorization.

Use `WorldPosition(x,y,z)` in metres: +X east, +Y up relative to the provisional +12.0 m MSL baseline, +Z south (`z = -Δnorthing`). Rathkhola `(90.217400 E, 23.914800 N)` is `(0,0,0)`; use the transformer's full-precision projected origin (`522126.5567081776` Easting, `2644810.7821246446` Northing), not its centimetre-rounded display values (`522126.56`, `2644810.78`).

The Phase 1 projected square is `x,z ∈ [-512,512]`, 1,024 × 1,024 m, with 16 selected chunks (indices -2 through 1 on each axis). The containing WGS84 envelope, rounded **outward** from all four full-precision corners, is **[90.212361, 23.910168, 90.222439, 23.919432]** in lon/lat order. The preserved Sample B XML was queried with **[90.212362, 23.910168, 90.222438, 23.919432]**; its historical query rectangle is slightly narrower than the containing envelope and must not be described as exact projected-square clipping.

Canonical clipped road lengths in the four **historical geographic sample rectangles**: A **16.731 km**, B **9.706 km**, C **6.024 km**, D **28.531 km**. Counts and tag denominators refer to API-returned objects, including external members; only road lengths are geometrically clipped. They do not measure field completeness.

Road graph route fixtures: The route fixtures are undirected topological road graphs derived from OSM snapshot node centerlines. They do not enforce one-way restrictions, vehicle access categories, turn prohibitions, or off-road courtyard/plaza access connectors, nor do they validate legal rickshaw access. Directed edge orientation, modal access hierarchies (`access`, `vehicle`, `motor_vehicle`), and turn restrictions are planned for the Phase 1 runtime navigation graph.

Mission 1: The 552.67 m road graph fixture connects nearest road vertices between Rathkhola Stand and Hardinge High School Gate. It does NOT include the intermediate passenger pickup at Rathkhola Market Corner (+14.997, 0.0, -9.998), which lies in the open fairground plaza off the tagged OSM street network (18.0 m from origin, 46.95 m from nearest street node). The fixture is strictly an origin-to-school road graph fixture; complete passenger journey route validation is formally deferred and Phase 1 acceptance criteria adjusted accordingly. Complete passenger mission navigation is not claimed as route-validated.

Mission 3: workshop `(-295.3,0,-77.0)` to temple `(-346.2,0.5,-110.2)` has ΔX=-50.9 m, ΔZ=-33.2 m and horizontal straight-line distance **60.77 m**. OSM graph distances between nearest road vertices are **42.38 m** workshop→temple, **573.12 m** temple→Rathkhola, **534.16 m** direct delivery, **615.50 m** delivery via temple. These exclude anchor-to-road offsets (workshop **30.35 m**, temple **6.38 m**, Rathkhola **29.46 m**). The direct route misses the nearest temple vertex; the detour visits it. **Courtyard traversal is unknown for both routes**, because no verified courtyard boundary or access connector is available. An actual anchor-to-anchor road/access distance cannot yet be certified.

Chunk arithmetic: A 256 m × 256 m chunk has an area of 0.065536 km². Dividing the reported 306.84 km² area gives **4,682.0068359375 area-equivalent chunk units** (the historical 4,685 was an unvalidated rounded area approximation). A 24 km × 24 km = 576 km² envelope yields **8,789.0625 area-equivalent chunk units**, or a **94 × 94 = 8,836 chunk rectangular grid** (⌈24,000 / 256⌉ = 94 cells covering a 24.064 km square). These are mathematical area and rectangular grid estimates, not actual intersecting grid-cell counts. Actual Upazila polygon intersection counts remain unavailable because the polygon is absent. The canonical active scope for Phase 1 is strictly the verified 16 chunks (4 × 4 grid, 1,024 m × 1,024 m).

Evidence: [execution report](FINAL_PHASE_0_VALIDATION_REPORT.md), [correction/change log](PHASE_0_CORRECTION_REPORT.md), `data/sources/raw_osm_snapshot_manifest.json`, `data/sources/evidence_checksums.json`, `data/world/mission_routes.json`. All nine current Phase 0 documents use this baseline.


## 1. Confirmed Technology Baseline & Rationale

| System Domain | Selected Technology | Alternative Options Considered | Rationale for Selection |
|---|---|---|---|
| **3D Rendering Engine** | **Three.js (r160+)** | Babylon.js, PlayCanvas, custom WebGPU | Huge ecosystem, modular footprint, standard WebGL 2 support, mature `GLTFLoader`, `InstancedMesh`, and rich community shader/post-processing libraries. |
| **Physics Simulation** | **Rapier 3D (WASM)** | Cannon-es, Ammo.js (Bullet), PhysX | Rapier is written in Rust and compiled to WebAssembly with linear memory management and SIMD optimization; it avoids JS garbage collection pauses, provides deterministic fixed-step integration, and natively includes a kinematic character controller and raycast vehicle simulation. |
| **Application UI Shell** | **React 19 + TypeScript + Vite** | Vue, Svelte, Vanilla DOM | Vite provides instant HMR and strict typing; React handles accessible HUD menus, dialogue overlays, inventory, and settings while remaining strictly decoupled from the 3D render loop. |
| **Client Session & UI State** | **Zustand** | Redux, MobX, React Context | Minimal boilerplate, hook-based, outside-React imperative access (`getState() / setState()`), zero overhead. React components re-render only when specific UI subscriptions trigger. |
| **Domain Logic Engine** | **Pure TypeScript Monorepo Package (`@dhamrai/game-core`)** | In-engine JS scripts | Decoupled domain rules (economy, inventory, mission conditions, wanted levels). Zero browser or Three.js dependencies; runs identically in client browser or future Node.js multiplayer server. |
| **Local Client Persistence** | **IndexedDB via Dexie.js** | LocalStorage, raw IndexedDB, SQLite-WASM | LocalStorage is blocking and capped at 5 MB. Dexie provides robust ACID transactions, schema version migrations, and indexed querying required for transaction ledgers and offline play. |
| **Runtime Data Validation** | **Zod** | Joi, Yup, manual guards | TypeScript-first schema declaration with static type inference. Validates untrusted external save payloads, chunk manifests, and API DTOs at boundaries. |
| **Backend & OAuth Gateway** | **Node.js + NestJS + TypeScript** | FastAPI (Python), Go (Gin), Express | TypeScript end-to-end; NestJS offers enterprise-grade dependency injection, guards, interceptors, and robust OAuth/Drive code-exchange pipelines. |
| **Backend Metadata Store** | **PostgreSQL (v15+)** | MongoDB, Redis-only, DynamoDB | Strict relational ACID transactions for user account IDs, Google `sub` hashes, encrypted refresh tokens, and cloud sync lease locks. |
| **3D Asset Compression** | **glTF 2.0 + Meshopt + KTX2** | Draco + WebP, uncompressed GLB | Meshopt offers rapid WASM decompression without frame hitching during chunk streaming; KTX2 Basis Universal decompresses straight to GPU VRAM formats (BC7/ASTC). |
| **Monorepo Package Manager** | **pnpm (v9+)** | npm, yarn, bun | Strict dependency isolation via content-addressable store; prevents phantom dependencies; lightning-fast workspace linking. |

---

## 2. Architectural Decision Records (ADRs)

### ADR-001: Separation of Rendering Loop from Domain State
* **Status:** Architecture baseline complete; mathematical tests passed; independent Survey of Bangladesh ground-control validation pending; OAuth integration requires credentials; ODbL legal review pending. Phase 1 not started; explicit authorization required.  
* **Context:** Mutating UI state or Three.js scene graphs directly inside game logic produces cascading React re-renders and non-deterministic physics.
* **Decision:** The simulation loop executes on a **fixed time-step accumulator** ($60\text{ Hz}$ / $16.66\text{ ms}$). Domain rules process deterministic commands (`GameCommand`) and emit domain events (`DomainEvent`). Three.js renders interpolated transforms between physics ticks. The React HUD subscribes to high-level game state events (money, wanted level, active quest) via Zustand without touching per-frame entity positions.

### ADR-002: Google Drive Hidden `appDataFolder` Cloud Save Protocol
* **Status:** Architecture baseline complete; mathematical tests passed; independent Survey of Bangladesh ground-control validation pending; OAuth integration requires credentials; ODbL legal review pending. Phase 1 not started; explicit authorization required.  
* **Context:** Players expect cloud save recovery across devices, but hosting full save state in a proprietary cloud database incurs recurring infrastructure costs and storage liability.
* **Decision:** The player's private Google Drive hidden `appDataFolder` (`drive.appdata` scope) is the canonical cloud save repository. 
* **Security & Token Flow:** The browser client NEVER receives or stores Google refresh tokens or client secrets. The frontend initiates an authorization-code flow; the NestJS backend exchanges the authorization code server-side, encrypts the refresh token at rest using AES-256-GCM, and interacts with the Google Drive API on behalf of the authenticated session.

### ADR-003: Non-Destructive Save Migrations & Version Independence
* **Status:** Architecture baseline complete; mathematical tests passed; independent Survey of Bangladesh ground-control validation pending; OAuth integration requires credentials; ODbL legal review pending. Phase 1 not started; explicit authorization required.  
* **Context:** Web games often wipe `IndexedDB` when a new app version is deployed, destroying dozens of hours of player progression.
* **Decision:** Four distinct independent version counters are maintained:
  * `appVersion`: Shipped client software release (e.g., `0.1.0`).
  * `saveSchemaVersion`: Binary/JSON structure of save files (e.g., `1`).
  * `worldDataVersion`: Road/chunk geographic data release (e.g., `0.1.0`).
  * `contentVersion`: Mission, dialogue, and economy definitions (e.g., `0.1.0`).
  An application update with an unchanged `saveSchemaVersion` leaves saves untouched. When `saveSchemaVersion` increments, an automated migration transformer runs against a pre-migration backup before committing.

### ADR-004: Provisional Coordinate Reference System Adoption (ESRI:102954 BUTM2010)
* **Status:** Architecture baseline complete; mathematical tests passed; independent Survey of Bangladesh ground-control validation pending; OAuth integration requires credentials; ODbL legal review pending. Phase 1 not started; explicit authorization required.  
* **Context:** WebGL single-precision float coordinates suffer visual jitter if world coordinates are centered millions of meters away from $(0,0,0)$. Furthermore, initial research misattributed the CRS code to EPSG:9358 (Saudi Arabia KSA-GRF17).
* **Decision:** 
  1. Offline preprocessing provisionally adopts **`ESRI:102954`** (`BUTM2010`), matching the Survey of Bangladesh's declared parameters (Transverse Mercator, Central Meridian $90.0^\circ\text{ E}$, Origin Latitude $0.0^\circ\text{ N}$, Scale Factor $0.9996$, False Easting $500,000\text{ m}$, False Northing $0\text{ m}$, WGS 84 datum).
  2. `ESRI:102954` is recognized as an **ESRI authority code**, NOT an official EPSG code.
  3. The local game world anchors $(0, 0, 0)$ at **Dhamrai Rathkhola Stand** ($23.914800^\circ\text{ N}, 90.217400^\circ\text{ E}$, BUTM Easting: `522126.5567081776` m, Northing: `2644810.7821246446` m, provisional $+12.0\text{ m}$ MSL).
  4. Three.js axes map to: $+X = \text{East}$, $+Y = \text{Elevation (Up)}$, $+Z = \text{South}$ ($-Z$ forward / North).

### ADR-005: Road Graph Architecture & Semantics (Phase 0 Fixtures vs Phase 1 Directed Runtime)
* **Status:** Architecture baseline complete; Phase 0 snapshot fixtures verified; Phase 1 directed navigation graph specified.
* **Context:** The Phase 0 mission routes are calculated from an undirected OSM snapshot centerline graph. They evaluate planar connectivity between snapped road vertices, but do not validate legal rickshaw access or vehicular drivability.
* **Decision:**
  1. **Phase 0 Snapshot Fixtures:** Retained strictly as undirected topological route fixtures. They ignore `oneway`, `access`, `vehicle`, `motor_vehicle`, and turn restrictions. Complete passenger journey validation for Mission 1 is formally deferred to Phase 1 plaza access modeling.
  2. **Phase 1 Directed Runtime Navigation Graph (`DirectedNavGraph`):** Implemented in Sprint 5/6 to support player navigation and NPC traffic. Interprets `oneway` (with local non-motorized contraflow support), evaluates access hierarchies (`access` $\rightarrow$ `vehicle` $\rightarrow$ `motor_vehicle`/`bicycle`), defaults peri-urban highway types to `vehicle=yes` and pedestrian footpaths to `vehicle=no`, and enforces `type=restriction` relations alongside dynamic kinematic turn penalties ($> 120^\circ$) for three-wheeled rickshaws.
  3. **No False Legality Claims:** No Phase 0 fixture claims to certify real-world or legal rickshaw traversability.

---

## 3. Hardware Profiles & Browser Compatibility Standards

### 3.1 Performance Profiles & Engineering Budgets

> [!NOTE]
> All parameters below are declared as **Engineering Targets**. They will be empirically measured and benchmarked against physical reference hardware during Phase 1 Sprint 6.

| Target Parameter | Low Profile (Baseline Target) | Medium Profile (Standard Target) | High Profile (Enthusiast Target) |
|---|---|---|---|
| **Hardware Target** | Intel UHD 620/630, Iris Xe, Ryzen 3 Vega | GTX 1050 / GTX 1650, Radeon RX 560 | RTX 3060+, Apple M-series Pro/Max |
| **Internal Render Resolution** | $1280 \times 720$ (Dynamic Scale to 0.8) | $1920 \times 1080$ | $1920 \times 1080$ to $2560 \times 1440$ |
| **Frame Rate Target** | Stable $30\text{ FPS}$ | Stable $60\text{ FPS}$ | Stable $60\text{ FPS}+$ |
| **Max Draw Calls / Frame** | $\le 180$ | $\le 450$ | $\le 800$ |
| **Max Triangles in View** | $\le 120,000$ | $\le 350,000$ | $\le 800,000$ |
| **Texture Memory (VRAM)** | $\le 250\text{ MB}$ (KTX2 compressed) | $\le 600\text{ MB}$ | $\le 1.2\text{ GB}$ |
| **Compressed GLB Size / Chunk**| Target: $\le 1.5\text{ MB}$ (Ceiling: $2.5\text{ MB}$) | Target: $\le 1.5\text{ MB}$ | Target: $\le 1.5\text{ MB}$ |
| **Shadows & Lighting** | Baked vertex lighting, no dynamic shadow | 1 directional cascaded shadow map (Sun) | High-res soft shadows + Screen-space AO |
| **Active Simulation Bubble** | $9$ chunks ($3\times 3$), max 12 NPCs/vehicles | $9$ chunks ($3\times 3$), max 30 NPCs/vehicles | $25$ chunks ($5\times 5$), max 60 NPCs/vehicles |

### 3.2 Browser Support Matrix
* **Supported Desktop Browsers:** Chrome 115+, Edge 115+, Firefox 120+, Safari 17+ on macOS, Windows 10/11, and modern Linux.
* **Compatibility Gate:** WebGL 2 feature detection executes prior to mounting the Three.js canvas. If WebGL 2 is unavailable (or hardware acceleration is disabled), the application displays a diagnostic screen with actionable browser configuration instructions rather than crashing silently.

---

## 4. Technical Risk Register & Mitigation Protocols

```yaml
risk_register:
  - id: RISK-01
    name: "Out of Memory (OOM) Crashes on Integrated GPUs"
    probability: HIGH
    impact: CRITICAL
    mitigation: "Strict 256m chunking with 9-chunk active streaming ring. Automatic disposal of Three.js BufferGeometry, Material textures, and Rapier colliders upon exiting the 5x5 prefetch radius. Asset budget capped at 1.5 MB target (2.5 MB hard ceiling) per chunk."

  - id: RISK-02
    name: "OpenStreetMap Data Gaps in Rural Unions"
    probability: HIGH
    impact: MEDIUM
    mitigation: "Offline pipeline implements deterministic procedural typology fallbacks for building heights and road widths. Central first playable slice is restricted to the verified Dhamrai town core."

  - id: RISK-03
    name: "Google OAuth Rate Limiting or Quota Depletion"
    probability: LOW
    impact: HIGH
    mitigation: "Saves write to local IndexedDB immediately. Cloud sync debounces uploads to 30-second checkpoints and on explicit game events (mission complete, purchase). Exponential backoff with jitter prevents request storming."

  - id: RISK-04
    name: "Save Conflict Between Multiple Devices"
    probability: MEDIUM
    impact: HIGH
    mitigation: "Optimistic concurrency control with parent revision matching and lease locks. If two devices diverge, cloud rejects silent overwrite and prompts the user with an explicit comparison screen (time, money, missions)."

  - id: RISK-05
    name: "Geodetic Datum & Epoch Drift Uncertainty"
    probability: LOW
    impact: HIGH
    mitigation: "Provisional adoption of ESRI:102954 with documented WKT2 parameters and automated pyproj unit tests. Mathematical parameter consistency is documented and round-trip tests pass. Independent Survey of Bangladesh ground-control validation remains pending; no certified control-point coordinates are provided."

  - id: RISK-06
    name: "ODbL Legal Interpretation of Derived 3D Meshes"
    probability: MEDIUM
    impact: HIGH
    mitigation: "Strict technical decoupling of geographic extraction layers (data/sources/) from proprietary game content (data/content/). Formal legal counsel review scheduled prior to public commercial release."
```
