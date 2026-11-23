/**
 * Dhamrai Life — Core 3D Game Engine Coordinator
 * ===============================================
 * Integrates WebGL2 Three.js rendering, Rapier 3D physics,
 * character kinematics, 3-wheel rickshaw simulation, camera director,
 * distance-based 3x3 chunk streaming, NPC management, autonomous road traffic,
 * and game state/persistence synchronization.
 */

import { PHASE_1_ANCHORS, WorldManifest, WorldPosition } from '@dhamrai/shared-contracts';
import {
  FARE_PASSENGER_KAMAL,
  FARE_PASSENGER_SUFIA,
  PHASE_1_MISSIONS,
} from '@dhamrai/game-core';
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
import { WorldMaterialBinder } from './materials/WorldMaterialBinder.js';
import { PropManager } from './PropManager.js';
import { DayNightCycle } from './atmosphere/DayNightCycle.js';
import { AtmosphereController } from './atmosphere/AtmosphereController.js';
import { StreetLampSystem } from './atmosphere/StreetLampSystem.js';
import { RickshawHeadlight } from './atmosphere/RickshawHeadlight.js';
import { WeatherSystem } from './atmosphere/WeatherSystem.js';
import { EconomyInteractables } from './EconomyInteractables.js';
import { CivicEnforcementBridge } from './CivicEnforcementBridge.js';
import { ObjectiveMarker, bearingToTargetDeg, distanceToTargetM } from './ObjectiveMarker.js';
import { PlotMarkers } from './PlotMarkers.js';
import { useSessionStore } from '../state/useSessionStore.js';
import { useGameStore } from '../state/useGameStore.js';
import { useUIStore } from '../state/useUIStore.js';
import { useSettingsStore } from '../state/useSettingsStore.js';

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
  /** Milestone 20 — parked driveable CNG */
  public cng!: RickshawVehicle;
  /** Milestone 22 — parked driveable easy bike */
  public easyBike!: RickshawVehicle;
  public activeVehicleKind: 'rickshaw' | 'cng' | 'easy_bike' = 'rickshaw';
  public cameraDirector!: CameraDirector;
  public inputManager!: InputManager;
  public chunkLoader!: ChunkLoader;
  public chunkStreamer!: ChunkStreamer;
  public npcManager!: NPCManager;
  public trafficManager!: TrafficManager;
  public audioManager!: AudioManager;
  public materialBinder!: WorldMaterialBinder;
  public propManager!: PropManager;
  public dayNightCycle!: DayNightCycle;
  public atmosphereController!: AtmosphereController;
  public streetLamps!: StreetLampSystem;
  public rickshawHeadlight!: RickshawHeadlight;
  public weatherSystem!: WeatherSystem;
  public economyInteractables!: EconomyInteractables;
  public civicBridge!: CivicEnforcementBridge;
  public objectiveMarker!: ObjectiveMarker;
  public plotMarkers!: PlotMarkers;
  private atmosphereHudAccum = 0;
  private plotMarkerAccum = 0;
  /** Milestone 33 — last announced emergent event id (avoid toast spam) */
  private lastAnnouncedEmergentId: string | null = null;
  private lastWearPos: WorldPosition | null = null;
  private conditionHudAccum = 0;
  private civicHudAccum = 0;
  private wayfindingAccum = 0;
  private landmarkDiscoverAccum = 0;

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
      // Milestone 36/38 — expose for CDP acceptance (same pattern as other stores)
      (window as any).__dhamrai_useSettingsStore = useSettingsStore;
      useSettingsStore.getState().hydrate();
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
    this.rickshaw = new RickshawVehicle(this.physics, { x: 2.5, y: 0.5, z: -1.0 }, 'rickshaw');
    // 5b. Milestone 20 — CNG parked near stand
    this.cng = new RickshawVehicle(this.physics, { x: 8.0, y: 0.5, z: 3.0 }, 'cng');
    // 5c. Milestone 22 — easy bike parked near stand
    this.easyBike = new RickshawVehicle(this.physics, { x: -4.0, y: 0.5, z: 2.5 }, 'easy_bike');

    // 6. Initialize Input Manager
    this.inputManager = new InputManager();
    this.inputManager.attach(canvas);

    // 7. Initialize NPC & Pedestrian Manager
    this.npcManager = new NPCManager(this.sceneManager.scene, this.physics);
    this.npcManager.init();

    // 7.5 Milestone 13 — tea stall / mistri proximity volumes
    this.economyInteractables = new EconomyInteractables();

    // 7.6 Milestone 14 — civic enforcement bridge
    this.civicBridge = new CivicEnforcementBridge();

    // 7.7 Milestone 15 — mission objective beacon
    this.objectiveMarker = new ObjectiveMarker(this.sceneManager.scene);
    this.plotMarkers = new PlotMarkers(this.sceneManager.scene);

    // 8. Initialize Autonomous Road Traffic AI
    this.trafficManager = new TrafficManager(this.sceneManager.scene, this.physics);
    await this.trafficManager.init();

    // 9. Initialize Domain Game State & Dexie Local Persistence
    await useGameStore.getState().initGame();

    // 10. Reconcile restored domain player transform and vehicle occupancy
    this.applyDomainToRuntime();

    // 11. Initialize Milestone 11 visual materials + street props (before chunk load)
    this.materialBinder = new WorldMaterialBinder();
    this.propManager = new PropManager(this.sceneManager.propsRoot);
    this.propManager.init();

    // 11b. Milestone 12 atmosphere stack
    this.dayNightCycle = new DayNightCycle();
    this.atmosphereController = new AtmosphereController(
      this.sceneManager,
      this.rendererManager,
      this.dayNightCycle
    );
    this.streetLamps = new StreetLampSystem(
      this.sceneManager.scene,
      this.propManager.getPoleAnchors()
    );
    this.rickshawHeadlight = new RickshawHeadlight(this.sceneManager.rickshawMesh);
    this.weatherSystem = new WeatherSystem(this.sceneManager.scene);
    this.atmosphereController.applyNow(this.weatherSystem.rainFactor);

    // 12. Initialize Chunk Streaming (atlas binder applied on each GLB load)
    this.chunkLoader = new ChunkLoader(this.physics);
    this.chunkLoader.setMaterialBinder(this.materialBinder);
    this.chunkStreamer = new ChunkStreamer(this.chunkLoader, this.sceneManager.scene);

    this.chunkStreamer.onActiveChunksChanged = (activeIds, count) => {
      useSessionStore.getState().setActiveChunkIds(activeIds);
      useSessionStore.getState().setLoadedChunkCount(count);
    };

    // 13. Load World Manifest & Start Initial Chunk Streaming
    await this.loadWorldManifest();

    // 14. Initial position stream around restored player coordinates
    const initialPos = this.isInVehicle ? this.rickshaw.getPosition() : this.character.getPosition();
    await this.chunkStreamer.updatePlayerPosition(initialPos);

    // 15. Initialize Web Audio Engine
    this.audioManager = new AudioManager();
    useSessionStore.getState().setIsAudioMuted(this.audioManager.settings.isMuted);

    // 16. Window resize listener
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
  private getActiveVehicle(): RickshawVehicle {
    if (this.activeVehicleKind === 'cng') return this.cng;
    if (this.activeVehicleKind === 'easy_bike') return this.easyBike;
    return this.rickshaw;
  }

  private getAllVehicles(): RickshawVehicle[] {
    return [this.rickshaw, this.cng, this.easyBike];
  }

  public syncRuntimeToDomain(): void {
    const engine = useGameStore.getState().engine;
    if (!engine) return;

    const vehicle = this.getActiveVehicle();
    const curPos = this.isInVehicle ? vehicle.getPosition() : this.character.getPosition();
    const curHeading = this.isInVehicle ? vehicle.heading : this.character.heading;

    engine.updatePlayerPosition(curPos, curHeading);
    engine.setInVehicle(this.isInVehicle);
    // Preserve domain-owned damagePercent (do not overwrite with 0)
    engine.updateVehicleState(vehicle.speedMps, vehicle.steeringAngle);
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
      this.activeVehicleKind = 'rickshaw';
      for (const v of this.getAllVehicles()) v.isOccupied = false;
      this.rickshaw.isOccupied = true;
      this.rickshaw.resetTransform(p.position, p.headingRadians);
      this.character.resetTransform(this.rickshaw.getDriverSeatPosition(), p.headingRadians);
      useSessionStore.getState().setIsInVehicle(true);
    } else {
      this.isInVehicle = false;
      for (const v of this.getAllVehicles()) v.isOccupied = false;
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
    const isUIBlocking =
      ui.isDialogueOpen || ui.isJournalOpen || ui.isInventoryOpen || ui.isSettingsOpen;

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
    if (input.toggleSettings) {
      ui.toggleSettings();
    }

    // 1.5 Mute Audio Toggle ('M' key)
    if (input.toggleMute) {
      const isMuted = this.audioManager ? this.audioManager.toggleMute() : false;
      useSessionStore.getState().setIsAudioMuted(isMuted);
    }

    // 1.6 Weather Toggle ('N' key) — Milestone 12
    if (input.toggleWeather && !isUIBlocking && this.weatherSystem) {
      const wx = this.weatherSystem.toggleWeather();
      useSessionStore.getState().setStatusMessage(
        wx === 'rain' ? 'বৃষ্টি শুরু (Light rain)' : 'আকাশ পরিষ্কার (Clear skies)'
      );
    }

    // 1.7 Advance day/night clock early so audio + lighting share the same t
    if (this.dayNightCycle) {
      this.dayNightCycle.update(dt);
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
    // Priority: dialogue NPC > tea/mistri > landmark plaque (M24)
    if (input.talkInteract && !isUIBlocking) {
      const nearbyNPC = this.npcManager.getNearbyInteractiveNPC(activePos, 2.5);
      if (nearbyNPC && !nearbyNPC.isBoarded) {
        const treeId = nearbyNPC.definition.dialogueTreeId || 'dialogue_farhana_student';
        ui.openDialogue(treeId);
        // Milestone 25 — reputation-gated tea greeting
        if (treeId === 'dialogue_tea_stall') {
          const eng = useGameStore.getState().engine;
          const rep = eng?.player.reputations.transportReputation ?? 0;
          if (rep >= 20) {
            useUIStore.getState().setDialogueNode('node_tea_regular');
          }
        }
      } else {
        const phase = (this.dayNightCycle?.phase ?? 'day') as
          | 'dawn'
          | 'day'
          | 'dusk'
          | 'night';
        const econ = this.economyInteractables?.findNearest(activePos, 2.5, phase);
        if (econ) {
          ui.openDialogue(econ.item.dialogueTreeId);
          if (econ.item.dialogueTreeId === 'dialogue_tea_stall') {
            const eng = useGameStore.getState().engine;
            const rep = eng?.player.reputations.transportReputation ?? 0;
            if (rep >= 20) {
              useUIStore.getState().setDialogueNode('node_tea_regular');
            }
          }
        } else {
          // Milestone 27–30 — plot inspect / buy / build / rent, else M24 plaque
          const eng = useGameStore.getState().engine;
          const plot = eng?.getNearestPlot(activePos, 8) ?? null;
          if (eng && plot) {
            eng.inspectPlot(plot.id);
            if (!eng.ownsPlot(plot.id)) {
              const buy = eng.purchasePlot(plot.id, Date.now());
              if (buy.success) {
                useGameStore.getState().syncFromEngine();
                useGameStore
                  .getState()
                  .showToast(`প্লট কেনা হয়েছে: ${plot.nameBn} (৳${(plot.priceMinorUnits / 100).toFixed(0)})`, 4000);
              } else if (buy.reason === 'INSUFFICIENT_FUNDS') {
                useGameStore.getState().showToast('টাকা নেই — প্লট কেনা যায়নি', 3000);
              } else {
                useSessionStore
                  .getState()
                  .setStatusMessage(`${plot.nameBn}: ${plot.blurbBn}`);
              }
            } else if (eng.getBuildingOnPlot(plot.id) === 'none') {
              const building = plot.allowedBuildings[0];
              if (building && building !== 'none') {
                const built = eng.placeBuilding(plot.id, building, Date.now());
                if (built.success) {
                  useGameStore.getState().syncFromEngine();
                  useGameStore
                    .getState()
                    .showToast(`ভবন তৈরি: ${building} on ${plot.nameEn}`, 4000);
                } else if (built.reason === 'INSUFFICIENT_FUNDS') {
                  useGameStore.getState().showToast('নির্মাণের টাকা নেই', 3000);
                }
              }
            } else {
              const rent = eng.claimRentalIncome(plot.id, Date.now());
              if (rent.success) {
                useGameStore.getState().syncFromEngine();
                useGameStore
                  .getState()
                  .showToast(
                    `ভাড়া আয় ৳${((rent.incomeMinorUnits ?? 0) / 100).toFixed(0)} (${plot.nameEn})`,
                    3500
                  );
              } else if (rent.reason === 'COOLDOWN') {
                useSessionStore.getState().setStatusMessage('ভাড়া এখনো তৈরি হয়নি — একটু পর আবার চেষ্টা করুন');
              }
            }
            useGameStore.getState().syncFromEngine();
          } else {
            const plaque = eng?.getNearestDiscoveredLandmark(activePos, 8) ?? null;
            if (plaque) {
              useGameStore
                .getState()
                .showToast(`${plaque.nameBn}: ${plaque.blurbBn}`, 5000);
              useSessionStore
                .getState()
                .setStatusMessage(`📜 ${plaque.nameEn} — ${plaque.sourceNote}`);
            }
          }
        }
      }
    }

    // 5. Vehicle Enter / Exit Interaction ('F' key) — nearer of rickshaw / CNG
    if (input.interact && !isUIBlocking) {
      if (this.isInVehicle) {
        const vehicle = this.getActiveVehicle();
        if (vehicle.canExit()) {
          this.isInVehicle = false;
          vehicle.isOccupied = false;
          const vPos = vehicle.getPosition();
          const sinH = Math.sin(vehicle.heading);
          const cosH = Math.cos(vehicle.heading);
          const exitPos: WorldPosition = {
            x: vPos.x - 1.2 * cosH,
            y: vPos.y + 0.1,
            z: vPos.z - 1.2 * sinH,
          };
          this.character.resetPosition(exitPos);
          this.character.heading = vehicle.heading;
          useSessionStore.getState().setIsInVehicle(false);
          const labels = { rickshaw: 'rickshaw', cng: 'CNG', easy_bike: 'easy bike' } as const;
          useSessionStore.getState().setStatusMessage(`Dismounted ${labels[this.activeVehicleKind]}`);
        } else {
          useSessionStore.getState().setStatusMessage('Stop vehicle to dismount!');
        }
      } else {
        const playerPos = this.character.getPosition();
        const candidates = this.getAllVehicles()
          .filter((v) => v.canEnter(playerPos))
          .map((v) => {
            const vp = v.getPosition();
            return {
              v,
              dist: Math.hypot(playerPos.x - vp.x, playerPos.z - vp.z),
            };
          })
          .sort((a, b) => a.dist - b.dist);
        const nearest = candidates[0];
        if (nearest) {
          for (const v of this.getAllVehicles()) v.isOccupied = false;
          this.isInVehicle = true;
          this.activeVehicleKind = nearest.v.archetype;
          nearest.v.isOccupied = true;
          useSessionStore.getState().setIsInVehicle(true);
          const msgs = {
            rickshaw: 'Riding rickshaw — [W] Pedal, [S] Brake, [A/D] Steer, [Space] Bell',
            cng: 'Riding CNG — [W] Drive, [S] Brake, [A/D] Steer',
            easy_bike: 'Riding easy bike — [W] Drive, [S] Brake, [A/D] Steer',
          } as const;
          useSessionStore.getState().setStatusMessage(msgs[nearest.v.archetype]);
        } else {
          useSessionStore.getState().setStatusMessage('Too far from vehicle (walk closer to press F)');
        }
      }
    }

    // 6. Update Camera Mouse Look
    if (!isUIBlocking) {
      this.cameraDirector.updateMouseLook(input.mouseDeltaX, input.mouseDeltaY);
    }

    // 7. Suppress motion inputs if modal UI is open; M13 blocks sprint when stamina critical
    const domainEngine = useGameStore.getState().engine;
    const sprintAllowed = domainEngine ? domainEngine.canSprint() : true;
    const baseInput = isUIBlocking
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
          toggleWeather: false,
          toggleSettings: false,
          mouseDeltaX: 0,
          mouseDeltaY: 0,
        }
      : input;
    const effectiveInput = {
      ...baseInput,
      sprint: baseInput.sprint && sprintAllowed,
    };

    // 7.5 Milestone 13 — apply vehicle condition multipliers before physics
    // Milestone 19 — soft arrest freezes controls
    const arrestHolding = domainEngine?.isSoftArrestHolding() === true;
    if (domainEngine) {
      const mods = domainEngine.getSpeedModifiers();
      this.rickshaw.topSpeedMult = mods.topSpeedMult;
      this.rickshaw.steerMult = mods.steerMult;
      this.rickshaw.limpMode = mods.limpMode;
      // CNG uses milder wear multipliers (motorized)
      this.cng.topSpeedMult = Math.max(0.55, mods.topSpeedMult);
      this.cng.steerMult = mods.steerMult;
      this.cng.limpMode = mods.limpMode;
      this.easyBike.topSpeedMult = Math.max(0.6, mods.topSpeedMult);
      this.easyBike.steerMult = mods.steerMult;
      this.easyBike.limpMode = mods.limpMode;
    }

    const idleVehicleInput = {
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
      toggleWeather: false,
      toggleSettings: false,
      mouseDeltaX: 0,
      mouseDeltaY: 0,
    };
    const driveInput = arrestHolding ? idleVehicleInput : effectiveInput;

    // 8. Fixed-Timestep Physics Simulation Step
    this.physics.step(dt, (physicsDt) => {
      if (this.isInVehicle) {
        const vehicle = this.getActiveVehicle();
        vehicle.update(physicsDt, driveInput);
        const seatPos = vehicle.getDriverSeatPosition();
        this.character.resetPosition(seatPos);
        for (const other of this.getAllVehicles()) {
          if (other !== vehicle) other.update(physicsDt, idleVehicleInput);
        }
      } else {
        this.character.update(physicsDt, arrestHolding ? idleVehicleInput : effectiveInput);
        for (const v of this.getAllVehicles()) v.update(physicsDt, idleVehicleInput);
      }
    });

    // 9. Update Visual Three.js Scene Entities
    const activeVehicle = this.getActiveVehicle();
    const curPos = this.isInVehicle ? activeVehicle.getPosition() : this.character.getPosition();
    const curHeading = this.isInVehicle ? activeVehicle.heading : this.character.heading;

    // Synchronize Player Mesh
    const pPos = this.character.getPosition();
    this.sceneManager.playerMesh.position.set(pPos.x, pPos.y, pPos.z);
    this.sceneManager.playerMesh.rotation.y = this.character.heading;

    // Synchronize Rickshaw + CNG meshes
    const rPos = this.rickshaw.getPosition();
    this.sceneManager.rickshawMesh.position.set(rPos.x, rPos.y, rPos.z);
    this.sceneManager.rickshawMesh.rotation.y = this.rickshaw.heading;
    const cPos = this.cng.getPosition();
    this.sceneManager.cngMesh.position.set(cPos.x, cPos.y, cPos.z);
    this.sceneManager.cngMesh.rotation.y = this.cng.heading;
    const bPos = this.easyBike.getPosition();
    this.sceneManager.easyBikeMesh.position.set(bPos.x, bPos.y, bPos.z);
    this.sceneManager.easyBikeMesh.rotation.y = this.easyBike.heading;

    // Steer front wheel meshes
    const frontWheelMesh = this.sceneManager.rickshawMesh.getObjectByName('wheel_front');
    if (frontWheelMesh) {
      frontWheelMesh.rotation.y = this.rickshaw.steeringAngle;
    }
    const cngFront = this.sceneManager.cngMesh.getObjectByName('wheel_front');
    if (cngFront) {
      cngFront.rotation.y = this.cng.steeringAngle;
    }
    const bikeFront = this.sceneManager.easyBikeMesh.getObjectByName('wheel_front');
    if (bikeFront) {
      bikeFront.rotation.y = this.easyBike.steeringAngle;
    }

    // 10. Update NPCs and Ambient Traffic AI
    this.npcManager.update(dt);
    this.trafficManager.update(dt, curPos, activeVehicle.getPosition());
    // Milestone 35 — distance LOD
    this.propManager?.updateLod(curPos);
    this.trafficManager.updateLod(curPos);
    useSessionStore.getState().setNpcPositions(this.npcManager.getDynamicNPCPositions());

    // 10.5 Update Web Audio Subsystems
    if (this.audioManager) {
      // 10.5.1 Rickshaw Vehicle Audio
      this.audioManager.rickshaw.update(
        dt,
        activeVehicle.speedMps,
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
      this.audioManager.ambience.setAtmosphere(
        this.dayNightCycle.nightFactor,
        this.weatherSystem.rainFactor
      );
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

    // 13b. Milestone 18 — Mission 4 parcel delivery at college
    const m4Inst = useGameStore.getState().allMissions['mission_4_market_parcel'];
    if (
      m4Inst &&
      m4Inst.state === 'ACTIVE' &&
      m4Inst.completedObjectiveIds.includes('obj_m4_collect_parcel') &&
      !m4Inst.completedObjectiveIds.includes('obj_m4_deliver_parcel')
    ) {
      const distToCollege = Math.hypot(
        curPos.x - PHASE_1_ANCHORS.DHAMRAI_GOVT_COLLEGE.x,
        curPos.z - PHASE_1_ANCHORS.DHAMRAI_GOVT_COLLEGE.z
      );
      if (distToCollege <= 15.0) {
        useGameStore.getState().completeObjective('mission_4_market_parcel', 'obj_m4_deliver_parcel');
        useGameStore.getState().finishMission('mission_4_market_parcel');
        const eng = useGameStore.getState().engine;
        if (eng?.inventory.hasItem('market_parcel')) {
          eng.inventory.removeItem('market_parcel', 1);
        }
        useGameStore.getState().syncFromEngine();
        useSessionStore
          .getState()
          .setStatusMessage('🎉 পার্সেল ডেলিভারি সম্পন্ন! ৳৪৫ অর্জিত');
      }
    }

    // 13c. Milestone 26 — vendor day job objectives
    const m5Inst = useGameStore.getState().allMissions['mission_5_vendor_day'];
    if (m5Inst && m5Inst.state === 'ACTIVE') {
      if (!m5Inst.completedObjectiveIds.includes('obj_m5_fetch_stock')) {
        const d = Math.hypot(
          curPos.x - PHASE_1_ANCHORS.RATHKHOLA_MARKET_PICKUP.x,
          curPos.z - PHASE_1_ANCHORS.RATHKHOLA_MARKET_PICKUP.z
        );
        if (d <= 12) {
          useGameStore.getState().completeObjective('mission_5_vendor_day', 'obj_m5_fetch_stock');
          useSessionStore.getState().setStatusMessage('বিস্কুট মজুদ তোলা হয়েছে — দোকানে ফিরুন');
        }
      } else if (!m5Inst.completedObjectiveIds.includes('obj_m5_return_stall')) {
        const d = Math.hypot(
          curPos.x - PHASE_1_ANCHORS.RATHKHOLA_ORIGIN.x,
          curPos.z - PHASE_1_ANCHORS.RATHKHOLA_ORIGIN.z
        );
        if (d <= 12) {
          useGameStore.getState().completeObjective('mission_5_vendor_day', 'obj_m5_return_stall');
          useGameStore.getState().finishMission('mission_5_vendor_day');
          useGameStore.getState().syncFromEngine();
          useSessionStore.getState().setStatusMessage('🎉 দিনের কাজ সম্পন্ন! ৳৩৫ অর্জিত');
        }
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
    let economyPrompt = '';
    if (!isUIBlocking) {
      const nearbyNPC = this.npcManager.getNearbyInteractiveNPC(curPos, 2.5);
      if (nearbyNPC && !nearbyNPC.isBoarded) {
        useSessionStore
          .getState()
          .setStatusMessage(`[E] কথা বলুন (Talk to ${nearbyNPC.definition.nameEn})`);
        economyPrompt = `[E] ${nearbyNPC.definition.nameBn}`;
      } else {
        const phase = (this.dayNightCycle?.phase ?? 'day') as
          | 'dawn'
          | 'day'
          | 'dusk'
          | 'night';
        const econ = this.economyInteractables?.findNearest(curPos, 2.5, phase);
        if (econ) {
          useSessionStore
            .getState()
            .setStatusMessage(`${econ.item.promptBn} / ${econ.item.promptEn}`);
          economyPrompt = econ.item.promptBn;
        } else if (!this.isInVehicle && this.easyBike.canEnter(curPos)) {
          useSessionStore.getState().setStatusMessage('[F] ইজি বাইকে উঠুন (Ride Easy Bike)');
        } else if (!this.isInVehicle && this.cng.canEnter(curPos)) {
          useSessionStore.getState().setStatusMessage('[F] সিএনজিতে উঠুন (Ride CNG)');
        } else if (!this.isInVehicle && this.rickshaw.canEnter(curPos)) {
          useSessionStore.getState().setStatusMessage('[F] রিকশায় উঠুন (Ride Rickshaw)');
        } else if (domainEngine) {
          const plot = domainEngine.getNearestPlot(curPos, 8);
          if (plot) {
            if (!domainEngine.ownsPlot(plot.id)) {
              useSessionStore
                .getState()
                .setStatusMessage(
                  `[E] প্লট কিনুন — ${plot.nameBn} ৳${(plot.priceMinorUnits / 100).toFixed(0)}`
                );
            } else if (domainEngine.getBuildingOnPlot(plot.id) === 'none') {
              useSessionStore
                .getState()
                .setStatusMessage(`[E] ভবন তৈরি করুন (${plot.allowedBuildings[0]})`);
            } else {
              useSessionStore.getState().setStatusMessage(`[E] ভাড়া আয় নিন — ${plot.nameBn}`);
            }
          }
        }
      }
    }

    // 16.5 Milestone 13 — wear while mounted + stamina tick + condition HUD
    if (domainEngine) {
      if (this.isInVehicle) {
        if (this.lastWearPos) {
          const dist = Math.hypot(curPos.x - this.lastWearPos.x, curPos.z - this.lastWearPos.z);
          if (dist > 0.05 && dist < 20) {
            const wear = domainEngine.applyTravelWear(dist, effectiveInput.sprint);
            if (wear.punctureTriggered) {
              useSessionStore
                .getState()
                .setStatusMessage('⚠️ পাংচার! মিস্ত্রি গৌতমের কাছে যান (Puncture — see Mistri Gautom)');
              useGameStore
                .getState()
                .showToast('টায়ার পাংচার হয়েছে! রথখোলায় মেরামত করুন।', 4000);
            }
          }
        }
        this.lastWearPos = { ...curPos };
      } else {
        this.lastWearPos = null;
      }

      const moving =
        (this.isInVehicle ? Math.abs(this.rickshaw.speedMps) : this.character.currentSpeed) > 0.2;
      const stam = domainEngine.tickStamina({
        dtSec: dt,
        sprinting: baseInput.sprint,
        inVehicle: this.isInVehicle,
        moving,
      });

      if (baseInput.sprint && stam.sprintBlocked && !isUIBlocking) {
        // Soft warning — throttle via condition HUD accum
      }

      this.conditionHudAccum += dt;
      if (this.conditionHudAccum >= 0.25) {
        this.conditionHudAccum = 0;
        useSessionStore.getState().setConditionHud({
          staminaPercent: domainEngine.staminaPercent,
          damagePercent: domainEngine.player.vehicleState.damagePercent,
          tirePressurePercent: domainEngine.tirePressurePercent,
          isPunctured: domainEngine.isPunctured,
          sprintBlocked: stam.sprintBlocked,
          economyPrompt,
        });
      }

      // Milestone 14/19 — civic enforcement tick + heat decay + soft arrest
      domainEngine.decayPoliceHeat(dt);
      this.civicHudAccum += dt;
      if (this.civicHudAccum >= 0.35 && this.civicBridge && !isUIBlocking) {
        this.civicHudAccum = 0;
        const phase = this.dayNightCycle?.phase ?? 'day';
        const civic = this.civicBridge.tick(domainEngine, {
          playerPos: curPos,
          speedKph: activeVehicle.speedMps * 3.6,
          inVehicle: this.isInVehicle,
          dayPhase: phase,
        });
        if (civic.arrested && civic.messageBn) {
          // Teleport / hold at Thana on fresh arrest
          const thana = PHASE_1_ANCHORS.THANA_JUNCTION_CHECKPOINT;
          if (this.isInVehicle) {
            const v = this.getActiveVehicle();
            v.resetTransform({ x: thana.x + 2, y: 0.5, z: thana.z }, 0);
            v.isOccupied = false;
            this.isInVehicle = false;
            useSessionStore.getState().setIsInVehicle(false);
          }
          this.character.resetTransform({ x: thana.x, y: 0.5, z: thana.z }, 0);
          useSessionStore.getState().setStatusMessage(`${civic.messageBn} (${civic.messageEn})`);
          useGameStore.getState().showToast(civic.messageBn, 4500);
          useGameStore.getState().syncFromEngine();
        } else if (civic.stopOpened || civic.fled) {
          if (civic.messageBn) {
            useSessionStore.getState().setStatusMessage(`${civic.messageBn} (${civic.messageEn})`);
          }
          if (civic.shouldOpenDialogue) {
            useUIStore.getState().openDialogue('dialogue_police_stop');
          }
          useGameStore.getState().syncFromEngine();
        } else if (civic.messageBn && !civic.arrested) {
          useSessionStore.getState().setStatusMessage(`${civic.messageBn} (${civic.messageEn})`);
        }
        const stop = domainEngine.activePoliceStop;
        useSessionStore.getState().setCivicHud({
          policeHeat: domainEngine.policeHeat,
          activeFineMinorUnits: stop && !stop.paid ? stop.currentFineMinorUnits : 0,
          policeStopActive: !!(stop && !stop.paid) || domainEngine.isSoftArrestHolding(),
        });
      }
    }

    // 12b. Milestone 12 — Weather particles, lighting, lamps, headlight (clock already advanced)
    if (this.dayNightCycle && this.atmosphereController) {
      this.weatherSystem.update(dt, curPos);
      this.atmosphereController.update(dt, this.weatherSystem.rainFactor);
      this.streetLamps.update(curPos, this.dayNightCycle.nightFactor);
      this.rickshawHeadlight.update(this.isInVehicle, this.dayNightCycle.isNightLike);

      this.atmosphereHudAccum += dt;
      if (this.atmosphereHudAccum >= 0.5) {
        this.atmosphereHudAccum = 0;
        const wxLabel = this.weatherSystem.state === 'rain' ? 'বৃষ্টি / Rain' : 'পরিষ্কার / Clear';
        useSessionStore
          .getState()
          .setAtmosphereHud(this.dayNightCycle.clockLabel, wxLabel, this.dayNightCycle.phase);
        // Milestone 16 — NPC day/night schedules
        this.npcManager.applyDayPhase(this.dayNightCycle.phase as 'dawn' | 'day' | 'dusk' | 'night');
      }
    }

    // 13. Update Camera Director
    const eyePos = this.isInVehicle
      ? activeVehicle.getDriverSeatPosition()
      : this.character.getEyePosition();
    const excludedBody = this.isInVehicle ? activeVehicle.body : this.character.body;
    this.cameraDirector.update(dt, eyePos, curHeading, this.physics, excludedBody);

    // 14. Update Chunk Streaming (around current player coordinates)
    this.chunkStreamer.updatePlayerPosition(curPos);

    // 15. Sync Zustand State
    useSessionStore.getState().setPlayerPosition(curPos);
    useSessionStore.getState().setPlayerHeading(curHeading);
    useSessionStore.getState().setVehicleSpeedKph(activeVehicle.speedMps * 3.6);

    // 16. Milestone 15 — objective beacon + compass
    if (this.objectiveMarker) {
      this.objectiveMarker.update(dt);
      this.wayfindingAccum += dt;
      if (this.wayfindingAccum >= 0.2) {
        this.wayfindingAccum = 0;
        const missionId = useGameStore.getState().currentActiveMissionId;
        const allM = useGameStore.getState().allMissions;
        const eng = useGameStore.getState().engine;
        let target: WorldPosition | null = null;
        if (missionId && missionId !== 'repeatable_fares') {
          const def =
            eng?.missions.getDefinition(missionId) || PHASE_1_MISSIONS[missionId] || null;
          const inst = allM[missionId];
          if (def && inst) {
            const obj = def.objectives.find((o) => !inst.completedObjectiveIds.includes(o.id));
            if (obj) target = obj.targetPosition;
          }
        }
        this.objectiveMarker.setTarget(target);
        if (target) {
          useSessionStore.getState().setWayfindingHud({
            objectiveBearingDeg: bearingToTargetDeg(curPos, target, curHeading),
            objectiveDistanceM: distanceToTargetM(curPos, target),
            hasActiveObjective: true,
          });
        } else {
          useSessionStore.getState().setWayfindingHud({
            objectiveBearingDeg: 0,
            objectiveDistanceM: 0,
            hasActiveObjective: false,
          });
        }
      }
    }

    // 17. Milestone 21 — landmark discovery
    this.landmarkDiscoverAccum += dt;
    if (this.landmarkDiscoverAccum >= 0.4 && domainEngine && !isUIBlocking) {
      this.landmarkDiscoverAccum = 0;
      const found = domainEngine.tryDiscoverLandmark(curPos);
      if (found) {
        useGameStore.getState().syncFromEngine();
        useGameStore
          .getState()
          .showToast(`ল্যান্ডমার্ক আবিষ্কৃত: ${found.nameBn} (${found.nameEn})`, 4000);
        useSessionStore
          .getState()
          .setStatusMessage(`📍 ${found.nameBn} — জার্নালে দেখুন [J]`);
      }
    }

    // 18. Milestone 27/29 — plot marker colors from ownership/buildings
    this.plotMarkerAccum += dt;
    if (this.plotMarkerAccum >= 0.5 && domainEngine && this.plotMarkers) {
      this.plotMarkerAccum = 0;
      this.plotMarkers.sync(domainEngine.getOwnedPlotIds(), domainEngine.getPlotBuildings());
    }

    // 19. Milestone 33 — daily errand + emergent event refresh (throttled via plotMarkerAccum edge)
    if (domainEngine && this.plotMarkerAccum === 0) {
      const dailyId = domainEngine.ensureDailyErrand(Date.now());
      const dailyFlag = `dailyErrandAnnounced_${dailyId}`;
      if (!domainEngine.getWorldFlag(dailyFlag) && !isUIBlocking) {
        domainEngine.setWorldFlag(dailyFlag, 1);
        useGameStore.getState().showToast(`দৈনিক দৌড় উপলব্ধ: ${dailyId}`, 3500);
      }
      const ev = domainEngine.startOrRefreshEmergentEvent(Date.now());
      const active = domainEngine.getActiveEmergentEvent(Date.now());
      if (active && active.id !== this.lastAnnouncedEmergentId && !isUIBlocking) {
        this.lastAnnouncedEmergentId = active.id;
        useSessionStore
          .getState()
          .setStatusMessage(`ঘটনা: ${active.nameBn} (${active.nameEn})`);
        useGameStore.getState().showToast(`ঘটনা: ${ev.nameBn}`, 4000);
      }
    }
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
    if (this.weatherSystem) this.weatherSystem.dispose();
    if (this.streetLamps) this.streetLamps.dispose();
    if (this.rickshawHeadlight) this.rickshawHeadlight.dispose();
    if (this.atmosphereController) this.atmosphereController.dispose();
    if (this.objectiveMarker) this.objectiveMarker.dispose();
    if (this.plotMarkers) this.plotMarkers.dispose();
    if (this.propManager) this.propManager.dispose();
    if (this.materialBinder) this.materialBinder.dispose();
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
