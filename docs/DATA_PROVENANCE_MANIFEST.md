# Dhamrai Life — Data Provenance & Source Licensing Manifest

**Document Version:** 3.0.0  
**Effective Date:** 2 November 2026  
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


## 1. Principles of Data Provenance & Legal Separation

### 1.1 Confirmed Source Licensing Terms
The four preserved raw OSM XML files are the reproducible inputs actually used in this audit. Other datasets below are planned sources or inherited research references; their actual files, metadata and reuse terms still require acquisition/review. The game pipeline must strictly honor all attribution clauses, share-alike boundaries, and commercial redistribution restrictions.

### 1.2 Intended Licensing Treatment vs. Legal Interpretation
The studio has established an architectural separation between geographic data ingestion and proprietary game content:
* **`data/sources/`:** Ingested, unmodified open geospatial data extracts (ODbL 1.0, CC BY-IGO 4.0).
* **`data/world/`:** Offline-processed 3D rendering meshes (`.glb`), road navigation graphs, and spatial chunk manifests.
* **`data/content/`:** Proprietary fictional quest storylines, character dialogue, NPC identity definitions, and fictional in-game economic rules.

> [!WARNING]
> **Legal Interpretation Disclosure:**
> 1. The classification of compiled 3D world chunk meshes (`.glb`) and collision hulls as an **ODbL §4.3 Produced Work** represents the **Studio's Intended Licensing Position**. 
> 2. While technical file/directory separation is an established engineering best practice to prevent data contamination, **directory separation does not by itself guarantee legal immunity or automatic exemption from ODbL Share-Alike provisions under international intellectual property law**.
> 3. Formal legal counsel specializing in open-source database law must review the final compilation and distribution package prior to commercial release. If the adapted road graph is legally deemed a Derivative Database, the extracted road network must be made available under ODbL 1.0 without compromising proprietary game story files.

### 1.3 Strict Prohibition on Proprietary Scraping
Under no circumstances shall Google Maps, Google Earth, Apple Maps, or commercial navigation APIs be scraped, vectorized, or traced for road alignment, building massing, or satellite textures.

---

## 2. Source-by-Source Licensing Register

