# Milestone 13 Implementation Report: Vehicle Maintenance, Driver Stamina & Tea Stall Economy

**Project:** Dhamrai Life  
**Status:** **COMPLETE — VERIFIED**  
**Date:** November 23, 2026  
**Planning:** [`milestone_13_planning_report.md`](./milestone_13_planning_report.md)

---

## 1. Executive Summary

Milestone 13 activates dormant economy/vehicle hooks into a playable resource loop:

1. **Vehicle wear & tires** — odometer wear while mounted; sprint accelerates damage/tire loss; soft speed/steer caps; puncture limp mode.
2. **Driver stamina** — drain on foot/pedal sprint; regen idle/walk; sprint blocked below 15%; tea buff doubles regen for 30s.
3. **Tea stall purchases** — `[E]` near Rathkhola stalls → চা ৳5 / বিস্কুট ৳8 via `CONSUMABLE_PURCHASE`.
4. **Mistri Gautom repairs** — tire / tune-up / full service (`MAINTENANCE_COST`); optional Kayetpara chain oil ৳15.
5. **HUD meters** — stamina, damage, tire + puncture/sprint-block warnings.
6. **Save** — additive optional V2 fields (`staminaPercent`, `tirePressurePercent`); **schema stays v2**.

Zero new npm deps · no backend · no CNG / property / NPC skeletal anim.

---

## 2. Files Changed

| Path | Change |
|---|---|
| `packages/shared-contracts/src/index.ts` | `CONSUMABLE_PURCHASE`; optional stamina/tire; M13 actionTriggers; VENDOR/MECHANIC roles |
| `packages/save-core/src/schemas/v2.schema.ts` | Optional fields + new ledger category |
| `packages/save-core/src/schemas/v1.schema.ts` | Ledger category parity |
| `packages/game-core/src/vehicle-condition.ts` | **New** — wear / puncture / repair math |
| `packages/game-core/src/stamina.ts` | **New** — drain / regen / consumables |
| `packages/game-core/src/engine.ts` | Wear/stamina APIs, purchaseConsumable/Repair, serialize optional fields |
| `packages/game-core/src/roles.ts` | stamina + tire + punctured on archetype |
| `packages/game-core/src/dialogue.ts` | Tea stall, mistri, chain-oil trees |
| `packages/game-core/src/index.ts` | Re-exports |
| `packages/game-core/test/vehicle-condition.test.ts` | **New** |
| `packages/game-core/test/stamina.test.ts` | **New** |
| `packages/game-core/test/engine.test.ts` | M13 purchase/save/hydrate tests |
| `apps/web/src/engine/EconomyInteractables.ts` | **New** — stall/mistri/chain-oil volumes |
| `apps/web/src/engine/GameEngine.ts` | Distance wear, stamina tick, sprint gate, interact priority; fix damage wipe on save |
| `apps/web/src/engine/RickshawVehicle.ts` | topSpeed/steer/limp multipliers |
| `apps/web/src/engine/NPCManager.ts` | Tea vendor + Mistri Gautom NPCs |
| `apps/web/src/state/useSessionStore.ts` | Condition HUD fields |
| `apps/web/src/components/HUD.tsx` | Stamina / damage / tire meters |
| `apps/web/src/components/DialogueBox.tsx` | BUY_* / REPAIR_* handlers |
| `apps/web/test/economy-interactables.test.ts` | **New** |
| `scratch/m13_live_verification.cjs` | **New** CDP suite (spawns Vite in-process) |
| `guideFiles/m13_shot_01…10_*.png` | Live shots |

---

## 3. Verification Gates

| Gate | Observed | Status |
|---|---|---|
| Vitest | **306 passed** / 4 skipped (Neon PG offline) | **PASS** |
| Typecheck | 0 errors | **PASS** |
| Python geo-pipeline | 23/23 | **PASS** |
| yarn.lock | Unchanged | **PASS** |
| Save schema | **v2** (optional additive fields) | **PASS** |
| Live CDP | **11/11** | **PASS** |
| FPS | **60.0** avg | **PASS** |
| Draw calls / tris | **78 / 11,815** | **PASS** |

---

## 4. Live CDP Highlights

| Scenario | Result |
|---|---|
| Baseline stamina/tire HUD + schema 2 | PASS |
| 500 m wear — damage↑ tire↓ | PASS |
| Sprint drain → sprint blocked | PASS |
| Tea stall cha −৳5 / stamina↑ | PASS |
| Puncture limp mode | PASS |
| High damage speed mult 0.85 | PASS |
| Full service −৳75 / meters restore | PASS |
| Save/reload stamina+tire+damage | PASS |
| FPS ≥ 55, drawCalls ≤ 180 | PASS |

---

## 5. Acceptance Criteria

| ID | Status |
|---|---|
| AC-M13-01 Travel wear | **PASS** |
| AC-M13-02 Sprint stamina block | **PASS** |
| AC-M13-03 Tea cha purchase | **PASS** |
| AC-M13-04 Insufficient funds | **PASS** (unit) |
| AC-M13-05 Mistri MAINTENANCE_COST | **PASS** |
| AC-M13-06 Puncture | **PASS** |
| AC-M13-07 Damage speed mult | **PASS** |
| AC-M13-08 Save/reload | **PASS** |
| AC-M13-09 Schema remains 2 | **PASS** |
| AC-M13-10 Old saves hydrate defaults | **PASS** (unit) |
| AC-M13-11 Vitest green (non-PG) | **PASS** |
| AC-M13-12 Typecheck + Python | **PASS** |
| AC-M13-13 Zero new deps | **PASS** |
| AC-M13-14 FPS ≥ 55 | **PASS** |
| AC-M13-15 No CNG/property/V3 | **PASS** |

---

## 6. Notable Fix

`GameEngine.syncRuntimeToDomain` previously forced `damagePercent = 0` on every save. It now leaves domain-owned wear untouched (only syncs speed/steer).

---

## 7. Screenshots

| File | Subject |
|---|---|
| `m13_shot_01_stamina_hud.png` | Stamina meter |
| `m13_shot_02_vehicle_condition_meters.png` | Damage/tire meters |
| `m13_shot_03_tea_stall_prompt.png` | Stall proximity |
| `m13_shot_04_cha_purchase.png` | Post-cha HUD |
| `m13_shot_05_low_stamina_sprint_block.png` | Sprint blocked |
| `m13_shot_06_wear_after_travel.png` | Post-wear meters |
| `m13_shot_07_puncture_event.png` | Puncture banner |
| `m13_shot_08_mistri_repair_menu.png` | Repair dialogue |
| `m13_shot_09_post_repair_meters.png` | Restored meters |
| `m13_shot_10_performance.png` | F3 overlay |

---

## 8. Decision

**Milestone 13 COMPLETE — VERIFIED.** Phase 1 livelihood loop closed: earn → spend (tea/repair) → maintain → recover.
