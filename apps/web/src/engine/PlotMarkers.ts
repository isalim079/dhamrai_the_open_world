/**
 * Milestone 27/29 — lightweight visual markers for fictional plots.
 */

import * as THREE from 'three';
import { PLOT_DEFINITIONS, type BuildingTemplateId } from '@dhamrai/game-core';

export class PlotMarkers {
  private readonly root = new THREE.Group();
  private readonly markers = new Map<string, THREE.Mesh>();

  constructor(scene: THREE.Scene) {
    this.root.name = 'PlotMarkers';
    scene.add(this.root);
    for (const plot of PLOT_DEFINITIONS) {
      const geom = new THREE.CylinderGeometry(1.2, 1.2, 0.08, 16);
      const mat = new THREE.MeshStandardMaterial({
        color: 0x566573,
        transparent: true,
        opacity: 0.55,
        roughness: 0.9,
      });
      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.set(plot.position.x, 0.05, plot.position.z);
      mesh.name = `plot_marker_${plot.id}`;
      this.root.add(mesh);
      this.markers.set(plot.id, mesh);
    }
  }

  public sync(
    ownedIds: readonly string[],
    buildings: Record<string, BuildingTemplateId>
  ): void {
    const owned = new Set(ownedIds);
    for (const [id, mesh] of this.markers) {
      const mat = mesh.material as THREE.MeshStandardMaterial;
      if (owned.has(id)) {
        const b = buildings[id] ?? 'none';
        mat.color.setHex(b === 'none' ? 0xf4d03f : 0x27ae60);
        mat.opacity = 0.75;
        mesh.scale.setScalar(b === 'none' ? 1 : 1.25);
      } else {
        mat.color.setHex(0x566573);
        mat.opacity = 0.45;
        mesh.scale.setScalar(1);
      }
    }
  }

  public dispose(): void {
    this.root.parent?.remove(this.root);
    for (const mesh of this.markers.values()) {
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    }
    this.markers.clear();
  }
}