### 2.1 OpenStreetMap (OSM) / Geofabrik Bangladesh Extract
* **Source Entity:** OpenStreetMap contributors / Geofabrik GmbH
* **Dataset Identifier:** `bangladesh-latest.osm.pbf`
* **Download URL:** <https://download.geofabrik.de/asia/bangladesh.html>
* **Previously recorded access date (not independently reproduced):** 2026-11-02
* **Previously quoted file size:** approximately 339 MB; no PBF is supplied or checksum-verified.
* **Recorded source licensing (release review pending):** **Open Database License (ODbL) v1.0** (<https://opendatacommons.org/licenses/odbl/1.0/>)
* **Intended Treatment:**
  * Raw and intermediate extracted geometries (roads, building polygons) remain under ODbL 1.0.
  * Rendered 3D GLB assets are intended to be treated as Produced Works; classification and any adapted-database release obligations require counsel review.
* **Known Limitations:**
  * Empirical audit of Dhamrai town core reveals **$0.0\%$ road width tags** and **$0.55\%$ building level tags**. Procedural fallbacks are required.
* **Mandatory Attribution Requirement:**
  * Must be prominently displayed on game credits, loading screens, and in-game map/about views:
  > *"Contains information from OpenStreetMap, which is made available here under the Open Database License (ODbL)."*
  * Hyperlink to `<http://www.openstreetmap.org/copyright>`.

### 2.2 UN OCHA / Humanitarian Data Exchange (HDX) Bangladesh Admin Boundaries
* **Source Entity:** United Nations Office for the Coordination of Humanitarian Affairs (UN OCHA) / Bangladesh Bureau of Statistics (BBS)
* **Dataset Identifier:** `Bangladesh - Subnational Administrative Boundaries (COD-AB)`
* **Download URL:** <https://data.humdata.org/dataset/cod-ab-bgd>
* **Previously recorded access date (not independently reproduced):** 2026-11-02
* **Format:** ESRI Shapefile / GeoJSON (`bgd_admbnda_adm3_bbs_*.shp`)
* **Recorded source licensing (release review pending):** **Creative Commons Attribution for Intergovernmental Organizations (CC BY-IGO 4.0)**
* **Intended Treatment:** Used solely for validating administrative multipolygon borders (Upazila Level 3 and Union Level 4).
* **Known Limitations:** Cartographic generalization scale $\approx 1:50,000$.
* **Mandatory Attribution Requirement:**
  > *"Administrative boundary polygons provided by UN OCHA / Bangladesh Bureau of Statistics via Humanitarian Data Exchange under CC BY-IGO 4.0."*

### 2.3 Survey of Bangladesh (SoB) / National Spatial Data Infrastructure (NSDI)
* **Source Entity:** Survey of Bangladesh (Ministry of Defence, Government of Bangladesh)
* **Dataset Identifier:** Upazila Map GIS Database & 1:25,000 Topographic Spatial Database
* **Portal URL:** <https://new.nsdi.gov.bd/datacatalog/>
* **Previously recorded access date (not independently reproduced):** 2026-11-02 (Catalog audit and technical parameter inspection)
* **Recorded source licensing (release review pending):** **Restricted Government Copyright (Crown Copyright Bangladesh)**
* **Usage Policy in Project:** **Reference standard ONLY**. We utilize the published mathematical parameters of BUTM 2010 ($0^\circ\text{ N}, 90^\circ\text{ E}, 0.9996, 500000\text{m}, 0\text{m}$, WGS84). **No proprietary vector shapefiles or digital map sheets from the Survey of Bangladesh are distributed in this codebase.**

### 2.4 ESA Copernicus GLO-30 Digital Elevation Model
* **Source Entity:** European Space Agency (ESA) / Airbus Defence and Space
* **Dataset Identifier:** `Copernicus_DSM_COG_10_N23_00_E090_00_DEM` / `N24_00_E090_00`
* **Download URL:** <https://spacedata.copernicus.eu/collections/copernicus-digital-elevation-model>
* **Previously recorded access date (not independently reproduced):** 2026-11-02
* **Format:** Cloud Optimized GeoTIFF (COG), $30\text{ m}$ horizontal sampling, EGM2008 vertical datum.
* **Recorded source licensing (release review pending):** **Copernicus Open Access Policy (Free, Full, and Open)**
* **Known Limitations:** $30\text{ m}$ horizontal posting cannot resolve micro-topography (road embankments, ditches). Vertical error is $\approx \pm 2-4\text{ m}$.
* **Mandatory Attribution Requirement:**
  > *"Produced using Copernicus WorldDEM-30 data © DLR e.V. 2010-2014 and © Airbus Defence and Space GmbH 2014-2018 provided under Copernicus Open Access."*

### 2.5 NASA / USGS Shuttle Radar Topography Mission (SRTM GL1)
* **Source Entity:** NASA / USGS (Earth Resources Observation and Science Center)
* **Dataset Identifier:** `SRTM1N23E090.hgt`, `SRTM1N24E090.hgt`
* **Download URL:** <https://earthexplorer.usgs.gov/>
* **Previously recorded access date (not independently reproduced):** 2026-11-02
* **Recorded source licensing (release review pending):** **U.S. Public Domain (U.S. Government Work)**
* **Usage Policy in Project:** Secondary macro-elevation sanity check.

### 2.6 Official Government of Bangladesh Web Portals (a2i / Cabinet Division)
* **Source Entity:** Dhamrai Upazila Administration / Ministry of Cultural Affairs / Heritage Hub
* **URLs:** 
  * <https://dhamrai.dhaka.gov.bd/>
  * <https://heritagehub.gov.bd/HeritageInfoes/Details/3208>
* **Recorded source licensing (release review pending):** **Bangladesh National Web Portal Terms of Use**
* **Usage Policy in Project:** Factual historical reference only (historical names, dates, artisan lost-wax casting technique descriptions).
* **Restrictions:** Photographs, government emblems, and seals on the portal are copyrighted and are strictly excluded from game textures.

### 2.7 Jahangirnagar University Factual Reference vs. Copyrighted Media
* **Source Entity:** Jahangirnagar University, Savar, Dhaka
* **URL:** <https://juniv.edu.bd/custom/slug/about-ju>
* **Previously recorded access date (not independently reproduced):** 2026-11-02
* **Recorded source licensing (release review pending):** **University Copyright (All Rights Reserved)**
* **Usage Policy in Project:** **Non-copyrightable factual data ONLY** (founding date: 20 August 1970, formal launch: 12 January 1971, land area: $697.56\text{ acres}$, official names of student residential halls and academic departments).
* **Restrictions & Legal Clarification:** Educational fair use does NOT grant blanket permission to reuse university publications, promotional photography, architectural blueprints, or institutional emblems. All official university logos, crests, and copyrighted graphic media are **strictly excluded**. In-game 3D university models must be original geometric interpretations based on open geospatial footprints.

## Preserved versus planned source evidence

The actual audit source is the OSM API v0.6 XML snapshots, **not** an acquired Geofabrik PBF. [Raw snapshot manifest](../data/sources/raw_osm_snapshot_manifest.json) records query URLs, XML bounds, timestamps, sizes and SHA-256 values. Acquisition time is inherited from the previous report and not independently attested by a download receipt. Hashes establish byte integrity, not authenticity or real-world completeness.

No HDX boundary, SoB control sheet, Geofabrik PBF, or DEM raster is provided. Prior assertions that HDX/OSM boundaries were independently reconciled are withdrawn pending those files. OSM-derived route fixtures retain ODbL attribution and source identifiers. Directory separation supplies no legal clearance. See the [ODbL definitions and obligations](https://opendatacommons.org/licenses/odbl/1-0/); ODbL counsel review remains pending.

Copernicus GLO-30 is a surface model (includes structures and vegetation), has EGM2008 vertical reference, and has product-specific licensing/attribution terms; it must not be described as bare-earth terrain or EGM96. Verify the acquired tile and terms against the [official Copernicus product specification](https://dataspace.copernicus.eu/explore-data/data-collections/copernicus-contributing-missions/collections-description/COP-DEM). A provisional +12m gameplay baseline is not a surveyed vertical datum.
