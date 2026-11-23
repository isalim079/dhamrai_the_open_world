# Milestone 12 Implementation Report: Dynamic Day–Night Cycle & Atmospheric Weather

**Project:** Dhamrai Life  
**Status:** **COMPLETE — VERIFIED**  
**Date:** November 23, 2026  
**Planning:** [`milestone_12_planning_report.md`](./milestone_12_planning_report.md)

---

## 1. Executive Summary

Milestone 12 delivers a driven day–night cycle and light rain atmosphere over the M11 textured world:

1. **DayNightCycle** — 24-minute game day, pause/scale, `localStorage` time scale.
2. **AtmosphereController** — sun arc, sky/fog/ambient/hemi, exposure.
3. **StreetLampSystem** — emissive bulbs on M11 poles + ≤6 culled PointLights at night.
4. **RickshawHeadlight** — SpotLight when mounted at night.
5. **WeatherSystem** — clear ↔ rain (`[N]`), ≤1200 particles, fog response.
6. **AmbientSoundscape** — night bed + rain layer + cricket chirps; mute respected.
7. HUD clock / phase / weather readout.

Zero new npm deps · SaveEnvelopeV2 unchanged · backend untouched.

---

## 2. Files Changed

| Path | Change |
|---|---|
| `apps/web/src/engine/atmosphere/atmosphereCurves.ts` | **New** |
| `apps/web/src/engine/atmosphere/DayNightCycle.ts` | **New** |
| `apps/web/src/engine/atmosphere/AtmosphereController.ts` | **New** |
| `apps/web/src/engine/atmosphere/StreetLampSystem.ts` | **New** |
| `apps/web/src/engine/atmosphere/RickshawHeadlight.ts` | **New** |
| `apps/web/src/engine/atmosphere/WeatherSystem.ts` | **New** |
| `apps/web/src/engine/GameEngine.ts` | Wire atmosphere stack |
| `apps/web/src/engine/SceneManager.ts` | Sun target in scene; M12 comments |
| `apps/web/src/engine/PropManager.ts` | `getPoleAnchors()` |
| `apps/web/src/engine/InputManager.ts` | `[N]` weather toggle |
| `apps/web/src/audio/AmbientSoundscape.ts` | Night + rain beds |
| `apps/web/src/state/useSessionStore.ts` | Clock/weather HUD fields |
| `apps/web/src/components/HUD.tsx` | Clock / weather / `[N]` hint |
| `apps/web/src/components/PerformanceOverlay.tsx` | Time/weather lines |
| `apps/web/test/atmosphere-curves.test.ts` | **New** |
| `apps/web/test/day-night-cycle.test.ts` | **New** |
| `apps/web/test/weather-system.test.ts` | **New** |
| `apps/web/test/street-lamp-system.test.ts` | **New** |
| `apps/web/test/ambient-soundscape.test.ts` | Updated for 3 beds |
| `scratch/m12_live_verification.cjs` | **New** CDP suite |
| `guideFiles/m12_shot_01…10_*.png` | Live shots |

---

## 3. Verification Gates

| Gate | Observed | Status |
|---|---|---|
| Vitest | **288 passed** / 4 skipped (Neon PG offline) | **PASS** |
| Typecheck | 0 errors | **PASS** |
| Python geo-pipeline | 23/23 | **PASS** |
| yarn.lock | Unchanged | **PASS** |
| Save schema | v2 | **PASS** |
| Live CDP | 11/11 scenario checks | **PASS** |
| FPS (night+rain) | **60.0** avg | **PASS** |
| Draw calls / tris | **46 / 8,635** | **PASS** |
| Active lamps at night | **6** (cap) | **PASS** |
| Headlight night+mounted | visible, intensity 2.2 | **PASS** |

---

## 4. Live CDP Highlights

| Scenario | Result |
|---|---|
| Noon clear — day phase, sunI > 0.5, lamps 0 | PASS |
| Dusk — lamps enable | PASS |
| Night — 6 lamps, sun ≈ 0.02 | PASS |
| Rickshaw headlight | PASS |
| Dawn 06:00 | PASS |
| Day rain fog increase | PASS |
| Night rain + audio hooks | PASS |
| HUD clock/weather | PASS |
| 60 FPS under night+rain | PASS |
| Chunk stream retains lamps/binder | PASS |

Screenshots: `m12_shot_01_noon_clear.png` … `m12_shot_10_chunk_stream_night.png`

---

## 5. Acceptance Criteria

| ID | Status |
|---|---|
| AC-M12-01 … AC-M12-15 | **PASS** (clock, sun, sky/fog, lamps≤6, headlight, rain, audio, HUD, FPS, budgets, tests, typecheck, lockfile, save v2, no flood/economy) |

---

## 6. Controls

| Key | Action |
|---|---|
| `[N]` | Toggle Clear ↔ Light rain |
| (automatic) | Day advances (24 min/day); pauseable via `dayNightCycle.setPaused` for tests |
| `[M]` | Mute (also silences night/rain beds) |

---

## 7. Known Limitations

1. Light rain only — no storms, lightning, or wet-friction physics.
2. Streetlamps are PointLights + emissive bulbs (not hero art fixtures).
3. Headless CDP frames can look sparse depending on capture timing; telemetry gates are authoritative.
4. Neon real-PG suite remains environment-gated.

---

## 8. Next

**Milestone 13 Discovery & Planning:** Vehicle Maintenance & Tea Stall Economy (uses M11 stalls + M12 atmosphere).

**Final Status:** **READY FOR REVIEW**
