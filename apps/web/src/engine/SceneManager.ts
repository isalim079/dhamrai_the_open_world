/**
 * Dhamrai Life — Scene Hierarchy & Lighting Manager
 */

import * as THREE from 'three';

export class SceneManager {
  public scene: THREE.Scene;
  public sunLight: THREE.DirectionalLight;
  public hemiLight: THREE.HemisphereLight;
  public ambientLight: THREE.AmbientLight;

  public playerMesh: THREE.Group;
  public rickshawMesh: THREE.Group;
  /** Milestone 20 — parked driveable CNG mesh */
  public cngMesh: THREE.Group;
  /** Milestone 22 — parked driveable easy bike mesh */
  public easyBikeMesh: THREE.Group;
  /** Milestone 11 street props attach under this group. */
  public propsRoot: THREE.Group;

  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#7eb8d8'); // Soft South-Asian midday sky (driven by M12 atmosphere)
    this.scene.fog = new THREE.FogExp2('#a8cfe0', 0.00105);

    // 1. Lighting setup — initial midday; Milestone 12 AtmosphereController drives these each tick
    this.ambientLight = new THREE.AmbientLight(0xfff6e8, 0.45);
    this.scene.add(this.ambientLight);

    this.hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x5a4a32, 0.65);
    this.scene.add(this.hemiLight);

    this.propsRoot = new THREE.Group();
    this.propsRoot.name = 'PropsRootHost';
    this.scene.add(this.propsRoot);

    this.sunLight = new THREE.DirectionalLight(0xfffaed, 1.5);
    // Solar angle: 65° elevation, azimuth South-Southeast (overridden by DayNightCycle)
    this.sunLight.position.set(120, 240, 140);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 1024;
    this.sunLight.shadow.mapSize.height = 1024;
    this.sunLight.shadow.camera.near = 10;
    this.sunLight.shadow.camera.far = 400;
    const shadowD = 60;
    this.sunLight.shadow.camera.left = -shadowD;
    this.sunLight.shadow.camera.right = shadowD;
    this.sunLight.shadow.camera.top = shadowD;
    this.sunLight.shadow.camera.bottom = -shadowD;
    this.scene.add(this.sunLight);
    this.scene.add(this.sunLight.target);

    // 2. Build 3D Player Character Mesh (1.7m capsule)
    this.playerMesh = this.createPlayerMesh();
    this.scene.add(this.playerMesh);

    // 3. Build 3D Rickshaw Vehicle Mesh (Authentic Dhaka/Dhamrai cycle rickshaw)
    this.rickshawMesh = this.createRickshawMesh();
    this.scene.add(this.rickshawMesh);

    // 4. Milestone 20 — parked CNG auto-rickshaw near stand
    this.cngMesh = this.createCngMesh();
    this.cngMesh.position.set(8.0, 0.0, 3.0);
    this.scene.add(this.cngMesh);

    // 5. Milestone 22 — parked easy bike near stand
    this.easyBikeMesh = this.createEasyBikeMesh();
    this.easyBikeMesh.position.set(-4.0, 0.0, 2.5);
    this.scene.add(this.easyBikeMesh);
  }

  private createPlayerMesh(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'PlayerCharacter';

    // Body capsule (height 1.7m, radius 0.35m)
    const bodyGeom = new THREE.CapsuleGeometry(0.35, 1.0, 8, 16);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x1f6feb, // Blue shirt/lungi
      roughness: 0.8,
    });
    const body = new THREE.Mesh(bodyGeom, bodyMat);
    body.position.y = 0.85;
    body.castShadow = true;
    group.add(body);

    // Forward direction indicator (small nose / cap visor pointing North -Z)
    const visorGeom = new THREE.BoxGeometry(0.2, 0.08, 0.25);
    const visorMat = new THREE.MeshStandardMaterial({ color: 0xffd700 });
    const visor = new THREE.Mesh(visorGeom, visorMat);
    visor.position.set(0, 1.45, -0.32);
    group.add(visor);

    return group;
  }

  private createRickshawMesh(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'CycleRickshaw';

    // Traditional enamel paint materials
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x0e6251, roughness: 0.5, metalness: 0.3 }); // Dark teal green frame
    const seatMat = new THREE.MeshStandardMaterial({ color: 0xb03a2e, roughness: 0.8 }); // Rexine red seat
    const hoodMat = new THREE.MeshStandardMaterial({ color: 0xf39c12, roughness: 0.9 }); // Yellow passenger canopy
    const metalMat = new THREE.MeshStandardMaterial({ color: 0xd5dbdb, roughness: 0.3, metalness: 0.8 }); // Chrome handlebars/spokes
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x212f3d, roughness: 0.95 }); // Black rubber

    // 1. Chassis Platform
    const chassisGeom = new THREE.BoxGeometry(1.1, 0.15, 1.8);
    const chassis = new THREE.Mesh(chassisGeom, frameMat);
    chassis.position.set(0, 0.35, 0.2);
    chassis.castShadow = true;
    group.add(chassis);

    // 2. Passenger Hood / Canopy
    const canopyGeom = new THREE.BoxGeometry(1.05, 0.8, 0.9);
    const canopy = new THREE.Mesh(canopyGeom, hoodMat);
    canopy.position.set(0, 0.9, 0.55);
    canopy.castShadow = true;
    group.add(canopy);

    // 3. Passenger Seat
    const seatGeom = new THREE.BoxGeometry(0.95, 0.2, 0.5);
    const seat = new THREE.Mesh(seatGeom, seatMat);
    seat.position.set(0, 0.55, 0.5);
    group.add(seat);

    // 4. Driver Saddle
    const saddleGeom = new THREE.BoxGeometry(0.25, 0.08, 0.3);
    const saddle = new THREE.Mesh(saddleGeom, seatMat);
    saddle.position.set(0, 0.75, -0.3);
    group.add(saddle);

    // 5. Handlebars & Bell
    const handleGeom = new THREE.CylinderGeometry(0.02, 0.02, 0.65, 8);
    const handle = new THREE.Mesh(handleGeom, metalMat);
    handle.rotation.z = Math.PI / 2;
    handle.position.set(0, 0.95, -0.85);
    group.add(handle);

    // Small brass bell
    const bellGeom = new THREE.SphereGeometry(0.04, 8, 8);
    const bellMat = new THREE.MeshStandardMaterial({ color: 0xf1c40f, metalness: 0.9, roughness: 0.2 });
    const bell = new THREE.Mesh(bellGeom, bellMat);
    bell.position.set(-0.18, 0.98, -0.85);
    group.add(bell);

    // 6. Wheels (1 Front, 2 Rear)
    const wheelGeom = new THREE.CylinderGeometry(0.35, 0.35, 0.08, 16);
    wheelGeom.rotateZ(Math.PI / 2);

    // Front Wheel
    const frontWheel = new THREE.Mesh(wheelGeom, tireMat);
    frontWheel.position.set(0, 0.35, -1.1);
    frontWheel.name = 'wheel_front';
    frontWheel.castShadow = true;
    group.add(frontWheel);

    // Rear Left Wheel
    const rearLeftWheel = new THREE.Mesh(wheelGeom, tireMat);
    rearLeftWheel.position.set(-0.55, 0.35, 0.7);
    rearLeftWheel.name = 'wheel_rear_left';
    rearLeftWheel.castShadow = true;
    group.add(rearLeftWheel);

    // Rear Right Wheel
    const rearRightWheel = new THREE.Mesh(wheelGeom, tireMat);
    rearRightWheel.position.set(0.55, 0.35, 0.7);
    rearRightWheel.name = 'wheel_rear_right';
    rearRightWheel.castShadow = true;
    group.add(rearRightWheel);

    return group;
  }

  /** Milestone 20 — green CNG cabin with gas cylinder silhouette */
  private createCngMesh(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'CngAutoRickshaw';

    const frameMat = new THREE.MeshStandardMaterial({ color: 0x1e8449, roughness: 0.55, metalness: 0.25 });
    const cabinMat = new THREE.MeshStandardMaterial({ color: 0xf4d03f, roughness: 0.7 });
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x1c2833, roughness: 0.95 });
    const cylinderMat = new THREE.MeshStandardMaterial({ color: 0x85929e, metalness: 0.7, roughness: 0.35 });

    const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.22, 2.2), frameMat);
    chassis.position.set(0, 0.42, 0.1);
    chassis.castShadow = true;
    group.add(chassis);

    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.25, 1.05, 1.35), cabinMat);
    cabin.position.set(0, 1.05, 0.15);
    cabin.castShadow = true;
    group.add(cabin);

    const cylinder = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.9, 12), cylinderMat);
    cylinder.rotation.z = Math.PI / 2;
    cylinder.position.set(0, 0.55, -0.95);
    group.add(cylinder);

    const wheelGeom = new THREE.CylinderGeometry(0.38, 0.38, 0.12, 16);
    wheelGeom.rotateZ(Math.PI / 2);
    const positions: [number, number, number][] = [
      [0, 0.38, -1.05],
      [-0.62, 0.38, 0.75],
      [0.62, 0.38, 0.75],
    ];
    const names = ['wheel_front', 'wheel_rear_left', 'wheel_rear_right'];
    for (let i = 0; i < 3; i++) {
      const w = new THREE.Mesh(wheelGeom, tireMat);
      w.position.set(...positions[i]!);
      w.name = names[i]!;
      w.castShadow = true;
      group.add(w);
    }

    return group;
  }

  /** Milestone 22 — slim electric easy-bike silhouette */
  private createEasyBikeMesh(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'EasyBike';

    const frameMat = new THREE.MeshStandardMaterial({ color: 0x2874a6, roughness: 0.45, metalness: 0.35 });
    const seatMat = new THREE.MeshStandardMaterial({ color: 0x1c2833, roughness: 0.85 });
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x212f3d, roughness: 0.95 });

    const deck = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.12, 1.5), frameMat);
    deck.position.set(0, 0.45, 0);
    deck.castShadow = true;
    group.add(deck);

    const stem = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.7, 0.08), frameMat);
    stem.position.set(0, 0.85, -0.55);
    group.add(stem);

    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.05, 0.05), frameMat);
    handle.position.set(0, 1.2, -0.55);
    group.add(handle);

    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.08, 0.35), seatMat);
    seat.position.set(0, 0.72, 0.15);
    group.add(seat);

    const wheelGeom = new THREE.CylinderGeometry(0.32, 0.32, 0.08, 14);
    wheelGeom.rotateZ(Math.PI / 2);
    const front = new THREE.Mesh(wheelGeom, tireMat);
    front.position.set(0, 0.32, -0.65);
    front.name = 'wheel_front';
    group.add(front);
    const rear = new THREE.Mesh(wheelGeom, tireMat);
    rear.position.set(0, 0.32, 0.55);
    rear.name = 'wheel_rear';
    group.add(rear);

    return group;
  }

  public dispose(): void {
    this.scene.clear();
  }
}
