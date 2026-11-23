# Milestone 11 Implementation Report: Visual World Polish & Street Detailing

**Project:** Dhamrai Life (ধামরাই পৌরসভা জীবনযাত্রা — 3D Open World)  
**Document Type:** Implementation & Verification Report  
**Target Milestone:** Milestone 11  
**Status:** **COMPLETE — VERIFIED**  
**Date:** November 23, 2026  
**Planning Reference:** [`guideFiles/milestone_11_planning_report.md`](./milestone_11_planning_report.md)

---

## 1. Executive Summary

Milestone 11 replaces the Phase 1 greybox look with shared procedural atlas materials and landmark-aligned street props, completing the visual–acoustic pairing begun in Milestone 10.

**Delivered:**
1. Procedural 512² atlases for buildings, roofs, asphalt, and embankment earth (`AtlasFactory`).
2. Shared `MeshStandardMaterial` binder applied on every chunk GLB load (`WorldMaterialBinder`), with per-chunk disposal skipping shared assets.
3. Landmark prop system (`PropManager`) with tea stalls, bilingual signboards, workshop/anvil props, Thana barriers, school gate pillars, and InstancedMesh poles/trees.
4. Static daylight fog/ambient polish only — **no day–night** (AC-M11-15).
5. Zero new npm dependencies; `SaveEnvelopeV2` unchanged; backend untouched.

**Live CDP:** 10 / 10 scenarios **PASS** at **60.0 FPS**, **79 draw calls**, **10,399 triangles** (Apple M4 Metal).

---

## 2. Files Changed

| Path | Change |
|---|---|
| `apps/web/src/engine/materials/AtlasFactory.ts` | **New** — deterministic DataTexture atlases |
| `apps/web/src/engine/materials/WorldMaterialBinder.ts` | **New** — shared materials + chunk bind |
| `apps/web/src/engine/props/propCatalog.ts` | **New** — procedural prop archetypes + canvas signs |
| `apps/web/src/engine/PropManager.ts` | **New** — landmark placement + InstancedMesh |
| `apps/web/src/content/signboardCopy.ts` | **New** — curated bilingual sign strings |
| `apps/web/src/engine/ChunkLoader.ts` | Bind atlases on load; skip shared material dispose |
| `apps/web/src/engine/SceneManager.ts` | `propsRoot` host; soft sky/fog/ambient polish |
| `apps/web/src/engine/GameEngine.ts` | Construct/dispose binder + PropManager |
| `apps/web/test/world-material-binder.test.ts` | **New** — 7 tests |
| `apps/web/test/prop-manager.test.ts` | **New** — 11 tests |
| `scratch/m11_live_verification.cjs` | **New** — headless Chrome CDP suite |
| `guideFiles/m11_shot_01…10_*.png` | Live verification screenshots |
| `guideFiles/PROGRESS.md` / `PROGRESS.md` | Status updates |

---

## 3. Architecture Delivered

```text
Chunk GLB load
  → ChunkLoader
  → WorldMaterialBinder.bindChunkGroup()  (shared atlas maps)
  → scene

GameEngine.init
  → PropManager.init() on SceneManager.propsRoot
  → InstancedMesh poles/trees/barriers + unique stalls/signs/workshop props
```

Shared materials use `userData.dhamraiShared = true` so chunk unload cannot dispose atlas GPU resources.

---

## 4. Verification Gates

| Gate | Target | Observed | Status |
|---|---|---|---|
| Vitest | No regressions + new M11 tests | **270 passed** / 4 skipped; 38 files green (1 Neon PG suite offline) | **PASS** |
| New M11 tests | Atlas + props | **18 / 18** | **PASS** |
| Python geo-pipeline | 23/23 | **23 / 23** | **PASS** |
| TypeScript | `tsc -b` 0 errors | **0 errors** | **PASS** |
| Lockfile | Zero new deps | `yarn.lock` unchanged | **PASS** |
| Save schema | v2 only | `CURRENT_SAVE_SCHEMA_VERSION = 2` | **PASS** |
| Live CDP | 10 scenarios | **10 / 10** | **PASS** |
| FPS | ≥ 55 | **60.0** (16.7 ms) | **PASS** |
| Draw calls | ≤ 180 | **79** | **PASS** |
| Triangles | ≤ 120,000 | **10,399** | **PASS** |

