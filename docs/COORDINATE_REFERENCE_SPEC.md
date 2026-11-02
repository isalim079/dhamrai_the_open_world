# Dhamrai Life — Coordinate Reference System (CRS) Specification

**Document Version:** 3.0.0  
**Effective Date:** 2 November 2026  
**Status:** Architecture baseline complete; mathematical tests passed; independent Survey of Bangladesh ground-control validation pending; OAuth integration requires credentials; ODbL legal review pending. Phase 1 not started; explicit authorization required.  
**Author:** Lead Technical Architect & Senior Game Development Engineer  

---

## Canonical reconciliation baseline — 2 November 2026

ESRI:102954 is **provisionally adopted**. Mathematical parameter consistency is documented and round-trip tests pass. Independent Survey of Bangladesh ground-control validation remains pending. Architecture baseline complete; OAuth/Drive integration requires credentials; ODbL legal review pending. Phase 1 has not started and requires explicit authorization.

Use `WorldPosition(x,y,z)` in metres: +X east, +Y up relative to the provisional +12.0 m MSL baseline, +Z south (`z = -Δnorthing`). Rathkhola `(90.217400 E, 23.914800 N)` is `(0,0,0)`; use the transformer's full-precision projected origin, not its centimetre-rounded display values.

The Phase 1 projected square is `x,z ∈ [-512,512]`, 1,024 × 1,024 m, with 16 selected chunks (indices -2 through 1 on each axis). The containing WGS84 envelope, rounded **outward** from all four full-precision corners, is **[90.212361, 23.910168, 90.222439, 23.919432]** in lon/lat order. The preserved Sample B XML was queried with **[90.212362, 23.910168, 90.222438, 23.919432]**; its historical query rectangle is slightly narrower than the containing envelope and must not be described as exact projected-square clipping.

Canonical clipped road lengths in the four **historical geographic sample rectangles**: A **16.731 km**, B **9.706 km**, C **6.024 km**, D **28.531 km**. Counts and tag denominators refer to API-returned objects, including external members; only road lengths are geometrically clipped. They do not measure field completeness.

Road graph route fixtures: The route fixtures are undirected topological road graphs derived from OSM snapshot node centerlines. They do not enforce one-way restrictions, vehicle access categories, turn prohibitions, or off-road courtyard/plaza access connectors, nor do they validate legal rickshaw access. Directed edge orientation, modal access hierarchies (`access`, `vehicle`, `motor_vehicle`), and turn restrictions are planned for the Phase 1 runtime navigation graph.

Mission 1: The 552.67 m road graph fixture connects nearest road vertices between Rathkhola Stand and Hardinge High School Gate. It does NOT include the intermediate passenger pickup at Rathkhola Market Corner (+14.997, 0.0, -9.998), which lies in the open fairground plaza off the tagged OSM street network (18.0 m from origin, 46.95 m from nearest street node). The fixture is strictly an origin-to-school road graph fixture; complete passenger journey route validation is formally deferred and Phase 1 acceptance criteria adjusted accordingly. Complete passenger mission navigation is not claimed as route-validated.

Mission 3: workshop `(-295.3,0,-77.0)` to temple `(-346.2,0.5,-110.2)` has ΔX=-50.9 m, ΔZ=-33.2 m and horizontal straight-line distance **60.77 m**. OSM graph distances between nearest road vertices are **42.38 m** workshop→temple, **573.12 m** temple→Rathkhola, **534.16 m** direct delivery, **615.50 m** delivery via temple. These exclude anchor-to-road offsets (workshop **30.35 m**, temple **6.38 m**, Rathkhola **29.46 m**). The direct route misses the nearest temple vertex; the detour visits it. **Courtyard traversal is unknown for both routes**, because no verified courtyard boundary or access connector is available. An actual anchor-to-anchor road/access distance cannot yet be certified.

Chunk arithmetic: A 256 m × 256 m chunk has an area of 0.065536 km². Dividing the reported 306.84 km² area gives **4,682.0068359375 area-equivalent chunk units** (the historical 4,685 was an unvalidated rounded area approximation). A 24 km × 24 km = 576 km² envelope yields **8,789.0625 area-equivalent chunk units**, or a **94 × 94 = 8,836 chunk rectangular grid** (⌈24,000 / 256⌉ = 94 cells covering a 24.064 km square). These are mathematical area and rectangular grid estimates, not actual intersecting grid-cell counts. Actual Upazila polygon intersection counts remain unavailable because the polygon is absent. The canonical active scope for Phase 1 is strictly the verified 16 chunks (4 × 4 grid, 1,024 m × 1,024 m).

