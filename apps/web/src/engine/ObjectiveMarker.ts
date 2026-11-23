/**
 * Milestone 15 — World-space mission objective beacon + bearing helpers.
 */

import * as THREE from 'three';
import type { WorldPosition } from '@dhamrai/shared-contracts';

export function bearingToTargetDeg(
  from: WorldPosition,
  to: WorldPosition,
  headingRad: number
): number {
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  // World angle: 0 = -Z (north), matching character heading
  const worldAngle = Math.atan2(dx, -dz);
  let rel = worldAngle - headingRad;
  while (rel > Math.PI) rel -= Math.PI * 2;
  while (rel < -Math.PI) rel += Math.PI * 2;
  return (rel * 180) / Math.PI;
}

export function distanceToTargetM(from: WorldPosition, to: WorldPosition): number {
  return Math.hypot(to.x - from.x, to.z - from.z);
}

export class ObjectiveMarker {
  public readonly root: THREE.Group;
  private readonly beam: THREE.Mesh;
  private readonly ring: THREE.Mesh;
  private readonly bobPivot: THREE.Group;
  private visible = false;
  private elapsed = 0;

  constructor(scene: THREE.Scene) {
    this.root = new THREE.Group();
    this.root.name = 'ObjectiveMarker';
    this.root.visible = false;

    this.bobPivot = new THREE.Group();
    this.root.add(this.bobPivot);

    const beamGeom = new THREE.CylinderGeometry(0.15, 0.35, 4.5, 8, 1, true);
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0xf1c40f,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.beam = new THREE.Mesh(beamGeom, beamMat);
    this.beam.position.y = 2.4;
    this.bobPivot.add(this.beam);

    const ringGeom = new THREE.TorusGeometry(1.1, 0.08, 8, 24);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xffe066,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    });
    this.ring = new THREE.Mesh(ringGeom, ringMat);
    this.ring.rotation.x = Math.PI / 2;
    this.ring.position.y = 0.15;
    this.bobPivot.add(this.ring);

    const tipGeom = new THREE.ConeGeometry(0.35, 0.7, 8);
    const tipMat = new THREE.MeshBasicMaterial({ color: 0xf1c40f });
    const tip = new THREE.Mesh(tipGeom, tipMat);
    tip.position.y = 5.0;
    this.bobPivot.add(tip);

    scene.add(this.root);
  }

  public setTarget(pos: WorldPosition | null): void {
    if (!pos) {
      this.visible = false;
      this.root.visible = false;
      return;
    }
    this.visible = true;
    this.root.visible = true;
    this.root.position.set(pos.x, 0, pos.z);
  }

  public update(dt: number): void {
    if (!this.visible) return;
    this.elapsed += dt;
    this.bobPivot.position.y = Math.sin(this.elapsed * 2.2) * 0.25;
    this.ring.rotation.z = this.elapsed * 1.5;
    const pulse = 0.35 + 0.2 * (0.5 + 0.5 * Math.sin(this.elapsed * 3));
    (this.beam.material as THREE.MeshBasicMaterial).opacity = pulse;
  }

  public dispose(): void {
    this.root.parent?.remove(this.root);
    this.root.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        const m = obj.material;
        if (Array.isArray(m)) m.forEach((x) => x.dispose());
        else m.dispose();
      }
    });
  }
}