---

## 5. Live CDP Telemetry

**Renderer:** `ANGLE (Apple, ANGLE Metal Renderer: Apple M4)`  
**Script:** `scratch/m11_live_verification.cjs`

| Scenario | Result |
|---|---|
| Atlas materials bound (`map` present, shared flag, 40+ textured meshes) | PASS |
| Rathkhola props within 25 m (≥ 14) | PASS |
| Kayetpara props within 20 m (5) | PASS |
| Thana props within 20 m (8) | PASS |
| Hardinge props within 15 m (4) | PASS |
| InstancedMesh batches (≥ 4 meshes, 12 poles) | PASS |
| Avg FPS 60 under visual + audio load | PASS |
| Draw calls / triangles under budget | PASS |
| Chunk stream: binder + props survive travel | PASS |
| Static daylight (no day–night) | PASS |

### Screenshots

1. `m11_shot_01_rathkhola_textured_market.png`
2. `m11_shot_02_tea_stall_cluster.png`
3. `m11_shot_03_shop_signboards.png`
4. `m11_shot_04_kayetpara_workshop_props.png`
5. `m11_shot_05_thana_junction_detail.png`
6. `m11_shot_06_hardinge_school_board.png`
7. `m11_shot_07_road_asphalt_detail.png`
8. `m11_shot_08_foliage_poles_overview.png`
9. `m11_shot_09_performance_under_visual_load.png`
10. `m11_shot_10_chunk_stream_stability.png`

---

## 6. Acceptance Criteria Matrix

| ID | Requirement | Status |
|---|---|---|
| **AC-M11-01** | Shared atlas textures on buildings/roads | **PASS** |
| **AC-M11-02** | Rathkhola tea stalls + signs | **PASS** |
| **AC-M11-03** | Kayetpara workshop props | **PASS** |
| **AC-M11-04** | Thana checkpoint detail | **PASS** |
| **AC-M11-05** | Hardinge bilingual board / pillars | **PASS** |
| **AC-M11-06** | InstancedMesh for repeats | **PASS** |
| **AC-M11-07** | FPS ≥ 55 | **PASS** (60.0) |
| **AC-M11-08** | Draw calls ≤ 180; tris ≤ 120k | **PASS** (79 / 10,399) |
| **AC-M11-09** | Dispose / stream stability | **PASS** |
| **AC-M11-10** | Vitest green (non-PG) | **PASS** |
| **AC-M11-11** | Python 23/23 | **PASS** |
| **AC-M11-12** | Typecheck clean | **PASS** |
| **AC-M11-13** | Zero new npm deps | **PASS** |
| **AC-M11-14** | Save schema v2 | **PASS** |
| **AC-M11-15** | No day–night / weather | **PASS** |

---

## 7. Known Limitations

1. Props are low-poly procedural silhouettes (intentional for budget + zero asset packs), not authored art-direction hero models.
2. Bengali canvas sign glyphs depend on host fonts (`Noto Sans Bengali` when available); Node tests use solid-color DataTexture fallbacks.
3. Decorative props do not add Rapier colliders by default (collider budget preserved).
4. Real PostgreSQL Neon suite remains environment-gated offline (unchanged; out of M11 scope).
5. Existing GLBs were **not** regenerated — runtime material override keeps chunk files valid without bake churn.

---

## 8. Milestone 12 Readiness

With textured facades, asphalt, and street props in place, the simulation is ready for **Milestone 12 Planning: Dynamic Day–Night Cycle & Atmospheric Weather** (TD-03), including streetlamp glow and night ambience hooks on the existing M10 audio engine.

**Final Status:** **READY FOR REVIEW**