Evidence: [execution report](FINAL_PHASE_0_VALIDATION_REPORT.md), [correction/change log](PHASE_0_CORRECTION_REPORT.md), `data/sources/raw_osm_snapshot_manifest.json`, `data/sources/evidence_checksums.json`, `data/world/mission_routes.json`. All nine current Phase 0 documents use this baseline.


## 1. Geodetic Authority & Candidate CRS Adoption

### 1.1 The Official Survey of Bangladesh (SoB) Baseline
The Survey of Bangladesh (SoB), under the National Spatial Data Infrastructure (NSDI) and the national 1:25,000 digital topographic mapping programme, established the **Bangladesh Universal Transverse Mercator 2010 (BUTM 2010)** projection system.

Official SoB / NSDI technical publications define the BUTM 2010 parameters as:
* **Projection Method:** Transverse Mercator (`EPSG:9807`)
* **Reference Ellipsoid / Datum:** WGS 84 (World Geodetic System 1984)
* **Latitude of Natural Origin ($\phi_0$):** $0^\circ 00' 00''\text{ N}$ ($0.0^\circ$, Equator)
* **Central Meridian ($\lambda_0$):** $90^\circ 00' 00''\text{ E}$ ($90.0^\circ$)
* **Scale Factor at Central Meridian ($k_0$):** $0.9996$
* **False Easting ($X_0$):** $500,000.0\text{ m}$
* **False Northing ($Y_0$):** $0.0\text{ m}$
* **Linear Unit:** Metre ($1.0\text{ m}$)

### 1.2 The Software Registry Candidate: `ESRI:102954`
In geodetic software libraries (PROJ, GDAL, pyproj), this identical parameter set is cataloged under the authority identifier **`ESRI:102954`** (`BUTM2010`).

> [!IMPORTANT]
> **Authority Evidence & Provisional Status:**
> 1. `ESRI:102954` is an **ESRI authority code**, NOT an EPSG code. (Initial draft erroneously cited `EPSG:9358`, which designates Saudi Arabia KSA-GRF17 and has been purged).
> 2. Software registry recognition in `pyproj` or `PROJ` does **NOT** by itself prove official Survey of Bangladesh endorsement. The Survey of Bangladesh does not officially maintain the ESRI registry.
> 3. No independent Survey of Bangladesh ground-control coordinates are preserved in this repository; acquisition and validation remain pending.
> 4. Therefore, `ESRI:102954` is **provisionally adopted** as the technical software implementation candidate that mathematically matches the Survey of Bangladesh's declared BUTM 2010 parameters. Full geodetic datum realization certification remains pending formal SoB ground-truth benchmark data acquisition.

### 1.3 Historical Comparison: BUTM 2010 vs. Older BTM (Gulshan 303)
* **Older BTM (EPSG:3106):** Based on the local **Gulshan 303 / Everest 1830 (1937 Adjustment)** ellipsoid, using Central Meridian $90^\circ\text{ E}$, Scale Factor $0.9996$, False Easting $500,000\text{ m}$, and a **False Northing of $-2,000,000\text{ m}$**. Converting between Gulshan 303 and WGS84 requires a 7-parameter Helmert transformation with known local regional distortions of $\pm 2-5\text{ m}$.
* **BUTM 2010 (ESRI:102954):** Designed to natively use the **WGS 84** ellipsoid and a False Northing of **$0\text{ m}$**, eliminating the need for datum shift transformations when ingesting GPS or OpenStreetMap data.

---

## 2. Parameter Comparison Matrix & Canonical WKT2

