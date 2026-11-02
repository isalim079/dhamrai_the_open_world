import { describe, it, expect } from 'vitest';
import {
  createInitialRickshawDriverState,
  RICKSHAW_STARTING_CASH_TAKAS,
  RICKSHAW_STARTING_CASH_POISHA,
  RICKSHAW_DAILY_RENT_POISHA,
  RICKSHAW_LICENSE_SLIP_ITEM,
} from '../src/roles.js';

describe('RickshawRole — Starting Conditions & Rental Mechanics', () => {
  it('declares the approved starting economic constants', () => {
    expect(RICKSHAW_STARTING_CASH_TAKAS).toBe(250);
    expect(RICKSHAW_STARTING_CASH_POISHA).toBe(25000); // ৳250.00
    expect(RICKSHAW_DAILY_RENT_POISHA).toBe(5000); // ৳50.00
  });

  it('initializes the Rickshaw Driver archetype with canonical position and status', () => {
    const role = createInitialRickshawDriverState();

    expect(role.roleId).toBe('rickshaw_driver');
    expect(role.position).toEqual({ x: 0.0, y: 0.0, z: 0.0 });
    expect(role.isInVehicle).toBe(false);

    expect(role.vehicleState.isRented).toBe(true);
    expect(role.vehicleState.model).toBe('basic_pedal_rickshaw');
    expect(role.vehicleState.dailyRentPoisha).toBe(5000);
    expect(role.vehicleState.damagePercent).toBe(0);

    expect(role.reputations.transportReputation).toBe(10);
    expect(role.reputations.civicTrust).toBe(10);
    expect(role.reputations.policeHeat).toBe(0);
    expect(role.reputations.artisanGuildTrust).toBe(0);
  });

  it('declares the valid Rickshaw License Slip municipal document', () => {
    expect(RICKSHAW_LICENSE_SLIP_ITEM.id).toBe('rickshaw_license_slip');
    expect(RICKSHAW_LICENSE_SLIP_ITEM.category).toBe('DOCUMENT');
    expect(RICKSHAW_LICENSE_SLIP_ITEM.isStackable).toBe(false);
    expect(RICKSHAW_LICENSE_SLIP_ITEM.metadata?.registrationNumber).toBe('DHAM-RICK-402');
  });
});
