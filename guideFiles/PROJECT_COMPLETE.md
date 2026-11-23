# Dhamrai Life — Project Closeout

**Closed:** 23 November 2026 (re-verified carefully same day)  
**Package manager:** Yarn Classic 1.22.22 · **Save schema:** SaveEnvelopeV2 (additive only) · **New npm deps this closeout:** none (except workspace package `@dhamrai/multiplayer-core` with no third-party deps)

## Tracks completed

| Track | IDs | Verification bar |
|---|---|---|
| Phase 2 closeout | M15–M20 | prior unit + CDP |
| Phase 3 | M21–M26 | prior unit + CDP |
| Phase 4 | M27–M32 | unit + `scratch/m27_m32_live_verification.cjs` |
| Phase 5 | M33–M38 | unit + `scratch/m33_m38_live_verification.cjs` (**8/8 PASS**) |
| Phase 6 spike | M39–M42 | unit `authoritative-room.test.ts` (**6/6 PASS**) + ADR |

## Careful Phase 5/6 re-check (23 Nov)

Initial closeout marked COMPLETE too early (thin reports, no CDP). Re-audit found and fixed:

1. **M34** — profiles not applied to driveables → wired `getVehicleProfile` into `RickshawVehicle`
2. **M33** — events registered but silent → toast/status announcement
3. **M36** — a11y toggles unused outside modal → HUD key-hint gate + `data-reduce-motion`

Then re-ran unit filters + CDP before keeping PASS.

## Explicitly out of scope / known limits

- Full five playable roles, Savar data package, true cadastral property
- Colyseus live rooms / public multiplayer launch
- Production Google OAuth credentials & Neon PostgreSQL live verification
- Certified historical claims (content uses source notes / fiction framing)

## How to run

```bash
yarn typecheck
yarn vitest run packages/game-core/test/daily-events.test.ts packages/game-core/test/vehicle-profiles.test.ts packages/save-core/test/migration-matrix.test.ts packages/multiplayer-core/test/authoritative-room.test.ts
node scratch/m33_m38_live_verification.cjs
yarn start:web
```

Canonical progress: `guideFiles/PROGRESS.md`.
