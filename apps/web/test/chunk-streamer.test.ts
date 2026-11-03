import { describe, it, expect, vi } from 'vitest';
import * as THREE from 'three';
import {
  getChunkCoordsFromPosition,
  getChunkId,
  compute3x3Ring,
  ChunkStreamer,
} from '../src/engine/ChunkStreamer.js';
import type { ChunkLoader, LoadedChunk } from '../src/engine/ChunkLoader.js';
import type { ChunkManifest } from '@dhamrai/shared-contracts';

describe('Distance-Based 3x3 Chunk Streaming Architecture', () => {
  it('correctly calculates chunk coordinates and clamps to Phase 1 boundaries [-2, 1]', () => {
    // Rathkhola Origin (0, 0) -> chunk (0, 0)
    expect(getChunkCoordsFromPosition(0, 0)).toEqual([0, 0]);
    expect(getChunkCoordsFromPosition(120, 200)).toEqual([0, 0]);

    // Negative coordinates
    expect(getChunkCoordsFromPosition(-50, -50)).toEqual([-1, -1]);
    expect(getChunkCoordsFromPosition(-300, -300)).toEqual([-2, -2]);

    // Positive extents
    expect(getChunkCoordsFromPosition(300, 300)).toEqual([1, 1]);

    // Out of bounds values clamp safely to [-2, 1]
    expect(getChunkCoordsFromPosition(-800, -800)).toEqual([-2, -2]);
    expect(getChunkCoordsFromPosition(800, 800)).toEqual([1, 1]);
  });

  it('computes 3x3 active ring centered on player chunk', () => {
    // Center at (0, 0): exactly 9 chunks
    const centerRing = compute3x3Ring(0, 0);
    expect(centerRing.length).toBe(9);
    expect(centerRing).toContain('dhamrai_chunk_x0_z0');
    expect(centerRing).toContain('dhamrai_chunk_x-1_z-1');
    expect(centerRing).toContain('dhamrai_chunk_x1_z1');

    // Corner at (-2, -2): bounded by slice edge, exactly 4 chunks
    const cornerRing = compute3x3Ring(-2, -2);
    expect(cornerRing.length).toBe(4);
    expect(cornerRing).toEqual([
      'dhamrai_chunk_x-2_z-2',
      'dhamrai_chunk_x-1_z-2',
      'dhamrai_chunk_x-2_z-1',
      'dhamrai_chunk_x-1_z-1',
    ]);
  });

  it('manages chunk lifecycle: loads desired chunks and disposes unneeded assets', async () => {
    const disposedChunks: string[] = [];

    const mockLoader: ChunkLoader = {
      setBaseUrl: vi.fn(),
      loadChunk: vi.fn(async (manifest: ChunkManifest): Promise<LoadedChunk> => ({
        chunkId: manifest.chunkId,
        manifest,
        sceneGroup: new THREE.Group(),
        colliders: [],
        triangleCount: 500,
      })),
      disposeChunk: vi.fn((chunk: LoadedChunk) => {
        disposedChunks.push(chunk.chunkId);
      }),
    } as unknown as ChunkLoader;

    const parentScene = new THREE.Scene();
    const streamer = new ChunkStreamer(mockLoader, parentScene);

    // Register 16 chunk manifests
    for (let cz = -2; cz <= 1; cz++) {
      for (let cx = -2; cx <= 1; cx++) {
        const id = getChunkId(cx, cz);
        streamer.registerChunkManifest({
          worldDataVersion: '1.0.0',
          chunkId: id,
          chunkX: cx,
          chunkZ: cz,
          boundsMeters: { minX: cx * 256, minZ: cz * 256, maxX: (cx + 1) * 256, maxZ: (cz + 1) * 256 },
          neighbors: [],
          glbAsset: `${id}.glb`,
          roadCount: 5,
          buildingCount: 20,
          triangleCount: 500,
          fileSizeBytes: 50000,
        });
      }
    }

    // 1. Initial player at (0, 0): loads 3x3 ring around (0, 0)
    await streamer.updatePlayerPosition({ x: 0, y: 0, z: 0 });
    expect(streamer.getActiveChunkCount()).toBe(9);
    expect(streamer.getLoadedChunk('dhamrai_chunk_x0_z0')).toBeDefined();
    expect(streamer.getLoadedChunk('dhamrai_chunk_x-2_z-2')).toBeUndefined();

    // 2. Player teleports to Southwest corner (-400, -400) -> chunk (-2, -2)
    await streamer.updatePlayerPosition({ x: -400, y: 0, z: -400 });

    // The corner (-2, -2) active ring only contains 4 chunks: (-2,-2), (-1,-2), (-2,-1), (-1,-1)
    expect(streamer.getActiveChunkCount()).toBe(4);
    expect(streamer.getLoadedChunk('dhamrai_chunk_x-2_z-2')).toBeDefined();

    // Verify previously loaded out-of-range chunks were disposed
    expect(disposedChunks).toContain('dhamrai_chunk_x0_z0');
    expect(disposedChunks).toContain('dhamrai_chunk_x1_z1');
    expect(mockLoader.disposeChunk).toHaveBeenCalled();

    // 3. Clean streamer disposal
    streamer.dispose();
    expect(streamer.getActiveChunkCount()).toBe(0);
  });
});
