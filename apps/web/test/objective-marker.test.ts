import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import {
  ObjectiveMarker,
  bearingToTargetDeg,
  distanceToTargetM,
} from '../src/engine/ObjectiveMarker.js';

describe('ObjectiveMarker — M15 wayfinding', () => {
  it('computes distance and relative bearing', () => {
    const from = { x: 0, y: 0, z: 0 };
    const north = { x: 0, y: 0, z: -100 };
    expect(distanceToTargetM(from, north)).toBeCloseTo(100, 5);
    // Heading 0 faces -Z; target north → bearing ~0
    expect(Math.abs(bearingToTargetDeg(from, north, 0))).toBeLessThan(1);

    const east = { x: 50, y: 0, z: 0 };
    const bearingEast = bearingToTargetDeg(from, east, 0);
    expect(bearingEast).toBeGreaterThan(80);
    expect(bearingEast).toBeLessThan(100);
  });

  it('shows and hides world beacon', () => {
    const scene = new THREE.Scene();
    const marker = new ObjectiveMarker(scene);
    expect(marker.root.visible).toBe(false);
    marker.setTarget({ x: 10, y: 0, z: -20 });
    expect(marker.root.visible).toBe(true);
    expect(marker.root.position.x).toBe(10);
    expect(marker.root.position.z).toBe(-20);
    marker.update(0.16);
    marker.setTarget(null);
    expect(marker.root.visible).toBe(false);
    marker.dispose();
  });
});
