/**
 * Dhamrai Life — Chunk GLB Loader & Physics Collider Generator
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import RAPIER from '@dimforge/rapier3d-compat';
import type { ChunkManifest } from '@dhamrai/shared-contracts';
import type { PhysicsWorld } from './PhysicsWorld.js';

export interface LoadedChunk {
  chunkId: string;
  manifest: ChunkManifest;
  sceneGroup: THREE.Group;
  colliders: RAPIER.Collider[];
  triangleCount: number;
}

export class ChunkLoader {
  private gltfLoader = new GLTFLoader();
  private assetBaseUrl = '/world/chunks';

  constructor(private physics: PhysicsWorld, baseUrl = '/world/chunks') {
    this.assetBaseUrl = baseUrl;
  }

  public setBaseUrl(url: string): void {
    this.assetBaseUrl = url;
  }

  /**
   * Loads a chunk GLB and manifest, generating visual meshes and Rapier static colliders.
   */
  public async loadChunk(manifest: ChunkManifest): Promise<LoadedChunk> {
    const glbUrl = `${this.assetBaseUrl}/${manifest.glbAsset}`;

    return new Promise((resolve, reject) => {
      this.gltfLoader.load(
        glbUrl,
        (gltf) => {
          const sceneGroup = gltf.scene || new THREE.Group();
          sceneGroup.name = manifest.chunkId;

          const colliders: RAPIER.Collider[] = [];
          let triangleCount = 0;

          // Traverse meshes to generate Rapier colliders and count triangles
          sceneGroup.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
              const mesh = child as THREE.Mesh;
              const geom = mesh.geometry as THREE.BufferGeometry;

              if (geom) {
                const posAttr = geom.getAttribute('position');
                const indexAttr = geom.getIndex();

                if (posAttr) {
                  const triCount = indexAttr ? indexAttr.count / 3 : posAttr.count / 3;
                  triangleCount += triCount;

                  // Extract positions Float32Array in world space
                  if (this.physics && this.physics.ready) {
                    mesh.updateMatrixWorld(true);
                    const positions = new Float32Array(posAttr.array);
                    const indices = indexAttr
                      ? new Uint32Array(indexAttr.array)
                      : new Uint32Array(posAttr.count).map((_, i) => i);

                    const collider = this.physics.createStaticTrimesh(positions, indices);
                    if (collider) {
                      colliders.push(collider);
                    }
                  }
                }
              }
            }
          });

          resolve({
            chunkId: manifest.chunkId,
            manifest,
            sceneGroup,
            colliders,
            triangleCount,
          });
        },
        undefined,
        (error) => {
          console.warn(`Failed to load chunk ${manifest.chunkId} from ${glbUrl}:`, error);
          reject(error);
        }
      );
    });
  }

  /**
   * Disposes all Three.js geometry, materials, textures, and Rapier colliders for an unloaded chunk.
   */
  public disposeChunk(chunk: LoadedChunk): void {
    // 1. Remove and free Rapier physics colliders
    if (this.physics && this.physics.ready) {
      for (const collider of chunk.colliders) {
        this.physics.removeCollider(collider);
      }
    }
    chunk.colliders = [];

    // 2. Traverse and dispose Three.js scene assets
    chunk.sceneGroup.traverse((object) => {
      if ((object as THREE.Mesh).isMesh) {
        const mesh = object as THREE.Mesh;

        if (mesh.geometry) {
          mesh.geometry.dispose();
        }

        if (mesh.material) {
          if (Array.isArray(mesh.material)) {
            for (const mat of mesh.material) {
              this.disposeMaterial(mat);
            }
          } else {
            this.disposeMaterial(mesh.material);
          }
        }
      }
    });

    // Detach from parent
    if (chunk.sceneGroup.parent) {
      chunk.sceneGroup.parent.remove(chunk.sceneGroup);
    }
    chunk.sceneGroup.clear();
  }

  private disposeMaterial(mat: THREE.Material): void {
    // Dispose textures if present
    const standardMat = mat as THREE.MeshStandardMaterial;
    if (standardMat.map) standardMat.map.dispose();
    if (standardMat.normalMap) standardMat.normalMap.dispose();
    if (standardMat.roughnessMap) standardMat.roughnessMap.dispose();
    if (standardMat.metalnessMap) standardMat.metalnessMap.dispose();
    mat.dispose();
  }
}
