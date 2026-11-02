# Dhamrai Life — Geographic Data Audit and Evidence Scope

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

## Reproduced snapshot metrics

Only road lengths below are clipped to each preserved **geographic query rectangle**. Counts, tags and POIs describe returned OSM API objects, including external way members. They are not exact counts inside the projected 1,024m square and are not ground-truth completeness.

| Sample | Query bbox (min lon, min lat, max lon, max lat) | Nodes / ways / relations | Highway ways | Buildings | Water / POIs | Unclipped km | Clipped km |
|---|---|---|---|---|---|---|---|
| sample_a_pourashava_core | [90.21, 23.91, 90.225, 23.925] | 8568 / 1763 / 1 | 88 | 1638 | 27 / 19 | 26.021 | 16.731 |
| sample_b_phase1_slice | [90.212362, 23.910168, 90.222438, 23.919432] | 3766 / 752 / 0 | 59 | 675 | 12 / 13 | 12.944 | 9.706 |
| sample_c_rural_union | [90.15, 23.93, 90.16, 23.94] | 1528 / 113 / 0 | 20 | 91 | 1 / 0 | 35.210 | 6.024 |
| sample_d_jahangirnagar_univ | [90.26, 23.875, 90.275, 23.89] | 11727 / 1780 / 26 | 194 | 1327 | 41 / 394 | 41.879 | 28.531 |

| Sample | Name-tagged road ways | Surface-tagged | Width-tagged | Buildings with levels | Named buildings |
|---|---|---|---|---|---|
| sample_a_pourashava_core | 4 (4.55%) | 9 (10.23%) | 0 (0.0%) | 9 (0.55%) | 9 (0.55%) |
| sample_b_phase1_slice | 3 (5.08%) | 6 (10.17%) | 0 (0.0%) | 9 (1.33%) | 9 (1.33%) |
| sample_c_rural_union | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) |
| sample_d_jahangirnagar_univ | 58 (29.9%) | 35 (18.04%) | 11 (5.67%) | 90 (6.78%) | 111 (8.36%) |

The old rural 35.210km anomaly counted entire crossing ways. WGS84 line/rectangle intersection followed by projected-segment length gives 6.024km. Phase 1's old 12.944km is likewise **unclipped**, while 9.706km is clipped to the historical rectangle. Boundary rounding does not change these preserved-query metrics into projected-square metrics. Buildings are counted as tagged ways, not validated building polygons; incomplete way references must not be interpreted as surveyed geometry.

## Snapshot provenance and integrity

Actual preserved snapshots are [listed in the raw manifest](../data/sources/raw_osm_snapshot_manifest.json), with query URLs, XML bounds, OSM response metadata, byte sizes and SHA-256 values. [Evidence inventory](../data/sources/evidence_checksums.json) includes the summary, scripts, route JSON, progress and test evidence. [Verifier](../tools/geo-pipeline/verify_evidence.py) compares the raw bytes against the previously recorded hashes and the summary references. Acquisition date is inherited; no independently attested original download receipt exists.

```bash
PYTHONPATH=tools/geo-pipeline .venv/bin/python tools/geo-pipeline/audit_osm_coverage.py --offline
PYTHONPATH=tools/geo-pipeline .venv/bin/python tools/geo-pipeline/generate_mission_routes.py
PYTHONPATH=tools/geo-pipeline .venv/bin/python tools/geo-pipeline/verify_evidence.py
```

The actual runtime is Python 3.9.6, pyproj 3.6.1 / PROJ 9.3.0, Shapely 2.0.7 / GEOS 3.11.4, certifi 2026.10.23. Exact outputs are in the [execution report](FINAL_PHASE_0_VALIDATION_REPORT.md).

## Mission and boundary evidence limits

Mission 2 is at Thana Junction, 83.28m horizontally from the WGS84 station anchor; 149.44m is the snapped-node graph route, excluding access offsets. Rounded documented coordinates yield about 83.3m. It is not established as a station-gate checkpoint.

Mission 1: The 552.67m road graph fixture connects nearest road vertices between Rathkhola Stand and Hardinge High School Gate, excluding its 29.46m origin and 45.93m school offsets. The separate market pickup at Rathkhola Market Corner (+14.997, 0.0, -9.998) is in the open plaza off the tagged road network and is pending access geometry. It is strictly an origin-to-school road graph fixture; complete passenger journey route validation is formally deferred and Phase 1 acceptance criteria adjusted accordingly. Complete passenger mission navigation is not claimed as route-validated. Mission 2 Rathkhola→checkpoint graph distance is 149.70m. These are topology fixtures, not implemented missions.

For Mission 3, [JSON](../data/world/mission_routes.json) preserves OSM node/way IDs, complete 3D graph polylines, per-leg and cumulative distances, both detour legs, canonical anchor geometry and snap offsets. The nearest temple node is `7464434335`; nearest workshop node `7464434330`; nearest Rathkhola node `13923209214`. Visiting the first node does not prove courtyard entry. The routing model is an undirected snapshot road-graph route fixture; it ignores direction/access/turn restrictions; actual rickshaw legality and last-metre traversability require review. Phase 0 fixtures do not validate legal rickshaw access.

No actual Upazila polygon is preserved. The claimed 306.84km² area, seven outer ways and HDX boundary agreement cannot be independently reproduced. [Grid result](../data/sources/chunk_grid_audit.json) reports missing geometry and null counts. It defines the origin, finite candidate extent rule and coverage outputs; [grid script](../tools/geo-pipeline/audit_chunk_grid.py) will enumerate actual polygon intersections when a licensed WGS84 geometry is supplied. A rectangle or area division is not a substitute. Main Bangshi/Puran Bangshi identifiers in prior research are inherited source references, not separately field-verified watercourse evidence in this audit.
