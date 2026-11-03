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

  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#87CEEB'); // Sky blue
    this.scene.fog = new THREE.FogExp2('#b0d5ec', 0.0012);

    // 1. Lighting setup (Authentic South Asian daylight)
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(this.ambientLight);

    this.hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x54432c, 0.6);
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight(0xfffaed, 1.5);
    // Solar angle: 65° elevation, azimuth South-Southeast
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

    // 2. Build 3D Player Character Mesh (1.7m capsule)
    this.playerMesh = this.createPlayerMesh();
    this.scene.add(this.playerMesh);

    // 3. Build 3D Rickshaw Vehicle Mesh (Authentic Dhaka/Dhamrai cycle rickshaw)
    this.rickshawMesh = this.createRickshawMesh();
    this.scene.add(this.rickshawMesh);
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

  public dispose(): void {
    this.scene.clear();
  }
}
