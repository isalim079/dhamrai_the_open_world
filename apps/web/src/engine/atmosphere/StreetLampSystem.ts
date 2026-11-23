/**
 * Distance-culled streetlamps anchored to M11 electrical pole positions.
 * Hard cap on active PointLights for GPU budget.
 */

import * as THREE from 'three';

export const MAX_ACTIVE_STREET_LAMPS = 6;
export const LAMP_BULB_HEIGHT = 6.2;

export interface LampAnchor {
  x: number;
  y: number;
  z: number;
}

export class StreetLampSystem {
  public readonly root: THREE.Group;
  private lights: THREE.PointLight[] = [];
  private bulbs: THREE.Mesh[] = [];
  private anchors: LampAnchor[] = [];
  private disposed = false;
  private activeCount = 0;

  constructor(
    private parent: THREE.Scene | THREE.Group,
    anchors: LampAnchor[],
    maxActive = MAX_ACTIVE_STREET_LAMPS
  ) {
    this.root = new THREE.Group();
    this.root.name = 'StreetLampSystem';
    this.parent.add(this.root);
    this.anchors = anchors.slice();

    const bulbMat = new THREE.MeshStandardMaterial({
      color: 0xffe0a0,
      emissive: 0xffc857,
      emissiveIntensity: 0,
      roughness: 0.4,
      metalness: 0.2,
    });
    const bulbGeom = new THREE.SphereGeometry(0.12, 8, 8);

    for (let i = 0; i < this.anchors.length; i++) {
      const a = this.anchors[i]!;
      const bulb = new THREE.Mesh(bulbGeom, bulbMat.clone());
      bulb.position.set(a.x, a.y + LAMP_BULB_HEIGHT, a.z);
      bulb.name = `lamp_bulb_${i}`;
      this.root.add(bulb);
      this.bulbs.push(bulb);

      if (i < maxActive) {
        const light = new THREE.PointLight(0xffd089, 0, 28, 2);
        light.position.copy(bulb.position);
        light.castShadow = false;
        light.visible = false;
        light.name = `lamp_light_${i}`;
        this.root.add(light);
        this.lights.push(light);
      }
    }
  }

  public get activeLightCount(): number {
    return this.activeCount;
  }

  public get lampCount(): number {
    return this.anchors.length;
  }

  public get isDisposed(): boolean {
    return this.disposed;
  }

  /**
   * Enables nearest lamps when nightFactor is high; day disables all.
   */
  public update(playerPos: { x: number; z: number }, nightFactor: number): void {
    if (this.disposed) return;

    const lampsOn = nightFactor >= 0.35;
    const intensity = lampsOn ? THREE.MathUtils.clamp((nightFactor - 0.25) / 0.5, 0, 1) * 1.35 : 0;

    // Rank anchors by distance
    const ranked = this.anchors
      .map((a, i) => ({
        i,
        d2: (a.x - playerPos.x) ** 2 + (a.z - playerPos.z) ** 2,
      }))
      .sort((a, b) => a.d2 - b.d2);

    const activeIdx = new Set(ranked.slice(0, this.lights.length).map((r) => r.i));

    // Reset lights
    for (const light of this.lights) {
      light.intensity = 0;
      light.visible = false;
    }
    this.activeCount = 0;

    let lightSlot = 0;
    for (let i = 0; i < this.bulbs.length; i++) {
      const bulb = this.bulbs[i]!;
      const mat = bulb.material as THREE.MeshStandardMaterial;
      if (!lampsOn) {
        mat.emissiveIntensity = 0;
        continue;
      }
      mat.emissiveIntensity = 0.55 + intensity * 0.8;

      if (activeIdx.has(i) && lightSlot < this.lights.length) {
        const light = this.lights[lightSlot++]!;
        const a = this.anchors[i]!;
        light.position.set(a.x, a.y + LAMP_BULB_HEIGHT, a.z);
        light.intensity = intensity;
        light.visible = intensity > 0.02;
        if (light.visible) this.activeCount++;
      }
    }
  }

  public dispose(): void {
    if (this.disposed) return;
    for (const light of this.lights) {
      this.root.remove(light);
      light.dispose();
    }
    for (const bulb of this.bulbs) {
      bulb.geometry.dispose();
      (bulb.material as THREE.Material).dispose();
      this.root.remove(bulb);
    }
    this.lights = [];
    this.bulbs = [];
    if (this.root.parent) this.root.parent.remove(this.root);
    this.root.clear();
    this.disposed = true;
  }
}
