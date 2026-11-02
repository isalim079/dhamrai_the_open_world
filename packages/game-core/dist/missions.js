/**
 * Dhamrai Life — Mission Domain & Declarative State Machine
 * ==========================================================
 * Strict, deterministic mission lifecycle with guaranteed idempotent payouts.
 */
import { PHASE_1_ANCHORS, CURRENCY_CODE_BDT, } from '@dhamrai/shared-contracts';
export const PHASE_1_MISSIONS = {
    mission_1_first_fare: {
        id: 'mission_1_first_fare',
        bengaliTitle: 'দিনের প্রথম যাত্রী',
        englishTitle: 'First Fare',
        description: 'Pick up passenger at Rathkhola Market Corner and transport to Hardinge High School Gate.',
        rewardMinorUnits: 3000, // ৳30.00 BDT
        currency: CURRENCY_CODE_BDT,
        reputationDelta: 5,
        objectives: [
            {
                id: 'obj_m1_pickup',
                bengaliTitle: 'যাত্রী তুলুন (রথখোলা বাজার মোড়)',
                description: 'Drive to Rathkhola Market Corner and pick up the student passenger.',
                targetPosition: PHASE_1_ANCHORS.RATHKHOLA_MARKET_PICKUP,
                completionRadiusM: 15.0,
                isCompleted: false,
            },
            {
                id: 'obj_m1_dropoff',
                bengaliTitle: 'যাত্রী নামিয়ে দিন (হার্ডিঞ্জ স্কুল গেট)',
                description: 'Transport the student north along the town road to Hardinge High School Gate.',
                targetPosition: PHASE_1_ANCHORS.HARDINGE_HIGH_SCHOOL,
                completionRadiusM: 15.0,
                isCompleted: false,
            },
        ],
    },
    mission_2_police_checkpoint: {
        id: 'mission_2_police_checkpoint',
        bengaliTitle: 'চেকপোস্ট ও কাগজপত্র',
        englishTitle: 'Police Checkpoint & Documents',
        description: 'Present valid vehicle license documents at Thana Junction police patrol.',
        rewardMinorUnits: 0, // Civic duty: purely reputation gain
        currency: CURRENCY_CODE_BDT,
        reputationDelta: 5,
        objectives: [
            {
                id: 'obj_m2_approach',
                bengaliTitle: 'থানা মোড় চেকপোস্টে থামুন',
                description: 'Approach the police checkpoint at Thana Junction and halt vehicle.',
                targetPosition: PHASE_1_ANCHORS.THANA_JUNCTION_CHECKPOINT,
                completionRadiusM: 12.0,
                isCompleted: false,
            },
            {
                id: 'obj_m2_show_docs',
                bengaliTitle: 'রিকশার লাইসেন্স কাগজ দেখান',
                description: 'Present vehicle registration slip from inventory to the patrol officer.',
                targetPosition: PHASE_1_ANCHORS.THANA_JUNCTION_CHECKPOINT,
                completionRadiusM: 12.0,
                isCompleted: false,
            },
        ],
    },
    mission_3_artisan_order: {
        id: 'mission_3_artisan_order',
        bengaliTitle: 'কাঁসা-পিতলের ফরমাশ',
        englishTitle: 'Brass Artisan Order',
        description: 'Collect brass bell cargo from Kayetpara workshop and deliver to Rathkhola artisan stand.',
        rewardMinorUnits: 7500, // ৳75.00 BDT
        currency: CURRENCY_CODE_BDT,
        reputationDelta: 10,
        objectives: [
            {
                id: 'obj_m3_collect_cargo',
                bengaliTitle: 'কায়েতপাড়া ওয়ার্কশপ থেকে মালামাল নিন',
                description: 'Collect newly cast brass bell cargo from the master artisan.',
                targetPosition: PHASE_1_ANCHORS.KAYETPARA_METAL_WORKSHOP,
                completionRadiusM: 15.0,
                isCompleted: false,
            },
            {
                id: 'obj_m3_deliver_cargo',
                bengaliTitle: 'রথখোলা কাংস্য বিপণিতে মাল খালাস করুন',
                description: 'Deliver brass cargo safely to the wholesale showroom at Rathkhola.',
                targetPosition: PHASE_1_ANCHORS.RATHKHOLA_ORIGIN,
                completionRadiusM: 15.0,
                isCompleted: false,
            },
        ],
    },
};
export class MissionDomain {
    _definitions;
    _instances = new Map();
    constructor(definitions = PHASE_1_MISSIONS, initialInstances) {
        this._definitions = { ...definitions };
        // Initialize all definitions into instance map
        for (const [id] of Object.entries(this._definitions)) {
            const initial = initialInstances?.[id];
            this._instances.set(id, {
                missionId: id,
                state: initial?.state ?? 'AVAILABLE',
                completedObjectiveIds: initial?.completedObjectiveIds ? [...initial.completedObjectiveIds] : [],
                startedAtMs: initial?.startedAtMs,
                completedAtMs: initial?.completedAtMs,
                payoutClaimed: initial?.payoutClaimed ?? (initial?.state === 'COMPLETED'),
                payoutTxId: initial?.payoutTxId,
            });
        }
    }
    getDefinition(missionId) {
        return this._definitions[missionId];
    }
    getInstance(missionId) {
        const inst = this._instances.get(missionId);
        return inst ? { ...inst, completedObjectiveIds: [...inst.completedObjectiveIds] } : undefined;
    }
    getAllInstances() {
        const out = {};
        for (const [id, inst] of this._instances.entries()) {
            out[id] = { ...inst, completedObjectiveIds: [...inst.completedObjectiveIds] };
        }
        return out;
    }
    activateMission(missionId, timestampMs = Date.now()) {
        const inst = this._instances.get(missionId);
        if (!inst) {
            throw new Error(`Mission "${missionId}" does not exist.`);
        }
        if (inst.state === 'COMPLETED') {
            throw new Error(`Cannot activate already completed mission: ${missionId}`);
        }
        if (inst.state === 'ACTIVE') {
            return; // Already active, no-op
        }
        inst.state = 'ACTIVE';
        inst.startedAtMs = timestampMs;
    }
    completeObjective(missionId, objectiveId) {
        const inst = this._instances.get(missionId);
        if (!inst) {
            throw new Error(`Mission "${missionId}" does not exist.`);
        }
        if (inst.state !== 'ACTIVE') {
            throw new Error(`Cannot complete objective "${objectiveId}" on mission "${missionId}" in state "${inst.state}". Mission must be ACTIVE.`);
        }
        const def = this._definitions[missionId];
        if (!def) {
            throw new Error(`Mission definition "${missionId}" missing.`);
        }
        const objDef = def.objectives.find((o) => o.id === objectiveId);
        if (!objDef) {
            throw new Error(`Objective "${objectiveId}" not found in mission "${missionId}".`);
        }
        if (!inst.completedObjectiveIds.includes(objectiveId)) {
            inst.completedObjectiveIds.push(objectiveId);
        }
    }
    areAllObjectivesCompleted(missionId) {
        const inst = this._instances.get(missionId);
        const def = this._definitions[missionId];
        if (!inst || !def)
            return false;
        return def.objectives.every((obj) => inst.completedObjectiveIds.includes(obj.id));
    }
    /**
     * Completes a mission and awards payouts and reputation atomically.
     * GUARANTEE: Idempotent. Subsequent calls on an already completed mission
     * return { success: true, payoutApplied: false } and NEVER award double cash or reputation.
     */
    completeMission(missionId, economy, onReputationGain, timestampMs = Date.now()) {
        const inst = this._instances.get(missionId);
        if (!inst) {
            return { success: false, payoutApplied: false, reason: `Mission "${missionId}" not found.` };
        }
        // Idempotency guard: Already completed
        if (inst.state === 'COMPLETED') {
            return {
                success: true,
                payoutApplied: false,
                transactionId: inst.payoutTxId,
                payoutMinorUnits: 0,
                payoutPence: 0,
                reputationDelta: 0,
                reason: 'ALREADY_COMPLETED',
            };
        }
        if (inst.state !== 'ACTIVE') {
            return {
                success: false,
                payoutApplied: false,
                reason: `Cannot complete mission in state "${inst.state}". Mission must be ACTIVE.`,
            };
        }
        const def = this._definitions[missionId];
        if (!def) {
            return { success: false, payoutApplied: false, reason: `Definition for "${missionId}" missing.` };
        }
        if (!this.areAllObjectivesCompleted(missionId)) {
            return {
                success: false,
                payoutApplied: false,
                reason: `Cannot complete mission "${missionId}": Incomplete objectives.`,
            };
        }
        // Deterministic transaction ID for the payout
        const payoutTxId = `tx_payout_${missionId}_${timestampMs}`;
        // Apply financial payout if reward > 0 and not previously claimed
        let txApplied = false;
        if (def.rewardMinorUnits > 0 && !inst.payoutClaimed) {
            const category = missionId.includes('artisan') ? 'DELIVERY_PAYMENT' : 'FARE_PAYMENT';
            economy.credit(def.rewardMinorUnits, category, `Reward for completing "${def.bengaliTitle}" (${def.englishTitle})`, timestampMs, payoutTxId);
            txApplied = true;
            inst.payoutClaimed = true;
            inst.payoutTxId = payoutTxId;
        }
        // Award reputation
        if (def.reputationDelta > 0 && onReputationGain) {
            onReputationGain(def.reputationDelta);
        }
        inst.state = 'COMPLETED';
        inst.completedAtMs = timestampMs;
        return {
            success: true,
            payoutApplied: txApplied,
            transactionId: payoutTxId,
            payoutMinorUnits: def.rewardMinorUnits,
            payoutPence: def.rewardMinorUnits,
            reputationDelta: def.reputationDelta,
        };
    }
    failMission(missionId, reason) {
        const inst = this._instances.get(missionId);
        if (!inst) {
            throw new Error(`Mission "${missionId}" does not exist.`);
        }
        if (inst.state === 'COMPLETED') {
            throw new Error(`Cannot fail already completed mission: ${missionId}`);
        }
        inst.state = 'FAILED';
        inst.failureReason = reason;
    }
}
//# sourceMappingURL=missions.js.map