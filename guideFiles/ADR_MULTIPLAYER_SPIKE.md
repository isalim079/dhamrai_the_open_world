# ADR — Multiplayer Feasibility Spike (Milestone 42)

**Status:** Accepted for spike closure · **Date:** 23 November 2026

## Context
Phase 6 requires proving that single-player domain rules can move behind an authoritative server without trusting client money/mission writes. ROADMAP lists Colyseus as a candidate; project constraints prefer **zero new npm dependencies** for this closeout.

## Decision
1. Ship **`@dhamrai/multiplayer-core`**: pure TypeScript in-process `AuthoritativeRoom` with shared command contracts (`MOVE`, `INTERACT_TEA`, cheat probes).
2. **Do not** add Colyseus (or any realtime package) in this spike.
3. Single-player (`apps/web` + `@dhamrai/game-core`) remains fully independent — MP package is opt-in / unused by the live client loop.

## Consequences
- **Pros:** No lockfile churn; deterministic Vitest coverage for rate limits, teleport rejection, cheat rejection, reconnect; clear command boundary reusable if Colyseus is adopted later.
- **Cons:** No live two-browser WebSocket demo in this slice; networking, matchmaking, and binary state sync remain future work.
- **Follow-up (optional):** If product prioritizes live MP, evaluate Colyseus room wrapping the same command handlers; keep `game-core` as the economy/mission authority.

## Alternatives considered
| Option | Why not now |
|---|---|
| Add Colyseus + sample clients | New dependency; contradicts closeout constraint; larger surface than needed for feasibility proof |
| Full authoritative NestJS game server | Out of Phase 6 spike scope |

## Verification
See `packages/multiplayer-core/test/authoritative-room.test.ts` (join, move, tea interact, rate limit, cheats, reconnect).
