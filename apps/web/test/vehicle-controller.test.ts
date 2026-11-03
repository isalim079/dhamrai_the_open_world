import { describe, it, expect, beforeEach } from 'vitest';
import { PhysicsWorld } from '../src/engine/PhysicsWorld.js';
import { RickshawVehicle } from '../src/engine/RickshawVehicle.js';
import type { InputState } from '../src/engine/InputManager.js';

describe('Pedal Rickshaw Raycast Vehicle Physics', () => {
  let physics: PhysicsWorld;
  let vehicle: RickshawVehicle;

  const defaultInput: InputState = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    sprint: false,
    jump: false,
    interact: false,
    cameraToggle: false,
    bell: false,
    mouseDeltaX: 0,
    mouseDeltaY: 0,
  };

  beforeEach(async () => {
    physics = new PhysicsWorld();
    await physics.init();
    vehicle = new RickshawVehicle(physics, { x: 0.0, y: 0.5, z: 0.0 });
  });

  it('configures authentic 3-wheel tricycle geometry', () => {
    expect(vehicle.wheels.length).toBe(3);

    // Front steerable wheel: center-forward (x=0, z < 0)
    expect(vehicle.wheels[0]!.offset.x).toBe(0.0);
    expect(vehicle.wheels[0]!.offset.z).toBeLessThan(0);

    // Rear drive wheels: symmetrical on lateral axis
    expect(vehicle.wheels[1]!.offset.x).toBeLessThan(0);
    expect(vehicle.wheels[2]!.offset.x).toBeGreaterThan(0);
    expect(Math.abs(vehicle.wheels[1]!.offset.x)).toBeCloseTo(Math.abs(vehicle.wheels[2]!.offset.x), 2);
  });

  it('enforces steering clamp to ±35 degrees', () => {
    vehicle.isOccupied = true;

    // Steer left hard for multiple frames
    const steerLeftInput = { ...defaultInput, left: true };
    for (let i = 0; i < 60; i++) {
      vehicle.update(1 / 60, steerLeftInput);
    }
    const maxSteer = (35 * Math.PI) / 180;
    expect(vehicle.steeringAngle).toBeCloseTo(maxSteer, 3);
    expect(vehicle.wheels[0]!.steeringAngle).toBeCloseTo(maxSteer, 3);

    // Steer right hard
    const steerRightInput = { ...defaultInput, right: true };
    for (let i = 0; i < 60; i++) {
      vehicle.update(1 / 60, steerRightInput);
    }
    expect(vehicle.steeringAngle).toBeCloseTo(-maxSteer, 3);
  });

  it('verifies mounting interaction distance gate (<= 2.5m)', () => {
    // Player within 2.0m -> can enter
    expect(vehicle.canEnter({ x: 1.5, y: 0.5, z: 1.0 })).toBe(true);

    // Player at exactly 2.5m -> can enter
    expect(vehicle.canEnter({ x: 2.5, y: 0.5, z: 0.0 })).toBe(true);

    // Player far away (3.5m) -> barred
    expect(vehicle.canEnter({ x: 3.5, y: 0.5, z: 0.0 })).toBe(false);
  });

  it('verifies safe exit speed gating (<= 0.5 m/s)', () => {
    // Stationary -> can exit
    vehicle.speedMps = 0.0;
    expect(vehicle.canExit()).toBe(true);

    vehicle.speedMps = 0.4;
    expect(vehicle.canExit()).toBe(true);

    // Moving fast (2.5 m/s) -> cannot exit
    vehicle.speedMps = 2.5;
    expect(vehicle.canExit()).toBe(false);
  });

  it('calculates driver saddle and passenger canopy seat offsets', () => {
    const driverSeat = vehicle.getDriverSeatPosition();
    const passengerSeat = vehicle.getPassengerSeatPosition();

    // Driver seat is in front of the rear axle
    expect(driverSeat.z).toBeLessThan(passengerSeat.z);
    // Both are elevated above ground
    expect(driverSeat.y).toBeGreaterThan(0.5);
    expect(passengerSeat.y).toBeGreaterThan(0.5);
  });
});
