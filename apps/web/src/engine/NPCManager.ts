/**
 * Dhamrai Life — NPC & Pedestrian Manager
 * =======================================
 * Manages story quest NPCs, ambient pedestrians, spatial proximity detection,
 * dialogue triggers, and passenger boarding/dismounting physics transitions.
 */

import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import {
  NPCEntityDefinition,
  NPCRoleType,
  PHASE_1_ANCHORS,
  WorldPosition,
} from '@dhamrai/shared-contracts';
import { PhysicsWorld } from './PhysicsWorld.js';
import type { DynamicNPCPosition } from '../state/useSessionStore.js';
import { presenceForRole, type SchedulePhase } from './npcSchedules.js';

export interface NPCInstance {
  definition: NPCEntityDefinition;
  mesh: THREE.Group;
  collider: RAPIER.Collider | null;
  body: RAPIER.RigidBody | null;
  isBoarded: boolean;
  currentPosition: WorldPosition;
  waypoints?: WorldPosition[];
  waypointIndex?: number;
  /** Milestone 16 — schedule-driven interactability */
  scheduleInteractable?: boolean;
  scheduleWalkMult?: number;
}

export const STORY_NPCS: NPCEntityDefinition[] = [
  {
    id: 'npc_student_farhana',
    nameBn: 'ফারহানা (কলেজ ছাত্রী)',
    nameEn: 'Farhana (College Student)',
    role: 'STORY_PASSENGER',
    spawnPosition: PHASE_1_ANCHORS.RATHKHOLA_MARKET_PICKUP, // (15.0, 0.0, -10.0)
    spawnHeadingRadians: Math.PI / 2, // Facing west toward stand
    dialogueTreeId: 'dialogue_farhana_student',
    associatedMissionId: 'mission_1_first_fare',
    isBoardablePassenger: true,
  },
  {
    id: 'npc_police_rafiq',
    nameBn: 'এসআই রফিক (থানা পুলিশ)',
    nameEn: 'SI Rafiq (Police Patrol)',
    role: 'POLICE_PATROL',
    spawnPosition: PHASE_1_ANCHORS.THANA_JUNCTION_CHECKPOINT, // (-61.0, 0.0, 66.5)
    spawnHeadingRadians: -Math.PI / 4,
    dialogueTreeId: 'dialogue_police_rafiq',
    associatedMissionId: 'mission_2_police_checkpoint',
    isBoardablePassenger: false,
  },
  {
    id: 'npc_artisan_gouranga',
    nameBn: 'গৌরাঙ্গ কর্মকার (কাঁসা কারিগর)',
    nameEn: 'Gouranga Karmakar (Brass Artisan)',
    role: 'ARTISAN',
    spawnPosition: PHASE_1_ANCHORS.KAYETPARA_METAL_WORKSHOP, // (-295.3, 0.0, -77.0)
    spawnHeadingRadians: 0,
    dialogueTreeId: 'dialogue_artisan_gouranga',
    associatedMissionId: 'mission_3_artisan_order',
    isBoardablePassenger: false,
  },
  // Milestone 13 — Tea vendor & mistri (fiction; not real-person claims)
  {
    id: 'npc_tea_vendor',
    nameBn: 'চাওয়ালা (রথখোলা)',
    nameEn: 'Tea Vendor (Rathkhola)',
    role: 'VENDOR',
    spawnPosition: { x: 3.2, y: 0.0, z: -2.4 },
    spawnHeadingRadians: Math.PI,
    dialogueTreeId: 'dialogue_tea_stall',
    isBoardablePassenger: false,
  },
  {
    id: 'npc_mistri_gautom',
    nameBn: 'মিস্ত্রি গৌতম (রথখোলা)',
    nameEn: 'Mistri Gautom (Rathkhola)',
    role: 'MECHANIC',
    spawnPosition: { x: -6.5, y: 0.0, z: 2.0 },
    spawnHeadingRadians: Math.PI / 2,
    dialogueTreeId: 'dialogue_mistri_gautom',
    isBoardablePassenger: false,
  },
  // Milestone 18 — market parcel courier (fiction)
  {
    id: 'npc_courier_salma',
    nameBn: 'সালমা (কুরিয়ার)',
    nameEn: 'Salma (Courier)',
    role: 'VENDOR',
    spawnPosition: { x: 12.0, y: 0.0, z: -8.0 },
    spawnHeadingRadians: -Math.PI / 2,
    dialogueTreeId: 'dialogue_courier_salma',
    associatedMissionId: 'mission_4_market_parcel',
    isBoardablePassenger: false,
  },
];

export class NPCManager {
  private readonly scene: THREE.Scene;
  private readonly physics: PhysicsWorld;
  public npcs: Map<string, NPCInstance> = new Map();
  private currentPhase: SchedulePhase = 'day';

