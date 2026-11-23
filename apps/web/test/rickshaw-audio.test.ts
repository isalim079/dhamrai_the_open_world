/**
 * Tests for Rickshaw Audio Subsystem (Bell, Rolling, Chain Cadence, Brake Squeal)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RickshawAudio } from '../src/audio/RickshawAudio.js';

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
  public state = 'running';
  public currentTime = 1.0;
  public sampleRate = 44100;
  public createdOscillators: any[] = [];
  public createdBufferSources: any[] = [];

  createGain() {
    return {
      gain: createMockAudioParam(1.0),
      connect: vi.fn(),
      disconnect: vi.fn(),
    };
  }

  createOscillator() {
    const osc = {
      type: 'sine',
      frequency: createMockAudioParam(440),
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
      type: 'lowpass',
      frequency: createMockAudioParam(350),
      Q: createMockAudioParam(1.0),
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
    const src = {
      buffer: null,
      loop: false,
      connect: vi.fn(),
      disconnect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      onended: null as any,
    };
    this.createdBufferSources.push(src);
    return src;
  }
}

describe('RickshawAudio', () => {
  let mockCtx: MockAudioContext;
  let mockSfxBus: any;
  let rickshawAudio: RickshawAudio;

  beforeEach(() => {
    mockCtx = new MockAudioContext();
    mockSfxBus = {
      connect: vi.fn(),
      disconnect: vi.fn(),
    };
    rickshawAudio = new RickshawAudio();
    rickshawAudio.init(mockCtx as any, mockSfxBus);
  });

  afterEach(() => {
    rickshawAudio.dispose();
  });

  it('initializes rolling sound source loop and connects to sfx bus', () => {
    expect(mockCtx.createdBufferSources.length).toBe(1);
    const source = mockCtx.createdBufferSources[0]!;
    expect(source.loop).toBe(true);
    expect(source.start).toHaveBeenCalled();
    expect(rickshawAudio.isRolling).toBe(true);
  });

  it('synthesizes dual-tone brass bell strike on triggerBell', () => {
    mockCtx.createdOscillators = [];
    rickshawAudio.triggerBell();

    // 2 strikes x 3 harmonics = 6 oscillators created
    expect(mockCtx.createdOscillators.length).toBe(6);

    const freqs = mockCtx.createdOscillators.map((o) => o.frequency.value);
    // Check that ~2400 Hz and ~2820 Hz bell frequencies are present
    expect(freqs).toContain(2400);
    expect(freqs).toContain(2820);

    for (const osc of mockCtx.createdOscillators) {
      expect(osc.start).toHaveBeenCalled();
      expect(osc.stop).toHaveBeenCalled();
    }
  });

  it('modulates wheel rolling noise based on vehicle speed and occupancy', () => {
    // 1. Stationary -> gain targets 0.0
    rickshawAudio.update(0.016, 0.0, true, false, false);

    // 2. Moving at 3.5 m/s (~12.6 km/h) -> active gain and higher filter cutoff
    rickshawAudio.update(0.016, 3.5, true, false, true);

    // 3. Dismounted while moving -> gain targets 0.0
    rickshawAudio.update(0.016, 3.5, false, false, false);
  });

  it('triggers mechanical chain clicks during active pedaling and movement', () => {
    mockCtx.createdOscillators = [];

    // Simulate 1 second of forward pedaling at 3.0 m/s
    for (let i = 0; i < 60; i++) {
      mockCtx.currentTime += 0.016;
      rickshawAudio.update(0.016, 3.0, true, false, true);
    }

    // Should have triggered multiple chain clicks (cadence ~4 Hz)
    expect(mockCtx.createdOscillators.length).toBeGreaterThan(2);
  });

  it('triggers brake squeal only when braking above 2.0 m/s with cooldown', () => {
    mockCtx.createdOscillators = [];

    // Braking at 1.0 m/s (below threshold) -> no squeal
    rickshawAudio.update(0.016, 1.0, true, true, false);
    expect(mockCtx.createdOscillators.length).toBe(0);

    // Braking at 3.5 m/s (above threshold) -> triggers squeal
    rickshawAudio.update(0.016, 3.5, true, true, false);
    expect(mockCtx.createdOscillators.length).toBe(1);

    // Braking again immediately (cooldown active) -> no new squeal
    rickshawAudio.update(0.016, 3.5, true, true, false);
    expect(mockCtx.createdOscillators.length).toBe(1);

    // Advance time past cooldown (1.5s)
    mockCtx.currentTime += 1.6;
    rickshawAudio.update(0.016, 3.5, true, true, false);
    expect(mockCtx.createdOscillators.length).toBe(2);
  });

  it('disposes rolling source and cleans up all audio nodes', () => {
    const source = mockCtx.createdBufferSources[0]!;
    rickshawAudio.dispose();
    expect(source.stop).toHaveBeenCalled();
    expect(source.disconnect).toHaveBeenCalled();
    expect(rickshawAudio.isRolling).toBe(false);
  });
});
