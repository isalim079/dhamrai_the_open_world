# World Data and Geographic Pipeline — Dhamrai Life

## 1. Purpose

Produce a legally usable, auditable and streamable game world representing Dhamrai and a selected Savar/Jahangirnagar University extension. The geographic pipeline is an offline build tool. It turns source GIS into a simplified road graph, building footprints, water/land features, points of interest and versioned 3D chunks.

## 2. Source hierarchy

1. **Administrative boundary:** Prefer authoritative government geospatial products where access and use terms permit. The Survey of Bangladesh/NSDI catalogue lists an Upazila map GIS database and 1:25,000 topographic data with BUTM 2010/WGS84 metadata; confirm access, scope, source date and redistribution terms for the actual file.
2. **Roads/buildings/POIs:** OpenStreetMap PBF extracts, with ODbL attribution and compliance review. Geofabrik provides Bangladesh PBF extracts; the checked page on 2 November 2026 listed a recent extract around 339 MB.
3. **Official landmarks/history:** Dhamrai Upazila official portal, Bangladesh heritage portal and official Jahangirnagar University site.
4. **Local validation:** Field survey, local contributors, permitted photographs, road measurements and manual review. Store source notes, date and consent/permission metadata.
5. **Custom assets:** Original Blender models or assets whose licence explicitly permits commercial/game redistribution.

Never use Google Maps tiles, imagery, scraped content or Google Maps road traces to build the game's copied geographic data. If satellite imagery is required for visual reference, independently verify its provider licence and permitted derivative use before inclusion.

## 3. Known geographic facts and uncertainty

- Dhamrai Upazila official portal's “at a glance” page lists 306.33 km², one municipality, 16 unions, 305 mouzas and 408 villages.
- A separate official geographic page lists 307.4 km².
- This discrepancy is a reason to use an inspected administrative boundary polygon rather than hard-code either area figure.
- Dhamrai is bounded by areas including Mirzapur/Kaliakair to the north, Singair to the south, Savar to the east and Manikganj/Saturia/Nagarpur to the west according to the official portal; validate the exact polygon from GIS.
- Jahangirnagar University is in Savar, outside Dhamrai Upazila; model it as an extension region.

## 4. Geographic data import

### 4.1 Input data

- Store source file name, download date, source URL, checksum, licence and any attribution requirements in `data/sources/raw_osm_snapshot_manifest.json`.
- Download a country or relevant regional OSM PBF from a reliable provider such as Geofabrik. Do not repeatedly query the public Overpass API for production builds.
- Obtain the upazila boundary source and record native CRS, datum, scale, date and redistribution terms.
- Obtain official landmark names/coordinates and curated source references.

### 4.2 Processing tools

Suggested tools: GDAL/OGR, PROJ, Osmium, osm2pgsql/PostGIS or Pyrosm/GeoPandas for extraction and validation. Select one pipeline and pin tool versions in a reproducible container. Avoid maintaining two competing sources of truth.

### 4.3 Processing sequence

```text
Source manifest + raw GIS files
          |
          v
Validate file/checksum/CRS/licence
          |
          v
Load authoritative Dhamrai boundary
          |
          v
Extract OSM ways/nodes/relations intersecting world region
          |
          v
Normalize roads / paths / water / buildings / landuse / POIs
          |
          v
Validate geometry and topology
          |
          v
Reconcile names and landmark metadata
          |
          v
Apply manual corrections + authoring overlays
          |
          v
Project to metric local game coordinates
          |
          v
Generate road graph, building meshes and collision geometry
          |
          v
Partition, optimize and export versioned chunks
          |
          v
QA preview map + automated geometry checks
```

## 5. Coordinate system

- Preserve original WGS84 latitude/longitude for provenance and external reference.
- Prefer the official source's documented native CRS when working with authoritative topographic/GIS layers. The NSDI catalogue identifies Survey of Bangladesh products using BUTM 2010, WGS84 datum and Transverse Mercator projection; verify actual dataset metadata and the precise CRS parameters before coding.
- Convert to local metre-based coordinates for rendering. Define and record a stable world origin, axis convention and transform version.
- Never treat degrees of longitude/latitude as metres.
- Mathematical parameter consistency and round-trip tests pass for provisional ESRI:102954. Independent Survey of Bangladesh ground-control validation remains pending; no certified control points are included. Obtain these before claiming geodetic validation.
- Keep game coordinates independent from browser screen coordinates.

## 6. OSM feature extraction

Candidate OSM tags include:

- Roads: `highway=*`, `name=*`, `ref=*`, `surface=*`, `width=*`, `lanes=*`, `oneway=*`, `maxspeed=*`, `bridge=*`, `tunnel=*`, `layer=*`.
- Buildings: `building=*`, `building:levels=*`, `height=*`, `roof:shape=*`, `roof:material=*`, `name=*`.
- Water/terrain: `waterway=*`, `natural=water`, `landuse=*`, `leisure=*`, `natural=*`.
- POIs: `amenity=*`, `shop=*`, `tourism=*`, `historic=*`, `place=*`, selected `man_made=*`.