  constructor(scene: THREE.Scene, physics: PhysicsWorld) {
    this.scene = scene;
    this.physics = physics;
  }

  /**
   * Milestone 16 — apply day-phase presence (visibility / walk / interact).
   */
  public applyDayPhase(phase: SchedulePhase): void {
    this.currentPhase = phase;
    for (const npc of this.npcs.values()) {
      if (npc.isBoarded) continue;
      const rule = presenceForRole(npc.definition.role as Parameters<typeof presenceForRole>[0], phase);
      npc.mesh.visible = rule.visible;
      npc.scheduleInteractable = rule.interactable;
      npc.scheduleWalkMult = rule.walkSpeedMult;
      if (npc.collider && this.physics.ready) {
        // Soft: keep collider even if hidden so respawn is simple; mesh hide is enough
      }
    }
  }

  public get dayPhase(): SchedulePhase {
    return this.currentPhase;
  }

  /**
   * Initializes story NPCs and ambient pedestrians into the 3D scene.
   */
  public init(): void {
    // 1. Spawn Story Quest NPCs
    for (const def of STORY_NPCS) {
      this.spawnNPC(def);
    }

    // 2. Ambient pedestrians with roadside patrol loops (M23 expands to 4)
    this.spawnAmbientPedestrian(
      'ambient_ped_1',
      'পথচারী (Pedestrian)',
      { x: 5.0, y: 0.0, z: -5.0 },
      0x27ae60, // Green punjabi
      [
        { x: 5.0, y: 0.0, z: -5.0 },
        { x: 12.0, y: 0.0, z: -8.0 },
        { x: 2.0, y: 0.0, z: -2.0 },
      ]
    );

    this.spawnAmbientPedestrian(
      'ambient_ped_2',
      'পথচারী (Pedestrian)',
      { x: -10.0, y: 0.0, z: -15.0 },
      0xd35400, // Saffron / Orange lungi
      [
        { x: -10.0, y: 0.0, z: -15.0 },
        { x: -25.0, y: 0.0, z: -30.0 },
        { x: -10.0, y: 0.0, z: -15.0 },
      ]
    );

    // Milestone 23 — longer market / thana-side loops
    this.spawnAmbientPedestrian(
      'ambient_ped_3',
      'পথচারী (Market Walker)',
      { x: 18.0, y: 0.0, z: -12.0 },
      0x8e44ad,
      [
        { x: 18.0, y: 0.0, z: -12.0 },
        { x: 22.0, y: 0.0, z: -4.0 },
        { x: 10.0, y: 0.0, z: -6.0 },
        { x: 18.0, y: 0.0, z: -12.0 },
      ]
    );

    this.spawnAmbientPedestrian(
      'ambient_ped_4',
      'পথচারী (Thana Road)',
      { x: -40.0, y: 0.0, z: 40.0 },
      0x16a085,
      [
        { x: -40.0, y: 0.0, z: 40.0 },
        { x: -55.0, y: 0.0, z: 55.0 },
        { x: -50.0, y: 0.0, z: 70.0 },
        { x: -40.0, y: 0.0, z: 40.0 },
      ]
    );
  }

  /** Milestone 23 — count ambient walkers with waypoint paths */
  public get ambientWalkerCount(): number {
    let n = 0;
    for (const npc of this.npcs.values()) {
      if (npc.definition.role === 'AMBIENT_PEDESTRIAN' && npc.waypoints && npc.waypoints.length >= 2) {
        n += 1;
      }
    }
    return n;
  }

  public spawnFareNPC(def: NPCEntityDefinition): NPCInstance {
    if (this.npcs.has(def.id)) {
      return this.npcs.get(def.id)!;
    }
    this.spawnNPC(def);
    return this.npcs.get(def.id)!;
  }

