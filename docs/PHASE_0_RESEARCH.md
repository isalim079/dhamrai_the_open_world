# Dhamrai Life — Phase 0 Geographic Research & Verification

**Document Version:** 3.0.0  
**Date of Snapshot / Access:** 2 November 2026  
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


## 1. Executive Summary

This research document establishes the empirical geographic baseline, data source audit, and licensing framework for **Dhamrai Life**, a desktop-first browser-based 3D open-world simulation of Dhamrai Upazila, Bangladesh, with a connected Jahangirnagar University / Savar expansion.

In compliance with the project's non-negotiable constraints, **no data, tiles, or satellite traces have been copied or scraped from Google Maps**. All geographic coordinates, bounding extents, administrative hierarchies, and feature densities documented here are derived from previously cited official government records (Survey of Bangladesh, National Spatial Data Infrastructure, Dhamrai Upazila Web Portal, Bangladesh Bureau of Statistics) and open geospatial databases (OpenStreetMap ODbL, Humanitarian Data Exchange COD-AB, Copernicus GLO-30 elevation models).

---

## 2. Geographic Research & Boundary Findings

### 2.1 Administrative Identity & Bounding Coordinates

Dhamrai (ধামরাই) is an Upazila (sub-district, Admin Level 6 in OpenStreetMap hierarchy) located in the north-western sector of Dhaka District within Dhaka Division, Bangladesh.

* **Central Geographic Anchor (World Origin):** Dhamrai Rathkhola Stand ($23^\circ 54' 53.28''\text{ N}, 90^\circ 13' 02.64''\text{ E}$ / $23.914800^\circ\text{ N}, 90.217400^\circ\text{ E}$).
* **OpenStreetMap Relation ID:** `4730829` (`admin_level: "6"`, `boundary: "administrative"`, `wikidata: "Q3345155"`)
* **Extremity Coordinates (WGS84 Bounding Box):**
  * **Southernmost Latitude:** $23.8285181^\circ\text{ N}$ (boundary along the Dhaleshwari / Bangshi river junctions bordering Singair Upazila)
  * **Northernmost Latitude:** $24.0436647^\circ\text{ N}$ (boundary bordering Mirzapur Upazila, Tangail District)
  * **Westernmost Longitude:** $90.0099270^\circ\text{ E}$ (boundary bordering Nagarpur and Saturia Upazilas)
  * **Easternmost Longitude:** $90.2459507^\circ\text{ E}$ (boundary along the main Bangshi River bordering Savar Upazila)
* **Spatial Dimensions of Upazila Bounding Envelope:**
  * **North-South Extent:** $\approx 23.92\text{ km}$
  * **East-West Extent:** $\approx 24.01\text{ km}$
  * **Bounding Box Area:** $\approx 574.34\text{ km}^2$

### 2.2 The Land Area Discrepancy Analysis

The documentation in `WORLD_DATA_SPEC.md` flagged an apparent discrepancy in official Bangladesh portal pages:
* Portal "At a Glance" page (`dhamrai.dhaka.gov.bd/pages/static-pages/6995d1c235ce18e1c07a9d49`) lists **$306.33\text{ km}^2$**.
* Portal "Geographic Profile" page (`dhamrai.dhaka.gov.bd/pages/static-pages/6995d1c235ce18e1c07a9d4a`) lists **$307.41\text{ km}^2$**.
* Bangladesh Bureau of Statistics (BBS) District Statistics (Dhaka) lists **$307.4\text{ km}^2$**.
* Previously reported OSM Relation 4730829 area: **306.84 km² (not reproduced; polygon absent)**.

**Architectural Resolution:**
The actual polygon must define the future world boundary. Neither portal area may substitute for geometry. The previously claimed OSM/HDX reconciliation cannot be reproduced because neither boundary file is preserved. The cause of the portal area discrepancy remains unresolved; riparian change is only a hypothesis. Bounding extremities above are inherited reference figures, not verified against an acquired polygon in this audit.

### 2.3 Topography, Elevation & Fluvial Hydrology

