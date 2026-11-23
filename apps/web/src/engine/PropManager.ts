/**
 * Dhamrai Life — Landmark Street Prop Manager (Milestone 11)
 * ==========================================================
 * Places deterministic procedural props at PHASE_1_ANCHORS and
 * batches repeated archetypes via THREE.InstancedMesh.
 * Props are world-persistent (not per-chunk) for the Phase 1 slice.
 */

import * as THREE from 'three';
import { PHASE_1_ANCHORS } from '@dhamrai/shared-contracts';
import { getSignCopy } from '../content/signboardCopy.js';
import {
  createTeaStall,
  createPolePrototype,
  createTreeTrunkPrototype,
  createTreeCanopyPrototype,
  createWorkshopAnvil,
  createBarrierPost,
  createSignboard,
  createGatePillar,
} from './props/propCatalog.js';

export interface PropPlacement {
  id: string;
  kind: string;
  x: number;
  y: number;
  z: number;
  yaw?: number;
}

/** Deterministic hash → [0,1) */
function seedUnit(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}

function setInstanceMatrix(
  mesh: THREE.InstancedMesh,
  index: number,
  x: number,
  y: number,
  z: number,
  yaw = 0,
  scale = 1
): void {
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
  m.compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(scale, scale, scale));
  mesh.setMatrixAt(index, m);
}

export class PropManager {
  public readonly root: THREE.Group;
  private uniqueProps: THREE.Object3D[] = [];
  private instanced: THREE.InstancedMesh[] = [];
  private disposed = false;
  private initialized = false;
  /** World XZ anchors for Milestone 12 streetlamps */
  private poleAnchors: Array<{ x: number; y: number; z: number }> = [];

  /** Exported for tests / HUD diagnostics */
  public stats = {
    uniquePropCount: 0,
    poleInstances: 0,
    treeInstances: 0,
    barrierInstances: 0,
    estimatedTriangles: 0,
  };

  constructor(private parentScene: THREE.Scene | THREE.Group) {
    this.root = new THREE.Group();
    this.root.name = 'PropsRoot';
  }

  public get isInitialized(): boolean {
    return this.initialized;
  }

  public get isDisposed(): boolean {
    return this.disposed;
  }

  /**
   * Milestone 35 — distance LOD: hide unique props beyond far radius; thin instanced opacity.
   */
  public updateLod(playerPos: { x: number; z: number }, farM = 90, nearM = 55): void {
    if (!this.initialized || this.disposed) return;
    for (const obj of this.uniqueProps) {
      const d = Math.hypot(obj.position.x - playerPos.x, obj.position.z - playerPos.z);
      obj.visible = d <= farM;
    }
    for (const mesh of this.instanced) {
      // Soft: keep instances but mark for future frustum work; scale group visibility by density
      mesh.visible = true;
      const mat = mesh.material as THREE.MeshStandardMaterial;
      if (mat && 'opacity' in mat) {
        // Near stand keep full; far chunks already streamed — mild opacity cue only
        mat.transparent = true;
        mat.opacity = 0.92;
      }
      void nearM;
    }
  }

  /** Idempotent world prop bootstrap. */
  public init(): void {
    if (this.initialized || this.disposed) return;

    this.parentScene.add(this.root);

    this.placeRathkholaCluster();
    this.placeHardingeSchool();
    this.placeThanaJunction();
    this.placeKayetparaWorkshop();
    this.placePoliceStationSign();
    this.placeInstancedPolesAndTrees();

    this.stats.uniquePropCount = this.uniqueProps.length;
    this.stats.estimatedTriangles = this.estimateTriangles();
    this.initialized = true;
  }

  private addUnique(obj: THREE.Object3D, x: number, y: number, z: number, yaw = 0): void {
    obj.position.set(x, y, z);
    obj.rotation.y = yaw;
    this.root.add(obj);
    this.uniqueProps.push(obj);
  }

  private placeRathkholaCluster(): void {
    const o = PHASE_1_ANCHORS.RATHKHOLA_ORIGIN;
    // Tea stalls in the open Rathkhola plaza (within ambient tea-clatter radius)
    // Placed slightly off road centerline so third-person spawn camera can see them.
    const stallOffsets: Array<[number, number, number]> = [
      [3.2, -2.4, 0.35],
      [-4.0, -3.0, -0.55],
      [6.5, 1.8, 1.1],
      [-2.2, 4.5, 0.15],
    ];
    for (let i = 0; i < stallOffsets.length; i++) {
      const [dx, dz, yaw] = stallOffsets[i]!;
      this.addUnique(createTeaStall(), o.x + dx, 0, o.z + dz, yaw);
    }

    const standSign = getSignCopy('sign_rathkhola_stand');
    if (standSign) {
      this.addUnique(createSignboard(standSign, 2.8, 1.0), o.x + 0.5, 0, o.z - 5.0, Math.PI);
    }
    const teaSign = getSignCopy('sign_tea_stall');
    if (teaSign) {
      this.addUnique(createSignboard(teaSign, 1.8, 0.7), o.x + 3.2, 0, o.z - 3.5, 0.35);
    }

    // Market pickup waiting props
    const pickup = PHASE_1_ANCHORS.RATHKHOLA_MARKET_PICKUP;
    this.addUnique(createTeaStall(), pickup.x + 2.0, 0, pickup.z + 1.5, -0.3);
  }

