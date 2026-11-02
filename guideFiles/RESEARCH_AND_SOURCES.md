# Research Notes and Sources

**Research snapshot date:** 2 November 2026  
**Purpose:** Record the public sources used to ground this product and architecture plan. Links and source details should be rechecked before implementation and before public release.

## 1. Google identity and Drive appDataFolder

### Google Drive appDataFolder

- Official guide: <https://developers.google.com/workspace/drive/api/guides/appdata>
- `appDataFolder` is a hidden app-specific folder accessible to the creating application through the Drive API; it is not visible in the ordinary Drive UI.
- Required scope: `https://www.googleapis.com/auth/drive.appdata`, documented as non-sensitive.
- The appDataFolder may be deleted when the user uninstalls the app from Drive or manually deletes app data.
- Files/folders cannot be shared or moved between spaces; they cannot be trashed. Do not design a normal user-facing visible-folder workflow around it.

### Google Identity Services

- Sign-in overview: <https://developers.google.com/identity/gsi/web/guides/overview>
- Server-side ID token verification: <https://developers.google.com/identity/gsi/web/guides/verify-google-id-token>
- Authorization code model: <https://developers.google.com/identity/oauth2/web/guides/use-code-model>
- Sign-in authentication and authorization to Google APIs are separate moments. The user must separately authorize the Drive scope.
- Verify ID tokens server-side. Google documentation identifies `sub` as the stable unique account identifier and warns against using email as the immutable ID.
- Authorization-code flow lets the backend exchange the code for access/refresh tokens. Refresh tokens must be stored securely on the platform/backend, not in browser local storage.

### Drive file upload

- Official guide: <https://developers.google.com/workspace/drive/api/guides/manage-uploads>
- Use Drive API v3 to create the initial file in `appDataFolder` and update the same primary file for later saves. Avoid one file per autosave.

## 2. Geographic data and map licensing

### OpenStreetMap

- Copyright and licence: <https://www.openstreetmap.org/copyright>
- OSM data is licensed under ODbL. Users may copy, distribute, transmit and adapt it with attribution; altered/built-upon databases have share-alike obligations. Legal treatment depends on how data is combined and distributed, so obtain a licensing review for the release data package.
- Display OpenStreetMap attribution and a link to the licence/copyright page wherever OSM-derived data is shown.

### Geofabrik

- Bangladesh download page: <https://download.geofabrik.de/asia/bangladesh.html>
- The page lists a Bangladesh `.osm.pbf` extract suitable for tools such as Osmium, Osmosis, imposm and osm2pgsql. On the checked 2 November 2026 page, the current extract was approximately 339 MB. This is a country-wide data extract, not a ready-made Dhamrai game map.
- Use a reproducible local pipeline; do not repeatedly query public Overpass endpoints for game runtime data.

### Bangladesh official GIS catalogue

- National Spatial Data Infrastructure catalogue: <https://new.nsdi.gov.bd/datacatalog/>
- The catalogue lists Survey of Bangladesh GIS datasets including an Upazila Map GIS database and 1:25,000 topographic map data. Catalogue metadata references BUTM 2010, WGS84 datum and Transverse Mercator for those products. The actual Dhamrai file, exact CRS definition, access process and reuse terms must be verified before use.
- Bangladesh Agricultural Research Council spatial data description: <https://barc.gov.bd/pages/static-pages/6922dfed933eb65569e24b15>
- This is a potential historical/secondary reference for upazila, union, mouza, settlement, water and road layers; verify freshness and terms before selection.

## 3. Dhamrai and local heritage

### Dhamrai official portal

