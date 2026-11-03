/**
 * Dhamrai Life — Core 3D Game Engine Coordinator
 * ===============================================
 * Integrates WebGL2 Three.js rendering, Rapier 3D physics,
 * character kinematics, 3-wheel rickshaw simulation, camera director,
 * and distance-based 3x3 chunk streaming.
 */

import type { WorldManifest, WorldPosition } from '@dhamrai/shared-contracts';
import { WebGLRendererManager } from './Renderer.js';
import { SceneManager } from './SceneManager.js';
import { PhysicsWorld } from './PhysicsWorld.js';
import { CharacterController } from './CharacterController.js';
import { RickshawVehicle } from './RickshawVehicle.js';
import { CameraDirector } from './CameraDirector.js';
import { InputManager } from './InputManager.js';
import { ChunkLoader } from './ChunkLoader.js';
import { ChunkStreamer } from './ChunkStreamer.js';
import { useSessionStore } from '../state/useSessionStore.js';

export class GameEngine {
  public rendererManager!: WebGLRendererManager;
  public sceneManager!: SceneManager;
  public physics!: PhysicsWorld;
  public character!: CharacterController;
  public rickshaw!: RickshawVehicle;
  public cameraDirector!: CameraDirector;
  public inputManager!: InputManager;
  public chunkLoader!: ChunkLoader;
  public chunkStreamer!: ChunkStreamer;

  private isRunning = false;
  private animFrameId: number | null = null;
  private lastTime = 0;
  private frameCount = 0;
  private fpsAccumulator = 0;
  private fpsLastSample = 0;

  public isInVehicle = false;

  public async init(canvas: HTMLCanvasElement): Promise<void> {
    // 1. Initialize Renderer & Scene
    this.rendererManager = new WebGLRendererManager(canvas);
    this.sceneManager = new SceneManager();
    this.cameraDirector = new CameraDirector(65, window.innerWidth / window.innerHeight, 0.1, 1000);

    // 2. Initialize Rapier 3D Physics (WASM)
    this.physics = new PhysicsWorld();
    await this.physics.init();

    // 3. Initialize Character Controller (at Rathkhola Stand: 0, 0.5, 0)
    this.character = new CharacterController(this.physics, { x: 0.0, y: 0.5, z: 0.0 });

    // 4. Initialize Rickshaw Vehicle (parked near Stand: 2.5, 0.5, -1.0)
    this.rickshaw = new RickshawVehicle(this.physics, { x: 2.5, y: 0.5, z: -1.0 });

    // 5. Initialize Input Manager
    this.inputManager = new InputManager();
    this.inputManager.attach(canvas);

    // 6. Initialize Chunk Streaming
    this.chunkLoader = new ChunkLoader(this.physics);
    this.chunkStreamer = new ChunkStreamer(this.chunkLoader, this.sceneManager.scene);

    this.chunkStreamer.onActiveChunksChanged = (activeIds, count) => {
      useSessionStore.getState().setActiveChunkIds(activeIds);
      useSessionStore.getState().setLoadedChunkCount(count);
    };

    // 7. Load World Manifest & Start Initial Chunk Streaming
    await this.loadWorldManifest();

    // 8. Initial position stream around Rathkhola Stand
    await this.chunkStreamer.updatePlayerPosition({ x: 0.0, y: 0.0, z: 0.0 });

    // 9. Window resize listener
    window.addEventListener('resize', this.onResize);
    this.onResize();
  }

  private onResize = (): void => {
    if (!this.rendererManager || !this.cameraDirector) return;
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.rendererManager.resize(width, height);
    this.cameraDirector.setAspect(width / height);
  };