Do not assume all tags are present or correct. Missing road width, surface, lane count and building height must use explicit fallback metadata with a confidence/source marker. Important roads and landmarks require manual QA.

## 7. Road graph

- Convert road/path geometry into directed graph edges and junction nodes.
- Preserve OSM source IDs when available, plus a stable project ID for authored/corrected features.
- Store road class, direction, width estimate, surface estimate, speed class, access flags, junction type, bridge/tunnel/layer and source confidence.
- Create lane/path data for traffic separately from the road surface mesh. Narrow roads may be single-lane shared-space paths, not forced two-lane roads.
- At intersections, validate node snapping, turn connectivity, road hierarchy and collision continuity.
- Add manual road-width/turning-radius corrections for high-detail roads based on local references.
- Keep a correction overlay rather than directly editing downloaded raw source records.

## 8. Buildings and props

- Create a low-poly building from footprint geometry and a style category.
- `building:levels` or `height` can guide massing but must be tagged as source-derived/estimated.
- Use a curated set of Bangladesh-style building modules: concrete shopfront, mixed-use building, tin-roof dwelling, boundary wall, market stall, workshop and institutional building.
- Randomize only within a controlled seed so repeated builds are deterministic.
- Important landmark buildings are bespoke hero assets with their own source, review and licence record.
- Avoid generating fake private residential interiors or identifying details for real households.

## 9. Chunking and world manifests

Start by profiling chunk sizes 128 m, 256 m and 512 m. Use 256 m × 256 m as a working prototype default, not a permanent guarantee.

Proposed chunk manifest:

```json
{
  "worldDataVersion": "0.1.0",
  "chunkId": "dhamrai-x012-y008",
  "boundsMeters": { "minX": 3072, "minY": 2048, "maxX": 3328, "maxY": 2304 },
  "neighbours": ["dhamrai-x011-y008", "dhamrai-x013-y008"],
  "assets": ["buildings/dh-shop-row-a.glb"],
  "roadGraphFile": "roads/dhamrai-x012-y008.json",
  "poiFile": "pois/dhamrai-x012-y008.json",
  "collisionFile": "collision/dhamrai-x012-y008.bin",
  "sourceManifestId": "osm-bd-2026-11-02"
}
```

The example values are illustrative only; actual chunk IDs and coordinates must come from the pipeline.

## 10. Geographic QA checks

Automated checks:
- Geometry validity and self-intersection.
- Duplicate/overlapping segments and invalid coordinates.
- Broken road graph nodes and unexpected disconnected components.
- Road seam continuity across chunk boundaries.
- Building footprint validity and impossible outlier dimensions.
- Missing/duplicate POI IDs and malformed labels.
- All high-detail mission destinations have valid coordinates and a traversable route.
- Every derived feature includes source ID, source date/confidence and correction status.

Manual checks:
- Dhamrai municipal road and alley walk/drive reference review.
- Key market junctions, bridges, rivers and road turns.
- Landmark placement, access, naming and orientation.
- Vehicle fit on narrow streets and turning clearances.
- Compare the map against independently licensed reference sources and local knowledge; do not use Google Maps imagery as a copied source.

## 11. Landmark content candidates

The Dhamrai government tourism portal lists candidate sites including Balia Zamindar Bari, Dhamrai metal craft, Saitta banyan tree, Mahashakti Preran Kendra and Yashomadhab Temple. The actual display name, coordinates, status, access and current appearance must be confirmed before release.

Bangladesh's heritage portal includes an entry for traditional bronze/copper craft of Dhamrai and describes the lost-wax process and craft activities around Rathkhola. This can inform a factual discovery/educational mission; verify details with the source record and, ideally, local artisans.

## 12. Data update strategy

- Geographic source updates are not automatic app updates. Treat map updates as a reviewed `worldDataVersion` release.
- Each release includes a source manifest, diff report, geometry QA report and tested spawn/mission coordinates.
- Content updates must not alter player save keys or delete discovered/owned objects.
- If a POI or road ID changes, provide an explicit stable-ID remap table so mission/property references can migrate.
- Do not silently move a player's in-game property because an OSM building footprint changed.

## 13. Map attribution

Display an OpenStreetMap credit and link to the ODbL licence/OSM copyright page wherever OSM-derived data is shown. Record attribution in the map screen, credits and any distributed data package. The legal treatment of a combined database or produced work can depend on how data is adapted; obtain licensing review before public distribution if the map dataset is modified or combined with other databases.

## Current evidence reconciliation

Use [CRS specification](../docs/COORDINATE_REFERENCE_SPEC.md) and [audit](../docs/GEOGRAPHIC_DATA_AUDIT.md) for the current canonical coordinate convention, outward Phase 1 envelope, historical clipped metrics and snapped-node mission distances. The 256m grid origin is Rathkhola local x,z=0. No actual Upazila polygon is preserved, so exact grid counts remain unavailable; area division is only an estimate. Courtyard traversal is unknown for both Mission 3 routes. ODbL legal review and independent geodetic validation remain pending. Phase 1 has not started and requires authorization.