  private placeHardingeSchool(): void {
    const a = PHASE_1_ANCHORS.HARDINGE_HIGH_SCHOOL;
    this.addUnique(createGatePillar(), a.x - 1.4, 0, a.z + 0.5, 0);
    this.addUnique(createGatePillar(), a.x + 1.4, 0, a.z + 0.5, 0);
    const sign = getSignCopy('sign_hardinge_school');
    if (sign) {
      this.addUnique(createSignboard(sign, 3.2, 1.0), a.x, 0, a.z + 2.2, 0);
    }
  }

  private placeThanaJunction(): void {
    const a = PHASE_1_ANCHORS.THANA_JUNCTION_CHECKPOINT;
    const barrierProto = createBarrierPost();
    const count = 6;
    const barriers = new THREE.InstancedMesh(barrierProto.geometry, barrierProto.material, count);
    barriers.name = 'instanced_barriers_thana';
    barriers.castShadow = true;
    const offsets: Array<[number, number]> = [
      [-2.5, 0],
      [-1.5, 0.3],
      [-0.5, 0],
      [0.5, 0.2],
      [1.5, 0],
      [2.5, 0.25],
    ];
    for (let i = 0; i < count; i++) {
      const [dx, dz] = offsets[i]!;
      setInstanceMatrix(barriers, i, a.x + dx, 0, a.z + dz, 0.15 * i);
    }
    barriers.instanceMatrix.needsUpdate = true;
    this.root.add(barriers);
    this.instanced.push(barriers);
    this.stats.barrierInstances = count;

    const sign = getSignCopy('sign_thana_checkpoint');
    if (sign) {
      this.addUnique(createSignboard(sign, 2.6, 0.85), a.x - 4.0, 0, a.z + 3.0, -0.4);
    }
  }

  private placeKayetparaWorkshop(): void {
    const a = PHASE_1_ANCHORS.KAYETPARA_METAL_WORKSHOP;
    this.addUnique(createWorkshopAnvil(), a.x + 1.2, 0, a.z - 0.8, 0.5);
    this.addUnique(createWorkshopAnvil(), a.x - 1.5, 0, a.z + 1.0, -0.8);
    const sign = getSignCopy('sign_kayetpara_workshop');
    if (sign) {
      this.addUnique(createSignboard(sign, 2.8, 0.9), a.x, 0, a.z + 3.5, 0.2);
    }
  }

  private placePoliceStationSign(): void {
    const a = PHASE_1_ANCHORS.DHAMRAI_POLICE_STATION;
    const sign = getSignCopy('sign_police_station');
    if (sign) {
      this.addUnique(createSignboard(sign, 2.5, 0.85), a.x + 2.0, 0, a.z + 2.5, 0);
    }
  }

