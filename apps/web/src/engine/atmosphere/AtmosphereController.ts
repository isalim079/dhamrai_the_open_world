/**
 * Applies DayNightCycle + weather samples to SceneManager lights / fog / sky
 * and renderer exposure.
 */

import * as THREE from 'three';
import type { SceneManager } from '../SceneManager.js';
import type { WebGLRendererManager } from '../Renderer.js';
import type { DayNightCycle } from './DayNightCycle.js';
import { rgbToHex, sampleAtmosphere } from './atmosphereCurves.js';

export class AtmosphereController {
  private accum = 0;
  private readonly updateInterval = 0.1; // 10 Hz color updates
  private disposed = false;
  private lastSample = sampleAtmosphere(0.5, 0);

  constructor(
    private sceneManager: SceneManager,
    private rendererManager: WebGLRendererManager,
    private cycle: DayNightCycle
  ) {}

  public get sample() {
    return this.lastSample;
  }

  public get isDisposed(): boolean {
    return this.disposed;
  }

  /** Force immediate apply (tests / CDP). */
  public applyNow(rainFactor = 0): void {
    if (this.disposed) return;
    this.lastSample = sampleAtmosphere(this.cycle.t, rainFactor);
    this.applySample(this.lastSample);
  }

  public update(dt: number, rainFactor = 0): void {
    if (this.disposed) return;
    this.accum += dt;
    if (this.accum < this.updateInterval) {
      // Still update sun position every frame for smooth arc
      this.applySunPosition(this.lastSample);
      return;
    }
    this.accum = 0;
    this.lastSample = sampleAtmosphere(this.cycle.t, rainFactor);
    this.applySample(this.lastSample);
  }

  private applySunPosition(sample: typeof this.lastSample): void {
    const dir = this.cycle.getSunDirection();
    const dist = 280;
    this.sceneManager.sunLight.position.set(dir.x * dist, Math.max(dir.y, 0.02) * dist, dir.z * dist);
    this.sceneManager.sunLight.target.position.set(0, 0, 0);
    this.sceneManager.sunLight.target.updateMatrixWorld();
    void sample;
  }

  private applySample(sample: typeof this.lastSample): void {
    const sun = this.sceneManager.sunLight;
    sun.color.setHex(rgbToHex(sample.sunColor));
    sun.intensity = sample.sunIntensity;
    sun.castShadow = sample.sunIntensity > 0.08;

    this.sceneManager.ambientLight.color.setHex(rgbToHex(sample.ambientColor));
    this.sceneManager.ambientLight.intensity = sample.ambientIntensity;

    this.sceneManager.hemiLight.color.setHex(rgbToHex(sample.hemiSkyColor));
    this.sceneManager.hemiLight.groundColor.setHex(rgbToHex(sample.hemiGroundColor));
    this.sceneManager.hemiLight.intensity = sample.hemiIntensity;

    this.sceneManager.scene.background = new THREE.Color(rgbToHex(sample.skyColor));
    const fog = this.sceneManager.scene.fog;
    if (fog instanceof THREE.FogExp2) {
      fog.color.setHex(rgbToHex(sample.fogColor));
      fog.density = sample.fogDensity;
    }

    this.rendererManager.renderer.toneMappingExposure = sample.exposure;
    this.applySunPosition(sample);
  }

  public dispose(): void {
    this.disposed = true;
  }
}
