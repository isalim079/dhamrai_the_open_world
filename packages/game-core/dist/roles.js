/**
 * Dhamrai Life — Player Archetypes & Rickshaw Driver Role
 * =========================================================
 * Declares the initial archetype state, vehicle rental rules,
 * starting documents, and starting inventory for the Rickshaw Driver.
 */
import { PHASE_1_ANCHORS } from '@dhamrai/shared-contracts';
export const RICKSHAW_STARTING_CASH_TAKAS = 250;
export const RICKSHAW_STARTING_CASH_POISHA = 25000; // ৳250.00
export const RICKSHAW_DAILY_RENT_POISHA = 5000; // ৳50.00
export const RICKSHAW_LICENSE_SLIP_ITEM = {
    id: 'rickshaw_license_slip',
    nameBn: 'রিকশার লাইসেন্স স্লিপ',
    nameEn: 'Rickshaw License Slip',
    category: 'DOCUMENT',
    quantity: 1,
    isStackable: false,
    maxStackSize: 1,
    descriptionBn: 'ধামরাই পৌরসভা অনুমোদিত প্যাডেল রিকশা চালানোর বৈধ্য কাগজ।',
    descriptionEn: 'Valid municipal permit issued for operating a pedal rickshaw in Dhamrai.',
    metadata: {
        registrationNumber: 'DHAM-RICK-402',
        issuedLocality: 'Dhamrai Pourashava',
        isValid: true,
    },
};
export function createInitialRickshawDriverState() {
    return {
        roleId: 'rickshaw_driver',
        position: { ...PHASE_1_ANCHORS.RATHKHOLA_ORIGIN },
        headingRadians: 0,
        isInVehicle: false,
        vehicleState: {
            id: 'rickshaw_rented_01',
            model: 'basic_pedal_rickshaw',
            isRented: true,
            dailyRentPoisha: RICKSHAW_DAILY_RENT_POISHA,
            conditionPercent: 100,
            speedMps: 0,
            steeringAngleRad: 0,
            damagePercent: 0,
        },
        reputations: {
            transportReputation: 10,
            civicTrust: 10,
            policeHeat: 0,
            artisanGuildTrust: 0,
        },
    };
}
//# sourceMappingURL=roles.js.map