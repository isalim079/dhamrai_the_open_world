/**
 * Tests for Central AudioManager & Web Audio Lifecycle
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AudioManager, getActiveAudioManager } from '../src/audio/AudioManager.js';

function createMockAudioParam(initialValue = 1.0) {
  return {
    value: initialValue,
    setValueAtTime: vi.fn(function (val: number) {
      this.value = val;
    }),
    setTargetAtTime: vi.fn(function (val: number) {
      this.value = val;
    }),
    linearRampToValueAtTime: vi.fn(function (val: number) {
      this.value = val;
    }),
    exponentialRampToValueAtTime: vi.fn(function (val: number) {
      this.value = val;
    }),
  };
}

class MockAudioContext {
  public state = 'suspended';
  public currentTime = 0;
  public sampleRate = 44100;
  public destination = {};
  public listener = {
    positionX: createMockAudioParam(0),
    positionY: createMockAudioParam(0),
    positionZ: createMockAudioParam(0),
    forwardX: createMockAudioParam(0),
    forwardY: createMockAudioParam(0),
    forwardZ: createMockAudioParam(-1),
    upX: createMockAudioParam(0),
    upY: createMockAudioParam(1),
    upZ: createMockAudioParam(0),
    setPosition: vi.fn(),
    setOrientation: vi.fn(),
  };

  createGain() {
    return {
      gain: createMockAudioParam(1.0),
      connect: vi.fn(),
      disconnect: vi.fn(),
    };
  }

  createOscillator() {
    return {
      type: 'sine',
      frequency: createMockAudioParam(440),
      connect: vi.fn(),
      disconnect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      onended: null,
    };
  }

  createBiquadFilter() {
    return {
      type: 'lowpass',
      frequency: createMockAudioParam(350),
      Q: createMockAudioParam(1.0),
      connect: vi.fn(),
      disconnect: vi.fn(),
    };
  }

  createPanner() {
    return {
      panningModel: 'HRTF',
      distanceModel: 'linear',
      refDistance: 10,
      maxDistance: 50,
      rolloffFactor: 1,
      positionX: createMockAudioParam(0),
      positionY: createMockAudioParam(0),
      positionZ: createMockAudioParam(0),
      connect: vi.fn(),
      disconnect: vi.fn(),
      setPosition: vi.fn(),
    };
  }

  createBuffer(channels: number, length: number, sampleRate: number) {
    return {
      numberOfChannels: channels,
      length,
      sampleRate,
      getChannelData: () => new Float32Array(length),
    };
  }

  createBufferSource() {
    return {
      buffer: null,
      loop: false,
      connect: vi.fn(),
      disconnect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      onended: null,
    };
  }

  async resume() {
    this.state = 'running';
  }

  async suspend() {
    this.state = 'suspended';
  }

  async close() {
    this.state = 'closed';
  }
}

describe('AudioManager Web Audio Coordinator', () => {
  let originalWindow: any;
  let mockStorage: Map<string, string>;

  beforeEach(() => {
    mockStorage = new Map();
    originalWindow = global.window;

    const mockWindow: any = {
      AudioContext: MockAudioContext,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      localStorage: {
        getItem: (k: string) => mockStorage.get(k) || null,
        setItem: (k: string, v: string) => mockStorage.set(k, v),
        removeItem: (k: string) => mockStorage.delete(k),
        clear: () => mockStorage.clear(),
      },
    };

    global.window = mockWindow;
    global.localStorage = mockWindow.localStorage;
    (global as any).document = {
      hidden: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
  });

  afterEach(() => {
    const mgr = getActiveAudioManager();
    if (mgr) mgr.dispose();
    global.window = originalWindow;
  });

  it('initializes successfully with master/sfx/ambience buses and default settings', () => {
    const manager = new AudioManager();
    expect(manager.isSupported).toBe(true);
    expect(manager.ctx).toBeDefined();
    expect(manager.masterGain).toBeDefined();
    expect(manager.sfxGain).toBeDefined();
    expect(manager.ambienceGain).toBeDefined();
    expect(manager.settings.masterVolume).toBe(0.8);
    expect(manager.settings.sfxVolume).toBe(0.8);
    expect(manager.settings.ambienceVolume).toBe(0.6);
    expect(manager.settings.isMuted).toBe(false);
  });

  it('manages autoplay unlocking on simulated user interaction', async () => {
    const manager = new AudioManager();
    expect(manager.ctx?.state).toBe('suspended');
    expect(manager.isUnlocked).toBe(false);

    // Simulate user interaction
    await manager.ctx?.resume();
    expect(manager.ctx?.state).toBe('running');
  });

  it('toggles mute correctly and adjusts effective master gain', () => {
    const manager = new AudioManager();
    expect(manager.settings.isMuted).toBe(false);
    expect(manager.masterGain?.gain.value).toBe(0.8);

    // Mute
    manager.toggleMute();
    expect(manager.settings.isMuted).toBe(true);
    expect(manager.masterGain?.gain.value).toBe(0.0);

    // Unmute
    manager.toggleMute();
    expect(manager.settings.isMuted).toBe(false);
    expect(manager.masterGain?.gain.value).toBe(0.8);
  });

  it('persists and restores client audio settings from localStorage', () => {
    const mgr1 = new AudioManager();
    mgr1.setMasterVolume(0.5);
    mgr1.setSfxVolume(0.65);
    mgr1.setAmbienceVolume(0.4);
    mgr1.setMuted(true);

    const raw = mockStorage.get('dhamrai_audio_settings_v1');
    expect(raw).toBeDefined();
    const parsed = JSON.parse(raw!);
    expect(parsed.masterVolume).toBe(0.5);
    expect(parsed.isMuted).toBe(true);

    mgr1.dispose();

    // Spawn new manager instance, should read from localStorage
    const mgr2 = new AudioManager();
    expect(mgr2.settings.masterVolume).toBe(0.5);
    expect(mgr2.settings.sfxVolume).toBe(0.65);
    expect(mgr2.settings.ambienceVolume).toBe(0.4);
    expect(mgr2.settings.isMuted).toBe(true);
    mgr2.dispose();
  });

  it('safely handles corrupted or malformed localStorage content without throwing', () => {
    mockStorage.set('dhamrai_audio_settings_v1', '{ invalid json... }');
    const manager = new AudioManager();
    expect(manager.settings.masterVolume).toBe(0.8); // Default fallback
    expect(manager.settings.isMuted).toBe(false);
    manager.dispose();
  });

  it('gracefully degrades when Web Audio API is unsupported', () => {
    // Delete AudioContext from window
    delete (global.window as any).AudioContext;
    delete (global.window as any).webkitAudioContext;

    const manager = new AudioManager();
    expect(manager.isSupported).toBe(false);
    expect(manager.ctx).toBeNull();

    // Calling methods should not crash
    expect(() => manager.setMasterVolume(0.5)).not.toThrow();
    expect(() => manager.toggleMute()).not.toThrow();
    expect(() => manager.updateListener({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: -1 })).not.toThrow();
    expect(() => manager.dispose()).not.toThrow();
  });

  it('updates 3D listener position and orientation vectors correctly', () => {
    const manager = new AudioManager();
    manager.ctx!.state = 'running';

    manager.updateListener(
      { x: 10, y: 2, z: -15 },
      { x: 0, y: 0, z: -1 },
      { x: 0, y: 1, z: 0 }
    );

    const listener = manager.ctx!.listener;
    expect(listener.positionX.setTargetAtTime).toHaveBeenCalledWith(10, expect.any(Number), 0.05);
    expect(listener.positionY.setTargetAtTime).toHaveBeenCalledWith(2, expect.any(Number), 0.05);
    expect(listener.positionZ.setTargetAtTime).toHaveBeenCalledWith(-15, expect.any(Number), 0.05);
  });
});
