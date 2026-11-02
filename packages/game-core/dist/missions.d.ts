/**
 * Dhamrai Life — Mission Domain & Declarative State Machine
 * ==========================================================
 * Strict, deterministic mission lifecycle with guaranteed idempotent payouts.
 */
import { MissionDefinition, MissionState } from '@dhamrai/shared-contracts';
import { EconomyDomain } from './economy.js';
export interface MissionInstance {
    missionId: string;
    state: MissionState;
    completedObjectiveIds: string[];
    startedAtMs?: number;
    completedAtMs?: number;
    payoutClaimed: boolean;
    payoutTxId?: string;
    failureReason?: string;
}
export interface MissionCompletionResult {
    success: boolean;
    payoutApplied: boolean;
    transactionId?: string;
    payoutPence?: number;
    reputationDelta?: number;
    reason?: string;
}
export declare const PHASE_1_MISSIONS: Record<string, MissionDefinition>;
export declare class MissionDomain {
    private readonly _definitions;
    private readonly _instances;
    constructor(definitions?: Record<string, MissionDefinition>, initialInstances?: Record<string, Partial<MissionInstance>>);
    getDefinition(missionId: string): MissionDefinition | undefined;
    getInstance(missionId: string): MissionInstance | undefined;
    getAllInstances(): Record<string, MissionInstance>;
    activateMission(missionId: string, timestampMs?: number): void;
    completeObjective(missionId: string, objectiveId: string): void;
    areAllObjectivesCompleted(missionId: string): boolean;
    /**
     * Completes a mission and awards payouts and reputation atomically.
     * GUARANTEE: Idempotent. Subsequent calls on an already completed mission
     * return { success: true, payoutApplied: false } and NEVER award double cash or reputation.
     */
    completeMission(missionId: string, economy: EconomyDomain, onReputationGain?: (repDelta: number) => void, timestampMs?: number): MissionCompletionResult;
    failMission(missionId: string, reason: string): void;
}
//# sourceMappingURL=missions.d.ts.map