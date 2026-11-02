# Dhamrai Life — Phase 0 Correction Report and Change Log

**Document Version:** 3.0.0  
**Reconciliation date:** 2 November 2026  
**Status:** Architecture baseline complete; mathematical tests passed; independent geodetic validation, OAuth credentials, ODbL legal review and missing boundary/access evidence pending. Phase 1 not started.

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

## Correction and change log

This report describes the current evidence. It withdraws previous claims of legal certification, independent control-point validation, and fully resolved geographic evidence. No Phase 1 implementation was authorized or begun.

| Correction | Current result / affected artifacts |
|---|---|
| Seven versus nine versus ten tests | Coordinate/route suite in `test_coordinate_transform.py` contains **ten** tests (strengthened with full-precision origin constants verification). Three separate synthetic grid tests in `test_chunk_grid.py`. Combined total: **13 automated unit tests**. Actual captured outputs appear in the execution report. |
| Full-precision origin equations | Reconciled `WORLD_PIPELINE_DESIGN.md` equations to use full-precision constants `522126.5567081776` and `2644810.7821246446`. Single authoritative pair in `coordinate_transform.py`; origin maps to `(0,0,0)`. Display-rounded values are not authoritative. |
| Mission 1 pickup axis & route semantics | Corrected generator WGS84 market pickup to `(90.2175475,23.9148901)` agreeing with `(+15,0,-10)` world anchor. Explicitly labeled fixture as origin-to-school road graph route only (552.67m). Adopted Option B: complete passenger journey route validation is formally deferred and Phase 1 acceptance criteria adjusted accordingly. |
| Mission 2 checkpoint | Thana Junction `(-61.0,0,+66.5)`, about 83.3m ESE of station `(-114.5,0,+2.7)`. From WGS84 anchors: 83.28m horizontal; nearest-road-node distance 149.44m, excluding 25.00m station and 14.60m checkpoint snap offsets. Rathkhola→checkpoint graph route is 149.70m. Removed “directly outside” as a current description. |
| Mission 3 geometry | Corrected 42.4m west/straight-line claims: 50.9m west, 33.2m north, **60.7704698m horizontal** from the user-specified 3D coordinates. Elevation difference is excluded. Updated CRS landmark table, plan, research baseline, audit and progress. |
| Mission 3 graph semantics | Retained actual graph distances 42.38 / 573.12 / 534.16 / 615.50m and preserved both detour legs plus mission polylines. These start/end at nearest graph vertices, not exact anchors. Stored source hash, OSM IDs, offsets and routing limitations. |
| Temple courtyard | Replaced `passes_temple` with `passes_temple_road_node`; added nullable `traverses_temple_courtyard`. Direct misses that vertex; detour visits it. Neither route has verified courtyard traversal. Removed asserted ceremonial courtyard entry from factual route descriptions; narrative remains optional design. |
| Graph quality & semantics | Corrected “452 connected intersection vertices” to 452 road vertices; these need not all be intersections or a single component. Graph is undirected and does not enforce access/turn/one-way rules. Replaced claims of "validated traversability" with "snapshot road-graph route fixture". Distinguished Phase 0 fixtures from Phase 1 directed runtime graph (`oneway`, `access`, `vehicle`, `motor_vehicle`, conflict fallbacks, turn restrictions). No field-verified or legal rickshaw access is claimed. |
| Two-corner bbox | SE sets minimum latitude 23.91016825518; NW sets maximum 23.91943158053. Removed obsolete two-corner latitude interval from current specifications. |
| Rounding containment | Corrected nearest-rounded longitude envelope to outward `[90.212361,23.910168,90.222439,23.919432]`. The test now compares full-precision corners with no tolerance that can hide clipping. Historic Sample B query stays recorded separately. |
| Road clipping | **12.944km is unclipped returned-way length**, **9.706km is clipped to historical Sample B query rectangle**. Never equated either with exact projected-square clipping. Other clipped metrics: A16.731/C6.024/D28.531km. |
| Counts and denominators | Current Sample B: 3,766 nodes, 752 ways, 59 highway ways, 675 building ways, 12 water features, 13 POIs; 9/675=1.33% level tags. Replaced 3,750/748/671/1.34% previous-revision values. API object counts are not polygon-clipped counts. |
| Four reference points | Formula-derived landmark references test mathematical consistency only. Removed independent geodetic/control-monument wording and certified-CORS/trig labels. Independent SoB ground-control validation remains pending everywhere. |
| Chunk estimate arithmetic | 306.84 / 0.065536 = 4,682.0068359375 area-equivalent cells (historic 4,685 was an unvalidated rounded area estimate). Bounding envelope of 24km × 24km = 576 km² gives 8,789.0625 area-equivalent cells, or ⌈24,000/256⌉² = 94² = 8,836 cells for a rectangular grid covering 24.064km. Documented original derivation of both estimates and reiterated that polygon intersection counts remain unavailable. |
| Actual polygon absence | No Upazila polygon or HDX comparison file is present. Withdrew reproduced 306.84km²/HDX reconciliation and definitive riparian-discrepancy-cause claims. Added grid script and unavailable JSON with null results; recorded failed acquisition. |
| Grid definition | 256m grid anchored to Rathkhola local `(x,z)=(0,0)`; indices are lower-corner floor coordinates. Closed-cell boundary touches count as intersections. Outside is counted only within the finite candidate rectangle; both candidate and intersecting coverage areas are emitted. Phase 1 selects 16 tiles rather than counting touching neighbours. |
| CRS risk register | RISK-05 now distinguishes provisional adoption, parameter consistency, passing round trips and pending independent SoB validation. No claim that software precision establishes ground accuracy. |
| Elevation metadata | Corrected Copernicus GLO-30 to EGM2008; SRTM is EGM96. +12m remains an assumed gameplay baseline. No DEM raster or benchmark sheet is provided. Source normalization remains pending. |
| Licensing | Removed “legally watertight”, blanket fair-use permission, guaranteed directory-separation immunity and claims that every planned dataset had been acquired/audited. Intended Produced Work classification is subject to ODbL counsel review; no legal approval is asserted. |
| Reproducibility | Supplied pinned Python requirements, strict offline missing-file failure, runtime-derived dependency versions (GEOS actually 3.11.4), manifest/checksum verifier, rerun outputs and deterministic generation comparisons. Hashes establish bytes, not source authenticity. |
| Status and links | All nine Phase 0 documents version 3.0.0; shared canonical baseline; relative evidence links replace machine-specific file URLs. Both progress trackers are identical, with missing evidence and approvals explicit. Historical guide roadmap phase assignments reconciled with the current seven-sprint plan. |

