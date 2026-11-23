/**
 * Dhamrai Life — Core 3D Game Engine Coordinator
 * ===============================================
 * Integrates WebGL2 Three.js rendering, Rapier 3D physics,
 * character kinematics, 3-wheel rickshaw simulation, camera director,
 * distance-based 3x3 chunk streaming, NPC management, autonomous road traffic,
 * and game state/persistence synchronization.
 */

import { PHASE_1_ANCHORS, WorldManifest, WorldPosition } from '@dhamrai/shared-contracts';
import { FARE_PASSENGER_KAMAL, FARE_PASSENGER_SUFIA } from '@dhamrai/game-core';
import { WebGLRendererManager } from './Renderer.js';
import { SceneManager } from './SceneManager.js';
import { PhysicsWorld } from './PhysicsWorld.js';
import { CharacterController } from './CharacterController.js';
import { RickshawVehicle } from './RickshawVehicle.js';
import { CameraDirector } from './CameraDirector.js';
import { InputManager } from './InputManager.js';
import { ChunkLoader } from './ChunkLoader.js';
import { Vector3 } from 'three';
import { ChunkStreamer } from './ChunkStreamer.js';
import { NPCManager } from './NPCManager.js';
import { TrafficManager } from './TrafficManager.js';
import { AudioManager } from '../audio/index.js';
import { useSessionStore } from '../state/useSessionStore.js';
import { useGameStore } from '../state/useGameStore.js';
import { useUIStore } from '../state/useUIStore.js';