* **Elevation Baseline (Provisional):** Digital Elevation Models (Copernicus GLO-30 / SRTM 30m) indicate regional average elevations of **$12.0\text{ m}$ to $15.0\text{ m}$** above Mean Sea Level (MSL) (Copernicus uses EGM2008; SRTM uses EGM96). No source DEM tiles are preserved to reproduce the local elevation claim. The $+12.0\text{ m}$ baseline at Rathkhola is marked **provisional** pending official leveling data.
* **Geoid vs. Ellipsoid:** In central Bangladesh, geoid undulation $N$ is approximately **$-45.0\text{ m}$ to $-48.0\text{ m}$** relative to the WGS84 ellipsoid. Orthometric heights (MSL) are used for gameplay elevation ($Y$).
* **Fluvial Drainage Network & Critical River Course Clarification:**
  * **Main Bangshi River (বংশী নদী - OSM Way `48492816`):** Flows southward along the **eastern boundary** of Dhamrai Upazila ($\approx 2.5\text{ km}$ east of the town core), separating Dhamrai from Savar Upazila.
  * **Puran Bangshi / Dhamrai Canal Loop (OSM Way `48493150`):** A meandering northern/northwestern loop channel that flows past the immediate north and northwest edge of Dhamrai Pourashava. **Note:** This local tributary channel must not be conflated with the main upazila eastern boundary river.
  * **Dhaleshwari River (ধলেশ্বরী নদী):** Connects in the south, creating active seasonal floodplains.
  * **Gazikhali & Kalmai Rivers:** Secondary seasonal streams and meandering drainage channels that transect the interior unions.

---

## 3. Source Verification & Multi-Dataset Comparison

| Dataset | Source Authority | Format & CRS | Access Date | License / Redistribution Terms | Fit for Game Production |
|---|---|---|---|---|---|
| **OSM Bangladesh PBF** | OpenStreetMap / Geofabrik | `.osm.pbf` (WGS84 EPSG:4326) | 2026-11-02 | ODbL 1.0 (Open Database License) | **Primary** for road topology, building footprints, and local POIs. |
| **HDX COD-AB (Admin 0-4)** | UN OCHA / Humanitarian Data Exchange | Shapefile / GeoJSON (WGS84 EPSG:4326) | 2026-11-02 | Creative Commons Attribution (CC BY-IGO 4.0) | **Primary** for authoritative Upazila and Union administrative boundary reconciliation. |
| **Survey of Bangladesh (SoB) NSDI** | Survey of Bangladesh | BUTM2010 (`ESRI:102954`) / 1:25k topo | 2026-11-02 (Catalog audit) | Restricted Government Copyright (Crown Copyright BD) | **Reference standard only** for official national projection parameters. Raw vectors not redistributed. |
| **Copernicus GLO-30** | ESA Copernicus / Airbus | GeoTIFF (WGS84 / EGM2008) | 2026-11-02 | Copernicus Open Access (Free & Open) | **Primary** for regional macro-elevation base and river basin contours. |
| **SRTM GL1** | NASA USGS | HGT (WGS84) | 2026-11-02 | U.S. Public Domain | **Secondary** elevation cross-check. |
| **Dhamrai Upazila Web Portal** | Government of Bangladesh (A2I) | Web HTML / Tabular | 2026-11-02 | Bangladesh National Web Portal Terms | **Primary** for local naming, historical landmark listings, and official spellings. Imagery excluded. |
| **Jahangirnagar University Portal** | Jahangirnagar University (`juniv.edu.bd`) | Web HTML / Publications | 2026-11-02 | University Copyright; factual reference only; no blanket fair-use permission | **Primary** for non-copyrightable factual data (hall names, dates, acreage). Logos/media excluded. |

---

## 4. Empirical OpenStreetMap Snapshot Audit (with Geometric Line-Clipping)

On 2 November 2026, targeted spatial queries were executed using the reproducible audit tool `tools/geo-pipeline/audit_osm_coverage.py` directly against the official OpenStreetMap API (v0.6) with Shapely 2.0.7 geometric line-clipping. Full machine-readable results are preserved in `data/sources/osm_audit_summary.json` (SHA-256: `90552be5205525563d192823465cb01e39ed841ce9a8884520b6f78edc94c5b7`).

### 4.1 Sample Area A: Dhamrai Pourashava Core (Town Center)
* **Bounding Box:** $90.210000^\circ - 90.225000^\circ\text{ E}, 23.910000^\circ - 23.925000^\circ\text{ N}$ (Area: $\approx 2.45\text{ km}^2$)
* **Verified Empirical Counts:**
  * **Nodes:** 8,568 | **Ways:** 1,763 | **Relations:** 1
  * **Highways:** 88 ways (Strictly Clipped: **$16.731\text{ km}$**; Unclipped: $26.021\text{ km}$)
  * **Building Footprints:** 1,638 polygons
  * **Waterways & Ponds:** 27 features | **POIs / Amenities:** 19 features
* **Attribute Completeness:**
  * Road Width Tag (`width`): **$0.0\%$** (0 out of 88 ways)
  * Road Surface Tag (`surface`): **$10.23\%$** (9 out of 88 ways)
  * Road Name Tag (`name`): **$4.55\%$** (4 out of 88 ways)
  * Building Levels Tag (`building:levels`): **$0.55\%$** (9 out of 1,638 buildings)

