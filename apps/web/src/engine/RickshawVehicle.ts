/**
 * Dhamrai Life — Pedal Rickshaw Raycast Vehicle Dynamics
 * ========================================================
 * Implements 3-wheel kinematics (1 front steerable wheel, 2 rear drive wheels)
 * with suspension raycasts, ±35° front steering limit, 12-18 km/h target speeds,
 * braking, and enter/exit range gating (<= 2.5m).
 */

import RAPIER from '@dimforge/rapier3d-compat';
import type { WorldPosition } from '@dhamrai/shared-contracts';
import type { PhysicsWorld } from './PhysicsWorld.js';
import type { InputState } from './InputManager.js';

export interface WheelInfo {
  offset: { x: number; y: number; z: number };
  radius: number;
  suspensionRestLength: number;
  suspensionCurrentLength: number;
  isGrounded: boolean;
  contactPoint: WorldPosition | null;
  steeringAngle: number; // Radians (front wheel only)
}

export type VehicleArchetype = 'rickshaw' | 'cng' | 'easy_bike';

export class RickshawVehicle {
  public body!: RAPIER.RigidBody;
  public collider!: RAPIER.Collider;

  public isOccupied = false;
  public speedMps = 0.0; // Current forward speed in meters/second
  public steeringAngle = 0.0; // Radians (-35° to +35°)
  public readonly archetype: VehicleArchetype;

  public readonly maxSteerAngle = (35 * Math.PI) / 180; // ±35° max steering clamp
  public readonly normalTargetSpeedMps: number;
  public readonly sprintTargetSpeedMps: number;
  public readonly maxInteractionRadius = 2.5; // m
  public readonly maxExitSpeedMps = 0.5; // m/s (~1.8 km/h)

  /** Milestone 13 — soft gameplay multipliers from vehicle condition */
  public topSpeedMult = 1.0;
  public steerMult = 1.0;
  public limpMode = false;

  // 3-Wheel Configuration
  public wheels: WheelInfo[] = [
    // 0: Front steerable wheel (center-forward)
    {
      offset: { x: 0.0, y: -0.2, z: -1.1 },
      radius: 0.35,
      suspensionRestLength: 0.35,
      suspensionCurrentLength: 0.35,
      isGrounded: true,
      contactPoint: null,
      steeringAngle: 0.0,
    },
    // 1: Rear-left drive wheel
    {
      offset: { x: -0.55, y: -0.2, z: 0.7 },
      radius: 0.35,
      suspensionRestLength: 0.35,
      suspensionCurrentLength: 0.35,
      isGrounded: true,
      contactPoint: null,
      steeringAngle: 0.0,
    },
    // 2: Rear-right drive wheel
    {
      offset: { x: 0.55, y: -0.2, z: 0.7 },
      radius: 0.35,
      suspensionRestLength: 0.35,
      suspensionCurrentLength: 0.35,
      isGrounded: true,
      contactPoint: null,
      steeringAngle: 0.0,
    },
  ];

  public heading = 0.0; // Yaw in radians

  constructor(
    private physics: PhysicsWorld,
    initialPos: WorldPosition = { x: 2.0, y: 0.5, z: 0.0 },
    archetype: VehicleArchetype = 'rickshaw'
  ) {
    this.archetype = archetype;
    // Milestone 20/22 — motorized CNG / easy bike vs pedal rickshaw
    if (archetype === 'cng') {
      this.normalTargetSpeedMps = 22.0 / 3.6;
      this.sprintTargetSpeedMps = 32.0 / 3.6;
    } else if (archetype === 'easy_bike') {
      this.normalTargetSpeedMps = 18.0 / 3.6;
      this.sprintTargetSpeedMps = 28.0 / 3.6;
    } else {
      this.normalTargetSpeedMps = 12.0 / 3.6;
      this.sprintTargetSpeedMps = 18.0 / 3.6;
    }
    this.create(initialPos);
  }

