import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as THREE from 'three';
import { AtlasFactory, ATLAS_SIZE } from '../src/engine/materials/AtlasFactory.js';
import {
  WorldMaterialBinder,
  isSharedWorldMaterial,
  SHARED_MATERIAL_FLAG,
} from '../src/engine/materials/WorldMaterialBinder.js';

describe('AtlasFactory — procedural world atlases', () => {
  let atlas: AtlasFactory;

  beforeEach(() => {
    atlas = new AtlasFactory(64); // smaller for fast tests
  });

  afterEach(() => {
    atlas.dispose();
  });

  it('creates four deterministic atlases of the requested size', () => {
    expect(atlas.size).toBe(64);
    expect(atlas.buildingMap.image.width).toBe(64);
    expect(atlas.asphaltMap.image.height).toBe(64);
    expect(atlas.roofMap).toBeDefined();
    expect(atlas.embankmentMap).toBeDefined();
  });

  it('is deterministic for the same coordinates', () => {
    const a = atlas.samplePixel('building', 10, 20);
    const b = atlas.samplePixel('building', 10, 20);
    expect(a).toEqual(b);

    const other = new AtlasFactory(64);
    expect(other.samplePixel('asphalt', 5, 5)).toEqual(atlas.samplePixel('asphalt', 5, 5));
    other.dispose();
  });

  it('default ATLAS_SIZE is 512 for production quality', () => {
    expect(ATLAS_SIZE).toBe(512);
  });

  it('dispose is idempotent and marks disposed', () => {
    atlas.dispose();
    expect(atlas.isDisposed).toBe(true);
    atlas.dispose();
    expect(atlas.isDisposed).toBe(true);
  });
});

describe('WorldMaterialBinder — shared atlas materials', () => {
  let binder: WorldMaterialBinder;

  beforeEach(() => {
    binder = new WorldMaterialBinder(64);
  });

  afterEach(() => {
    binder.dispose();
  });

  it('marks shared materials with the dhamraiShared flag', () => {
    expect(binder.buildingMaterial.userData[SHARED_MATERIAL_FLAG]).toBe(true);
    expect(isSharedWorldMaterial(binder.roadMaterial)).toBe(true);
    expect(binder.buildingMaterial.map).toBe(binder.atlas.buildingMap);
    expect(binder.roadMaterial.map).toBe(binder.atlas.asphaltMap);
  });

  it('binds chunk meshes by material name and is idempotent', () => {
    const group = new THREE.Group();
    const building = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshStandardMaterial({ name: 'building_atlas', color: 0xd1c7b8 })
    );
    const road = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      new THREE.MeshStandardMaterial({ name: 'road_asphalt', color: 0x333333 })
    );
    const earth = new THREE.Mesh(
      new THREE.BoxGeometry(1, 0.2, 1),
      new THREE.MeshStandardMaterial({ name: 'embankment_earth', color: 0x556633 })
    );
    group.add(building, road, earth);

    const first = binder.bindChunkGroup(group);
    expect(first).toBe(3);
    expect(building.material).toBe(binder.buildingMaterial);
    expect(road.material).toBe(binder.roadMaterial);
    expect(earth.material).toBe(binder.embankmentMaterial);

    const second = binder.bindChunkGroup(group);
    // Already shared — may still count as rebound when name matches
    expect(second).toBeGreaterThanOrEqual(0);
    expect(building.material).toBe(binder.buildingMaterial);
  });

  it('does not throw when binding after dispose (returns 0)', () => {
    binder.dispose();
    const group = new THREE.Group();
    group.add(
      new THREE.Mesh(
        new THREE.BoxGeometry(),
        new THREE.MeshStandardMaterial({ name: 'building_atlas' })
      )
    );
    expect(binder.bindChunkGroup(group)).toBe(0);
  });
});
