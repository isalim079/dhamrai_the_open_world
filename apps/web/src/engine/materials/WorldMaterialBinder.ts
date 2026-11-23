/**
 * Dhamrai Life — Shared World Material Binder (Milestone 11)
 * ==========================================================
 * Creates shared MeshStandardMaterials backed by AtlasFactory textures
 * and applies them to loaded chunk meshes by glTF material name.
 *
 * Shared materials are marked with `userData.dhamraiShared = true` so
 * ChunkLoader disposal skips them (prevents atlas teardown on unload).
 */

import * as THREE from 'three';
import { AtlasFactory } from './AtlasFactory.js';

export const SHARED_MATERIAL_FLAG = 'dhamraiShared';

export class WorldMaterialBinder {
  public readonly atlas: AtlasFactory;
  public readonly buildingMaterial: THREE.MeshStandardMaterial;
  public readonly roadMaterial: THREE.MeshStandardMaterial;
  public readonly embankmentMaterial: THREE.MeshStandardMaterial;

  private disposed = false;
  private bindCount = 0;

  constructor(atlasSize?: number) {
    this.atlas = new AtlasFactory(atlasSize);

    this.buildingMaterial = new THREE.MeshStandardMaterial({
      name: 'building_atlas',
      map: this.atlas.buildingMap,
      roughness: 0.78,
      metalness: 0.08,
      color: 0xffffff,
    });
    this.buildingMaterial.userData[SHARED_MATERIAL_FLAG] = true;

    this.roadMaterial = new THREE.MeshStandardMaterial({
      name: 'road_asphalt',
      map: this.atlas.asphaltMap,
      roughness: 0.9,
      metalness: 0.02,
      color: 0xffffff,
    });
    this.roadMaterial.userData[SHARED_MATERIAL_FLAG] = true;

    this.embankmentMaterial = new THREE.MeshStandardMaterial({
      name: 'embankment_earth',
      map: this.atlas.embankmentMap,
      roughness: 0.95,
      metalness: 0.0,
      color: 0xffffff,
    });
    this.embankmentMaterial.userData[SHARED_MATERIAL_FLAG] = true;
  }

  public get totalBindCount(): number {
    return this.bindCount;
  }

  public get isDisposed(): boolean {
    return this.disposed;
  }

  /**
   * Idempotently replaces chunk mesh materials with shared atlas materials.
   * Returns the number of meshes rebound on this call.
   */
  public bindChunkGroup(root: THREE.Object3D): number {
    if (this.disposed) return 0;

    let rebound = 0;
    root.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh) return;

      const current = mesh.material;
      const materials = Array.isArray(current) ? current : [current];
      const next: THREE.Material[] = [];

      for (const mat of materials) {
        const name = (mat?.name || '').toLowerCase();
        if (name.includes('building')) {
          next.push(this.buildingMaterial);
          rebound++;
        } else if (name.includes('road') || name.includes('asphalt')) {
          next.push(this.roadMaterial);
          rebound++;
        } else if (name.includes('embankment') || name.includes('earth')) {
          next.push(this.embankmentMaterial);
          rebound++;
        } else if (mat?.userData?.[SHARED_MATERIAL_FLAG]) {
          next.push(mat);
        } else {
          // Unknown material: still apply building atlas as a safe visual upgrade
          // when the mesh has UVs (procedural buildings without named materials).
          const geom = mesh.geometry as THREE.BufferGeometry | undefined;
          if (geom?.getAttribute('uv')) {
            next.push(this.buildingMaterial);
            rebound++;
          } else {
            next.push(mat);
          }
        }
      }

      mesh.material = Array.isArray(current) ? next : next[0]!;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    });

    this.bindCount += rebound;
    return rebound;
  }

  public dispose(): void {
    if (this.disposed) return;
    this.buildingMaterial.dispose();
    this.roadMaterial.dispose();
    this.embankmentMaterial.dispose();
    this.atlas.dispose();
    this.disposed = true;
  }
}

/** True when a material is owned by WorldMaterialBinder and must not be disposed per-chunk. */
export function isSharedWorldMaterial(mat: THREE.Material): boolean {
  return mat.userData?.[SHARED_MATERIAL_FLAG] === true;
}
