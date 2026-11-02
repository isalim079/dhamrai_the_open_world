# Dhamrai Life — Final Phase 0 Validation and Test Execution Report

**Document Version:** 3.0.0  
**Validation date:** 2 November 2026  
**Status:** Architecture baseline complete; mathematical tests passed; independent Survey of Bangladesh ground-control validation pending; OAuth integration requires credentials; ODbL legal review pending. Phase 1 not started; explicit authorization required.

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

## Outcome and evidence limits

Documentation reconciliation and the locally available evidence checks are complete. **The requested exact Upazila chunk enumeration and verified courtyard/access routes could not be completed**: the polygon and access geometry are absent. These are unresolved evidence dependencies, not successful validation results. Architecture remains provisionally accepted; the stack and game scope have not changed. No client, backend, gameplay or Phase 1 implementation was started.

The existing coordinate/mission suite contains **ten tests** (strengthened with full-precision origin constants verification), all passed in the documented existing `.venv`. A separate **three-test synthetic grid suite** also passed. Total: 13 automated tests. Synthetic tests establish algorithm semantics, not actual Upazila counts. No benchmark, live OAuth/Drive test, independent ground-control survey or legal approval was performed.

## Environment and reproduction

Observed environment (read from runtime, not hard-coded claims):

```json
{
  "python": "3.9.6",
  "platform": "macOS-27.0.1-arm64-arm-64bit",
  "pyproj": "3.6.1",
  "proj": "9.3.0",
  "shapely": "2.0.7",
  "geos": "3.11.4",
  "certifi": "2026.10.23"
}
```

Dependencies are pinned in [requirements.txt](../tools/geo-pipeline/requirements.txt). Tests were run in the **existing** `.venv`, without reinstalling dependencies. For a separate compatible environment, create a Python 3.9 virtual environment and install that requirements file; a fresh online installation was not tested here.

Run from the repository root:

```bash
PYTHONPATH=tools/geo-pipeline .venv/bin/python tools/geo-pipeline/reproduce_evidence.py
PYTHONPATH=tools/geo-pipeline .venv/bin/python tools/geo-pipeline/verify_evidence.py
```

[Reproduction runner](../tools/geo-pipeline/reproduce_evidence.py) records command output and exits in [test_execution.json](../data/sources/test_execution.json). The runner expects the actual-polygon step to exit 2 while geometry is missing, and records that limitation; it must not be interpreted as a successful grid audit. Following intentional evidence regeneration, `verify_evidence.py --write` rebuilds the checksum inventory; ordinary verification does not rewrite it. Original raw hashes remain pinned and cannot be silently rebaselined by `--write`.

## Actual command output

The following blocks copy captured subprocess output. Both the summary and route JSON were regenerated twice and compared byte-for-byte; duplicated generation output is retained in JSON and shown once below.

```bash
PYTHONPATH=tools/geo-pipeline .venv/bin/python tools/geo-pipeline/audit_osm_coverage.py --offline
```

```text
Auditing: Dhamrai Pourashava Core (Town Center) [90.21, 23.91, 90.225, 23.925]...
Auditing: Phase 1 Playable Slice (16 Chunks / 1024m x 1024m) [90.212362, 23.910168, 90.222438, 23.919432]...
Auditing: Rural Union Sector (Balia / Chauhat) [90.15, 23.93, 90.16, 23.94]...
Auditing: Jahangirnagar University Campus (Savar) [90.26, 23.875, 90.275, 23.89]...

Audit complete! Wrote machine-readable results to data/sources/osm_audit_summary.json
Summary file SHA-256: 90552be5205525563d192823465cb01e39ed841ce9a8884520b6f78edc94c5b7
Exit code: 0
```

```bash
PYTHONPATH=tools/geo-pipeline .venv/bin/python tools/geo-pipeline/generate_mission_routes.py
```

