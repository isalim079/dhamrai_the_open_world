/**
 * Dhamrai Life — Distance-Based 3x3 Chunk Streaming Manager
 * ==========================================================
 * Dynamically streams the 16 canonical Phase 1 chunks (256m x 256m)
 * maintaining a 3x3 active ring (9 chunks, 768m x 768m) around the player.
 * Automatically disposes out-of-range Three.js meshes and Rapier colliders.
 */

import * as THREE from 'three';
import type { ChunkManifest, WorldManifest, WorldPosition } from '@dhamrai/shared-contracts';
import type { ChunkLoader, LoadedChunk } from './ChunkLoader.js';

export const CHUNK_SIZE_M = 256.0;
export const CANONICAL_AXIS_INDICES = [-2, -1, 0, 1] as const;

export function getChunkCoordsFromPosition(x: number, z: number): [number, number] {
  const cx = Math.floor(x / CHUNK_SIZE_M);
  const cz = Math.floor(z / CHUNK_SIZE_M);
  // Clamp to valid Phase 1 slice grid bounds [-2, 1]
  const clampedX = Math.max(-2, Math.min(1, cx));
  const clampedZ = Math.max(-2, Math.min(1, cz));
  return [clampedX, clampedZ];
}

export function getChunkId(cx: number, cz: number): string {
  return `dhamrai_chunk_x${cx}_z${cz}`;
}

export function compute3x3Ring(centerCx: number, centerCz: number): string[] {
  const ids: string[] = [];
  for (let dz = -1; dz <= 1; dz++) {
    for (let dx = -1; dx <= 1; dx++) {
      const nx = centerCx + dx;
      const nz = centerCz + dz;
      if (nx >= -2 && nx <= 1 && nz >= -2 && nz <= 1) {
        ids.push(getChunkId(nx, nz));
      }
    }
  }
  return ids;
}

export class ChunkStreamer {
  public activeChunks = new Map<string, LoadedChunk>();
  public loadingChunks = new Set<string>();
  public failedChunks = new Map<string, number>();

  private manifestMap = new Map<string, ChunkManifest>();
  private chunksParentGroup: THREE.Group;
  private currentCenterCx = 999;
  private currentCenterCz = 999;

  public onActiveChunksChanged?: (activeIds: string[], count: number) => void;

  constructor(
    private chunkLoader: ChunkLoader,
    parentSceneOrGroup: THREE.Scene | THREE.Group
  ) {
    this.chunksParentGroup = new THREE.Group();
    this.chunksParentGroup.name = 'WorldChunksGroup';
    parentSceneOrGroup.add(this.chunksParentGroup);
  }

  public registerWorldManifest(worldManifest: WorldManifest): void {
    this.manifestMap.clear();
    for (const chunk of worldManifest.chunks) {
      this.manifestMap.set(chunk.chunkId, chunk);
    }
  }

  public registerChunkManifest(manifest: ChunkManifest): void {
    this.manifestMap.set(manifest.chunkId, manifest);
  }

  /**
   * Evaluates player position and streams chunks in the 3x3 active ring.
   */
  public async updatePlayerPosition(playerPos: WorldPosition): Promise<void> {
    const [cx, cz] = getChunkCoordsFromPosition(playerPos.x, playerPos.z);

    // Only recalculate desired chunks when the player crosses into a different chunk cell
    if (cx === this.currentCenterCx && cz === this.currentCenterCz) {
      return;
    }

    this.currentCenterCx = cx;
    this.currentCenterCz = cz;

    const desiredIds = compute3x3Ring(cx, cz);
    const desiredSet = new Set(desiredIds);

    // 1. Evict chunks that are no longer in the active 3x3 ring
    const toUnload: string[] = [];
    for (const activeId of this.activeChunks.keys()) {
      if (!desiredSet.has(activeId)) {
        toUnload.push(activeId);
      }
    }

    for (const chunkId of toUnload) {
      const loaded = this.activeChunks.get(chunkId);
      if (loaded) {
        this.chunkLoader.disposeChunk(loaded);
        this.activeChunks.delete(chunkId);
      }
    }

    // 2. Load missing chunks
    const loadPromises: Promise<void>[] = [];
    for (const chunkId of desiredIds) {
      if (!this.activeChunks.has(chunkId) && !this.loadingChunks.has(chunkId)) {
        const manifest = this.manifestMap.get(chunkId);
        if (manifest) {
          loadPromises.push(this.loadSingleChunk(manifest));
        }
      }
    }

    if (loadPromises.length > 0) {
      await Promise.allSettled(loadPromises);
    }

    if (this.onActiveChunksChanged) {
      this.onActiveChunksChanged(Array.from(this.activeChunks.keys()), this.activeChunks.size);
    }
  }

  private async loadSingleChunk(manifest: ChunkManifest): Promise<void> {
    const chunkId = manifest.chunkId;
    this.loadingChunks.add(chunkId);

    try {
      const loaded = await this.chunkLoader.loadChunk(manifest);
      this.chunksParentGroup.add(loaded.sceneGroup);
      this.activeChunks.set(chunkId, loaded);
      this.failedChunks.delete(chunkId);
    } catch (err) {
      const retries = (this.failedChunks.get(chunkId) || 0) + 1;
      this.failedChunks.set(chunkId, retries);
      console.warn(`Chunk load failed for ${chunkId} (attempt ${retries}/3):`, err);

      // Retry once after short delay if retries < 2
      if (retries < 2) {
        setTimeout(() => {
          this.loadingChunks.delete(chunkId);
          this.loadSingleChunk(manifest);
        }, 1000);
        return;
      }
    } finally {
      this.loadingChunks.delete(chunkId);
    }
  }

  public getLoadedChunk(chunkId: string): LoadedChunk | undefined {
    return this.activeChunks.get(chunkId);
  }

  public getActiveChunkCount(): number {
    return this.activeChunks.size;
  }

  public getTotalVisibleTriangles(): number {
    let sum = 0;
    for (const c of this.activeChunks.values()) {
      sum += c.triangleCount;
    }
    return sum;
  }

  public dispose(): void {
    for (const loaded of this.activeChunks.values()) {
      this.chunkLoader.disposeChunk(loaded);
    }
    this.activeChunks.clear();
    this.loadingChunks.clear();
    this.failedChunks.clear();
    this.chunksParentGroup.clear();
  }
}
