import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as THREE from 'three';
import {
  StreetLampSystem,
  MAX_ACTIVE_STREET_LAMPS,
} from '../src/engine/atmosphere/StreetLampSystem.js';

describe('StreetLampSystem', () => {
  let scene: THREE.Scene;
  let lamps: StreetLampSystem;

  const anchors = [
    { x: 0, y: 0, z: 0 },
    { x: 10, y: 0, z: 0 },
    { x: 20, y: 0, z: 0 },
    { x: 100, y: 0, z: 0 },
    { x: 200, y: 0, z: 0 },
    { x: 300, y: 0, z: 0 },
    { x: 400, y: 0, z: 0 },
    { x: 500, y: 0, z: 0 },
  ];

  beforeEach(() => {
    scene = new THREE.Scene();
    lamps = new StreetLampSystem(scene, anchors);
  });

  afterEach(() => {
    lamps.dispose();
  });

  it('creates one bulb per anchor and caps PointLights', () => {
    expect(lamps.lampCount).toBe(anchors.length);
    let pointLights = 0;
    lamps.root.traverse((o) => {
      if ((o as THREE.PointLight).isLight && o.type === 'PointLight') pointLights++;
    });
    expect(pointLights).toBeLessThanOrEqual(MAX_ACTIVE_STREET_LAMPS);
  });

  it('disables all lights by day and enables ≤6 at night near player', () => {
    lamps.update({ x: 0, z: 0 }, 0);
    expect(lamps.activeLightCount).toBe(0);

    lamps.update({ x: 0, z: 0 }, 1);
    expect(lamps.activeLightCount).toBeGreaterThan(0);
    expect(lamps.activeLightCount).toBeLessThanOrEqual(MAX_ACTIVE_STREET_LAMPS);
  });

  it('dispose clears scene attachment', () => {
    lamps.update({ x: 0, z: 0 }, 1);
    lamps.dispose();
    expect(lamps.isDisposed).toBe(true);
    expect(scene.getObjectByName('StreetLampSystem')).toBeUndefined();
  });
});
