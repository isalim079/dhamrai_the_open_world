/**
 * Dhamrai Life — Rapier 3D Kinematic Character Controller
 */

import RAPIER from '@dimforge/rapier3d-compat';
import type { WorldPosition } from '@dhamrai/shared-contracts';
import type { PhysicsWorld } from './PhysicsWorld.js';
import type { InputState } from './InputManager.js';

export class CharacterController {
  public body!: RAPIER.RigidBody;
  public collider!: RAPIER.Collider;
  public controller!: RAPIER.KinematicCharacterController;

  public readonly radius = 0.35;
  public readonly halfHeight = 0.5; // Total height = 2*0.5 + 2*0.35 = 1.7m capsule
  public readonly walkSpeed = 3.5; // m/s (~12.6 km/h)
  public readonly sprintSpeed = 6.0; // m/s (~21.6 km/h)

  private verticalVelocity = 0.0;
  private readonly gravity = -9.81;

  public heading = 0.0; // Radians yaw rotation
  public isGrounded = true;

  constructor(private physics: PhysicsWorld, initialPos: WorldPosition = { x: 0.0, y: 0.5, z: 0.0 }) {
    this.create(initialPos);
  }

  private create(initialPos: WorldPosition): void {
    const { world, rapier } = this.physics;

    // Kinematic position-based rigid body
    const bodyDesc = rapier.RigidBodyDesc.kinematicPositionBased().setTranslation(
      initialPos.x,
      initialPos.y + this.radius + this.halfHeight,
      initialPos.z
    );
    this.body = world.createRigidBody(bodyDesc);

    // 1.7m capsule collider
    const colliderDesc = rapier.ColliderDesc.capsule(this.halfHeight, this.radius);
    this.collider = world.createCollider(colliderDesc, this.body);

    // Character controller: 0.05m offset, 45° max slope, 0.3m autostep
    this.controller = world.createCharacterController(0.05);
    this.controller.setMaxSlopeClimbAngle((45 * Math.PI) / 180);
    this.controller.setMinSlopeSlideAngle((50 * Math.PI) / 180);
    this.controller.enableAutostep(0.3, 0.2, false);
    this.controller.enableSnapToGround(0.3);
  }

  public update(dt: number, input: InputState): void {
    // 1. Update horizontal heading from mouse movement
    if (input.mouseDeltaX !== 0) {
      this.heading -= input.mouseDeltaX * 0.0025;
    }

    // 2. Compute desired horizontal direction relative to heading
    let moveX = 0;
    let moveZ = 0;

    if (input.forward) moveZ -= 1;
    if (input.backward) moveZ += 1;
    if (input.left) moveX -= 1;
    if (input.right) moveX += 1;

    const len = Math.hypot(moveX, moveZ);
    const speed = input.sprint ? this.sprintSpeed : this.walkSpeed;

    let worldDx = 0;
    let worldDz = 0;

    if (len > 1e-4) {
      const normX = moveX / len;
      const normZ = moveZ / len;

      // Rotate direction by player heading
      const sinH = Math.sin(this.heading);
      const cosH = Math.cos(this.heading);

      worldDx = (normX * cosH - normZ * sinH) * speed * dt;
      worldDz = (normX * sinH + normZ * cosH) * speed * dt;
    }

    // 3. Gravity and vertical integration
    if (this.isGrounded) {
      this.verticalVelocity = -0.5; // Slight downward stickiness
    } else {
      this.verticalVelocity += this.gravity * dt;
      if (this.verticalVelocity < -20.0) this.verticalVelocity = -20.0;
    }

    const desiredMovement = {
      x: worldDx,
      y: this.verticalVelocity * dt,
      z: worldDz,
    };

    // 4. Compute movement with obstacle collision
    this.controller.computeColliderMovement(this.collider, desiredMovement);
    const correctedMovement = this.controller.computedMovement();

    const currentPos = this.body.translation();
    const newPos = {
      x: currentPos.x + correctedMovement.x,
      y: currentPos.y + correctedMovement.y,
      z: currentPos.z + correctedMovement.z,
    };

    this.isGrounded = this.controller.computedGrounded();

    // 5. Out-of-bounds safety check (recovers player if fallen below world or outside 1,024m slice)
    if (newPos.y < -10.0 || Math.abs(newPos.x) > 512.0 || Math.abs(newPos.z) > 512.0) {
      console.warn('Player fell out of bounds; recovering to Rathkhola Stand (0, 0.5, 0)');
      this.resetPosition({ x: 0.0, y: 0.5, z: 0.0 });
      return;
    }

    this.body.setNextKinematicTranslation(newPos);
  }

  public getPosition(): WorldPosition {
    const t = this.body.translation();
    // Return ground contact position (subtracting capsule bottom offset)
    return {
      x: t.x,
      y: t.y - this.halfHeight - this.radius,
      z: t.z,
    };
  }

  public getEyePosition(): WorldPosition {
    const t = this.body.translation();
    return {
      x: t.x,
      y: t.y + this.halfHeight * 0.5, // Eye level
      z: t.z,
    };
  }

  public resetPosition(pos: WorldPosition): void {
    this.verticalVelocity = 0.0;
    this.isGrounded = true;
    this.body.setTranslation(
      {
        x: pos.x,
        y: pos.y + this.radius + this.halfHeight,
        z: pos.z,
      },
      true
    );
  }

  public dispose(): void {
    if (this.controller) {
      this.physics.world.removeCharacterController(this.controller);
    }
    if (this.collider) {
      this.physics.removeCollider(this.collider);
    }
    if (this.body) {
      this.physics.world.removeRigidBody(this.body);
    }
  }
}
