/**
 * Dhamrai Life — Central Web Audio Manager
 * =========================================
 * Manages the browser-native AudioContext lifecycle, gain bus hierarchy,
 * browser autoplay activation, 3D listener orientation, client-side volume persistence,
 * and graceful fallback when audio hardware or Web Audio API is unavailable.
 *
 * Guaranteed:
 * - 100% native browser Web Audio API (0 external npm dependencies).
 * - Client settings stored in localStorage (0 SaveEnvelopeV2 mutation).
 * - Offloads synthesis to dedicated browser audio thread (preserves 60 FPS).
 */

import { RickshawAudio } from './RickshawAudio.js';
import { LocomotionAudio } from './LocomotionAudio.js';
import { AmbientSoundscape } from './AmbientSoundscape.js';
import { UIAudio } from './UIAudio.js';
import { clamp } from './SynthesizerUtils.js';

export interface AudioSettings {
  masterVolume: number;
  sfxVolume: number;
  ambienceVolume: number;
  isMuted: boolean;
}

const STORAGE_KEY = 'dhamrai_audio_settings_v1';

const DEFAULT_SETTINGS: AudioSettings = {
  masterVolume: 0.8,
  sfxVolume: 0.8,
  ambienceVolume: 0.6,
  isMuted: false,
};

let activeAudioManagerInstance: AudioManager | null = null;

export function getActiveAudioManager(): AudioManager | null {
  return activeAudioManagerInstance;
}

export class AudioManager {
  public ctx: AudioContext | null = null;
  public isSupported = false;
  public isUnlocked = false;

  // Master Gain Buses
  public masterGain: GainNode | null = null;
  public sfxGain: GainNode | null = null;
  public ambienceGain: GainNode | null = null;

  // Subsystems
  public readonly rickshaw: RickshawAudio = new RickshawAudio();
  public readonly locomotion: LocomotionAudio = new LocomotionAudio();
  public readonly ambience: AmbientSoundscape = new AmbientSoundscape();
  public readonly ui: UIAudio = new UIAudio();

  // Settings
  public settings: AudioSettings = { ...DEFAULT_SETTINGS };

  // Listener cleanup tracking
  private onUserInteractionBound = this.onUserInteraction.bind(this);
  private onVisibilityChangeBound = this.onVisibilityChange.bind(this);
  private wasRunningBeforeHide = false;

  constructor() {
    activeAudioManagerInstance = this;
    this.loadSettings();

    // 1. Detect Web Audio API capability safely
    if (typeof window !== 'undefined') {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        try {
          this.ctx = new AudioCtxClass();
          this.isSupported = true;
          this.setupGainHierarchy();
          this.setupAutoplayUnlocking();
          this.setupVisibilityHandling();

          // Initialize subsystems
          if (this.ctx && this.sfxGain && this.ambienceGain) {
            this.rickshaw.init(this.ctx, this.sfxGain);
            this.locomotion.init(this.ctx, this.sfxGain);
            this.ambience.init(this.ctx, this.ambienceGain);
            this.ui.init(this.ctx, this.sfxGain);
          }
        } catch (err) {
          console.warn('AudioManager: Web Audio initialization failed; falling back to silent mode:', err);
          this.isSupported = false;
        }
      }
    }

