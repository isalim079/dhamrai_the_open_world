/**
 * Light rain weather — clear | rain with capped particle overlay.
 */

import * as THREE from 'three';

export type WeatherState = 'clear' | 'rain';

export const MAX_RAIN_PARTICLES = 1200;
export const WEATHER_STORAGE_KEY = 'dhamrai.weather';

export class WeatherSystem {
  public state: WeatherState = 'clear';
  public readonly root: THREE.Group;
  private points: THREE.Points | null = null;
  private positions: Float32Array | null = null;
  private velocities: Float32Array | null = null;
  private disposed = false;
  private followPos = { x: 0, y: 0, z: 0 };
  public readonly particleCount: number;

  constructor(
    private parent: THREE.Scene | THREE.Group,
    particleCount = MAX_RAIN_PARTICLES
  ) {
    this.particleCount = Math.min(MAX_RAIN_PARTICLES, Math.max(0, particleCount));
    this.root = new THREE.Group();
    this.root.name = 'WeatherSystem';
    this.parent.add(this.root);
    this.loadPrefs();
    this.buildParticles();
    this.applyVisibility();
  }

  private loadPrefs(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const raw = localStorage.getItem(WEATHER_STORAGE_KEY);
      if (raw === 'rain' || raw === 'clear') this.state = raw;
    } catch {
      /* ignore */
    }
  }

  public persistPrefs(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(WEATHER_STORAGE_KEY, this.state);
    } catch {
      /* ignore */
    }
  }

  private buildParticles(): void {
    if (this.particleCount === 0) return;
    this.positions = new Float32Array(this.particleCount * 3);
    this.velocities = new Float32Array(this.particleCount);
    for (let i = 0; i < this.particleCount; i++) {
      this.respawn(i, true);
    }
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xb8d4e8,
      size: 0.08,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      sizeAttenuation: true,
    });
    this.points = new THREE.Points(geom, mat);
    this.points.frustumCulled = false;
    this.points.name = 'RainParticles';
    this.root.add(this.points);
  }

  private respawn(i: number, initial: boolean): void {
    if (!this.positions || !this.velocities) return;
    const spread = 28;
    const ox = this.followPos.x;
    const oy = this.followPos.y;
    const oz = this.followPos.z;
    this.positions[i * 3] = ox + (Math.random() - 0.5) * spread * 2;
    this.positions[i * 3 + 1] = oy + (initial ? Math.random() * 18 : 14 + Math.random() * 6);
    this.positions[i * 3 + 2] = oz + (Math.random() - 0.5) * spread * 2;
    this.velocities[i] = 9 + Math.random() * 6;
  }

  private applyVisibility(): void {
    if (this.points) this.points.visible = this.state === 'rain';
  }

  public get rainFactor(): number {
    return this.state === 'rain' ? 1 : 0;
  }

  public get isDisposed(): boolean {
    return this.disposed;
  }

  public setWeather(state: WeatherState): void {
    this.state = state;
    this.applyVisibility();
    this.persistPrefs();
  }

  public toggleWeather(): WeatherState {
    this.setWeather(this.state === 'clear' ? 'rain' : 'clear');
    return this.state;
  }

  public update(dt: number, playerPos: { x: number; y: number; z: number }): void {
    if (this.disposed || this.state !== 'rain' || !this.points || !this.positions || !this.velocities) {
      this.followPos = { ...playerPos };
      return;
    }
    this.followPos = { ...playerPos };
    for (let i = 0; i < this.particleCount; i++) {
      const yi = i * 3 + 1;
      this.positions[yi]! -= this.velocities[i]! * dt;
      // Drift slightly with wind
      this.positions[i * 3]! += dt * 1.2;
      if (this.positions[yi]! < playerPos.y - 1) {
        this.respawn(i, false);
      }
    }
    const attr = this.points.geometry.getAttribute('position') as THREE.BufferAttribute;
    attr.needsUpdate = true;
  }

  public dispose(): void {
    if (this.disposed) return;
    if (this.points) {
      this.points.geometry.dispose();
      (this.points.material as THREE.Material).dispose();
      this.root.remove(this.points);
      this.points = null;
    }
    if (this.root.parent) this.root.parent.remove(this.root);
    this.root.clear();
    this.positions = null;
    this.velocities = null;
    this.disposed = true;
  }
}