## Evidence delivery inventory

- [Coordinate transformer](../tools/geo-pipeline/coordinate_transform.py) and [ten-test suite](../tools/geo-pipeline/test_coordinate_transform.py).
- [Offline OSM audit](../tools/geo-pipeline/audit_osm_coverage.py), [audit summary](../data/sources/osm_audit_summary.json), [raw OSM manifest](../data/sources/raw_osm_snapshot_manifest.json) and four actual XML snapshots alongside it.
- [Route generator](../tools/geo-pipeline/generate_mission_routes.py) and [route polylines](../data/world/mission_routes.json).
- [Grid counter](../tools/geo-pipeline/audit_chunk_grid.py), [synthetic tests](../tools/geo-pipeline/test_chunk_grid.py), [unavailable actual-polygon result](../data/sources/chunk_grid_audit.json).
- [Checksum verifier](../tools/geo-pipeline/verify_evidence.py), [checksum inventory](../data/sources/evidence_checksums.json), [test execution JSON](../data/sources/test_execution.json), [execution report](FINAL_PHASE_0_VALIDATION_REPORT.md).
- [Root progress](../PROGRESS.md) and [guide progress](../guideFiles/PROGRESS.md).

## Unresolved external dependencies and approvals

1. Acquire the actual licensed Upazila polygon (OSM relation 4730829 full geometry and/or HDX Admin-3 source), preserve its metadata/checksum, review boundary agreement, then rerun grid enumeration. Exact intersection/outside/boundary counts and coverage area remain unavailable.
2. Obtain independent Survey of Bangladesh ground-control coordinates and vertical benchmark evidence; validate the provisional projection against them. The four mathematical references do not satisfy this requirement.
3. Verify temple courtyard boundary, entrances and access connectors for all mission anchors. Actual anchor-to-anchor road/access distances and courtyard traversal remain unresolved; graph distances alone do not prove access.
4. Obtain Google Cloud OAuth client credentials, configured consent/redirects and Drive appDataFolder scope. OAuth/Drive E2E integration remains unimplemented and untested, awaiting authorized Phase 1 work.
5. Obtain ODbL legal review for adapted road graph/database release obligations and rendered asset classification; review actual acquired source licenses before distribution.
6. Acquire DEM tiles and reconcile EGM2008/EGM96 heights with the provisional baseline. Hardware benchmarks remain future Phase 1 tasks.
7. Explicit user authorization is required before Phase 1. Architecture provisional acceptance is not implementation authorization.
