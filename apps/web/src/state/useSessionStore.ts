import { create } from 'zustand';
import type { WorldPosition } from '@dhamrai/shared-contracts';

export type CameraMode = 'FIRST_PERSON' | 'THIRD_PERSON';

export interface PerformanceStats {
  fps: number;
  frameTimeMs: number;
  drawCalls: number;
  triangles: number;
  activeColliders: number;
}

export interface DynamicNPCPosition {
  id: string;
  nameBn: string;
  nameEn: string;
  position: WorldPosition;
  role: string;
  isBoarded: boolean;
}

export interface SessionState {
  playerPosition: WorldPosition;
  playerHeading: number;
  isInVehicle: boolean;
  vehicleSpeedKph: number;
  cameraMode: CameraMode;
  activeChunkIds: string[];
  loadedChunkCount: number;
  performance: PerformanceStats;
  isWebGLSupported: boolean;
  webGLErrorMessage: string | null;
  bellRinging: boolean;
  statusMessage: string;
  npcPositions: DynamicNPCPosition[];
  isAudioMuted: boolean;
  /** Milestone 12 atmosphere HUD */
  gameClockLabel: string;
  weatherLabel: string;
  dayPhase: string;
  /** Milestone 13 resource meters */
  staminaPercent: number;
  damagePercent: number;
  tirePressurePercent: number;
  isPunctured: boolean;
  sprintBlocked: boolean;
  economyPrompt: string;
  /** Milestone 14 civic HUD */
  policeHeat: number;
  activeFineMinorUnits: number;
  policeStopActive: boolean;
  /** Milestone 15 wayfinding */
  objectiveBearingDeg: number;
  objectiveDistanceM: number;
  hasActiveObjective: boolean;

  setPlayerPosition: (pos: WorldPosition) => void;
  setPlayerHeading: (heading: number) => void;
  setIsInVehicle: (inVehicle: boolean) => void;
  setVehicleSpeedKph: (speed: number) => void;
  setCameraMode: (mode: CameraMode) => void;
  toggleCameraMode: () => void;
  setActiveChunkIds: (chunkIds: string[]) => void;
  setLoadedChunkCount: (count: number) => void;
  setPerformanceStats: (stats: Partial<PerformanceStats>) => void;
  setWebGLSupport: (supported: boolean, error?: string | null) => void;
  triggerBell: () => void;
  setStatusMessage: (msg: string) => void;
  setNpcPositions: (positions: DynamicNPCPosition[]) => void;
  setIsAudioMuted: (muted: boolean) => void;
  setAtmosphereHud: (clock: string, weather: string, phase: string) => void;
  setConditionHud: (stats: {
    staminaPercent: number;
    damagePercent: number;
    tirePressurePercent: number;
    isPunctured: boolean;
    sprintBlocked: boolean;
    economyPrompt?: string;
  }) => void;
  setCivicHud: (stats: {
    policeHeat: number;
    activeFineMinorUnits: number;
    policeStopActive: boolean;
  }) => void;
  setWayfindingHud: (stats: {
    objectiveBearingDeg: number;
    objectiveDistanceM: number;
    hasActiveObjective: boolean;
  }) => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  playerPosition: { x: 0.0, y: 0.5, z: 0.0 },
  playerHeading: 0.0,
  isInVehicle: false,
  vehicleSpeedKph: 0.0,
  cameraMode: 'THIRD_PERSON',
  activeChunkIds: [],
  loadedChunkCount: 0,
  performance: {
    fps: 60,
    frameTimeMs: 16.6,
    drawCalls: 0,
    triangles: 0,
    activeColliders: 0,
  },
  isWebGLSupported: true,
  webGLErrorMessage: null,
  bellRinging: false,
  statusMessage: 'Ready — Dhamrai Rathkhola Stand',
  npcPositions: [],
  isAudioMuted: false,
  gameClockLabel: '08:24',
  weatherLabel: 'Clear',
  dayPhase: 'day',
  staminaPercent: 100,
  damagePercent: 0,
  tirePressurePercent: 100,
  isPunctured: false,
  sprintBlocked: false,
  economyPrompt: '',
  policeHeat: 0,
  activeFineMinorUnits: 0,
  policeStopActive: false,
  objectiveBearingDeg: 0,
  objectiveDistanceM: 0,
  hasActiveObjective: false,

  setPlayerPosition: (pos) => set({ playerPosition: pos }),
  setPlayerHeading: (heading) => set({ playerHeading: heading }),
  setIsInVehicle: (inVehicle) => set({ isInVehicle: inVehicle }),
  setVehicleSpeedKph: (speed) => set({ vehicleSpeedKph: speed }),
  setCameraMode: (mode) => set({ cameraMode: mode }),
  toggleCameraMode: () =>
    set((s) => ({
      cameraMode: s.cameraMode === 'FIRST_PERSON' ? 'THIRD_PERSON' : 'FIRST_PERSON',
    })),
  setActiveChunkIds: (chunkIds) => set({ activeChunkIds: chunkIds }),
  setLoadedChunkCount: (count) => set({ loadedChunkCount: count }),
  setPerformanceStats: (stats) =>
    set((s) => ({ performance: { ...s.performance, ...stats } })),
  setWebGLSupport: (supported, error = null) =>
    set({ isWebGLSupported: supported, webGLErrorMessage: error }),
  triggerBell: () => {
    set({ bellRinging: true });
    setTimeout(() => set({ bellRinging: false }), 400);
  },
  setStatusMessage: (msg) => set({ statusMessage: msg }),
  setNpcPositions: (positions) => set({ npcPositions: positions }),
  setIsAudioMuted: (muted) => set({ isAudioMuted: muted }),
  setAtmosphereHud: (clock, weather, phase) =>
    set({ gameClockLabel: clock, weatherLabel: weather, dayPhase: phase }),
  setConditionHud: (stats) =>
    set({
      staminaPercent: stats.staminaPercent,
      damagePercent: stats.damagePercent,
      tirePressurePercent: stats.tirePressurePercent,
      isPunctured: stats.isPunctured,
      sprintBlocked: stats.sprintBlocked,
      economyPrompt: stats.economyPrompt ?? '',
    }),
  setCivicHud: (stats) =>
    set({
      policeHeat: stats.policeHeat,
      activeFineMinorUnits: stats.activeFineMinorUnits,
      policeStopActive: stats.policeStopActive,
    }),
  setWayfindingHud: (stats) =>
    set({
      objectiveBearingDeg: stats.objectiveBearingDeg,
      objectiveDistanceM: stats.objectiveDistanceM,
      hasActiveObjective: stats.hasActiveObjective,
    }),
}));
