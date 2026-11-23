/**
 * Rickshaw dynamo headlight — SpotLight on the vehicle mesh, night + mounted only.
 */

import * as THREE from 'three';

export class RickshawHeadlight {
  public readonly light: THREE.SpotLight;
  private disposed = false;

  constructor(private rickshawMesh: THREE.Group) {
    this.light = new THREE.SpotLight(0xfff2d0, 0, 35, Math.PI / 7, 0.45, 1.4);
    this.light.castShadow = false;
    this.light.name = 'RickshawDynamoHeadlight';
    // Mount near handlebars / front of chassis, aimed forward (-Z)
    this.light.position.set(0, 1.05, -0.95);
    this.light.target.position.set(0, 0.6, -8);
    this.rickshawMesh.add(this.light);
    this.rickshawMesh.add(this.light.target);
    this.light.visible = false;
  }

  public get isDisposed(): boolean {
    return this.disposed;
  }

  public update(isInVehicle: boolean, isNightLike: boolean): void {
    if (this.disposed) return;
    const on = isInVehicle && isNightLike;
    this.light.intensity = on ? 2.2 : 0;
    this.light.visible = on;
  }

  public dispose(): void {
    if (this.disposed) return;
    this.rickshawMesh.remove(this.light.target);
    this.rickshawMesh.remove(this.light);
    this.light.dispose();
    this.disposed = true;
  }
}