  public despawnFarePassenger(npcId: string): boolean {
    const npc = this.npcs.get(npcId);
    if (!npc) return false;

    // 1. Remove Rapier collider & body cleanly
    if (npc.collider && this.physics.ready) {
      this.physics.removeCollider(npc.collider);
      npc.collider = null;
    }
    if (npc.body && this.physics.ready) {
      this.physics.world.removeRigidBody(npc.body);
      npc.body = null;
    }

    // 2. Detach mesh from parent (rickshaw chassis or world scene)
    if (npc.mesh.parent) {
      npc.mesh.parent.remove(npc.mesh);
    } else {
      this.scene.remove(npc.mesh);
    }

    // 3. Dispose geometry and materials
    npc.mesh.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((m) => m.dispose());
        } else if (mesh.material) {
          mesh.material.dispose();
        }
      }
    });

    this.npcs.delete(npcId);
    return true;
  }

  public getDynamicNPCPositions(): DynamicNPCPosition[] {
    const out: DynamicNPCPosition[] = [];
    for (const [id, npc] of this.npcs.entries()) {
      out.push({
        id,
        nameBn: npc.definition.nameBn,
        nameEn: npc.definition.nameEn,
        position: { ...npc.currentPosition },
        role: npc.definition.role,
        isBoarded: npc.isBoarded,
      });
    }
    return out;
  }

  private spawnNPC(def: NPCEntityDefinition): void {
    const mesh = this.createNPCMesh(def.role);
    mesh.position.set(def.spawnPosition.x, def.spawnPosition.y, def.spawnPosition.z);
    mesh.rotation.y = def.spawnHeadingRadians;
    this.scene.add(mesh);

    // Create Rapier kinematic collider for NPC interaction & physical presence
    let body: RAPIER.RigidBody | null = null;
    let collider: RAPIER.Collider | null = null;

    if (this.physics.ready) {
      const { world, rapier } = this.physics;
      const bodyDesc = rapier.RigidBodyDesc.kinematicPositionBased().setTranslation(
        def.spawnPosition.x,
        def.spawnPosition.y + 0.85,
        def.spawnPosition.z
      );
      body = world.createRigidBody(bodyDesc);
      const colDesc = rapier.ColliderDesc.capsule(0.5, 0.35);
      collider = world.createCollider(colDesc, body);
    }

    this.npcs.set(def.id, {
      definition: def,
      mesh,
      collider,
      body,
      isBoarded: false,
      currentPosition: { ...def.spawnPosition },
    });
  }

  private spawnAmbientPedestrian(
    id: string,
    name: string,
    spawnPos: WorldPosition,
    colorHex: number,
    waypoints: WorldPosition[]
  ): void {
    const def: NPCEntityDefinition = {
      id,
      nameBn: name,
      nameEn: 'Townsperson',
      role: 'AMBIENT_PEDESTRIAN',
      spawnPosition: spawnPos,
      spawnHeadingRadians: 0,
    };

    const mesh = this.createNPCMesh('AMBIENT_PEDESTRIAN', colorHex);
    mesh.position.set(spawnPos.x, spawnPos.y, spawnPos.z);
    this.scene.add(mesh);

    this.npcs.set(id, {
      definition: def,
      mesh,
      collider: null,
      body: null,
      isBoarded: false,
      currentPosition: { ...spawnPos },
      waypoints,
      waypointIndex: 0,
    });
  }

  private createNPCMesh(role: NPCRoleType, customColor?: number): THREE.Group {
    const group = new THREE.Group();
    group.name = `NPC_${role}`;

    // Attire color based on role
    let bodyColor = 0x16a085; // Default teal
    if (customColor) {
      bodyColor = customColor;
    } else if (role === 'STORY_PASSENGER') {
      bodyColor = 0x2e86c1; // Farhana: Blue/white student uniform
    } else if (role === 'POLICE_PATROL') {
      bodyColor = 0xb7950b; // SI Rafiq: Khaki uniform
    } else if (role === 'ARTISAN') {
      bodyColor = 0x7d6608; // Gouranga: Traditional brass-worker brown
    } else if (role === 'VENDOR') {
      bodyColor = 0xc0392b; // Tea vendor: deep red shirt
    } else if (role === 'MECHANIC') {
      bodyColor = 0x5d6d7e; // Mistri: grease-grey work clothes
    }

    // Body capsule (1.7m total height)
    const bodyGeom = new THREE.CapsuleGeometry(0.3, 0.9, 8, 12);
    const bodyMat = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.8 });
    const body = new THREE.Mesh(bodyGeom, bodyMat);
    body.position.y = 0.85;
    body.castShadow = true;
    group.add(body);

    // Head / Face
    const headGeom = new THREE.SphereGeometry(0.18, 8, 8);
    const skinMat = new THREE.MeshStandardMaterial({ color: 0x8d5524, roughness: 0.9 }); // South Asian skin tone
    const head = new THREE.Mesh(headGeom, skinMat);
    head.position.y = 1.48;
    head.castShadow = true;
    group.add(head);

    // Cap / Hair / Salwar scarf
    const capGeom = new THREE.BoxGeometry(0.24, 0.08, 0.24);
    const capMat = new THREE.MeshStandardMaterial({
      color: role === 'POLICE_PATROL' ? 0x1a252f : 0x2c3e50,
    });
    const cap = new THREE.Mesh(capGeom, capMat);
    cap.position.y = 1.62;
    group.add(cap);

    // Student schoolbag for Farhana
    if (role === 'STORY_PASSENGER') {
      const bagGeom = new THREE.BoxGeometry(0.28, 0.35, 0.15);
      const bagMat = new THREE.MeshStandardMaterial({ color: 0xc0392b }); // Red school backpack
      const bag = new THREE.Mesh(bagGeom, bagMat);
      bag.position.set(0, 0.85, 0.3);
      group.add(bag);
    }

    return group;
  }

  /**
   * Evaluates proximity to player and returns closest interactive NPC within interaction radius.
   */
  public getNearbyInteractiveNPC(
    playerPos: WorldPosition,
    maxDistance = 2.5
  ): NPCInstance | null {
    let closestNPC: NPCInstance | null = null;
    let closestDist = maxDistance;

    for (const npc of this.npcs.values()) {
      if (npc.isBoarded) continue; // Cannot interact on foot while boarded in vehicle
      if (npc.mesh.visible === false) continue;
      if (npc.scheduleInteractable === false) continue;

      const dx = playerPos.x - npc.currentPosition.x;
      const dz = playerPos.z - npc.currentPosition.z;
      const dist = Math.hypot(dx, dz);

      if (dist < closestDist) {
        closestDist = dist;
        closestNPC = npc;
      }
    }

    return closestNPC;
  }

  /**
   * Boards passenger into the rickshaw passenger seat.
   * Reparents Three.js mesh to rickshaw chassis and disables physics collider.
   */
  public boardPassenger(
    npcId: string,
    rickshawGroup: THREE.Group,
    seatLocalPos: WorldPosition
  ): boolean {
    const npc = this.npcs.get(npcId);
    if (!npc || npc.isBoarded) return false;

    // 1. Remove Rapier collider while boarded
    if (npc.collider && this.physics.ready) {
      this.physics.removeCollider(npc.collider);
      npc.collider = null;
    }

    // 2. Reparent Three.js mesh to rickshaw group
    this.scene.remove(npc.mesh);
    rickshawGroup.add(npc.mesh);
    npc.mesh.position.set(seatLocalPos.x, seatLocalPos.y, seatLocalPos.z);
    npc.mesh.rotation.set(0, 0, 0); // Face forward with vehicle

    npc.isBoarded = true;
    return true;
  }

  /**
   * Dismounts passenger at destination.
   * Reparents mesh back to world scene.
   */
  public dismountPassenger(
    npcId: string,
    worldDropoffPos: WorldPosition
  ): boolean {
    const npc = this.npcs.get(npcId);
    if (!npc || !npc.isBoarded) return false;

    // 1. Detach from vehicle and attach back to world scene
    if (npc.mesh.parent) {
      npc.mesh.parent.remove(npc.mesh);
    }
    this.scene.add(npc.mesh);
    npc.mesh.position.set(worldDropoffPos.x, worldDropoffPos.y, worldDropoffPos.z);
    npc.currentPosition = { ...worldDropoffPos };

    // 2. Re-create Rapier kinematic collider
    if (this.physics.ready) {
      const { world, rapier } = this.physics;
      const bodyDesc = rapier.RigidBodyDesc.kinematicPositionBased().setTranslation(
        worldDropoffPos.x,
        worldDropoffPos.y + 0.85,
        worldDropoffPos.z
      );
      npc.body = world.createRigidBody(bodyDesc);
      const colDesc = rapier.ColliderDesc.capsule(0.5, 0.35);
      npc.collider = world.createCollider(colDesc, npc.body);
    }

    npc.isBoarded = false;
    return true;
  }

  /**
   * Updates ambient pedestrian walkers along waypoints (throttled).
   */
  public update(dt: number): void {
    const walkSpeed = 1.2; // m/s

    for (const npc of this.npcs.values()) {
      if (npc.isBoarded || !npc.waypoints || npc.waypoints.length === 0) continue;
      if (npc.mesh.visible === false) continue;
      const speedMult = npc.scheduleWalkMult ?? 1;
      if (speedMult <= 0.01) continue;

      const target = npc.waypoints[npc.waypointIndex ?? 0]!;
      const dx = target.x - npc.currentPosition.x;
      const dz = target.z - npc.currentPosition.z;
      const dist = Math.hypot(dx, dz);

      if (dist < 0.3) {
        // Advance to next waypoint in loop
        npc.waypointIndex = ((npc.waypointIndex ?? 0) + 1) % npc.waypoints.length;
      } else {
        const step = Math.min(dist, walkSpeed * speedMult * dt);
        const heading = Math.atan2(dx, dz);
        npc.currentPosition.x += (dx / dist) * step;
        npc.currentPosition.z += (dz / dist) * step;

        npc.mesh.position.set(npc.currentPosition.x, npc.currentPosition.y, npc.currentPosition.z);
        npc.mesh.rotation.y = heading;
      }
    }
  }

  public dispose(): void {
    for (const npc of this.npcs.values()) {
      if (npc.collider && this.physics.ready) {
        this.physics.removeCollider(npc.collider);
      }
      if (npc.body && this.physics.ready) {
        this.physics.world.removeRigidBody(npc.body);
      }
      this.scene.remove(npc.mesh);
    }
    this.npcs.clear();
  }
}
