import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as THREE from 'three';
import { NPCManager, STORY_NPCS } from '../src/engine/NPCManager.js';
import { PhysicsWorld } from '../src/engine/PhysicsWorld.js';
import { PHASE_1_ANCHORS } from '@dhamrai/shared-contracts';

describe('NPCManager — Spawning, Proximity & Passenger Transitions', () => {
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

  it('should spawn all 3 key story NPCs at their canonical anchors', () => {
    for (const def of STORY_NPCS) {
      const inst = npcManager.npcs.get(def.id);
      expect(inst).toBeDefined();
      expect(inst?.definition.id).toBe(def.id);
      expect(inst?.mesh).toBeDefined();
      expect(inst?.currentPosition.x).toBeCloseTo(def.spawnPosition.x);
      expect(inst?.currentPosition.z).toBeCloseTo(def.spawnPosition.z);
    }
  });

  it('should detect nearby interactive NPC when within 2.5m radius', () => {
    // Farhana is at (15.0, 0.0, -10.0)
    const nearbyPos = { x: 14.0, y: 0.0, z: -10.5 };
    const detected = npcManager.getNearbyInteractiveNPC(nearbyPos, 2.5);
    expect(detected).toBeDefined();
    expect(detected?.definition.id).toBe('npc_student_farhana');
  });

  it('should return null when player is outside interaction radius', () => {
    const distantPos = { x: 0.0, y: 0.0, z: 0.0 }; // 18m away from Farhana
    const detected = npcManager.getNearbyInteractiveNPC(distantPos, 2.5);
    expect(detected).toBeNull();
  });

  it('should transition Farhana between boarded state in rickshaw and dismounted in scene', () => {
    const rickshawGroup = new THREE.Group();
    scene.add(rickshawGroup);

    const seatPos = { x: 0, y: 0.65, z: 0.55 };
    const boarded = npcManager.boardPassenger('npc_student_farhana', rickshawGroup, seatPos);
    expect(boarded).toBe(true);

    const farhana = npcManager.npcs.get('npc_student_farhana');
    expect(farhana?.isBoarded).toBe(true);
    expect(farhana?.mesh.parent).toBe(rickshawGroup);

    // Boarded passenger cannot be targeted by proximity interaction
    const checkWhileBoarded = npcManager.getNearbyInteractiveNPC({ x: 15.0, y: 0.0, z: -10.0 }, 2.5);
    expect(checkWhileBoarded).toBeNull();

    // Dismount passenger at Hardinge High School Gate
    const dropoffPos = PHASE_1_ANCHORS.HARDINGE_HIGH_SCHOOL;
    const dismounted = npcManager.dismountPassenger('npc_student_farhana', dropoffPos);
    expect(dismounted).toBe(true);
    expect(farhana?.isBoarded).toBe(false);
    expect(farhana?.mesh.parent).toBe(scene);
    expect(farhana?.currentPosition.x).toBeCloseTo(dropoffPos.x);
  });
});
