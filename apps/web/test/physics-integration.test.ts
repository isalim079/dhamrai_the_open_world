import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PhysicsWorld } from '../src/engine/PhysicsWorld.js';
import { CharacterController } from '../src/engine/CharacterController.js';
import type { InputState } from '../src/engine/InputManager.js';

describe('Rapier 3D Physics Simulation & Character Controller', () => {
  let physics: PhysicsWorld;

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
  });

  afterEach(() => {
    physics.dispose();
  });

  it('initializes Rapier 3D WASM world with Earth gravity (0, -9.81, 0)', () => {
    expect(physics.ready).toBe(true);
    expect(physics.world.gravity.y).toBeCloseTo(-9.81, 2);
    expect(physics.fixedDeltaTime).toBeCloseTo(1 / 60, 4);
  });

  it('executes fixed-timestep sub-stepping with accumulator', () => {
    let subStepsCalled = 0;

    // Advance by exactly 2 physics steps (2 * 1/60s = ~0.03333s)
    const alpha = physics.step(2 * physics.fixedDeltaTime, (dt) => {
      subStepsCalled++;
      expect(dt).toBeCloseTo(1 / 60, 4);
    });

    expect(subStepsCalled).toBe(2);
    expect(alpha).toBeGreaterThanOrEqual(0);
    expect(alpha).toBeLessThanOrEqual(1.0);
  });

  it('creates static ground and trimesh colliders', () => {
    const initialCount = physics.activeColliderCount;

    // Create a 256m ground box collider
    const ground = physics.createStaticBox(128, 0.5, 128, 0, -0.5, 0);
    expect(ground).not.toBeNull();
    expect(physics.activeColliderCount).toBe(initialCount + 1);

    // Create a road trimesh collider
    const positions = new Float32Array([
      -2, 0, -5,   2, 0, -5,   2, 0, 5,
      -2, 0, -5,   2, 0, 5,   -2, 0, 5,
    ]);
    const indices = new Uint32Array([0, 1, 2, 3, 4, 5]);
    const trimesh = physics.createStaticTrimesh(positions, indices);
    expect(trimesh).not.toBeNull();
    expect(physics.activeColliderCount).toBe(initialCount + 2);

    // Remove colliders
    physics.removeCollider(ground!);
    physics.removeCollider(trimesh!);
    expect(physics.activeColliderCount).toBe(initialCount);
  });

  it('initializes 1.7m player capsule character controller', () => {
    const char = new CharacterController(physics, { x: 0, y: 0.5, z: 0 });

    expect(char.radius).toBe(0.35);
    expect(char.halfHeight).toBe(0.5);
    // Total capsule height: 2*halfHeight + 2*radius = 1.0 + 0.7 = 1.7m
    expect(char.halfHeight * 2 + char.radius * 2).toBeCloseTo(1.7, 2);

    const pos = char.getPosition();
    expect(pos.x).toBeCloseTo(0.0, 2);
    expect(pos.y).toBeCloseTo(0.5, 2);
    expect(pos.z).toBeCloseTo(0.0, 2);

    char.dispose();
  });

  it('moves player forward along heading on forward input', () => {
    // Add ground plane
    physics.createStaticBox(100, 0.5, 100, 0, -0.5, 0);

    const char = new CharacterController(physics, { x: 0, y: 0.0, z: 0 });
    char.heading = 0.0; // Heading North (-Z)

    // Simulate forward input for 30 frames (0.5s)
    const forwardInput = { ...defaultInput, forward: true };
    for (let i = 0; i < 30; i++) {
      char.update(1 / 60, forwardInput);
      physics.world.step();
    }

    const pos = char.getPosition();
    // In Three.js coordinates, North is -Z
    expect(pos.z).toBeLessThan(0.0);

    char.dispose();
  });

  it('recovers player safely if fallen out of bounds', () => {
    const char = new CharacterController(physics, { x: 0, y: -15.0, z: 0 });

    // One update step triggers out-of-bounds recovery
    char.update(1 / 60, defaultInput);

    const pos = char.getPosition();
    // Recovered to Rathkhola Stand (0, 0.5, 0)
    expect(pos.x).toBeCloseTo(0.0, 1);
    expect(pos.y).toBeGreaterThanOrEqual(0.0);
    expect(pos.z).toBeCloseTo(0.0, 1);

    char.dispose();
  });
});
