import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as THREE from 'three';
import { NPCManager } from '../src/engine/NPCManager.js';
import { PhysicsWorld } from '../src/engine/PhysicsWorld.js';

describe('NPC ambient paths (M23)', () => {
  let scene: THREE.Scene;
  let physics: PhysicsWorld;
  let npcManager: NPCManager;

  beforeEach(async () => {
    scene = new THREE.Scene();
    physics = new PhysicsWorld();
    await physics.init();
    npcManager = new NPCManager(scene, physics);
    npcManager.init();
  });

  afterEach(() => {
    npcManager.dispose();
    physics.dispose();
  });

  it('spawns at least 4 ambient walkers with waypoint loops', () => {
    expect(npcManager.ambientWalkerCount).toBeGreaterThanOrEqual(4);
  });
});
