/**
 * Tests for Locomotion Audio Subsystem (Footsteps, Cadences, Vehicle Suppression)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LocomotionAudio } from '../src/audio/LocomotionAudio.js';

class MockAudioContext {
  public state = 'running';
  public currentTime = 1.0;
  public sampleRate = 44100;
  public createdOscillators: any[] = [];

  createGain() {
    return {
      gain: {
        value: 1.0,
        setValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
      disconnect: vi.fn(),
    };
  }

  createOscillator() {
    const osc = {
      type: 'sine',
      frequency: {
        value: 100,
        setValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
      disconnect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      onended: null as any,
    };
    this.createdOscillators.push(osc);
    return osc;
  }

  createBiquadFilter() {
    return {
      type: 'bandpass',
      frequency: { setValueAtTime: vi.fn() },
      Q: { setValueAtTime: vi.fn() },
      connect: vi.fn(),
      disconnect: vi.fn(),
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
      connect: vi.fn(),
      disconnect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      onended: null as any,
    };
  }
}

describe('LocomotionAudio', () => {
  let mockCtx: MockAudioContext;
  let mockSfxBus: any;
  let locomotionAudio: LocomotionAudio;

  beforeEach(() => {
    mockCtx = new MockAudioContext();
    mockSfxBus = { connect: vi.fn(), disconnect: vi.fn() };
    locomotionAudio = new LocomotionAudio();
    locomotionAudio.init(mockCtx as any, mockSfxBus);
  });

  afterEach(() => {
    locomotionAudio.dispose();
  });

  it('suppresses footsteps while stationary on foot', () => {
    mockCtx.createdOscillators = [];
    for (let i = 0; i < 60; i++) {
      mockCtx.currentTime += 0.016;
      locomotionAudio.update(0.016, 0.0, false, false);
    }
    expect(mockCtx.createdOscillators.length).toBe(0);
  });

  it('suppresses footsteps while mounted in cycle rickshaw even if moving', () => {
    mockCtx.createdOscillators = [];
    for (let i = 0; i < 60; i++) {
      mockCtx.currentTime += 0.016;
      locomotionAudio.update(0.016, 4.0, false, true); // isInVehicle = true
    }
    expect(mockCtx.createdOscillators.length).toBe(0);
  });

  it('triggers footsteps at ~2.0 Hz walking cadence on foot', () => {
    mockCtx.createdOscillators = [];
    // 1 second of walking: ~2 footsteps expected
    for (let i = 0; i < 60; i++) {
      mockCtx.currentTime += 0.016;
      locomotionAudio.update(0.016, 1.4, false, false);
    }
    expect(mockCtx.createdOscillators.length).toBeGreaterThanOrEqual(1);
    expect(mockCtx.createdOscillators.length).toBeLessThanOrEqual(3);
  });

  it('triggers footsteps at ~3.2 Hz sprinting cadence on foot', () => {
    mockCtx.createdOscillators = [];
    // 1 second of sprinting: ~3-4 footsteps expected
    for (let i = 0; i < 60; i++) {
      mockCtx.currentTime += 0.016;
      locomotionAudio.update(0.016, 3.2, true, false);
    }
    expect(mockCtx.createdOscillators.length).toBeGreaterThanOrEqual(3);
    expect(mockCtx.createdOscillators.length).toBeLessThanOrEqual(4);
  });
});
