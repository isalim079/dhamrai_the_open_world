/**
 * Milestone 14 — Samples speed / Thana proximity / day phase and drives domain stops.
 */

import { PHASE_1_ANCHORS, type WorldPosition } from '@dhamrai/shared-contracts';
import type { GameCoreEngine } from '@dhamrai/game-core';
import { FLEE_RADIUS_M, THANA_ENFORCE_RADIUS_M } from '@dhamrai/game-core';

export interface CivicTickInput {
  playerPos: WorldPosition;
  speedKph: number;
  inVehicle: boolean;
  dayPhase: string;
  nowMs?: number;
}

export interface CivicTickResult {
  stopOpened: boolean;
  fled: boolean;
  stopId?: string;
  fineMinorUnits?: number;
  heat?: number;
  messageBn?: string;
  messageEn?: string;
  shouldOpenDialogue: boolean;
}

export class CivicEnforcementBridge {
  public tick(engine: GameCoreEngine, input: CivicTickInput): CivicTickResult {
    const nowMs = input.nowMs ?? Date.now();
    const thana = PHASE_1_ANCHORS.THANA_JUNCTION_CHECKPOINT;
    const distanceToThanaM = Math.hypot(input.playerPos.x - thana.x, input.playerPos.z - thana.z);
    const isNightOrDusk = input.dayPhase === 'night' || input.dayPhase === 'dusk';

    const active = engine.activePoliceStop;
    let playerDistanceFromStopM = 0;
    if (active) {
      playerDistanceFromStopM = Math.hypot(
        input.playerPos.x - active.stopX,
        input.playerPos.z - active.stopZ
      );
    }

    const inf = engine.evaluateInfraction({
      speedKph: input.speedKph,
      distanceToThanaM,
      inVehicle: input.inVehicle,
      isNightOrDusk,
      hasLicense: engine.inventory.hasItem('rickshaw_license_slip'),
      nowMs,
      playerDistanceFromStopM,
    });

    if (!inf) {
      return { stopOpened: false, fled: false, shouldOpenDialogue: false };
    }

    if (inf.code === 'FLEE_STOP' && active) {
      const updated = engine.applyFleePenalty(inf.fineMinorUnits, inf.heatDelta, nowMs);
      return {
        stopOpened: false,
        fled: true,
        stopId: updated?.id ?? active.id,
        fineMinorUnits: updated?.currentFineMinorUnits ?? active.currentFineMinorUnits,
        heat: engine.policeHeat,
        messageBn: 'চেকপোস্ট থেকে পালিয়েছেন — জরিমানা ও হিট বেড়েছে',
        messageEn: 'Fled the stop — fine and heat increased',
        shouldOpenDialogue: true,
      };
    }

    const stop = engine.beginPoliceStop(
      inf,
      { x: input.playerPos.x, z: input.playerPos.z },
      nowMs
    );

    return {
      stopOpened: true,
      fled: false,
      stopId: stop.id,
      fineMinorUnits: stop.currentFineMinorUnits,
      heat: engine.policeHeat,
      messageBn: `পুলিশ স্টপ! জরিমানা ৳${(stop.currentFineMinorUnits / 100).toFixed(0)}`,
      messageEn: `Police stop! Fine ৳${(stop.currentFineMinorUnits / 100).toFixed(0)}`,
      shouldOpenDialogue: true,
    };
  }

  public distanceToThana(pos: WorldPosition): number {
    const t = PHASE_1_ANCHORS.THANA_JUNCTION_CHECKPOINT;
    return Math.hypot(pos.x - t.x, pos.z - t.z);
  }

  public isNearThana(pos: WorldPosition, heat = 0): boolean {
    const boost = heat >= 40 ? 0.5 : 0;
    return this.distanceToThana(pos) <= THANA_ENFORCE_RADIUS_M + boost;
  }

  public isOutsideFleeRadius(engine: GameCoreEngine, pos: WorldPosition): boolean {
    const active = engine.activePoliceStop;
    if (!active) return false;
    return Math.hypot(pos.x - active.stopX, pos.z - active.stopZ) > FLEE_RADIUS_M;
  }
}