| Parameter | Official SoB BUTM 2010 Specification | ESRI:102954 WKT Implementation | Concordance |
|---|---|---|---|
| **Projection** | Transverse Mercator | Transverse Mercator (`EPSG:9807`) | **Exact Match** |
| **Ellipsoid** | WGS 84 ($a=6378137.0, 1/f=298.257223563$) | WGS 84 (`EPSG:7030`) | **Exact Match** |
| **Datum** | WGS 84 | WGS 84 Ensemble (`EPSG:6326`) | **Exact Match** |
| **Origin Latitude** | $0.0^\circ\text{ N}$ | $0^\circ 00' 00''\text{ N}$ | **Exact Match** |
| **Central Meridian**| $90.0^\circ\text{ E}$ | $90^\circ 00' 00''\text{ E}$ | **Exact Match** |
| **Scale Factor** | $0.9996$ | $0.9996$ | **Exact Match** |
| **False Easting** | $500,000.0\text{ m}$ | $500,000.0\text{ m}$ | **Exact Match** |
| **False Northing**| $0.0\text{ m}$ | $0.0\text{ m}$ | **Exact Match** |

### Canonical WKT2 Representation
```wkt
PROJCRS["BUTM2010",
    BASEGEOGCRS["WGS 84",
        ENSEMBLE["World Geodetic System 1984 ensemble",
            MEMBER["World Geodetic System 1984 (Transit)"],
            MEMBER["World Geodetic System 1984 (G730)"],
            MEMBER["World Geodetic System 1984 (G873)"],
            MEMBER["World Geodetic System 1984 (G1150)"],
            MEMBER["World Geodetic System 1984 (G1674)"],
            MEMBER["World Geodetic System 1984 (G1762)"],
            MEMBER["World Geodetic System 1984 (G2139)"],
            ELLIPSOID["WGS 84",6378137,298.257223563,
                LENGTHUNIT["metre",1]],
            ENSEMBLEACCURACY[2.0]],
        PRIMEM["Greenwich",0,
            ANGLEUNIT["degree",0.0174532925199433]],
        ID["EPSG",4326]],
    CONVERSION["TM 90 NE",
        METHOD["Transverse Mercator",
            ID["EPSG",9807]],
        PARAMETER["Latitude of natural origin",0,
            ANGLEUNIT["degree",0.0174532925199433],
            ID["EPSG",8801]],
        PARAMETER["Longitude of natural origin",90,
            ANGLEUNIT["degree",0.0174532925199433],
            ID["EPSG",8802]],
        PARAMETER["Scale factor at natural origin",0.9996,
            SCALEUNIT["unity",1],
            ID["EPSG",8805]],
        PARAMETER["False easting",500000,
            LENGTHUNIT["metre",1],
            ID["EPSG",8806]],
        PARAMETER["False northing",0,
            LENGTHUNIT["metre",1],
            ID["EPSG",8807]]],
    CS[Cartesian,2],
        AXIS["(E)",east,
            ORDER[1],
            LENGTHUNIT["metre",1]],
        AXIS["(N)",north,
            ORDER[2],
            LENGTHUNIT["metre",1]],
    USAGE[
        SCOPE["Survey of Bangladesh Topographic & NSDI Applications."],
        AREA["Bangladesh - onshore and offshore."],
        BBOX[18.56,88.01,26.64,92.67]],
    ID["ESRI",102954]]
```

---

## 3. Unresolved Geodetic Uncertainties & Limitations

1. **WGS 84 Realization Epoch Uncertainty:**
   - The WGS 84 ensemble contains multiple realization epochs (Transit, G730, G873, G1150, G1674, G1762, G2139) aligned with successive ITRF frames.
   - For open-world game rendering and relative spatial topology, internal millimeter precision is achieved. However, absolute tectonic drift offset ($\approx 3-5\text{ cm/year}$ northeastward motion of the Indian Plate relative to ITRF2014) is unresolved in raw OSM historical data and is treated as negligible for game physics.
2. **Vertical Datum & Elevation Baseline:**
   - Copernicus GLO-30 uses **EGM2008** heights; SRTM uses **EGM96** heights. These must be reconciled before mixing raster heights, whereas raw GNSS positioning yields ellipsoidal heights relative to the **WGS 84 Ellipsoid**.
   - In central Bangladesh (Dhamrai), the geoid undulation $N$ is approximately **$-45.0\text{ m}$ to $-48.0\text{ m}$** ($H_{\text{orthometric}} = h_{\text{ellipsoid}} - N$).
   - **Provisional Elevation Standard:** The project adopts a **Provisional Ground Baseline of $+12.0\text{ m}$ above Mean Sea Level (MSL)** at Rathkhola. This elevation figure is provisional and subject to adjustment if official Survey of Bangladesh Bench Mark (BM) leveling sheets are acquired.
