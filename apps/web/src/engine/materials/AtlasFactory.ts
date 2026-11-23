/**
 * Dhamrai Life — Procedural Material Atlas Factory (Milestone 11)
 * ================================================================
 * Generates deterministic DataTextures for building facades, roofs,
 * asphalt, and embankment earth without external image assets or
 * npm dependencies. Safe in both browser and Vitest (Node) contexts.
 */

import * as THREE from 'three';

export const ATLAS_SIZE = 512;

export type AtlasKind = 'building' | 'roof' | 'asphalt' | 'embankment';

function clampByte(v: number): number {
  return Math.max(0, Math.min(255, v | 0));
}

/** Deterministic 2D hash in [0, 1). */
function hash2(x: number, y: number, seed: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453;
  return n - Math.floor(n);
}

function writePixel(
  data: Uint8Array,
  size: number,
  x: number,
  y: number,
  r: number,
  g: number,
  b: number,
  a = 255
): void {
  const i = (y * size + x) * 4;
  data[i] = clampByte(r);
  data[i + 1] = clampByte(g);
  data[i + 2] = clampByte(b);
  data[i + 3] = clampByte(a);
}

function fillBuildingAtlas(data: Uint8Array, size: number): void {
  // Lower 60% (v 0–0.6): plaster + brick band + window strip
  // Upper-right roof region handled separately by roof atlas; building atlas
  // still paints a tin-ish patch in UV roof quadrant for meshes that share one map.
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / (size - 1);
      const v = y / (size - 1);

      if (v >= 0.65) {
        // Roof quadrant hint (corrugated tin)
        const ridge = Math.sin(u * Math.PI * 28) * 12;
        const base = 95 + ridge;
        const rust = hash2(x, y, 3) > 0.92 ? 35 : 0;
        writePixel(data, size, x, y, base + rust, base - 8, base - 18);
        continue;
      }

      // Window horizontal band around v≈0.35–0.48
      const inWindowBand = v > 0.32 && v < 0.48;
      const windowCol = Math.floor(u * 8) % 2 === 0;
      if (inWindowBand && windowCol && u % 0.125 > 0.03 && u % 0.125 < 0.095) {
        const glass = 40 + hash2(x, y, 1) * 30;
        writePixel(data, size, x, y, glass, glass + 15, glass + 25);
        continue;
      }

      // Brick courses in lower plaster
      const brickRow = Math.floor(v * 48);
      const brickCol = Math.floor(u * 24 + (brickRow % 2) * 0.5);
      const mortar = (x % Math.max(1, Math.floor(size / 24)) < 1) || (y % Math.max(1, Math.floor(size / 48)) < 1);
      if (v < 0.6 && !mortar) {
        const n = hash2(brickCol, brickRow, 7);
        const r = 168 + n * 40;
        const g = 118 + n * 25;
        const b = 92 + n * 18;
        writePixel(data, size, x, y, r, g, b);
      } else if (mortar && v < 0.6) {
        writePixel(data, size, x, y, 210, 200, 188);
      } else {
        // Upper plaster
        const n = hash2(x, y, 11) * 18;
        writePixel(data, size, x, y, 208 + n, 198 + n * 0.8, 184 + n * 0.6);
      }
    }
  }
}

function fillRoofAtlas(data: Uint8Array, size: number): void {
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / (size - 1);
      const wave = Math.sin(u * Math.PI * 36) * 18;
      const n = hash2(x, y, 5) * 20;
      const r = 110 + wave + n;
      const g = 105 + wave * 0.7 + n * 0.5;
      const b = 95 + wave * 0.4;
      // Occasional rust streak
      if (hash2(x, y, 9) > 0.97) {
        writePixel(data, size, x, y, r + 40, g - 10, b - 20);
      } else {
        writePixel(data, size, x, y, r, g, b);
      }
    }
  }
}

function fillAsphaltAtlas(data: Uint8Array, size: number): void {
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const n = hash2(x, y, 13) * 28;
      const base = 42 + n;
      // Faint center-ish wear streak
      const wear = Math.abs(x - size / 2) < size * 0.04 ? 14 : 0;
      writePixel(data, size, x, y, base + wear, base + wear, base + wear + 2);
    }
  }
}

function fillEmbankmentAtlas(data: Uint8Array, size: number): void {
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const n = hash2(x, y, 17);
      const r = 85 + n * 45;
      const g = 105 + n * 50;
      const b = 55 + n * 30;
      writePixel(data, size, x, y, r, g, b);
    }
  }
}

function makeDataTexture(kind: AtlasKind, size = ATLAS_SIZE): THREE.DataTexture {
  const data = new Uint8Array(size * size * 4);
  switch (kind) {
    case 'building':
      fillBuildingAtlas(data, size);
      break;
    case 'roof':
      fillRoofAtlas(data, size);
      break;
    case 'asphalt':
      fillAsphaltAtlas(data, size);
      break;
    case 'embankment':
      fillEmbankmentAtlas(data, size);
      break;
  }

  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.needsUpdate = true;
  tex.name = `atlas_${kind}_${size}`;
  return tex;
}

/**
 * Builds and owns the four shared world atlases.
 * Deterministic: same size always yields identical pixel buffers.
 */
export class AtlasFactory {
  public readonly size: number;
  public buildingMap: THREE.DataTexture;
  public roofMap: THREE.DataTexture;
  public asphaltMap: THREE.DataTexture;
  public embankmentMap: THREE.DataTexture;

  private disposed = false;

  constructor(size = ATLAS_SIZE) {
    this.size = size;
    this.buildingMap = makeDataTexture('building', size);
    this.roofMap = makeDataTexture('roof', size);
    this.asphaltMap = makeDataTexture('asphalt', size);
    this.embankmentMap = makeDataTexture('embankment', size);
  }

  /** Sample a single pixel for deterministic unit tests. */
  public samplePixel(kind: AtlasKind, x: number, y: number): [number, number, number, number] {
    const map =
      kind === 'building'
        ? this.buildingMap
        : kind === 'roof'
          ? this.roofMap
          : kind === 'asphalt'
            ? this.asphaltMap
            : this.embankmentMap;
    const data = map.image.data as Uint8Array;
    const i = (y * this.size + x) * 4;
    return [data[i]!, data[i + 1]!, data[i + 2]!, data[i + 3]!];
  }

  public get isDisposed(): boolean {
    return this.disposed;
  }

  public dispose(): void {
    if (this.disposed) return;
    this.buildingMap.dispose();
    this.roofMap.dispose();
    this.asphaltMap.dispose();
    this.embankmentMap.dispose();
    this.disposed = true;
  }
}
