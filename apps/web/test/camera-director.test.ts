import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { CameraDirector } from '../src/engine/CameraDirector.js';
import type { PhysicsWorld } from '../src/engine/PhysicsWorld.js';

describe('Camera Director & Occlusion Avoidance Architecture', () => {
  it('toggles seamlessly between first-person and third-person view modes', () => {
    const director = new CameraDirector();
    expect(director.mode).toBe('THIRD_PERSON');

    director.toggleMode();
    expect(director.mode).toBe('FIRST_PERSON');

    director.toggleMode();
    expect(director.mode).toBe('THIRD_PERSON');
  });

  it('clamps vertical pitch angle to prevent camera gimbal flipping', () => {
    const director = new CameraDirector();

    // Pitch way up (extreme positive delta)
    director.updateMouseLook(0, -5000);
    const maxPitch = (80 * Math.PI) / 180;
    expect(director.pitch).toBeCloseTo(maxPitch, 2);

    // Pitch way down (extreme negative delta)
    director.updateMouseLook(0, 10000);
    expect(director.pitch).toBeCloseTo(-maxPitch, 2);
  });

  it('positions camera at eye level in first-person mode', () => {
    const director = new CameraDirector();
    director.mode = 'FIRST_PERSON';

    const eyePos = { x: 10.0, y: 1.65, z: 25.0 };
    director.update(0.016, eyePos, 0.0);

    expect(director.camera.position.x).toBeCloseTo(10.0, 2);
    expect(director.camera.position.y).toBeCloseTo(1.65, 2);
    expect(director.camera.position.z).toBeCloseTo(25.0, 2);
  });

  it('calculates occlusion distance pullback against simulated physics hits', () => {
    const director = new CameraDirector();

    const mockPhysicsHit = {
      ready: true,
      rapier: {
        Ray: class {
          constructor(public origin: any, public dir: any) {}
        },
      },
      world: {
        castRay: () => ({ timeOfImpact: 2.0 }), // Obstacle hit at 2.0m
      },
    } as unknown as PhysicsWorld;

    const origin = { x: 0, y: 1, z: 0 };
    const direction = new THREE.Vector3(0, 0, 1);

    const clampedDist = director.calculateOcclusionDistance(origin, direction, 4.5, mockPhysicsHit);

    // Expected distance = timeOfImpact (2.0) - safety margin (0.25) = 1.75m
    expect(clampedDist).toBeCloseTo(1.75, 2);
    expect(clampedDist).toBeLessThan(4.5);
  });

  it('preserves full target distance when no obstacle is hit', () => {
    const director = new CameraDirector();

    const mockPhysicsNoHit = {
      ready: true,
      rapier: {
        Ray: class {
          constructor(public origin: any, public dir: any) {}
        },
      },
      world: {
        castRay: () => null, // No obstacle hit
      },
    } as unknown as PhysicsWorld;

    const origin = { x: 0, y: 1, z: 0 };
    const direction = new THREE.Vector3(0, 0, 1);

    const fullDist = director.calculateOcclusionDistance(origin, direction, 4.5, mockPhysicsNoHit);
    expect(fullDist).toBe(4.5);
  });
});