3. **Independent Ground-Truth Geodetic Validation:**
   - Independent Survey of Bangladesh ground-control coordinate evidence has not been obtained.
   - The test suite therefore evaluates **mathematical consistency and round-trip inversion precision**, not independent geodetic validation against physical ground pillars.

---

## 4. Local Three.js World Coordinate System

### 4.1 Anchored World Origin $(0, 0, 0)$
* **Location:** Dhamrai Rathkhola Stand (Chariot Yard)
* **WGS84 Coordinates:** $90.217400^\circ\text{ E}, 23.914800^\circ\text{ N}$
* **Projected BUTM 2010 Coordinates (`ESRI:102954` / pyproj 3.6.1):**
  * Authoritative Projected Easting ($X_{\text{origin}}$): **`522126.5567081776`** meters (display rounded: $522,126.56\text{ m}$)
  * Authoritative Projected Northing ($Y_{\text{origin}}$): **`2644810.7821246446`** meters (display rounded: $2,644,810.78\text{ m}$)
  * Provisional Vertical Datum ($Y_0$): $+12.0\text{ m}$ MSL (assumed gameplay baseline; no verified raster/benchmark)

### 4.2 Standard Three.js Axis Conventions
To prevent confusion between projected Cartesian coordinates and Three.js camera rendering space, all coordinates must use an explicit 3D `WorldPosition`:

```ts
export interface WorldPosition {
  x: number; // Easting offset in meters (delta East)
  y: number; // Elevation offset in meters (Elevation - 12.0m baseline)
  z: number; // Inverted Northing offset in meters (-delta North, Three.js -Z forward)
}
```

$$\begin{aligned}
X_{\text{game}} &= \text{Easting} - 522126.5567081776\text{ m} \quad &&(+X = \text{East}, -X = \text{West}) \\
Y_{\text{game}} &= \text{Elevation} - 12.0\text{ m} \quad &&(+Y = \text{Up}, -Y = \text{Down}) \\
Z_{\text{game}} &= -(\text{Northing} - 2644810.7821246446\text{ m}) \quad &&(+Z = \text{South}, -Z = \text{North})
\end{aligned}$$

> [!CAUTION]
> **Axis Rule:** Northing offsets in Bangladesh are positive northward. In Three.js, looking North is $-Z$. Therefore, a point **North** of Rathkhola has $Z < 0$, while a point **South** of Rathkhola has $Z > 0$. Never equate Northing with the $Y$ coordinate (which is strictly Elevation).

---

## 5. Automated Mathematical Tests & Mathematical Consistency Results

Automated test suite [tools/geo-pipeline/test_coordinate_transform.py](../tools/geo-pipeline/test_coordinate_transform.py) was executed on 2 November 2026 using `pyproj-3.6.1` and PROJ 9.3+. **All 10 automated unit tests passed.**

The 10 automated tests cover:
1. `test_crs_definition_validity`: BUTM2010 WKT matching `ESRI:102954` parameters.
2. `test_crs_regression_epsg_9358`: Guard asserting EPSG:9358 is KSA-GRF17, not BUTM2010.
3. `test_origin_is_zero`: Origin transforms to exactly $(0.0, 0.0, 0.0)$ in Three.js space.
4. `test_origin_constants_full_precision`: Authoritative projected origin constants match pyproj 3.6.1 projection to floating-point exactness.
5. `test_phase1_mission_coordinates_threejs_axes`: 3D WorldPosition coordinates and Three.js right-handed axis signs for Phase 1 landmarks.
6. `test_round_trip_accuracy`: Sub-millimetre inversion fidelity across 6 regional landmarks.
7. `test_crs_reference_consistency_points`: Mathematical projection consistency across four regional reference coordinates.
8. `test_scale_factor_distortion`: Grid scale distortion is $< 0.05\%$ across the Dhamrai sector.
9. `test_phase1_bounding_envelope_4_corners`: Outward WGS84 envelope strictly contains all 4 projected corners.
10. `test_mission_routes_continuity_and_ordering`: Continuity, sequence ordering, edge topology, and Dijkstra distances for Phase 1 snapshot route fixtures.

