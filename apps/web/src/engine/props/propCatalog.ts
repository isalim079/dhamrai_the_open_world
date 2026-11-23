/**
 * Procedural low-poly prop archetype builders for Milestone 11.
 * All geometry is code-authored — no external GLB packs.
 */

import * as THREE from 'three';
import type { SignboardCopy } from '../../content/signboardCopy.js';

const woodMat = () =>
  new THREE.MeshStandardMaterial({ color: 0x6e2c00, roughness: 0.85, metalness: 0.05 });
const tarpMat = (color: number) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.9, metalness: 0.0 });
const metalMat = () =>
  new THREE.MeshStandardMaterial({ color: 0xb0b0b0, roughness: 0.4, metalness: 0.75 });
const concreteMat = () =>
  new THREE.MeshStandardMaterial({ color: 0xcfd8dc, roughness: 0.9, metalness: 0.05 });
const foliageMat = () =>
  new THREE.MeshStandardMaterial({ color: 0x1e8449, roughness: 0.95, metalness: 0.0 });
const brassMat = () =>
  new THREE.MeshStandardMaterial({ color: 0xd4ac0d, roughness: 0.35, metalness: 0.85 });

/** Roadside tea stall / tonger dokan. */
export function createTeaStall(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'prop_tea_stall';

  const counter = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.85, 0.7), woodMat());
  counter.position.set(0, 0.425, 0);
  counter.castShadow = true;
  group.add(counter);

  const roof = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.08, 1.2), tarpMat(0xf39c12));
  roof.position.set(0, 1.45, 0);
  roof.castShadow = true;
  group.add(roof);

  // Side tarp flap for silhouette readability at distance
  const flap = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.35, 0.04), tarpMat(0xe67e22));
  flap.position.set(0, 1.2, -0.55);
  group.add(flap);

  const postL = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.3, 6), woodMat());
  postL.position.set(-0.75, 0.65, -0.35);
  group.add(postL);
  const postR = postL.clone();
  postR.position.x = 0.75;
  group.add(postR);

  const kettle = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), metalMat());
  kettle.position.set(-0.35, 0.95, 0.05);
  group.add(kettle);

  return group;
}

/** Electrical pole (single instance prototype for InstancedMesh). */
export function createPolePrototype(): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 6.5, 6), concreteMat());
  mesh.geometry.translate(0, 3.25, 0);
  mesh.name = 'prop_pole_proto';
  mesh.castShadow = true;
  return mesh;
}

/** Simple low-poly tree prototype for InstancedMesh. */
export function createTreePrototype(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'prop_tree_proto';

  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 1.8, 6), woodMat());
  trunk.position.y = 0.9;
  trunk.castShadow = true;
  group.add(trunk);

  const canopy = new THREE.Mesh(new THREE.SphereGeometry(1.1, 8, 6), foliageMat());
  canopy.position.y = 2.4;
  canopy.castShadow = true;
  group.add(canopy);

  return group;
}

/** Flatten a group into a single merge-friendly mesh for instancing (canopy+trunk as one draw via merged approach is hard).
 * For trees we instance two separate InstancedMeshes in PropManager instead.
 */
export function createTreeTrunkPrototype(): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 1.8, 6), woodMat());
  mesh.geometry.translate(0, 0.9, 0);
  mesh.castShadow = true;
  return mesh;
}

export function createTreeCanopyPrototype(): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1.1, 8, 6), foliageMat());
  mesh.geometry.translate(0, 2.4, 0);
  mesh.castShadow = true;
  return mesh;
}

/** Kayetpara workshop anvil / workbench silhouette. */
export function createWorkshopAnvil(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'prop_workshop_anvil';

  const block = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.55, 0.55), metalMat());
  block.position.y = 0.35;
  block.castShadow = true;
  group.add(block);

  const horn = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.2, 0.2), metalMat());
  horn.position.set(0.55, 0.55, 0);
  group.add(horn);

  const brass = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.08, 12), brassMat());
  brass.rotation.z = Math.PI / 2;
  brass.position.set(-0.55, 1.1, 0);
  group.add(brass);

  const hang = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.7, 4), metalMat());
  hang.position.set(-0.55, 0.75, 0);
  group.add(hang);

  return group;
}

/** Thana checkpoint barrier post. */
export function createBarrierPost(): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 1.2, 8), tarpMat(0xf1c40f));
  mesh.geometry.translate(0, 0.6, 0);
  mesh.castShadow = true;
  mesh.name = 'prop_barrier_post';
  return mesh;
}

/**
 * Creates a bilingual signboard. Uses CanvasTexture when DOM canvas is available;
 * otherwise falls back to a solid-color DataTexture (Vitest/Node).
 */
export function createSignboard(copy: SignboardCopy, width = 2.4, height = 0.9): THREE.Group {
  const group = new THREE.Group();
  group.name = copy.id;

  const texture = createSignTexture(copy, 512, 192);
  const faceMat = new THREE.MeshStandardMaterial({
    map: texture,
    roughness: 0.7,
    metalness: 0.05,
    color: 0xffffff,
  });
  faceMat.userData.dhamraiSignTexture = true;

  const board = new THREE.Mesh(new THREE.BoxGeometry(width, height, 0.06), faceMat);
  board.position.y = height / 2 + 1.4;
  board.castShadow = true;
  group.add(board);

  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 1.5, 6), woodMat());
  post.position.y = 0.75;
  group.add(post);

  return group;
}

export function createSignTexture(copy: SignboardCopy, w = 512, h = 192): THREE.Texture {
  const canvasAvailable =
    typeof document !== 'undefined' && typeof document.createElement === 'function';

  if (canvasAvailable) {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const face = `#${copy.faceColor.toString(16).padStart(6, '0')}`;
      const text = `#${copy.textColor.toString(16).padStart(6, '0')}`;
      ctx.fillStyle = face;
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      ctx.lineWidth = 8;
      ctx.strokeRect(4, 4, w - 8, h - 8);

      ctx.fillStyle = text;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = 'bold 42px "Noto Sans Bengali", "Noto Sans", sans-serif';
      ctx.fillText(copy.bn, w / 2, h * 0.38);
      ctx.font = '600 28px "Noto Sans", sans-serif';
      ctx.fillText(copy.en, w / 2, h * 0.68);

      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.needsUpdate = true;
      tex.name = `sign_${copy.id}`;
      return tex;
    }
  }

  // Node / headless fallback: solid face color DataTexture
  const data = new Uint8Array(16 * 16 * 4);
  const r = (copy.faceColor >> 16) & 0xff;
  const g = (copy.faceColor >> 8) & 0xff;
  const b = copy.faceColor & 0xff;
  for (let i = 0; i < 16 * 16; i++) {
    data[i * 4] = r;
    data[i * 4 + 1] = g;
    data[i * 4 + 2] = b;
    data[i * 4 + 3] = 255;
  }
  const tex = new THREE.DataTexture(data, 16, 16, THREE.RGBAFormat);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  tex.name = `sign_${copy.id}_fallback`;
  return tex;
}

/** School gate pillar pair. */
export function createGatePillar(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'prop_gate_pillar';
  const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.45, 2.4, 0.45), concreteMat());
  pillar.position.y = 1.2;
  pillar.castShadow = true;
  group.add(pillar);
  const cap = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.15, 0.55), concreteMat());
  cap.position.y = 2.5;
  group.add(cap);
  return group;
}