```text
Loaded road network from data/sources/raw_osm_sample_b_phase1_slice.xml: 452 road vertices (not necessarily intersections or a single connected component).
  Target 'Dhamrai Rathkhola Stand': Node 13923209214 (29.5m away)
  Target 'Rathkhola Market Corner': Node 13923209214 (46.9m away)
  Target 'Dhamrai Hardinge High School Gate': Node 5617945281 (45.9m away)
  Target 'Thana Junction Checkpoint': Node 13686881067 (14.6m away)
  Target 'Dhamrai Police Station': Node 6383980983 (25.0m away)
  Target 'Kayetpara Metal Craft Workshop': Node 7464434330 (30.4m away)
  Target 'Sri Sri Yashomadhab Mandir': Node 7464434335 (6.4m away)

Generated mission routes fixture: data/world/mission_routes.json
  Mission 1 road distance: 552.67 m (26 waypoints)
  Mission 2 road distance: 149.70 m (11 waypoints)
  Mission 2 -> Police Station offset: 83.28 m Euclidean, 149.44 m road
  Mission 3 Direct road distance: 534.16 m (Visits nearest temple road vertex? False)
  Mission 3 Detour road distance: 615.50 m (33 waypoints)
Exit code: 0
```

```bash
PYTHONPATH=tools/geo-pipeline .venv/bin/python tools/geo-pipeline/test_coordinate_transform.py
```

```text
..........
----------------------------------------------------------------------
Ran 10 tests in 0.064s

OK
Exit code: 0
```

```bash
PYTHONPATH=tools/geo-pipeline .venv/bin/python tools/geo-pipeline/test_chunk_grid.py
```

```text
...
----------------------------------------------------------------------
Ran 3 tests in 0.004s

OK
Exit code: 0
```

```bash
PYTHONPATH=tools/geo-pipeline .venv/bin/python tools/geo-pipeline/audit_chunk_grid.py
```

```text
{
  "status": "unavailable",
  "source_file": "data/sources/dhamrai_upazila.geojson",
  "crs": "ESRI:102954 (provisional)",
  "grid_origin_world_xz_m": [
    0,
    0
  ],
  "cell_size_m": 256,
  "grid_rule": "Closed cells at integer multiples of 256m; count boundary-only touches as intersects. Outside cells counted only within candidate rectangle, not the infinite grid.",
  "area_equivalent_estimate": {
    "reported_area_km2_unverified": 306.84,
    "fractional_cells": 4682.0068359375,
    "historical_4685": "Approximate area-equivalent estimate only; not an intersection count."
  },
  "intersecting_cells": null,
  "outside_cells_within_candidate_grid": null,
  "partial_boundary_cells": null,
  "total_candidate_grid_coverage_m2": null,
  "intersecting_cell_coverage_m2": null,
  "reason": "Actual Upazila polygon is absent. OSM relation 4730829 full acquisition failed: curl exit 6 (DNS); web fetches also unavailable. No substitute geometry used."
}
Exit code: 2
```

### Deterministic output comparison

Both repeated generations matched these hashes:

- `data/sources/osm_audit_summary.json`: `90552be5205525563d192823465cb01e39ed841ce9a8884520b6f78edc94c5b7`
- `data/world/mission_routes.json`: `5f2177eebc0ce215e27023af400c391deadbe553f7dfb39b056036d88a702813`

### Original raw and delivered artifact checksums

```bash
PYTHONPATH=tools/geo-pipeline .venv/bin/python tools/geo-pipeline/verify_evidence.py
```

```text
PASS data/sources/raw_osm_sample_a_pourashava_core.xml: 62a8c13d770e164afbcde033cb1d10696e05d17696a4d38b94ec59e78d6d9141
PASS data/sources/raw_osm_sample_b_phase1_slice.xml: e69f01828ddbf3a7efc0267b126b987324e88b68c0343c4dafcf0532bb18e3a7
PASS data/sources/raw_osm_sample_c_rural_union.xml: 7a527854ff79ada45e48ba8f7dcd3e1e94b4c2a4dbf73ace78f7627747edd007
PASS data/sources/raw_osm_sample_d_jahangirnagar_univ.xml: 2c0b3a6ca6fd7a1c0899ea4e0c1062bdbe0d900e6eabdc2a8e49e771663939f2
PASS all 20 evidence file checksums and sizes; raw manifest metadata; identical progress trackers.
Exit code: 0
```

Every inventory entry matches its file size and SHA-256. The four raw hashes also match the values recorded before this reconciliation and the audit summary references. The raw manifest's query/XML metadata matches the files. Both progress trackers are byte-identical. The inventory covers all delivered Python scripts, requirements, data artifacts and both progress trackers; it excludes itself and documentation/report prose to avoid self-reference.