  private create(initialPos: WorldPosition): void {
    const { world, rapier } = this.physics;

    const isCng = this.archetype === 'cng';
    const isBike = this.archetype === 'easy_bike';
    // Dynamic rigid body for chassis (rickshaw ~90 kg, easy bike ~120, CNG ~280)
    const bodyDesc = rapier.RigidBodyDesc.dynamic()
      .setTranslation(initialPos.x, initialPos.y + 0.4, initialPos.z)
      .setLinearDamping(0.8)
      .setAngularDamping(2.0);

    this.body = world.createRigidBody(bodyDesc);

    // Chassis compound cuboid collider
    const colliderDesc = rapier.ColliderDesc.cuboid(
      isCng ? 0.75 : isBike ? 0.45 : 0.6,
      isCng ? 0.45 : isBike ? 0.4 : 0.35,
      isCng ? 1.3 : isBike ? 1.0 : 1.1
    )
      .setFriction(0.7)
      .setRestitution(0.1)
      .setMass(isCng ? 280.0 : isBike ? 120.0 : 90.0);

    this.collider = world.createCollider(colliderDesc, this.body);
  }

  public canEnter(playerPos: WorldPosition): boolean {
    const vPos = this.getPosition();
    const dist = Math.hypot(playerPos.x - vPos.x, playerPos.z - vPos.z);
    return dist <= this.maxInteractionRadius;
  }

  public canExit(): boolean {
    return Math.abs(this.speedMps) <= this.maxExitSpeedMps;
  }

  public update(dt: number, input: InputState): void {
    const translation = this.body.translation();
    const linvel = this.body.linvel();

    // Compute forward/lateral vectors from current vehicle yaw
    const forwardX = -Math.sin(this.heading);
    const forwardZ = -Math.cos(this.heading);

    // Current forward speed
    this.speedMps = linvel.x * forwardX + linvel.z * forwardZ;

    if (this.isOccupied) {
      // 1. Steering with 'A'/'D' (clamped to ±35°); low tire reduces response
      const steerSpeed = 2.5 * dt * this.steerMult; // radians per second
      const maxSteer = this.maxSteerAngle * this.steerMult;
      if (input.left) {
        this.steeringAngle = Math.min(this.steeringAngle + steerSpeed, maxSteer);
      } else if (input.right) {
        this.steeringAngle = Math.max(this.steeringAngle - steerSpeed, -maxSteer);
      } else {
        // Auto-center steering when keys released
        if (this.steeringAngle > 0.01) {
          this.steeringAngle = Math.max(0, this.steeringAngle - steerSpeed * 1.5);
        } else if (this.steeringAngle < -0.01) {
          this.steeringAngle = Math.min(0, this.steeringAngle + steerSpeed * 1.5);
        } else {
          this.steeringAngle = 0;
        }
      }
      this.wheels[0]!.steeringAngle = this.steeringAngle;

      // 2. Pedaling / Acceleration with 'W' (damage & puncture soft caps)
      const baseTarget = input.sprint ? this.sprintTargetSpeedMps : this.normalTargetSpeedMps;
      const limpCap = this.limpMode ? this.normalTargetSpeedMps * 0.35 : baseTarget;
      const targetSpeed = Math.min(limpCap, baseTarget * this.topSpeedMult);
      let driveForce = 0.0;

      if (input.forward) {
        if (this.speedMps < targetSpeed) {
          driveForce = this.limpMode ? 120.0 : 350.0; // Newtons
        }
      } else if (input.backward) {
        // Braking / reverse
        if (this.speedMps > 0.2) {
          driveForce = -500.0; // Strong brake
        } else if (this.speedMps > -1.5) {
          driveForce = -150.0; // Slow reverse
        }
      }

      // Apply drive force in forward direction
      if (driveForce !== 0) {
        const forceX = forwardX * driveForce;
        const forceZ = forwardZ * driveForce;
        this.body.applyImpulse({ x: forceX * dt, y: 0, z: forceZ * dt }, true);
      }

      // 3. Angular steering yaw torque when vehicle has forward/backward motion
      if (Math.abs(this.speedMps) > 0.1 && Math.abs(this.steeringAngle) > 0.01) {
        // Turning rate proportional to speed and steering angle
        const turnRate = (this.speedMps / 1.8) * Math.sin(this.steeringAngle);
        this.heading += turnRate * dt;
        this.body.setAngvel({ x: 0, y: turnRate, z: 0 }, true);
      }
    } else {
      // Vehicle unoccupied: natural braking friction
      this.steeringAngle = 0;
      this.wheels[0]!.steeringAngle = 0;
    }

    // 4. Raycast suspension simulation for 3 wheels
    const { world, rapier } = this.physics;
    const sinH = Math.sin(this.heading);
    const cosH = Math.cos(this.heading);

    for (const wheel of this.wheels) {
      // Calculate wheel world origin
      const wx = translation.x + (wheel.offset.x * cosH - wheel.offset.z * sinH);
      const wy = translation.y + wheel.offset.y;
      const wz = translation.z + (wheel.offset.x * sinH + wheel.offset.z * cosH);

      const ray = new rapier.Ray({ x: wx, y: wy, z: wz }, { x: 0, y: -1, z: 0 });
      const maxRayDist = wheel.suspensionRestLength + wheel.radius;

      // Cast ray against static world environment
      const hit = world.castRay(
        ray,
        maxRayDist,
        true,
        undefined,
        undefined,
        undefined,
        this.body
      );

      if (hit && hit.timeOfImpact < maxRayDist) {
        wheel.isGrounded = true;
        wheel.suspensionCurrentLength = hit.timeOfImpact - wheel.radius;
        wheel.contactPoint = {
          x: wx,
          y: wy - hit.timeOfImpact,
          z: wz,
        };

        // Spring force F = -k * deltaX
        const compression = wheel.suspensionRestLength - wheel.suspensionCurrentLength;
        if (compression > 0) {
          const springForce = compression * 1200.0; // N/m
          this.body.applyImpulseAtPoint(
            { x: 0, y: springForce * dt, z: 0 },
            { x: wx, y: wy, z: wz },
            true
          );
        }
      } else {
        wheel.isGrounded = false;
        wheel.suspensionCurrentLength = wheel.suspensionRestLength;
        wheel.contactPoint = null;
      }
    }

    // 5. Out-of-bounds safety recovery
    if (translation.y < -10.0 || Math.abs(translation.x) > 512.0 || Math.abs(translation.z) > 512.0) {
      console.warn('Rickshaw fell out of bounds; recovering to (2, 0.5, 0)');
      this.resetPosition({ x: 2.0, y: 0.5, z: 0.0 });
    }
  }

