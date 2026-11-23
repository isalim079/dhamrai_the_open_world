import { describe, it, expect } from 'vitest';
import {
  LANDMARK_DEFINITIONS,
  findDiscoverableLandmark,
  parseDiscoveredLandmarkIds,
  serializeDiscoveredLandmarkIds,
  distanceToLandmarkM,
} from '../src/landmarks.js';
import { GameCoreEngine } from '../src/engine.js';
import { PHASE_1_ANCHORS } from '@dhamrai/shared-contracts';

describe('Landmark discovery (M21)', () => {
  it('parses and serializes discovered ids', () => {
    expect(parseDiscoveredLandmarkIds('')).toEqual([]);
    expect(parseDiscoveredLandmarkIds('lm_a, lm_b')).toEqual(['lm_a', 'lm_b']);
    expect(serializeDiscoveredLandmarkIds(['lm_b', 'lm_a', 'lm_a'])).toBe('lm_a,lm_b');
  });

  it('catalog covers Phase 1 anchors', () => {
    expect(LANDMARK_DEFINITIONS.length).toBeGreaterThanOrEqual(8);
    expect(LANDMARK_DEFINITIONS.some((l) => l.id === 'lm_rathkhola')).toBe(true);
    expect(LANDMARK_DEFINITIONS.some((l) => l.id === 'lm_college')).toBe(true);
  });

  it('finds discoverable landmark within radius', () => {
    const near = findDiscoverableLandmark(PHASE_1_ANCHORS.RATHKHOLA_ORIGIN, new Set());
    expect(near?.id).toBe('lm_rathkhola');
    const far = findDiscoverableLandmark({ x: 5000, y: 0, z: 5000 }, new Set());
    expect(far).toBeNull();
    const already = findDiscoverableLandmark(
      PHASE_1_ANCHORS.RATHKHOLA_ORIGIN,
      new Set(['lm_rathkhola'])
    );
    expect(already).toBeNull();
  });

  it('engine discovers once and persists via worldFlags', () => {
    const engine = GameCoreEngine.createNewGame(1000);
    const first = engine.tryDiscoverLandmark(PHASE_1_ANCHORS.THANA_JUNCTION_CHECKPOINT);
    expect(first?.id).toBe('lm_thana');
    expect(engine.hasDiscoveredLandmark('lm_thana')).toBe(true);
    const again = engine.tryDiscoverLandmark(PHASE_1_ANCHORS.THANA_JUNCTION_CHECKPOINT);
    expect(again).toBeNull();

    const save = engine.toSaveEnvelope('m21', 'M21');
    expect(String(save.worldFlags.discoveredLandmarks)).toContain('lm_thana');
    const loaded = GameCoreEngine.fromSaveEnvelope(save);
    expect(loaded.hasDiscoveredLandmark('lm_thana')).toBe(true);
    expect(distanceToLandmarkM(PHASE_1_ANCHORS.THANA_JUNCTION_CHECKPOINT, first!)).toBeLessThan(1);
  });
});
