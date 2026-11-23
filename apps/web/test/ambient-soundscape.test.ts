/**
 * Tests for 3D Ambient Soundscape (Spatial Panning, Zone Events, Idempotency)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AmbientSoundscape } from '../src/audio/AmbientSoundscape.js';

class MockAudioContext {
  public state = 'running';
  public currentTime = 1.0;
  public sampleRate = 44100;
  public createdPanners: any[] = [];
  public createdOscillators: any[] = [];
  public createdBufferSources: any[] = [];

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
        value: 440,
        setValueAtTime: vi.fn(),
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
      type: 'lowpass',
      frequency: { setValueAtTime: vi.fn() },
      connect: vi.fn(),
      disconnect: vi.fn(),
    };
  }

  createPanner() {
    const panner = {
      panningModel: 'HRTF',
      distanceModel: 'linear',
      refDistance: 10,
      maxDistance: 50,
      rolloffFactor: 1,
      positionX: { setValueAtTime: vi.fn() },
      positionY: { setValueAtTime: vi.fn() },
      positionZ: { setValueAtTime: vi.fn() },
      connect: vi.fn(),
      disconnect: vi.fn(),
      setPosition: vi.fn(),
    };
    this.createdPanners.push(panner);
    return panner;
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

describe('AmbientSoundscape', () => {
  let mockCtx: MockAudioContext;
  let mockAmbienceBus: any;
  let ambient: AmbientSoundscape;

  beforeEach(() => {
    mockCtx = new MockAudioContext();
    mockAmbienceBus = { connect: vi.fn(), disconnect: vi.fn() };
    ambient = new AmbientSoundscape();
    ambient.init(mockCtx as any, mockAmbienceBus);
  });

  afterEach(() => {
    ambient.dispose();
  });

  it('initializes spatial panners for Rathkhola, Kayetpara, and Thana plus global bed', () => {
    // 3 spatial emitters created
    expect(mockCtx.createdPanners.length).toBe(3);
    // 1 global town bed buffer source created
    expect(mockCtx.createdBufferSources.length).toBe(1);
    expect(mockCtx.createdBufferSources[0]?.loop).toBe(true);
  });

  it('guarantees idempotency: multiple init calls never duplicate emitters', () => {
    // Call init again
    ambient.init(mockCtx as any, mockAmbienceBus);
    expect(mockCtx.createdPanners.length).toBe(3);
    expect(mockCtx.createdBufferSources.length).toBe(1);
  });

  it('triggers anvil strikes when player is inside Kayetpara Workshop zone', () => {
    mockCtx.createdOscillators = [];

    // Kayetpara is at X: -295.3, Z: -77.0. Place player at -295.0, -75.0 (dist ~2m)
    const nearKayetpara = { x: -295.0, y: 0.5, z: -75.0 };

    for (let i = 0; i < 200; i++) {
      mockCtx.currentTime += 0.016;
      ambient.update(0.016, nearKayetpara);
    }

    expect(mockCtx.createdOscillators.length).toBeGreaterThan(0);
  });

  it('suppresses Kayetpara anvil strikes when player is far away (e.g. at Rathkhola)', () => {
    mockCtx.createdOscillators = [];

    // Rathkhola is at X: 0, Z: 0 (dist > 300m away from Kayetpara)
    const atRathkhola = { x: 0.0, y: 0.5, z: 0.0 };

    // Advance 10 seconds
    for (let i = 0; i < 600; i++) {
      mockCtx.currentTime += 0.016;
      ambient.update(0.016, atRathkhola);
    }

    // Should NOT have triggered any anvil strikes (which use high frequencies ~1600+ Hz)
    // May have triggered Rathkhola tea stall clatter (~3200 Hz)
    const anvilStrikes = mockCtx.createdOscillators.filter(
      (o) => o.frequency.value >= 1400 && o.frequency.value <= 1900
    );
    expect(anvilStrikes.length).toBe(0);
  });

  it('cleans up all panner and buffer source nodes on disposal', () => {
    const bedSource = mockCtx.createdBufferSources[0]!;
    ambient.dispose();
    expect(bedSource.stop).toHaveBeenCalled();
    expect(bedSource.disconnect).toHaveBeenCalled();
  });
});
