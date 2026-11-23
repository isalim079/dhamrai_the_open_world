/**
 * Dhamrai Life — Player Archetypes & Rickshaw Driver Role
 * =========================================================
 * Declares the initial archetype state, vehicle rental rules,
 * starting documents, and starting inventory for the Rickshaw Driver.
 */
import { PHASE_1_ANCHORS } from '@dhamrai/shared-contracts';
export const RICKSHAW_STARTING_CASH_TAKAS = 250;
export const RICKSHAW_STARTING_CASH_MINOR_UNITS = 25000; // ৳250.00 BDT
export const RICKSHAW_STARTING_CASH_POISHA = RICKSHAW_STARTING_CASH_MINOR_UNITS; // Alias
export const RICKSHAW_DAILY_RENT_MINOR_UNITS = 5000; // ৳50.00 BDT
export const RICKSHAW_DAILY_RENT_POISHA = RICKSHAW_DAILY_RENT_MINOR_UNITS; // Alias
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
export const BRASS_BELLS_CARGO_ITEM = {
    id: 'brass_bells_cargo',
    nameBn: 'পিতলের ঘণ্টা ও পাত্রের চালান',
    nameEn: 'Brass Bells & Vessels Consignment',
    category: 'CARGO',
    quantity: 1,
    isStackable: false,
    maxStackSize: 1,
    descriptionBn: 'গৌরাঙ্গ কর্মকারের কর্মশালা থেকে রথখোলা স্ট্যান্ডে পৌঁছে দেওয়ার ঐতিহ্যবাহী কাঁসা-পিতলের তৈরি ঘণ্টা।',
    descriptionEn: 'Traditional brass craft bells and ritual vessels from Gouranga Karmakar workshop for Rathkhola stand.',
    metadata: {
        origin: 'Kayetpara Metal Workshop',
        destination: 'Rathkhola Stand',
        weightKg: 12,
    },
};
export const FARE_PASSENGER_KAMAL = {
    id: 'npc_passenger_kamal',
    nameBn: 'কামাল মিয়া (যাত্রী)',
    nameEn: 'Kamal Mia (Passenger)',
    role: 'STORY_PASSENGER',
    spawnPosition: { x: 8.0, y: 0.0, z: -5.0 },
    spawnHeadingRadians: Math.PI * 0.5,
    dialogueTreeId: 'dialogue_fare_kamal',
    isBoardablePassenger: true,
};
export const FARE_PASSENGER_SUFIA = {
    id: 'npc_passenger_sufia',
    nameBn: 'সুফিয়া বেগম (যাত্রী)',
    nameEn: 'Sufia Begum (Passenger)',
    role: 'STORY_PASSENGER',
    spawnPosition: { x: -12.0, y: 0.0, z: 8.0 },
    spawnHeadingRadians: Math.PI * 0.25,
    dialogueTreeId: 'dialogue_fare_sufia',
    isBoardablePassenger: true,
};
export function createInitialRickshawDriverState() {
    return {
        roleId: 'rickshaw_driver',
        position: { ...PHASE_1_ANCHORS.RATHKHOLA_ORIGIN },
        headingRadians: 0,
        isInVehicle: false,
        staminaPercent: 100,
        vehicleState: {
            id: 'rickshaw_rented_01',
            model: 'basic_pedal_rickshaw',
            isRented: true,
            dailyRentMinorUnits: RICKSHAW_DAILY_RENT_MINOR_UNITS,
            dailyRentPoisha: RICKSHAW_DAILY_RENT_MINOR_UNITS,
            conditionPercent: 100,
            speedMps: 0,
            steeringAngleRad: 0,
            damagePercent: 0,
            tirePressurePercent: 100,
            isPunctured: false,
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