    // Expose development diagnostics hook strictly gated behind import.meta.env.DEV
    if (import.meta.env.DEV && typeof window !== 'undefined') {
      (window as any).__dhamrai_audio = this;
    }
  }

  /**
   * Constructs the master gain routing tree:
   * [SFX Nodes]      --> sfxGain      \
   * [Ambience Nodes] --> ambienceGain - --> masterGain --> ctx.destination
   */
  private setupGainHierarchy(): void {
    if (!this.ctx) return;

    try {
      this.masterGain = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();
      this.ambienceGain = this.ctx.createGain();

      this.sfxGain.connect(this.masterGain);
      this.ambienceGain.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);

      this.applySettingsToGains();
    } catch (err) {
      console.warn('AudioManager: Failed to construct gain hierarchy:', err);
    }
  }

  /**
   * Complies with browser autoplay policy: listens for first user gesture to resume context.
   */
  private setupAutoplayUnlocking(): void {
    if (typeof window === 'undefined' || !this.ctx) return;

    if (this.ctx.state === 'running') {
      this.isUnlocked = true;
      return;
    }

    const events = ['pointerdown', 'keydown', 'click', 'touchstart'];
    for (const evt of events) {
      window.addEventListener(evt, this.onUserInteractionBound, { once: true, passive: true });
    }
  }

  private onUserInteraction(): void {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().then(() => {
        this.isUnlocked = true;
      }).catch(() => {});
    } else {
      this.isUnlocked = true;
    }

    // Remove any remaining listeners
    const events = ['pointerdown', 'keydown', 'click', 'touchstart'];
    for (const evt of events) {
      window.removeEventListener(evt, this.onUserInteractionBound);
    }
  }

  /**
   * Suspends/resumes audio playback when the browser tab loses/gains focus.
   */
  private setupVisibilityHandling(): void {
    if (typeof document === 'undefined') return;
    document.addEventListener('visibilitychange', this.onVisibilityChangeBound);
  }

  private onVisibilityChange(): void {
    if (!this.ctx) return;

    if (document.hidden) {
      if (this.ctx.state === 'running') {
        this.wasRunningBeforeHide = true;
        this.ctx.suspend().catch(() => {});
      }
    } else {
      if (this.wasRunningBeforeHide && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
        this.wasRunningBeforeHide = false;
      }
    }
  }

  /**
   * Synchronizes the 3D AudioListener with Three.js camera position and orientation.
   */
  public updateListener(
    cameraPos: { x: number; y: number; z: number },
    forwardVec: { x: number; y: number; z: number },
    upVec: { x: number; y: number; z: number } = { x: 0, y: 1, z: 0 }
  ): void {
    if (!this.ctx || this.ctx.state !== 'running') return;

    try {
      const listener = this.ctx.listener;
      const now = this.ctx.currentTime;

      // Modern AudioListener API with AudioParam smoothing
      if (listener.positionX) {
        listener.positionX.setTargetAtTime(cameraPos.x, now, 0.05);
        listener.positionY.setTargetAtTime(cameraPos.y, now, 0.05);
        listener.positionZ.setTargetAtTime(cameraPos.z, now, 0.05);

        listener.forwardX.setTargetAtTime(forwardVec.x, now, 0.05);
        listener.forwardY.setTargetAtTime(forwardVec.y, now, 0.05);
        listener.forwardZ.setTargetAtTime(forwardVec.z, now, 0.05);

        listener.upX.setTargetAtTime(upVec.x, now, 0.05);
        listener.upY.setTargetAtTime(upVec.y, now, 0.05);
        listener.upZ.setTargetAtTime(upVec.z, now, 0.05);
      } else {
        // Fallback for legacy WebKit/Safari
        listener.setPosition(cameraPos.x, cameraPos.y, cameraPos.z);
        listener.setOrientation(
          forwardVec.x,
          forwardVec.y,
          forwardVec.z,
          upVec.x,
          upVec.y,
          upVec.z
        );
      }
    } catch {}
  }

  /**
   * Applies current settings (master, sfx, ambience, mute) to gain nodes.
   */
  public applySettingsToGains(): void {
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const effectiveMaster = this.settings.isMuted ? 0.0 : this.settings.masterVolume;

    if (this.masterGain) {
      this.masterGain.gain.setValueAtTime(effectiveMaster, now);
    }
    if (this.sfxGain) {
      this.sfxGain.gain.setValueAtTime(this.settings.sfxVolume, now);
    }
    if (this.ambienceGain) {
      this.ambienceGain.gain.setValueAtTime(this.settings.ambienceVolume, now);
    }
  }

  // --- Volume Settings Controls ---

  public setMasterVolume(v: number): void {
    this.settings.masterVolume = clamp(v, 0.0, 1.0);
    this.applySettingsToGains();
    this.saveSettings();
  }

  public setSfxVolume(v: number): void {
    this.settings.sfxVolume = clamp(v, 0.0, 1.0);
    this.applySettingsToGains();
    this.saveSettings();
  }

  public setAmbienceVolume(v: number): void {
    this.settings.ambienceVolume = clamp(v, 0.0, 1.0);
    this.applySettingsToGains();
    this.saveSettings();
  }

  public setMuted(muted: boolean): void {
    this.settings.isMuted = muted;
    this.applySettingsToGains();
    this.saveSettings();
  }

  public toggleMute(): boolean {
    this.setMuted(!this.settings.isMuted);
    return this.settings.isMuted;
  }

  // --- LocalStorage Persistence (Client Only) ---

  private loadSettings(): void {
    if (typeof localStorage === 'undefined') return;

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;

      const parsed = JSON.parse(raw);
      if (typeof parsed === 'object' && parsed !== null) {
        if (typeof parsed.masterVolume === 'number') {
          this.settings.masterVolume = clamp(parsed.masterVolume, 0.0, 1.0);
        }
        if (typeof parsed.sfxVolume === 'number') {
          this.settings.sfxVolume = clamp(parsed.sfxVolume, 0.0, 1.0);
        }
        if (typeof parsed.ambienceVolume === 'number') {
          this.settings.ambienceVolume = clamp(parsed.ambienceVolume, 0.0, 1.0);
        }
        if (typeof parsed.isMuted === 'boolean') {
          this.settings.isMuted = parsed.isMuted;
        }
      }
    } catch {
      // Malformed json in localStorage -> safely fallback to defaults
      this.settings = { ...DEFAULT_SETTINGS };
    }
  }

  private saveSettings(): void {
    if (typeof localStorage === 'undefined') return;

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
    } catch {}
  }

  /**
   * Disposes the AudioContext, all child subsystems, and detaches event listeners.
   */
  public dispose(): void {
    if (typeof window !== 'undefined') {
      const events = ['pointerdown', 'keydown', 'click', 'touchstart'];
      for (const evt of events) {
        window.removeEventListener(evt, this.onUserInteractionBound);
      }
    }
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.onVisibilityChangeBound);
    }

    this.rickshaw.dispose();
    this.locomotion.dispose();
    this.ambience.dispose();
    this.ui.dispose();

    if (this.masterGain) {
      try {
        this.masterGain.disconnect();
      } catch {}
      this.masterGain = null;
    }
    if (this.sfxGain) {
      try {
        this.sfxGain.disconnect();
      } catch {}
      this.sfxGain = null;
    }
    if (this.ambienceGain) {
      try {
        this.ambienceGain.disconnect();
      } catch {}
      this.ambienceGain = null;
    }

    if (this.ctx) {
      try {
        this.ctx.close();
      } catch {}
      this.ctx = null;
    }

    this.isSupported = false;
    this.isUnlocked = false;
    if (activeAudioManagerInstance === this) {
      activeAudioManagerInstance = null;
    }
  }
}