### 5.1 CRS Reference Consistency & Mathematical Round-Trip Fidelity
This test verifies mathematical projection consistency against the candidate `ESRI:102954` definition across known regional landmarks. Because no independent Survey of Bangladesh benchmark coordinates are supplied, this confirms mathematical software precision, not independent geodetic certification.

| Reference Point Station | WGS84 (Lon, Lat) | BUTM 2010 Easting | BUTM 2010 Northing | Round-trip Inversion Residual |
|---|---|---|---|---|
| **Tejgaon reference coordinate (not certified CORS)** | $90.394667^\circ\text{ E}, 23.767333^\circ\text{ N}$ | $540,214.06\text{ m}$ | $2,628,523.27\text{ m}$ | $< 10^{-8\circ}$ (display-rounded residual; not absolute ground accuracy) |
| **Jahangirnagar Univ Shahid Minar** | $90.268000^\circ\text{ E}, 23.882500^\circ\text{ N}$ | $527,283.33\text{ m}$ | $2,641,243.59\text{ m}$ | $< 10^{-8\circ}$ (display-rounded residual; not absolute ground accuracy) |
| **National Shahid Minar (Dhaka)** | $90.398056^\circ\text{ E}, 23.727500^\circ\text{ N}$ | $540,571.72\text{ m}$ | $2,624,114.24\text{ m}$ | $< 10^{-8\circ}$ (display-rounded residual; not absolute ground accuracy) |
| **Balia Zamindar Bari (Reference)** | $90.082573^\circ\text{ E}, 24.008351^\circ\text{ N}$ | $508,398.05\text{ m}$ | $2,655,153.57\text{ m}$ | $< 10^{-8\circ}$ (display-rounded residual; not absolute ground accuracy) |

### 5.2 Phase 1 4-Corner Bounding Envelope & Meridian Convergence
Due to Transverse Mercator meridian convergence ($\approx 0.088^\circ$ at $90.22^\circ\text{ E}$), lines of constant projected northing tilt relative to true geographic parallels of latitude.

Transforming all four corners of the projected $1,024\text{ m} \times 1,024\text{ m}$ square yields:
* **Southwest (SW) Corner:** $(X=-512.0, Z=+512.0) \rightarrow 90.2123619^\circ\text{ E}, 23.9101825^\circ\text{ N}$
* **Northwest (NW) Corner:** $(X=-512.0, Z=-512.0) \rightarrow 90.2123770^\circ\text{ E}, 23.9194316^\circ\text{ N}$ (**Defines Maximum Latitude**)
* **Southeast (SE) Corner:** $(X=+512.0, Z=+512.0) \rightarrow 90.2224226^\circ\text{ E}, 23.9101683^\circ\text{ N}$ (**Defines Minimum Latitude**)
* **Northeast (NE) Corner:** $(X=+512.0, Z=-512.0) \rightarrow 90.2224384^\circ\text{ E}, 23.9194174^\circ\text{ N}$

> [!IMPORTANT]
> **Complete Axis-Aligned Geographic Envelope:**
> $$\text{Bbox} = [90.212361^\circ\text{ E}, 23.910168^\circ\text{ N}, 90.222439^\circ\text{ E}, 23.919432^\circ\text{ N}]$$
> Using only the SW and NE corners would have truncated $\approx 1.5\text{ m}$ off the SE corner (latitude minimum) and NW corner (latitude maximum). All 4 corners are mathematically proven to reside strictly within this envelope (`test_phase1_bounding_envelope_4_corners` passed).

### 5.3 Standardized Phase 1 3D World Positions

