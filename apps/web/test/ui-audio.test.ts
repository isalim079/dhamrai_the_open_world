/**
 * Tests for UI & Quest Audio Subsystem
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UIAudio } from '../src/audio/UIAudio.js';

function createMockAudioParam(initialValue = 1.0) {
  return {
    value: initialValue,
    setValueAtTime: vi.fn(function (val: number) {
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
  public createdOscillators: any[] = [];

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
}

describe('UIAudio', () => {
  let mockCtx: MockAudioContext;
  let mockSfxBus: any;
  let uiAudio: UIAudio;

  beforeEach(() => {
    mockCtx = new MockAudioContext();
    mockSfxBus = { connect: vi.fn(), disconnect: vi.fn() };
    uiAudio = new UIAudio();
    uiAudio.init(mockCtx as any, mockSfxBus);
  });

  afterEach(() => {
    uiAudio.dispose();
  });

  it('triggers dialogue click tone', () => {
    mockCtx.createdOscillators = [];
    uiAudio.playDialogueClick();
    expect(mockCtx.createdOscillators.length).toBe(1);
    expect(mockCtx.createdOscillators[0]?.type).toBe('triangle');
  });

  it('triggers rising two-note chime on mission accept', () => {
    mockCtx.createdOscillators = [];
    uiAudio.playMissionAccept();
    expect(mockCtx.createdOscillators.length).toBe(2);
    expect(mockCtx.createdOscillators[0]?.frequency.value).toBeCloseTo(523.25, 1);
    expect(mockCtx.createdOscillators[1]?.frequency.value).toBeCloseTo(659.25, 1);
  });

  it('triggers three-note celebratory fanfare on mission complete', () => {
    mockCtx.createdOscillators = [];
    uiAudio.playMissionComplete();
    expect(mockCtx.createdOscillators.length).toBe(3);
    expect(mockCtx.createdOscillators[0]?.frequency.value).toBeCloseTo(523.25, 1);
    expect(mockCtx.createdOscillators[1]?.frequency.value).toBeCloseTo(659.25, 1);
    expect(mockCtx.createdOscillators[2]?.frequency.value).toBeCloseTo(783.99, 1);
  });

  it('triggers metallic coin rattle on fare payout', () => {
    mockCtx.createdOscillators = [];
    uiAudio.playCoinPayout();
    expect(mockCtx.createdOscillators.length).toBe(2);
    expect(mockCtx.createdOscillators[0]?.frequency.setValueAtTime).toHaveBeenCalledWith(3400, expect.any(Number));
    expect(mockCtx.createdOscillators[1]?.frequency.setValueAtTime).toHaveBeenCalledWith(4200, expect.any(Number));
  });
});
