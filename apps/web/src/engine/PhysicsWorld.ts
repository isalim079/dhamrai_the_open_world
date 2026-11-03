/**
 * Dhamrai Life — Rapier 3D Physics World Manager
 */

import RAPIER from '@dimforge/rapier3d-compat';

export interface TrimeshData {
  positions: Float32Array;
  indices: Uint32Array | Uint16Array;
}

export class PhysicsWorld {
  public rapier!: typeof RAPIER;
  public world!: RAPIER.World;
  private isInitialized = false;

  public readonly fixedDeltaTime = 1 / 60; // 60 Hz fixed timestep
  private accumulator = 0;
  private readonly maxSubSteps = 4; // Prevent spiral of death on frame drops

  public async init(): Promise<void> {
    if (this.isInitialized) return;
    await RAPIER.init();
    this.rapier = RAPIER;
    this.world = new RAPIER.World({ x: 0.0, y: -9.81, z: 0.0 });
    this.world.timestep = this.fixedDeltaTime;
    this.isInitialized = true;
  }

  public get ready(): boolean {
    return this.isInitialized;
  }

  /**
   * Advances the physics simulation using a fixed timestep accumulator.
   * Calls `substepCallback` for each 60 Hz fixed physics step (for character/vehicle logic).
   * Returns interpolation factor alpha in [0, 1] for render transform smoothing.
   */
  public step(frameDeltaSeconds: number, substepCallback?: (dt: number) => void): number {
    if (!this.isInitialized) return 0;

    // Clamp frame delta to 0.1s to avoid huge jumps after tab freeze
    const clampedDelta = Math.min(frameDeltaSeconds, 0.1);
    this.accumulator += clampedDelta;

    let steps = 0;
    while (this.accumulator >= this.fixedDeltaTime && steps < this.maxSubSteps) {
      if (substepCallback) {
        substepCallback(this.fixedDeltaTime);
      }
      this.world.step();
      this.accumulator -= this.fixedDeltaTime;
      steps++;
    }

    // Discard any residual accumulator beyond maxSubSteps to stay synchronized
    if (steps >= this.maxSubSteps) {
      this.accumulator = 0;
    }

    return this.accumulator / this.fixedDeltaTime;
  }

  /**
   * Creates a static trimesh collider from vertex positions and indices.
   */
  public createStaticTrimesh(positions: Float32Array, indices: Uint32Array | Uint16Array): RAPIER.Collider | null {
    if (!this.isInitialized || positions.length === 0 || indices.length === 0) return null;

    try {
      const idx32 = indices instanceof Uint32Array ? indices : new Uint32Array(indices);
      const colDesc = this.rapier.ColliderDesc.trimesh(positions, idx32);
      return this.world.createCollider(colDesc);
    } catch (err) {
      console.warn('Failed to create static trimesh collider:', err);
      return null;
    }
  }

  /**
   * Creates a static box collider (used for ground base planes or buildings).
   */
  public createStaticBox(
    halfX: number,
    halfY: number,
    halfZ: number,
    posX: number,
    posY: number,
    posZ: number
  ): RAPIER.Collider | null {
    if (!this.isInitialized) return null;

    try {
      const colDesc = this.rapier.ColliderDesc.cuboid(halfX, halfY, halfZ).setTranslation(posX, posY, posZ);
      return this.world.createCollider(colDesc);
    } catch (err) {
      console.warn('Failed to create static box collider:', err);
      return null;
    }
  }

  /**
   * Removes a collider safely from the physics world.
   */
  public removeCollider(collider: RAPIER.Collider): void {
    if (!this.isInitialized) return;
    try {
      this.world.removeCollider(collider, false);
    } catch {
      // Ignored if already removed
    }
  }

  public get activeColliderCount(): number {
    return this.isInitialized ? this.world.colliders.len() : 0;
  }

  public dispose(): void {
    if (this.isInitialized) {
      this.world.free();
      this.isInitialized = false;
    }
  }
}