  public getPosition(): WorldPosition {
    const t = this.body.translation();
    return { x: t.x, y: t.y, z: t.z };
  }

  public getDriverSeatPosition(): WorldPosition {
    const t = this.body.translation();
    const sinH = Math.sin(this.heading);
    const cosH = Math.cos(this.heading);
    // Driver seat is around (0, 0.45, -0.2) in local space (forward is -Z)
    const localX = 0.0;
    const localZ = -0.2;
    return {
      x: t.x + (localX * cosH - localZ * sinH),
      y: t.y + 0.45,
      z: t.z + (localX * sinH + localZ * cosH),
    };
  }

  public getPassengerSeatPosition(): WorldPosition {
    const t = this.body.translation();
    const sinH = Math.sin(this.heading);
    const cosH = Math.cos(this.heading);
    // Passenger seat is in the rear canopy at (0, 0.65, +0.55) in local space
    const localX = 0.0;
    const localZ = 0.55;
    return {
      x: t.x + (localX * cosH - localZ * sinH),
      y: t.y + 0.65,
      z: t.z + (localX * sinH + localZ * cosH),
    };
  }

  public resetPosition(pos: WorldPosition): void {
    this.speedMps = 0.0;
    this.steeringAngle = 0.0;
    this.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    this.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
    this.body.setTranslation({ x: pos.x, y: pos.y + 0.4, z: pos.z }, true);
  }

  public resetTransform(pos: WorldPosition, heading: number = 0.0): void {
    this.speedMps = 0.0;
    this.steeringAngle = 0.0;
    this.heading = heading;
    this.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    this.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
    this.body.setTranslation({ x: pos.x, y: pos.y + 0.4, z: pos.z }, true);
    const halfH = heading * 0.5;
    this.body.setRotation({ x: 0, y: Math.sin(halfH), z: 0, w: Math.cos(halfH) }, true);
  }

  public dispose(): void {
    if (this.collider) {
      this.physics.removeCollider(this.collider);
    }
    if (this.body) {
      this.physics.world.removeRigidBody(this.body);
    }
  }
}