### Actual failed boundary acquisition

```bash
curl -L --fail --max-time 20 https://api.openstreetmap.org/api/0.6/relation/4730829/full -o /tmp/dhamrai_relation.xml
```

```text
  % Total    % Received % Xferd  Average Speed   Time    Time     Time  Current
                                 Dload  Upload   Total   Spent    Left  Speed

  0     0    0     0    0     0      0      0 --:--:-- --:--:-- --:--:--     0curl: (6) Could not resolve host: api.openstreetmap.org
Exit code: 6
```

The web tool also failed to open the OSM full-relation XML, OSM full-relation JSON and polygon-service GeoJSON endpoints. No actual polygon is provided. [Grid audit JSON](../data/sources/chunk_grid_audit.json) therefore records `null` intersecting, outside, partial and coverage results. No successful boundary test or chunk count is claimed. The previously reported 306.84km² area is not independently reproduced.

## Test coverage and practical limits

The ten automated coordinate/route tests in [test_coordinate_transform.py](../tools/geo-pipeline/test_coordinate_transform.py) cover CRS parameters, the EPSG:9358 regression guard, origin alignment, full-precision origin constants verification against pyproj, 3D mission axis convention, round-trip precision for the listed coordinates, four mathematical reference coordinates, one local scale-distortion sample, full-precision corner containment and mission graph routing. Mission checks verify source SHA-256, every saved OSM graph edge, summed lengths, Dijkstra shortest paths for direct routes/individual detour legs, ordering, local containment and unknown courtyard evidence. The three synthetic chunk-grid tests in [test_chunk_grid.py](../tools/geo-pipeline/test_chunk_grid.py) cover an interior partial cell, boundary-only touching cells and an outside cell caused by a hole. Combined total: **13 automated unit tests** across both test suites (10 coordinate/route + 3 synthetic grid).

Four reference coordinates are computed mathematical fixtures, **not independent ground-control points**. Public coordinate serialization rounds world coordinates to four decimals and geographic coordinates to seven decimals; displayed zeros or perfect round trips on selected fixtures do not establish absolute millimetre ground accuracy. No independent SoB ground-control dataset is present.

Road routes use nearest graph vertices and omit access offsets. The routing graph is undirected, ignores one-way/access/turn restrictions and uses horizontal lengths, with road elevations defaulting to the provisional baseline. It is a topology fixture, not certified rickshaw navigation; complete passenger journey validation for Mission 1 is formally deferred to Phase 1 plaza access modeling. The direct delivery misses the nearest temple road vertex and the detour visits it; neither proves courtyard traversal. No surveyed courtyard polygon or access connectors are supplied.

ODbL review remains pending. Directory separation does not settle Produced Work/Derivative Database treatment; see the [ODbL definitions and obligations](https://opendatacommons.org/licenses/odbl/1-0/). Source DEM tiles are absent; Copernicus EGM2008 and SRTM EGM96 require reconciliation against the provisional gameplay baseline, as described in the [source manifest](DATA_PROVENANCE_MANIFEST.md).

## Outstanding external dependencies and approvals

| Dependency | Current state / required evidence |
|---|---|
| Actual Upazila polygon | Missing; acquisition failed. Preserve licensed full geometry and metadata, then enumerate grid cells and compare HDX/OSM boundaries. |
| Independent Survey of Bangladesh ground control | Pending acquisition and validation; ESRI:102954 remains provisional. |
| Courtyard/entrance/access geometry | Pending; obtain reviewed boundary and connectors before asserting traversal or actual anchor-to-anchor access distance. |
| OAuth/Drive | Requires owner-provided Google Cloud credentials, consent/redirect/scope configuration and future authorized implementation. No E2E result claimed. |
| ODbL counsel review | Pending; determine graph/database release obligations and asset classification before distribution. |
| DEM/vertical benchmarks | Missing; +12m is provisional. |
| Hardware/gameplay/save benchmarks | Not run; future Phase 1 implementation work. |
| Phase 1 authorization | Explicit user authorization required; no Phase 1 implementation begun. |

[Complete correction log and artifact links](PHASE_0_CORRECTION_REPORT.md). The evidence does not justify certifying Phase 0 as geographically or legally watertight.