  private placeInstancedPolesAndTrees(): void {
    // Curated roadside pole positions near key corridors
    const poleSites: Array<[number, number]> = [
      [6, 8],
      [12, -6],
      [-8, 10],
      [-18, 40],
      [-40, 55],
      [-55, 70],
      [-70, -200],
      [-80, -210],
      [-280, -70],
      [-300, -90],
      [20, 180],
      [-50, -260],
    ];

    const poleProto = createPolePrototype();
    const poles = new THREE.InstancedMesh(poleProto.geometry, poleProto.material, poleSites.length);
    poles.name = 'instanced_poles';
    poles.castShadow = true;
    this.poleAnchors = [];
    for (let i = 0; i < poleSites.length; i++) {
      const [x, z] = poleSites[i]!;
      const yaw = seedUnit(`pole_${i}`) * Math.PI * 2;
      setInstanceMatrix(poles, i, x, 0, z, yaw);
      this.poleAnchors.push({ x, y: 0, z });
    }
    poles.instanceMatrix.needsUpdate = true;
    this.root.add(poles);
    this.instanced.push(poles);
    this.stats.poleInstances = poleSites.length;

    // Trees — ring around markets / river-ish corridors (deterministic offsets)
    const treeSites: Array<[number, number, number]> = [];
    const treeSeeds = [
      [10, 12],
      [-12, 8],
      [25, -15],
      [-22, -18],
      [-90, 50],
      [-50, 90],
      [-310, -100],
      [-330, -80],
      [-60, -230],
      [35, 200],
      [-100, -50],
      [5, -40],
      [-15, 30],
      [40, 40],
      [-200, -50],
      [-250, -60],
    ];
    for (let i = 0; i < treeSeeds.length; i++) {
      const seed = treeSeeds[i]!;
      const bx = seed[0] ?? 0;
      const bz = seed[1] ?? 0;
      const jx = (seedUnit(`tx_${i}`) - 0.5) * 4;
      const jz = (seedUnit(`tz_${i}`) - 0.5) * 4;
      const scale = 0.85 + seedUnit(`ts_${i}`) * 0.4;
      treeSites.push([bx + jx, bz + jz, scale]);
    }

    const trunkProto = createTreeTrunkPrototype();
    const canopyProto = createTreeCanopyPrototype();
    const trunks = new THREE.InstancedMesh(
      trunkProto.geometry,
      trunkProto.material,
      treeSites.length
    );
    const canopies = new THREE.InstancedMesh(
      canopyProto.geometry,
      canopyProto.material,
      treeSites.length
    );
    trunks.name = 'instanced_tree_trunks';
    canopies.name = 'instanced_tree_canopies';
    trunks.castShadow = true;
    canopies.castShadow = true;

    for (let i = 0; i < treeSites.length; i++) {
      const [x, z, scale] = treeSites[i]!;
      const yaw = seedUnit(`ty_${i}`) * Math.PI * 2;
      setInstanceMatrix(trunks, i, x, 0, z, yaw, scale);
      setInstanceMatrix(canopies, i, x, 0, z, yaw, scale);
    }
    trunks.instanceMatrix.needsUpdate = true;
    canopies.instanceMatrix.needsUpdate = true;
    this.root.add(trunks);
    this.root.add(canopies);
    this.instanced.push(trunks, canopies);
    this.stats.treeInstances = treeSites.length;
  }

  private estimateTriangles(): number {
    let tris = 0;
    const countGeom = (geom: THREE.BufferGeometry, instances = 1) => {
      const idx = geom.getIndex();
      const pos = geom.getAttribute('position');
      const t = idx ? idx.count / 3 : pos ? pos.count / 3 : 0;
      tris += t * instances;
    };

    for (const obj of this.uniqueProps) {
      obj.traverse((c) => {
        const m = c as THREE.Mesh;
        if (m.isMesh && m.geometry) countGeom(m.geometry, 1);
      });
    }
    for (const im of this.instanced) {
      countGeom(im.geometry, im.count);
    }
    return Math.round(tris);
  }

  /** Pole world positions for StreetLampSystem (Milestone 12). */
  public getPoleAnchors(): Array<{ x: number; y: number; z: number }> {
    return this.poleAnchors.map((a) => ({ ...a }));
  }

  /**
   * Returns unique + instanced props near a world XZ point (for tests / debug).
   */
  public countPropsNear(x: number, z: number, radius: number): number {
    let n = 0;
    const r2 = radius * radius;
    for (const obj of this.uniqueProps) {
      const dx = obj.position.x - x;
      const dz = obj.position.z - z;
      if (dx * dx + dz * dz <= r2) n++;
    }
    // Sample instanced matrices
    const m = new THREE.Matrix4();
    const p = new THREE.Vector3();
    for (const im of this.instanced) {
      for (let i = 0; i < im.count; i++) {
        im.getMatrixAt(i, m);
        p.setFromMatrixPosition(m);
        const dx = p.x - x;
        const dz = p.z - z;
        if (dx * dx + dz * dz <= r2) n++;
      }
    }
    return n;
  }

  public dispose(): void {
    if (this.disposed) return;

    for (const obj of this.uniqueProps) {
      obj.traverse((c) => {
        const mesh = c as THREE.Mesh;
        if (!mesh.isMesh) return;
        mesh.geometry?.dispose();
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        for (const mat of mats) {
          if (!mat) continue;
          const std = mat as THREE.MeshStandardMaterial;
          if (std.map) std.map.dispose();
          mat.dispose();
        }
      });
      this.root.remove(obj);
    }
    this.uniqueProps = [];

    for (const im of this.instanced) {
      im.geometry.dispose();
      const mats = Array.isArray(im.material) ? im.material : [im.material];
      for (const mat of mats) mat.dispose();
      this.root.remove(im);
    }
    this.instanced = [];

    if (this.root.parent) this.root.parent.remove(this.root);
    this.root.clear();
    this.initialized = false;
    this.disposed = true;
  }
}