let activeGameEngineInstance: GameEngine | null = null;
export function getActiveGameEngine(): GameEngine | null {
  return activeGameEngineInstance;
}

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
  public npcManager!: NPCManager;
  public trafficManager!: TrafficManager;
  public audioManager!: AudioManager;

  private isRunning = false;
  private animFrameId: number | null = null;
  private lastTime = 0;
  private frameCount = 0;
  private fpsAccumulator = 0;
  private fpsLastSample = 0;

  public isInVehicle = false;

  public async init(canvas: HTMLCanvasElement): Promise<void> {
    activeGameEngineInstance = this;

    // 1. Expose engine & store instances on window for DEV debugging
    if (import.meta.env.DEV && typeof window !== 'undefined') {
      (window as any).__dhamrai_engine = this;
      (window as any).__dhamrai_useUIStore = useUIStore;
      (window as any).__dhamrai_useGameStore = useGameStore;
      (window as any).__dhamrai_useSessionStore = useSessionStore;
    }

    // 2. Initialize Renderer & Scene
    this.rendererManager = new WebGLRendererManager(canvas);
    this.sceneManager = new SceneManager();
    this.cameraDirector = new CameraDirector(65, window.innerWidth / window.innerHeight, 0.1, 1000);

    // 3. Initialize Rapier 3D Physics (WASM)
    this.physics = new PhysicsWorld();
    await this.physics.init();

    // 4. Initialize Character Controller (at Rathkhola Stand: 0, 0.5, 0)
    this.character = new CharacterController(this.physics, { x: 0.0, y: 0.5, z: 0.0 });

    // 5. Initialize Rickshaw Vehicle (parked near Stand: 2.5, 0.5, -1.0)
    this.rickshaw = new RickshawVehicle(this.physics, { x: 2.5, y: 0.5, z: -1.0 });

    // 6. Initialize Input Manager
    this.inputManager = new InputManager();
    this.inputManager.attach(canvas);

    // 7. Initialize NPC & Pedestrian Manager
    this.npcManager = new NPCManager(this.sceneManager.scene, this.physics);
    this.npcManager.init();

    // 8. Initialize Autonomous Road Traffic AI
    this.trafficManager = new TrafficManager(this.sceneManager.scene, this.physics);
    await this.trafficManager.init();

    // 9. Initialize Domain Game State & Dexie Local Persistence
    await useGameStore.getState().initGame();

    // 10. Reconcile restored domain player transform and vehicle occupancy
    this.applyDomainToRuntime();

    // 11. Initialize Chunk Streaming
    this.chunkLoader = new ChunkLoader(this.physics);
    this.chunkStreamer = new ChunkStreamer(this.chunkLoader, this.sceneManager.scene);

    this.chunkStreamer.onActiveChunksChanged = (activeIds, count) => {
      useSessionStore.getState().setActiveChunkIds(activeIds);
      useSessionStore.getState().setLoadedChunkCount(count);
    };

    // 12. Load World Manifest & Start Initial Chunk Streaming
    await this.loadWorldManifest();

    // 13. Initial position stream around restored player coordinates
    const initialPos = this.isInVehicle ? this.rickshaw.getPosition() : this.character.getPosition();
    await this.chunkStreamer.updatePlayerPosition(initialPos);

    // 14. Initialize Web Audio Engine
    this.audioManager = new AudioManager();
    useSessionStore.getState().setIsAudioMuted(this.audioManager.settings.isMuted);

    // 15. Window resize listener
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

  /**
   * Boards any passenger NPC into the rickshaw passenger seat.
   */
  public boardPassenger(npcId: string): boolean {
    const seatPos = this.rickshaw.getPassengerSeatPosition();
    return this.npcManager.boardPassenger(
      npcId,
      this.sceneManager.rickshawMesh,
      seatPos
    );
  }

  /**
   * Action trigger invoked when Farhana agrees to board the rickshaw during dialogue.
   */
  public boardPassengerFarhana(): boolean {
    const boarded = this.boardPassenger('npc_student_farhana');
    if (boarded) {
      useSessionStore.getState().setStatusMessage('ফারহানা উঠেছে! (Farhana boarded — Drive to Hardinge School Gate)');
      useGameStore.getState().showToast('ফারহানা রিকশায় উঠেছে। গন্তব্য: হরগোবিন্দ স্কুল গেট।', 3500);
    }
    return boarded;
  }

  /**
   * Synchronizes actual 3D runtime transforms and vehicle state into the domain engine.
   * MUST be called before saving or creating save envelopes.
   */
  public syncRuntimeToDomain(): void {
    const engine = useGameStore.getState().engine;
    if (!engine) return;

    const curPos = this.isInVehicle ? this.rickshaw.getPosition() : this.character.getPosition();
    const curHeading = this.isInVehicle ? this.rickshaw.heading : this.character.heading;

    engine.updatePlayerPosition(curPos, curHeading);
    engine.setInVehicle(this.isInVehicle);
    engine.updateVehicleState(
      this.rickshaw.speedMps,
      this.rickshaw.steeringAngle,
      0
    );
  }

  /**
   * Reconciles domain player transform and vehicle state to the 3D runtime entities.
   * MUST be called after save hydration (local load, cloud restore, conflict resolution).
   */
  public applyDomainToRuntime(): void {
    const engine = useGameStore.getState().engine;
    if (!engine) return;

    const p = engine.player;
    if (p.isInVehicle) {
      this.isInVehicle = true;
      this.rickshaw.isOccupied = true;
      this.rickshaw.resetTransform(p.position, p.headingRadians);
      this.character.resetTransform(this.rickshaw.getDriverSeatPosition(), p.headingRadians);
      useSessionStore.getState().setIsInVehicle(true);
    } else {
      this.isInVehicle = false;
      this.rickshaw.isOccupied = false;
      this.character.resetTransform(p.position, p.headingRadians);
      useSessionStore.getState().setIsInVehicle(false);
    }

    useSessionStore.getState().setPlayerPosition(p.position);
    useSessionStore.getState().setPlayerHeading(p.headingRadians);

    if (this.chunkStreamer) {
      this.chunkStreamer.updatePlayerPosition(p.position);
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
    const ui = useUIStore.getState();
    const isUIBlocking = ui.isDialogueOpen || ui.isJournalOpen || ui.isInventoryOpen;

    const activePos = this.isInVehicle ? this.rickshaw.getPosition() : this.character.getPosition();

    // 1. UI Modals Hotkeys
    if (input.toggleJournal) {
      ui.toggleJournal();
    }
    if (input.toggleInventory) {
      ui.toggleInventory();
    }
    if (input.toggleDebug) {
      ui.toggleDebugOverlay();
    }

    // 1.5 Mute Audio Toggle ('M' key)
    if (input.toggleMute) {
      const isMuted = this.audioManager ? this.audioManager.toggleMute() : false;
      useSessionStore.getState().setIsAudioMuted(isMuted);
    }

    // 2. Camera Toggle ('V' key)
    if (input.cameraToggle && !isUIBlocking) {
      const newMode = this.cameraDirector.toggleMode();
      useSessionStore.getState().setCameraMode(newMode);
    }

    // 3. Bell Ringing ('Space' key in vehicle)
    if (this.isInVehicle && input.bell && !isUIBlocking) {
      useSessionStore.getState().triggerBell();
      this.audioManager?.rickshaw.triggerBell();
    }

    // 4. Talk / Dialogue Interaction ('E' key)
    if (input.talkInteract && !isUIBlocking) {
      const nearbyNPC = this.npcManager.getNearbyInteractiveNPC(activePos, 2.5);
      if (nearbyNPC && !nearbyNPC.isBoarded) {
        ui.openDialogue(nearbyNPC.definition.dialogueTreeId || 'dialogue_farhana_student');
      }
    }

    // 5. Vehicle Enter / Exit Interaction ('F' key)
    if (input.interact && !isUIBlocking) {
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

    // 6. Update Camera Mouse Look
    if (!isUIBlocking) {
      this.cameraDirector.updateMouseLook(input.mouseDeltaX, input.mouseDeltaY);
    }

    // 7. Suppress motion inputs if modal UI is open
    const effectiveInput = isUIBlocking
      ? {
          forward: false,
          backward: false,
          left: false,
          right: false,
          sprint: false,
          jump: false,
          interact: false,
          cameraToggle: false,
          bell: false,
          talkInteract: false,
          toggleJournal: false,
          toggleInventory: false,
          toggleDebug: false,
          toggleMute: false,
          mouseDeltaX: 0,
          mouseDeltaY: 0,
        }
      : input;

    // 8. Fixed-Timestep Physics Simulation Step
    this.physics.step(dt, (physicsDt) => {
      if (this.isInVehicle) {
        this.rickshaw.update(physicsDt, effectiveInput);
        // Position character controller inside driver seat
        const seatPos = this.rickshaw.getDriverSeatPosition();
        this.character.resetPosition(seatPos);
      } else {
        this.character.update(physicsDt, effectiveInput);
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
          talkInteract: false,
          toggleJournal: false,
          toggleInventory: false,
          toggleDebug: false,
          toggleMute: false,
          mouseDeltaX: 0,
          mouseDeltaY: 0,
        });
      }
    });

    // 9. Update Visual Three.js Scene Entities
    const curPos = this.isInVehicle ? this.rickshaw.getPosition() : this.character.getPosition();
    const curHeading = this.isInVehicle ? this.rickshaw.heading : this.character.heading;

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

    // 10. Update NPCs and Ambient Traffic AI
    this.npcManager.update(dt);
    this.trafficManager.update(dt, curPos, this.rickshaw.getPosition());
    useSessionStore.getState().setNpcPositions(this.npcManager.getDynamicNPCPositions());

    // 10.5 Update Web Audio Subsystems
    if (this.audioManager) {
      // 10.5.1 Rickshaw Vehicle Audio
      this.audioManager.rickshaw.update(
        dt,
        this.rickshaw.speedMps,
        this.isInVehicle,
        effectiveInput.backward,
        effectiveInput.forward
      );

      // 10.5.2 Character Locomotion Audio
      const charSpeed = this.character.currentSpeed;
      this.audioManager.locomotion.update(
        dt,
        charSpeed,
        effectiveInput.sprint,
        this.isInVehicle
      );

      // 10.5.3 Ambient 3D Soundscape Emitters
      this.audioManager.ambience.update(dt, curPos);

      // 10.5.4 3D Audio Listener (Camera Orientation & Position)
      const cam = this.cameraDirector.camera;
      const camForward = new Vector3();
      cam.getWorldDirection(camForward);
      this.audioManager.updateListener(cam.position, camForward, cam.up);
    }

    // 11. Mission 1 Drop-off Detection (Hardinge High School Gate)
    const farhana = this.npcManager.npcs.get('npc_student_farhana');
    if (farhana && farhana.isBoarded) {
      const distToSchool = Math.hypot(
        curPos.x - PHASE_1_ANCHORS.HARDINGE_HIGH_SCHOOL.x,
        curPos.z - PHASE_1_ANCHORS.HARDINGE_HIGH_SCHOOL.z
      );

      if (distToSchool <= 15.0) {
        // Drop off Farhana
        this.npcManager.dismountPassenger(
          'npc_student_farhana',
          PHASE_1_ANCHORS.HARDINGE_HIGH_SCHOOL
        );
        useGameStore.getState().completeObjective('mission_1_first_fare', 'obj_m1_dropoff');
        useGameStore.getState().finishMission('mission_1_first_fare');
        useSessionStore
          .getState()
          .setStatusMessage('🎉 মিশন সম্পন্ন! হরগোবিন্দ স্কুল গেটে পৌঁছানো হয়েছে।');
      }
    }

    // 12. Mission 2 Checkpoint Arrival Detection (Thana Junction, 12m)
    const m2Inst = useGameStore.getState().allMissions['mission_2_police_checkpoint'];
    if (
      m2Inst &&
      m2Inst.state === 'ACTIVE' &&
      !m2Inst.completedObjectiveIds.includes('obj_m2_approach')
    ) {
      const distToCheckpoint = Math.hypot(
        curPos.x - PHASE_1_ANCHORS.THANA_JUNCTION_CHECKPOINT.x,
        curPos.z - PHASE_1_ANCHORS.THANA_JUNCTION_CHECKPOINT.z
      );
      if (distToCheckpoint <= 12.0) {
        useGameStore.getState().completeObjective('mission_2_police_checkpoint', 'obj_m2_approach');
        useSessionStore.getState().setStatusMessage('থানা মোড় চেকপোস্টে পৌঁছেছেন। [E] কথা বলুন');
      }
    }

    // 13. Mission 3 Cargo Delivery Detection (Rathkhola Origin, 15m)
    const m3Inst = useGameStore.getState().allMissions['mission_3_artisan_order'];
    if (
      m3Inst &&
      m3Inst.state === 'ACTIVE' &&
      m3Inst.completedObjectiveIds.includes('obj_m3_collect_cargo') &&
      !m3Inst.completedObjectiveIds.includes('obj_m3_deliver_cargo')
    ) {
      const distToRathkhola = Math.hypot(
        curPos.x - PHASE_1_ANCHORS.RATHKHOLA_ORIGIN.x,
        curPos.z - PHASE_1_ANCHORS.RATHKHOLA_ORIGIN.z
      );
      if (distToRathkhola <= 15.0) {
        useGameStore.getState().completeObjective('mission_3_artisan_order', 'obj_m3_deliver_cargo');
        useGameStore.getState().finishMission('mission_3_artisan_order');
        const eng = useGameStore.getState().engine;
        if (eng) {
          eng.inventory.removeItem('brass_bells_cargo', 1);
        }
        useGameStore.getState().syncFromEngine();
        useSessionStore.getState().setStatusMessage('🎉 কাঁসার মালামাল খালাস সম্পন্ন! ৳৭৫ অর্জিত (+১০ কারিগর আস্থা)');
      }
    }

    // 14. Repeatable Fare Drop-off Detection (Kamal at Thana, Sufia at Kayetpara)
    const kamal = this.npcManager.npcs.get('npc_passenger_kamal');
    const sufia = this.npcManager.npcs.get('npc_passenger_sufia');
    const activeFareNpc = (kamal && kamal.isBoarded) ? kamal : (sufia && sufia.isBoarded) ? sufia : null;

    if (activeFareNpc) {
      const dropoffAnchor = activeFareNpc.definition.id === 'npc_passenger_kamal'
        ? PHASE_1_ANCHORS.THANA_JUNCTION_CHECKPOINT
        : PHASE_1_ANCHORS.KAYETPARA_METAL_WORKSHOP;

      const distToDropoff = Math.hypot(
        curPos.x - dropoffAnchor.x,
        curPos.z - dropoffAnchor.z
      );

      if (distToDropoff <= 15.0) {
        // Despawn boarded fare passenger cleanly
        this.npcManager.despawnFarePassenger(activeFareNpc.definition.id);

        // Find active repeatable fare trip ID
        const activeMissions = useGameStore.getState().activeMissions;
        const fareTripEntry = Object.entries(activeMissions).find(([id]) => id.startsWith('fare_trip_'));
        if (fareTripEntry) {
          const tripId = fareTripEntry[0];
          useGameStore.getState().completeObjective(tripId, 'obj_fare_dropoff');
          useGameStore.getState().finishMission(tripId);
        }

        const eng = useGameStore.getState().engine;
        if (eng) {
          const now = Date.now();
          eng.setWorldFlag('fareNpcCooldownMs', now + 60000); // 60s cooldown
          const totalFares = ((eng.getWorldFlag<number>('totalFaresCompleted') as number) ?? 0) + 1;
          eng.setWorldFlag('totalFaresCompleted', totalFares);
        }

        useSessionStore.getState().setStatusMessage('🎉 যাত্রী নামানো হয়েছে! ভাড়া পরিশোধ করা হয়েছে।');
      }
    }

    // 15. Repeatable Fare Spawner: spawns Kamal or Sufia after Mission 1 completes and cooldown passes
    const m1Inst = useGameStore.getState().allMissions['mission_1_first_fare'];
    if (m1Inst && m1Inst.state === 'COMPLETED') {
      const eng = useGameStore.getState().engine;
      const cooldownEnd = (eng?.getWorldFlag<number>('fareNpcCooldownMs') as number) ?? 0;
      const hasKamal = this.npcManager.npcs.has('npc_passenger_kamal');
      const hasSufia = this.npcManager.npcs.has('npc_passenger_sufia');

      if (!hasKamal && !hasSufia && Date.now() >= cooldownEnd) {
        const totalFares = (eng?.getWorldFlag<number>('totalFaresCompleted') as number) ?? 0;
        const fareDef = totalFares % 2 === 0 ? FARE_PASSENGER_KAMAL : FARE_PASSENGER_SUFIA;
        this.npcManager.spawnFareNPC(fareDef);
        useSessionStore.getState().setStatusMessage(`নতুন যাত্রী (${fareDef.nameEn}) রথখোলা স্ট্যান্ডে অপেক্ষা করছেন [E]`);
      }
    }

    // 16. Contextual Interaction Prompts
    if (!isUIBlocking) {
      const nearbyNPC = this.npcManager.getNearbyInteractiveNPC(curPos, 2.5);
      if (nearbyNPC && !nearbyNPC.isBoarded) {
        useSessionStore
          .getState()
          .setStatusMessage(`[E] কথা বলুন (Talk to ${nearbyNPC.definition.nameEn})`);
      } else if (!this.isInVehicle && this.rickshaw.canEnter(curPos)) {
        useSessionStore.getState().setStatusMessage('[F] রিকশায় উঠুন (Ride Rickshaw)');
      }
    }

    // 13. Update Camera Director
    const eyePos = this.isInVehicle ? this.rickshaw.getDriverSeatPosition() : this.character.getEyePosition();
    const excludedBody = this.isInVehicle ? this.rickshaw.body : this.character.body;
    this.cameraDirector.update(dt, eyePos, curHeading, this.physics, excludedBody);

    // 14. Update Chunk Streaming (around current player coordinates)
    this.chunkStreamer.updatePlayerPosition(curPos);

    // 15. Sync Zustand State
    useSessionStore.getState().setPlayerPosition(curPos);
    useSessionStore.getState().setPlayerHeading(curHeading);
    useSessionStore.getState().setVehicleSpeedKph(this.rickshaw.speedMps * 3.6);
  }

  public render(): void {
    this.rendererManager.render(this.sceneManager.scene, this.cameraDirector.camera);
  }

  public dispose(): void {
    if (activeGameEngineInstance === this) {
      activeGameEngineInstance = null;
    }
    this.stop();
    window.removeEventListener('resize', this.onResize);
    if (typeof window !== 'undefined' && (window as any).__dhamrai_engine === this) {
      delete (window as any).__dhamrai_engine;
    }
    if (this.inputManager) this.inputManager.detach();
    if (this.chunkStreamer) this.chunkStreamer.dispose();
    if (this.npcManager) this.npcManager.dispose();
    if (this.trafficManager) this.trafficManager.dispose();
    if (this.character) this.character.dispose();
    if (this.rickshaw) this.rickshaw.dispose();
    if (this.physics) this.physics.dispose();
    if (this.sceneManager) this.sceneManager.dispose();
    if (this.rendererManager) this.rendererManager.dispose();
    if (this.audioManager) this.audioManager.dispose();
  }
}
