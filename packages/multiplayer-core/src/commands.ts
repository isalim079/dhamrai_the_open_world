/**
 * Milestone 39 — Shared multiplayer command / event contracts.
 * Clients propose commands; server applies or rejects. Never trust client money/mission writes.
 */

export type MultiplayerCommandType =
  | 'MOVE'
  | 'INTERACT_TEA'
  | 'CLAIM_RENT'
  | 'SET_CASH_CHEAT' // always rejected — cheat probe
  | 'COMPLETE_MISSION_CHEAT'; // always rejected

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface MultiplayerCommand {
  type: MultiplayerCommandType;
  clientId: string;
  sequence: number;
  timestampMs: number;
  /** MOVE */
  position?: Vec3;
  headingRadians?: number;
  /** CLAIM_RENT */
  plotId?: string;
}

export type RejectReason =
  | 'RATE_LIMIT'
  | 'INVALID_MOVE'
  | 'UNKNOWN_CLIENT'
  | 'CHEAT_REJECTED'
  | 'NOT_ALLOWED'
  | 'COOLDOWN';

export interface CommandResult {
  ok: boolean;
  reason?: RejectReason;
  /** Snapshot hint after apply */
  cashMinorUnits?: number;
  position?: Vec3;
}

export interface PlayerRoomState {
  clientId: string;
  position: Vec3;
  headingRadians: number;
  cashMinorUnits: number;
  lastCommandMs: number;
  commandCountWindow: number;
  windowStartedMs: number;
  connected: boolean;
  roomOwner: boolean;
}
