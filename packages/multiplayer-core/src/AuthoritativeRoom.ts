/**
 * Milestone 40–42 — In-process authoritative room spike (no Colyseus dependency).
 */

import type {
  CommandResult,
  MultiplayerCommand,
  PlayerRoomState,
  Vec3,
} from './commands.js';

export const MAX_MOVE_DELTA_M = 8;
export const RATE_LIMIT_WINDOW_MS = 1000;
export const RATE_LIMIT_MAX_COMMANDS = 20;
export const TEA_COST_MINOR = 500; // ৳5
export const TEA_INTERACT_RADIUS_M = 3;
export const DEFAULT_TEA_STALL: Vec3 = { x: 3.2, y: 0, z: -2.4 };

export class AuthoritativeRoom {
  public readonly roomId: string;
  private readonly players = new Map<string, PlayerRoomState>();
  private ownerClientId: string | null = null;
  private readonly teaStall: Vec3;

  constructor(roomId = 'dhamrai_spike_1', teaStall: Vec3 = DEFAULT_TEA_STALL) {
    this.roomId = roomId;
    this.teaStall = teaStall;
  }

  public join(clientId: string, startingCash = 25000): PlayerRoomState {
    const existing = this.players.get(clientId);
    if (existing) {
      existing.connected = true;
      return existing;
    }
    const isOwner = this.ownerClientId === null;
    if (isOwner) this.ownerClientId = clientId;
    const state: PlayerRoomState = {
      clientId,
      position: { x: 0, y: 0.5, z: 0 },
      headingRadians: 0,
      cashMinorUnits: startingCash,
      lastCommandMs: 0,
      commandCountWindow: 0,
      windowStartedMs: 0,
      connected: true,
      roomOwner: isOwner,
    };
    this.players.set(clientId, state);
    return state;
  }

  public disconnect(clientId: string): void {
    const p = this.players.get(clientId);
    if (p) p.connected = false;
  }

  /** Milestone 42 — reconnect restores presence without resetting economy */
  public reconnect(clientId: string): PlayerRoomState | null {
    const p = this.players.get(clientId);
    if (!p) return null;
    p.connected = true;
    return p;
  }

  public getPlayer(clientId: string): Readonly<PlayerRoomState> | undefined {
    return this.players.get(clientId);
  }

  public get playerCount(): number {
    return this.players.size;
  }

  public applyCommand(cmd: MultiplayerCommand): CommandResult {
    const player = this.players.get(cmd.clientId);
    if (!player || !player.connected) {
      return { ok: false, reason: 'UNKNOWN_CLIENT' };
    }

    // Rate limit
    if (cmd.timestampMs - player.windowStartedMs > RATE_LIMIT_WINDOW_MS) {
      player.windowStartedMs = cmd.timestampMs;
      player.commandCountWindow = 0;
    }
    player.commandCountWindow += 1;
    if (player.commandCountWindow > RATE_LIMIT_MAX_COMMANDS) {
      return { ok: false, reason: 'RATE_LIMIT' };
    }
    player.lastCommandMs = cmd.timestampMs;

    switch (cmd.type) {
      case 'SET_CASH_CHEAT':
      case 'COMPLETE_MISSION_CHEAT':
        return { ok: false, reason: 'CHEAT_REJECTED' };

      case 'MOVE': {
        if (!cmd.position) return { ok: false, reason: 'INVALID_MOVE' };
        const dx = cmd.position.x - player.position.x;
        const dz = cmd.position.z - player.position.z;
        const dist = Math.hypot(dx, dz);
        if (dist > MAX_MOVE_DELTA_M) {
          return { ok: false, reason: 'INVALID_MOVE' };
        }
        player.position = { ...cmd.position };
        if (typeof cmd.headingRadians === 'number') {
          player.headingRadians = cmd.headingRadians;
        }
        return { ok: true, position: { ...player.position }, cashMinorUnits: player.cashMinorUnits };
      }

      case 'INTERACT_TEA': {
        const d = Math.hypot(
          player.position.x - this.teaStall.x,
          player.position.z - this.teaStall.z
        );
        if (d > TEA_INTERACT_RADIUS_M) {
          return { ok: false, reason: 'NOT_ALLOWED' };
        }
        if (player.cashMinorUnits < TEA_COST_MINOR) {
          return { ok: false, reason: 'NOT_ALLOWED' };
        }
        player.cashMinorUnits -= TEA_COST_MINOR;
        return { ok: true, cashMinorUnits: player.cashMinorUnits, position: { ...player.position } };
      }

      case 'CLAIM_RENT':
        // Spike: rent claims stay single-player domain; reject in MP room
        return { ok: false, reason: 'NOT_ALLOWED' };

      default:
        return { ok: false, reason: 'NOT_ALLOWED' };
    }
  }
}