- At-a-glance page: <https://dhamrai.dhaka.gov.bd/pages/static-pages/6995d1c235ce18e1c07a9d49>
- The page lists area 306.33 km², 1 municipality, 16 unions, 305 mouzas, 408 villages and rivers including Bangshi, Dhaleshwari, Kalmai and Gazikhali.
- Geographic description page: <https://dhamrai.dhaka.gov.bd/pages/static-pages/6995d1c235ce18e1c07a9d4a>
- That page lists 307.4 km². The discrepancy means the polygon must be sourced and checked rather than choosing a number.
- Tourism spots: <https://dhamrai.dhaka.gov.bd/pages/tourist-spot>
- Candidate attractions listed include Balia Zamindar Bari, Dhamrai metal craft, Saitta banyan tree, Mahashakti Preran Kendra and Yashomadhab Temple. Validate coordinates, present access, spelling and permission for imagery before modelling.

### Dhamrai metal craft

- Bangladesh heritage portal entry: <https://heritagehub.gov.bd/HeritageInfoes/Details/3208>
- Describes traditional bronze/copper craft of Dhamrai, including the lost-wax method and a connection to Rathkhola village. Use this as a source for educational/exploration content; corroborate with local artisans and further records.

## 4. Jahangirnagar University

- Official university profile: <https://juniv.edu.bd/custom/slug/about-ju>
- States the university is in Savar, established 20 August 1970 and formally launched 12 January 1971; profile lists 697.56 acres. Treat the campus as a Savar extension, not Dhamrai Upazila.
- Hall names, current buildings and access routes should be checked against current official university information before inclusion.

## 5. Runtime, physics and performance

### Three.js

- WebGLRenderer: <https://threejs.org/docs/pages/WebGLRenderer>
- Current Three.js WebGLRenderer uses WebGL 2; WebGL 1 is unsupported since r163.
- InstancedMesh: <https://threejs.org/docs/pages/InstancedMesh>
- Instancing reduces draw calls when rendering many objects with matching geometry/materials and different transforms.
- LOD: <https://threejs.org/docs/pages/LOD>
- LOD switches between model detail levels based on camera distance.
- GLTFLoader: <https://threejs.org/docs/pages/GLTFLoader>
- Supports GLTF 2.0 and selected compression/material extensions; configure decoders/loaders only for assets that actually use them.

### Rapier

- JavaScript controllers: <https://rapier.rs/docs/user_guides/javascript/character_controller/>
- Rapier documents character controllers and raycast-wheel vehicle controllers. Game-specific character movement and vehicle tuning remain necessary.

### Browser graphics

- MDN WebGL API: <https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API>
- WebGL availability depends on browser and GPU support. Feature-detect WebGL 2 and test on actual target machines.
- MDN OffscreenCanvas transfer: <https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/transferControlToOffscreen>
- OffscreenCanvas is a possible worker-rendering optimization, not a requirement for the first release.

## 6. Browser storage and multiplayer

### Browser storage

- MDN quotas/eviction: <https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria>
- Browser storage is best-effort by default. `navigator.storage.persist()` can request persistent storage, but it does not remove the user's ability to clear browser data. Cloud and export backups remain necessary.

### Colyseus

- Official docs: <https://docs.colyseus.io/>
- State synchronization docs: <https://docs.colyseus.io/state>
- Colyseus documents server-owned room state, real-time synchronization and matchmaking. It is a candidate for a future server-authoritative multiplayer spike, not an MVP dependency.

## 7. Research limitations

- The current offline OSM snapshot audit and road-node route evidence are preserved in `data/sources/` and `data/world/`; see the nine reconciled documents in `docs/`. No SoB/HDX Upazila boundary or independent ground-control sheet is supplied. Exact polygon grid counts, boundary reconciliation and field completeness remain unresolved. OAuth integration requires credentials; legal review remains pending; Phase 1 is not started.
- No field survey has been performed. Local road widths, narrow alleys, signs, traffic patterns, building styles, current landmarks and campus access need human verification.
- Browser performance targets are engineering targets, not universal guarantees. Validate against an agreed set of desktop machines and browsers.
- Google API quota, OAuth consent-screen configuration, verification/review requirements and production publishing details must be checked in the actual Google Cloud project before launch.
