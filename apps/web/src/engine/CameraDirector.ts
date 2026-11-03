/**
 * Dhamrai Life — Camera Director (1st / 3rd Person with Occlusion Avoidance)
 */

import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import type { WorldPosition } from '@dhamrai/shared-contracts';
import type { CameraMode } from '../state/useSessionStore.js';
import type { PhysicsWorld } from './PhysicsWorld.js';

export class CameraDirector {
  public camera: THREE.PerspectiveCamera;
  public mode: CameraMode = 'THIRD_PERSON';

  public pitch = 0.0; // Radians vertical look angle
  public yaw = 0.0; // Radians horizontal look angle

  public readonly targetDistance = 4.5; // Third-person resting distance
  public readonly targetHeight = 2.0; // Third-person height offset
  public readonly minDistance = 0.5; // Minimum clamped distance when occluded

  private currentCameraPos = new THREE.Vector3();
  private currentLookTarget = new THREE.Vector3();

  constructor(fov = 65, aspect = 16 / 9, near = 0.1, far = 1000) {
    this.camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
  }

  public setAspect(aspect: number): void {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  public toggleMode(): CameraMode {
    this.mode = this.mode === 'FIRST_PERSON' ? 'THIRD_PERSON' : 'FIRST_PERSON';
    return this.mode;
  }

  public updateMouseLook(deltaX: number, deltaY: number): void {
    const sensitivity = 0.0025;
    this.yaw -= deltaX * sensitivity;
    this.pitch -= deltaY * sensitivity;

    // Clamp pitch to avoid gimbal lock / flipping
    const maxPitch = (80 * Math.PI) / 180;
    this.pitch = Math.max(-maxPitch, Math.min(maxPitch, this.pitch));
  }

  public update(
    dt: number,
    targetEyePos: WorldPosition,
    targetHeading: number,
    physics?: PhysicsWorld,
    excludedBody?: RAPIER.RigidBody
  ): void {
    if (this.mode === 'FIRST_PERSON') {
      // 1. First-Person: Camera sits directly at eye position
      this.camera.position.set(targetEyePos.x, targetEyePos.y, targetEyePos.z);

      const effectiveYaw = targetHeading + this.yaw;
      const dirX = -Math.sin(effectiveYaw) * Math.cos(this.pitch);
      const dirY = Math.sin(this.pitch);
      const dirZ = -Math.cos(effectiveYaw) * Math.cos(this.pitch);

      this.camera.lookAt(targetEyePos.x + dirX, targetEyePos.y + dirY, targetEyePos.z + dirZ);
    } else {
      // 2. Third-Person: Orbit behind target with occlusion avoidance
      const effectiveYaw = targetHeading + this.yaw;

      // Base target look-at point (slightly above waist)
      const lookAtX = targetEyePos.x;
      const lookAtY = targetEyePos.y + 0.3;
      const lookAtZ = targetEyePos.z;

      // Desired camera offset vector pointing backwards
      let desiredDist = this.targetDistance;
      const dirBackX = Math.sin(effectiveYaw) * Math.cos(this.pitch);
      const dirBackY = Math.max(0.1, Math.sin(-this.pitch) + 0.35);
      const dirBackZ = Math.cos(effectiveYaw) * Math.cos(this.pitch);

      const normDir = new THREE.Vector3(dirBackX, dirBackY, dirBackZ).normalize();

      // 3. Occlusion avoidance raycast against world obstacles (buildings, terrain)
      if (physics && physics.ready) {
        const rayOrigin = { x: lookAtX, y: lookAtY, z: lookAtZ };
        const rayDir = { x: normDir.x, y: normDir.y, z: normDir.z };
        const rapierRay = new physics.rapier.Ray(rayOrigin, rayDir);

        const hit = physics.world.castRay(
          rapierRay,
          desiredDist,
          true,
          undefined,
          undefined,
          undefined,
          excludedBody
        );

        if (hit && hit.timeOfImpact < desiredDist) {
          // Pull camera in front of the hit obstacle with safety margin
          desiredDist = Math.max(this.minDistance, hit.timeOfImpact - 0.25);
        }
      }

      const targetCamX = lookAtX + normDir.x * desiredDist;
      const targetCamY = lookAtY + normDir.y * desiredDist;
      const targetCamZ = lookAtZ + normDir.z * desiredDist;

      // Smooth camera position interpolation
      const lerpFactor = Math.min(1.0, 15.0 * dt);
      this.currentCameraPos.lerp(new THREE.Vector3(targetCamX, targetCamY, targetCamZ), lerpFactor);
      this.currentLookTarget.lerp(new THREE.Vector3(lookAtX, lookAtY, lookAtZ), lerpFactor);

      this.camera.position.copy(this.currentCameraPos);
      this.camera.lookAt(this.currentLookTarget);
    }
  }

  public calculateOcclusionDistance(
    origin: WorldPosition,
    direction: THREE.Vector3,
    maxDist: number,
    physics?: PhysicsWorld,
    excludedBody?: RAPIER.RigidBody
  ): number {
    if (!physics || !physics.ready) return maxDist;

    const rapierRay = new physics.rapier.Ray(origin, { x: direction.x, y: direction.y, z: direction.z });
    const hit = physics.world.castRay(rapierRay, maxDist, true, undefined, undefined, undefined, excludedBody);

    if (hit && hit.timeOfImpact < maxDist) {
      return Math.max(this.minDistance, hit.timeOfImpact - 0.25);
    }
    return maxDist;
  }
}
