import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as THREE from 'three';
import { PropManager } from '../src/engine/PropManager.js';
import { PHASE_1_ANCHORS } from '@dhamrai/shared-contracts';
import { LANDMARK_SIGNS, getSignCopy } from '../src/content/signboardCopy.js';
import { createTeaStall, createSignboard } from '../src/engine/props/propCatalog.js';

describe('signboardCopy — curated bilingual content', () => {
  it('includes required landmark signs', () => {
    expect(LANDMARK_SIGNS.length).toBeGreaterThanOrEqual(5);
    expect(getSignCopy('sign_rathkhola_stand')?.bn).toContain('রাঠখোলা');
    expect(getSignCopy('sign_hardinge_school')?.en).toContain('Hardinge');
    expect(getSignCopy('sign_kayetpara_workshop')?.en).toContain('Kayetpara');
  });
});

describe('propCatalog — procedural archetypes', () => {
  it('builds a tea stall group with counter and roof', () => {
    const stall = createTeaStall();
    expect(stall.name).toBe('prop_tea_stall');
    expect(stall.children.length).toBeGreaterThanOrEqual(3);
  });

  it('builds a signboard with a texture map', () => {
    const copy = getSignCopy('sign_tea_stall')!;
    const board = createSignboard(copy);
    expect(board.name).toBe('sign_tea_stall');
    let hasTexturedFace = false;
    board.traverse((c) => {
      const m = c as THREE.Mesh;
      if (m.isMesh) {
        const mat = m.material as THREE.MeshStandardMaterial;
        if (mat.map) hasTexturedFace = true;
      }
    });
    expect(hasTexturedFace).toBe(true);
    board.traverse((c) => {
      const m = c as THREE.Mesh;
      if (m.isMesh) {
        m.geometry.dispose();
        const mats = Array.isArray(m.material) ? m.material : [m.material];
        for (const mat of mats) {
          const std = mat as THREE.MeshStandardMaterial;
          if (std.map) std.map.dispose();
          mat.dispose();
        }
      }
    });
  });
});

describe('PropManager — landmark street props', () => {
  let scene: THREE.Scene;
  let props: PropManager;

  beforeEach(() => {
    scene = new THREE.Scene();
    props = new PropManager(scene);
    props.init();
  });

  afterEach(() => {
    props.dispose();
  });

  it('initializes once and attaches PropsRoot to the scene', () => {
    expect(props.isInitialized).toBe(true);
    expect(scene.getObjectByName('PropsRoot')).toBe(props.root);
    props.init(); // idempotent
    expect(props.stats.uniquePropCount).toBeGreaterThan(0);
  });

  it('places tea stalls / signs near Rathkhola origin (AC-M11-02)', () => {
    const o = PHASE_1_ANCHORS.RATHKHOLA_ORIGIN;
    const near = props.countPropsNear(o.x, o.z, 25);
    expect(near).toBeGreaterThanOrEqual(4);
  });

  it('places workshop props near Kayetpara (AC-M11-03)', () => {
    const a = PHASE_1_ANCHORS.KAYETPARA_METAL_WORKSHOP;
    const near = props.countPropsNear(a.x, a.z, 20);
    expect(near).toBeGreaterThanOrEqual(2);
  });

  it('places checkpoint detail near Thana Junction (AC-M11-04)', () => {
    const a = PHASE_1_ANCHORS.THANA_JUNCTION_CHECKPOINT;
    const near = props.countPropsNear(a.x, a.z, 20);
    expect(near).toBeGreaterThanOrEqual(3);
  });

  it('places Hardinge school board / pillars (AC-M11-05)', () => {
    const a = PHASE_1_ANCHORS.HARDINGE_HIGH_SCHOOL;
    const near = props.countPropsNear(a.x, a.z, 15);
    expect(near).toBeGreaterThanOrEqual(2);
  });

  it('uses InstancedMesh for poles, trees, and barriers (AC-M11-06)', () => {
    expect(props.stats.poleInstances).toBeGreaterThanOrEqual(8);
    expect(props.stats.treeInstances).toBeGreaterThanOrEqual(8);
    expect(props.stats.barrierInstances).toBe(6);

    let instancedCount = 0;
    props.root.traverse((c) => {
      if ((c as THREE.InstancedMesh).isInstancedMesh) instancedCount++;
    });
    expect(instancedCount).toBeGreaterThanOrEqual(3);
  });

  it('keeps estimated prop triangles well under the 120k view budget', () => {
    expect(props.stats.estimatedTriangles).toBeLessThan(25_000);
  });

  it('dispose clears scene attachment and is idempotent (AC-M11-09)', () => {
    props.dispose();
    expect(props.isDisposed).toBe(true);
    expect(scene.getObjectByName('PropsRoot')).toBeUndefined();
    props.dispose();
    expect(props.isDisposed).toBe(true);
  });
});