### 4.2 Sample Area B: Phase 1 Playable Slice (16 Chunks / 1024m x 1024m)
* **Historical Sample B query rectangle (not the full containing envelope):** $90.212362^\circ - 90.222438^\circ\text{ E}, 23.910168^\circ - 23.919432^\circ\text{ N}$ (approximately 1.05 km²; distinct from the 1.048576 km² projected square)
* **Verified Empirical Counts:**
  * **Nodes:** 3,766 | **Ways:** 752 | **Relations:** 0
  * **Highways:** 59 ways (Strictly Clipped: **$9.706\text{ km}$**; Unclipped: $12.944\text{ km}$)
  * **Building Footprints:** 675 polygons
  * **Waterways:** 12 features | **POIs / Amenities:** 13 features
* **Attribute Completeness:**
  * Road Width Tag: **$0.0\%$**
  * Road Surface Tag: **$10.17\%$**
  * Building Levels Tag: **$1.33\%$** (9 out of 675 buildings)

### 4.3 Sample Area C: Rural Union Sector (Balia / Chauhat)
* **Bounding Box:** $90.150000^\circ - 90.160000^\circ\text{ E}, 23.930000^\circ - 23.940000^\circ\text{ N}$ (Area: $\approx 1.14\text{ km}^2$)
* **Verified Empirical Counts:**
  * **Nodes:** 1,528 | **Ways:** 113
  * **Highways:** 20 ways (Strictly Clipped: **$6.024\text{ km}$**; Unclipped: $35.210\text{ km}$)
  * *Note on Clipping:* The previous unclipped figure ($35.210\text{ km}$) was an artifact caused by summing regional highways (R503) crossing the box across their entire upazila spans. Line-clipping reveals an authentic rural density of $5.28\text{ km/km}^2$.
  * **Building Footprints:** 91 polygons (dispersed homesteads)
  * **Road Width / Surface Tags:** **$0.0\%$**
  * **Building Levels Tags:** **$0.0\%$**

### 4.4 Sample Area D: Jahangirnagar University Campus (Savar)
* **Bounding Box:** $90.260000^\circ - 90.275000^\circ\text{ E}, 23.875000^\circ - 23.890000^\circ\text{ N}$ (Area: $\approx 2.56\text{ km}^2$)
* **Verified Empirical Counts:**
  * **Nodes:** 11,727 | **Ways:** 1,780 | **Relations:** 26
  * **Highways:** 194 ways (Strictly Clipped: **$28.531\text{ km}$**; Unclipped: $41.879\text{ km}$)
  * **Building Footprints:** 1,327 polygons
  * **Named Buildings:** **$111$ buildings ($8.36\%$)** with full titles
  * **Building Levels Tag:** **$90$ buildings ($6.78\%$)** have explicit floor tags (`building:levels: 3`, `4`)
  * **POIs / Amenities:** 394 features

---

## 5. Licensing & Legal Compliance Framework

See [docs/DATA_PROVENANCE_MANIFEST.md](../docs/DATA_PROVENANCE_MANIFEST.md) for full terms. In summary:
1. **OpenStreetMap (ODbL 1.0):**
   - Transformed 3D meshes, collision data, and road navigation graphs constitute the studio's intended **Produced Work** under §4.3 (subject to formal legal review before release).
   - Mandatory attribution: *"Contains information from OpenStreetMap, which is made available here under the Open Database License (ODbL)."*
2. **Proprietary Separation:**
   - Fictional game overlays (plots, quest anchors, character identities, economy data) remain proprietary and are decoupled into `data/content/`. Directory separation is an architectural discipline, but formal legal review is required before distribution.
3. **Strict Google Maps Prohibition:**
   - Under no circumstances will Google Maps or Google Earth data, tiles, or traces be copied or scraped.

---

## 6. Official Coordinate Reference System Adoption

* **Projected CRS Authority:** **`ESRI:102954`** (`BUTM2010`) — **Provisionally Adopted**.
* **Note on Authority Distinction:** `ESRI:102954` is an **ESRI authority code**, NOT an EPSG code. (EPSG:9358 designates Saudi Arabia KSA-GRF17 and is rejected).
* **World Origin Anchor:** Dhamrai Rathkhola Stand ($23.914800^\circ\text{ N}, 90.217400^\circ\text{ E}$, provisional $+12.0\text{ m}$ MSL).
* **Reference Implementation:** Documented in [docs/COORDINATE_REFERENCE_SPEC.md](../docs/COORDINATE_REFERENCE_SPEC.md) and tested via [tools/geo-pipeline/coordinate_transform.py](../tools/geo-pipeline/coordinate_transform.py).