| Feature / Location | WGS84 (Lon, Lat, Elev) | Three.js WorldPosition $(X, Y, Z)$ | Spatial Quadrant & Direction |
|---|---|---|---|
| **Dhamrai Rathkhola (Origin)** | $90.217400^\circ\text{ E}, 23.914800^\circ\text{ N}, 12.0\text{ m}$ | $(0.0, 0.0, 0.0)$ | World Center Anchor |
| **Hardinge High School** | $90.216685^\circ\text{ E}, 23.916800^\circ\text{ N}, 13.0\text{ m}$ | $(-73.1, +1.0, -221.3)$ | Northwest (West: $73.1\text{m}$, North: $221.3\text{m}$) |
| **Thana Junction (Checkpoint)** | $90.216800^\circ\text{ E}, 23.914200^\circ\text{ N}, 12.0\text{ m}$ | $(-61.0, 0.0, +66.5)$ | Southwest (West: $61.0\text{m}$, South: $66.5\text{m}$) |
| **Dhamrai Police Station** | $90.216275^\circ\text{ E}, 23.914777^\circ\text{ N}, 12.0\text{ m}$ | $(-114.5, 0.0, +2.7)$ | Southwest of origin; 83.3m WNW from checkpoint |
| **Kayetpara Metal Workshop** | $90.214500^\circ\text{ E}, 23.915500^\circ\text{ N}, 12.0\text{ m}$ | $(-295.3, 0.0, -77.0)$ | Northwest (West: $295.3\text{m}$, North: $77.0\text{m}$) |
| **Yashomadhab Mandir** | $90.214000^\circ\text{ E}, 23.915800^\circ\text{ N}, 12.5\text{ m}$ | $(-346.2, +0.5, -110.2)$ | Northwest (50.9m west; 60.77m horizontal distance from workshop) |
| **Dhamrai Pourashava** | $90.216746^\circ\text{ E}, 23.917354^\circ\text{ N}, 13.0\text{ m}$ | $(-67.0, +1.0, -282.7)$ | Northwest (West: $67.0\text{m}$, North: $282.7\text{m}$) |
| **Dhamrai Govt College** | $90.217800^\circ\text{ E}, 23.912856^\circ\text{ N}, 12.0\text{ m}$ | $(+41.0, 0.0, +215.2)$ | Southeast (East: $41.0\text{m}$, South: $215.2\text{m}$) |

---

## 6. Road Graph Semantics & Mission Route Fixtures

### 6.1 Undirected Phase 0 Snapshot Fixtures vs. Future Directed Runtime Graph
The Phase 0 road graph fixtures in [data/world/mission_routes.json](../data/world/mission_routes.json) are **undirected topological route fixtures** extracted from snapshot `sample_b_phase1_slice.xml` highway ways:
* **Current Fixture Scope:** Validates that nearest road vertices are mutually connected through the OSM street network and verifies Dijkstra distance calculations.
* **Non-Enforcement:** Strictly ignores `oneway` restrictions, access tag hierarchies (`access`, `vehicle`, `motor_vehicle`), turn prohibitions, and off-road plaza/courtyard links.
* **No Legal Access Claim:** Does **not** validate or claim certified legal rickshaw access or vehicular traversability on real-world streets.

### 6.2 Planned Phase 1 Directed Runtime Navigation Graph
The future runtime navigation graph (`DirectedNavGraph`) built in Phase 1 Sprint 5 / Sprint 6 will enforce:
* **`oneway` Rules:** Digitize directed edges $(u \rightarrow v)$ for `oneway=yes`, reverse $(v \rightarrow u)$ for `oneway=-1`, and bidirectional edges when absent or `oneway=no`. Support municipal contraflow rules (`oneway:bicycle=no` / `oneway:rickshaw=no`) where width $\ge 4.0\text{ m}$.
* **Access Hierarchy:** Top-level `access` tag falls back to `vehicle` and `motor_vehicle`/`bicycle`. Pedal rickshaws are classified as non-motorized `vehicle` / `cycle_rickshaw`, allowing operation where `motor_vehicle=no` but barring entry where `vehicle=no` (pedestrian footways, stairs, inner sanctums).
* **Missing/Conflicting Tag Defaults:** Peri-urban vehicular highway classes default to `vehicle=yes`; footways and paths default to `vehicle=no`. Conflicting tags default to restricted status for autonomous NPC navigation.
* **Turn Restrictions:** Modeled via OSM Relation `type=restriction` with edge-pair penalty expansion; dynamic angle penalties applied for $> 120^\circ$ sharp turns.

### 6.3 Mission 1 Passenger Route Deferral
The current 552.67 m fixture connects nearest road vertices between Rathkhola Stand and Hardinge High School Gate. The passenger pickup at Rathkhola Market Corner (`+15.0, 0.0, -10.0`) is situated on the open Rathkhola fairground plaza off the tagged road network. Complete passenger journey route validation (Stand $\rightarrow$ Pickup $\rightarrow$ School) is **formally deferred to Phase 1 runtime authoring**, where pedestrian/plaza access connectors will be introduced. Complete passenger journey navigation is not claimed as pre-validated by the Phase 0 baseline.