  private async loadWorldManifest(): Promise<void> {
    try {
      const resp = await fetch('/world/world_manifest.json');
      if (resp.ok) {
        const manifest: WorldManifest = await resp.json();
        this.chunkStreamer.registerWorldManifest(manifest);
      } else {
        console.warn('Could not fetch /world/world_manifest.json, using fallback registry');
      }
    } catch (err) {
      console.warn('Network error fetching world_manifest.json:', err);
    }
  }

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();
    this.fpsLastSample = this.lastTime;
    this.loop(this.lastTime);
  }

  public stop(): void {
    this.isRunning = false;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  private loop = (currentTime: number): void => {
    if (!this.isRunning) return;

    const dt = Math.min((currentTime - this.lastTime) / 1000.0, 0.1);
    this.lastTime = currentTime;

    this.update(dt);
    this.render();

    // Performance measurements
    this.frameCount++;
    this.fpsAccumulator++;
    if (currentTime - this.fpsLastSample >= 500) {
      const elapsedSeconds = (currentTime - this.fpsLastSample) / 1000.0;
      const currentFps = Math.round(this.fpsAccumulator / elapsedSeconds);
      const metrics = this.rendererManager.getMetrics();

      useSessionStore.getState().setPerformanceStats({
        fps: currentFps,
        frameTimeMs: dt * 1000.0,
        drawCalls: metrics.drawCalls,
        triangles: metrics.triangles,
        activeColliders: this.physics.activeColliderCount,
      });

      this.fpsAccumulator = 0;
      this.fpsLastSample = currentTime;
    }

    this.animFrameId = requestAnimationFrame(this.loop);
  };

  public update(dt: number): void {
    const input = this.inputManager.getInput();

    // 1. Camera Toggle ('V' key)
    if (input.cameraToggle) {
      const newMode = this.cameraDirector.toggleMode();
      useSessionStore.getState().setCameraMode(newMode);
    }

    // 2. Bell Ringing ('Space' key in vehicle)
    if (this.isInVehicle && input.bell) {
      useSessionStore.getState().triggerBell();
    }

    // 3. Vehicle Enter / Exit Interaction ('F' key)
    if (input.interact) {
      if (this.isInVehicle) {
        // Attempt dismount: only if stationary / stopped
        if (this.rickshaw.canExit()) {
          this.isInVehicle = false;
          this.rickshaw.isOccupied = false;
          const vPos = this.rickshaw.getPosition();
          // Dismount player 1.2m to the left of the rickshaw
          const sinH = Math.sin(this.rickshaw.heading);
          const cosH = Math.cos(this.rickshaw.heading);
          const exitPos: WorldPosition = {
            x: vPos.x - 1.2 * cosH,
            y: vPos.y + 0.1,
            z: vPos.z - 1.2 * sinH,
          };
          this.character.resetPosition(exitPos);
          this.character.heading = this.rickshaw.heading;
          useSessionStore.getState().setIsInVehicle(false);
          useSessionStore.getState().setStatusMessage('Dismounted rickshaw');
        } else {
          useSessionStore.getState().setStatusMessage('Stop rickshaw to dismount!');
        }
      } else {
        // Attempt mount: check distance <= 2.5m
        const playerPos = this.character.getPosition();
        if (this.rickshaw.canEnter(playerPos)) {
          this.isInVehicle = true;
          this.rickshaw.isOccupied = true;
          useSessionStore.getState().setIsInVehicle(true);
          useSessionStore.getState().setStatusMessage('Riding rickshaw — [W] Pedal, [S] Brake, [A/D] Steer, [Space] Bell');
        } else {
          useSessionStore.getState().setStatusMessage('Too far from rickshaw (walk closer to press F)');
        }
      }
    }

    // 4. Update Camera Mouse Look
    this.cameraDirector.updateMouseLook(input.mouseDeltaX, input.mouseDeltaY);

    // 5. Fixed-Timestep Physics Simulation Step
    this.physics.step(dt, (physicsDt) => {
      if (this.isInVehicle) {
        this.rickshaw.update(physicsDt, input);
        // Position character controller inside driver seat
        const seatPos = this.rickshaw.getDriverSeatPosition();
        this.character.resetPosition(seatPos);
      } else {
        this.character.update(physicsDt, input);
        // Unoccupied rickshaw still simulates suspension resting
        this.rickshaw.update(physicsDt, {
          forward: false,
          backward: false,
          left: false,
          right: false,
          sprint: false,
          jump: false,
          interact: false,
          cameraToggle: false,
          bell: false,
          mouseDeltaX: 0,
          mouseDeltaY: 0,
        });
      }
    });

    // 6. Update Visual Three.js Scene Entities
    const activePos = this.isInVehicle ? this.rickshaw.getPosition() : this.character.getPosition();
    const activeHeading = this.isInVehicle ? this.rickshaw.heading : this.character.heading;

    // Synchronize Player Mesh
    const pPos = this.character.getPosition();
    this.sceneManager.playerMesh.position.set(pPos.x, pPos.y, pPos.z);
    this.sceneManager.playerMesh.rotation.y = this.character.heading;

    // Synchronize Rickshaw Mesh
    const rPos = this.rickshaw.getPosition();
    this.sceneManager.rickshawMesh.position.set(rPos.x, rPos.y, rPos.z);
    this.sceneManager.rickshawMesh.rotation.y = this.rickshaw.heading;

    // Steer front wheel mesh
    const frontWheelMesh = this.sceneManager.rickshawMesh.getObjectByName('wheel_front');
    if (frontWheelMesh) {
      frontWheelMesh.rotation.y = this.rickshaw.steeringAngle;
    }

    // 7. Update Camera Director
    const eyePos = this.isInVehicle ? this.rickshaw.getDriverSeatPosition() : this.character.getEyePosition();
    const excludedBody = this.isInVehicle ? this.rickshaw.body : this.character.body;
    this.cameraDirector.update(dt, eyePos, activeHeading, this.physics, excludedBody);

    // 8. Update Chunk Streaming (around current player coordinates)
    this.chunkStreamer.updatePlayerPosition(activePos);

    // 9. Sync Zustand State
    useSessionStore.getState().setPlayerPosition(activePos);
    useSessionStore.getState().setPlayerHeading(activeHeading);
    useSessionStore.getState().setVehicleSpeedKph(this.rickshaw.speedMps * 3.6);
  }

  public render(): void {
    this.rendererManager.render(this.sceneManager.scene, this.cameraDirector.camera);
  }

  public dispose(): void {
    this.stop();
    window.removeEventListener('resize', this.onResize);
    if (this.inputManager) this.inputManager.detach();
    if (this.chunkStreamer) this.chunkStreamer.dispose();
    if (this.character) this.character.dispose();
    if (this.rickshaw) this.rickshaw.dispose();
    if (this.physics) this.physics.dispose();
    if (this.sceneManager) this.sceneManager.dispose();
    if (this.rendererManager) this.rendererManager.dispose();
  }
}
