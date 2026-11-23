import { describe, it, expect } from 'vitest';
import {
  AuthoritativeRoom,
  RATE_LIMIT_MAX_COMMANDS,
  TEA_COST_MINOR,
} from '../src/AuthoritativeRoom.js';

describe('AuthoritativeRoom spike (M39–M42)', () => {
  it('joins two clients with room ownership', () => {
    const room = new AuthoritativeRoom();
    const a = room.join('a');
    const b = room.join('b');
    expect(a.roomOwner).toBe(true);
    expect(b.roomOwner).toBe(false);
    expect(room.playerCount).toBe(2);
  });

  it('applies MOVE within delta and rejects teleport cheats', () => {
    const room = new AuthoritativeRoom();
    room.join('a');
    const ok = room.applyCommand({
      type: 'MOVE',
      clientId: 'a',
      sequence: 1,
      timestampMs: 1000,
      position: { x: 2, y: 0.5, z: 0 },
    });
    expect(ok.ok).toBe(true);

    const cheat = room.applyCommand({
      type: 'MOVE',
      clientId: 'a',
      sequence: 2,
      timestampMs: 1001,
      position: { x: 500, y: 0.5, z: 0 },
    });
    expect(cheat.ok).toBe(false);
    expect(cheat.reason).toBe('INVALID_MOVE');
  });

  it('rejects cash/mission cheat commands', () => {
    const room = new AuthoritativeRoom();
    room.join('a', 25000);
    const cash = room.applyCommand({
      type: 'SET_CASH_CHEAT',
      clientId: 'a',
      sequence: 1,
      timestampMs: 1,
    });
    expect(cash.reason).toBe('CHEAT_REJECTED');
    expect(room.getPlayer('a')!.cashMinorUnits).toBe(25000);

    const mission = room.applyCommand({
      type: 'COMPLETE_MISSION_CHEAT',
      clientId: 'a',
      sequence: 2,
      timestampMs: 2,
    });
    expect(mission.reason).toBe('CHEAT_REJECTED');
  });

  it('rate-limits burst commands', () => {
    const room = new AuthoritativeRoom();
    room.join('a');
    let lastReason: string | undefined;
    for (let i = 0; i < RATE_LIMIT_MAX_COMMANDS + 3; i++) {
      const r = room.applyCommand({
        type: 'MOVE',
        clientId: 'a',
        sequence: i,
        timestampMs: 5000,
        position: { x: Math.min(i * 0.1, 2), y: 0.5, z: 0 },
      });
      if (!r.ok) lastReason = r.reason;
    }
    expect(lastReason).toBe('RATE_LIMIT');
  });

  it('authorizes tea interact near stall and rejects when far', () => {
    const room = new AuthoritativeRoom();
    room.join('a', 25000);
    room.applyCommand({
      type: 'MOVE',
      clientId: 'a',
      sequence: 1,
      timestampMs: 10_000,
      position: { x: 3.2, y: 0.5, z: -2.4 },
    });
    const buy = room.applyCommand({
      type: 'INTERACT_TEA',
      clientId: 'a',
      sequence: 2,
      timestampMs: 10_001,
    });
    expect(buy.ok).toBe(true);
    expect(buy.cashMinorUnits).toBe(25000 - TEA_COST_MINOR);

    room.applyCommand({
      type: 'MOVE',
      clientId: 'a',
      sequence: 3,
      timestampMs: 10_002,
      position: { x: 0, y: 0.5, z: 40 },
    });
    const far = room.applyCommand({
      type: 'INTERACT_TEA',
      clientId: 'a',
      sequence: 4,
      timestampMs: 10_003,
    });
    expect(far.ok).toBe(false);
  });

  it('reconnect restores connection without wiping cash', () => {
    const room = new AuthoritativeRoom();
    room.join('a', 12000);
    room.disconnect('a');
    expect(room.getPlayer('a')!.connected).toBe(false);
    const back = room.reconnect('a');
    expect(back?.connected).toBe(true);
    expect(back?.cashMinorUnits).toBe(12000);
  });
});
