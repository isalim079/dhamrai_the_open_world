import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CloudSaveService } from '../src/services/CloudSaveService.js';
import { useAuthStore } from '../src/state/useAuthStore.js';
import { useGameStore } from '../src/state/useGameStore.js';
import { GameCoreEngine } from '@dhamrai/game-core';
import {
  SaveOrchestrator,
  MemoryStorageAdapter,
  attachChecksum,
} from '@dhamrai/save-core';
import type { SaveEnvelopeV2 } from '@dhamrai/shared-contracts';

describe('Milestone 8 — Deterministic Conflict Resolution', () => {
  let cloudService: CloudSaveService;
  let orchestrator: SaveOrchestrator;
  let engine: GameCoreEngine;

  const mockUser = {
    id: 'usr_test_conflict',
    googleSub: 'sub_conflict',
    email: 'conflict@dhamrai.test',
    name: 'Conflict Tester',
  };

  beforeEach(async () => {
    orchestrator = new SaveOrchestrator(new MemoryStorageAdapter());
    await orchestrator.init();
    engine = GameCoreEngine.createNewGame();
    await orchestrator.saveEngine('Autosave', engine);

    useGameStore.setState({
      orchestrator,
      engine,
      isInitialized: true,
    });

    useAuthStore.getState().logout();
    useAuthStore.getState().login('mock_token_conflict', mockUser);

    cloudService = new CloudSaveService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('performs clean no-op fast-forward when checksums are identical', async () => {
    const localEnvelope = await orchestrator.loadSave('Autosave');

    let putCalled = false;
    global.fetch = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
      const u = String(url);
      if (u.includes('/api/cloud-save?slotName=')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            found: true,
            fileName: 'save_usr_test.json',
            save: localEnvelope, // exact identical save
            version: 'ver_identical_001',
            checksumSha256: localEnvelope.checksumSha256,
          }),
        };
      }
      if (init?.method === 'PUT') {
        putCalled = true;
      }
      return { ok: true, status: 200, json: async () => ({}) };
    });

    await cloudService.performSync('Autosave');

    expect(useAuthStore.getState().syncStatus).toBe('SYNCED');
    expect(putCalled).toBe(false); // Zero network upload for identical content
  });

  it('triggers interactive CONFLICT modal when remote save is newer', async () => {
    const localEnvelope = await orchestrator.loadSave('Autosave');

    // Create a divergent remote save with newer timestamp and different cash
    const remoteEnvelope = await attachChecksum({
      ...localEnvelope,
      saveId: 'save_remote_divergent',
      updatedAtIso: new Date(Date.now() + 60000).toISOString(), // 1 min in future
      player: {
        ...localEnvelope.player,
        cashMinorUnits: 35000, // ৳350.00
        reputation: 25,
      },
    });

    // Spy downloadCloudSave to return remoteEnvelope with matching integrity
    vi.spyOn(cloudService, 'downloadCloudSave').mockResolvedValue({
      found: true,
      fileName: 'save_remote.json',
      save: remoteEnvelope,
      version: 'ver_remote_newer_99',
      checksumSha256: remoteEnvelope.checksumSha256,
    });

    await cloudService.performSync('Autosave');

    const authState = useAuthStore.getState();
    expect(authState.syncStatus).toBe('CONFLICT');
    expect(authState.isConflictModalOpen).toBe(true);
    expect(authState.conflictData).not.toBeNull();
    expect(authState.conflictData?.local.player.cashMinorUnits).toBe(localEnvelope.player.cashMinorUnits);
    expect(authState.conflictData?.remote.player.cashMinorUnits).toBe(35000);
  });

  it('resolves conflict with KEEP_CLOUD by hydrating local engine from remote save', async () => {
    const localEnvelope = await orchestrator.loadSave('Autosave');

    const remoteEnvelope = await attachChecksum({
      ...localEnvelope,
      saveId: 'save_remote_winner',
      updatedAtIso: new Date(Date.now() + 60000).toISOString(),
      player: {
        ...localEnvelope.player,
        cashMinorUnits: 42000, // ৳420.00
        reputation: 30,
      },
    });

    useAuthStore.getState().setConflictData({
      local: localEnvelope,
      remote: remoteEnvelope,
    });

    expect(useAuthStore.getState().isConflictModalOpen).toBe(true);

    await cloudService.resolveConflict('KEEP_CLOUD', 'Autosave');

    expect(useAuthStore.getState().syncStatus).toBe('SYNCED');
    expect(useAuthStore.getState().conflictData).toBeNull();
    expect(useAuthStore.getState().isConflictModalOpen).toBe(false);

    // Verify local orchestrator now has remote data
    const loaded = await orchestrator.loadSave('Autosave');
    expect(loaded.player.cashMinorUnits).toBe(42000);
    expect(loaded.player.reputation).toBe(30);
  });

  it('resolves conflict with KEEP_BOTH by archiving local save and loading cloud save', async () => {
    const localEnvelope = await orchestrator.loadSave('Autosave');

    const remoteEnvelope = await attachChecksum({
      ...localEnvelope,
      saveId: 'save_remote_both',
      updatedAtIso: new Date(Date.now() + 60000).toISOString(),
      player: {
        ...localEnvelope.player,
        cashMinorUnits: 55000,
        reputation: 40,
      },
    });

    useAuthStore.getState().setConflictData({
      local: localEnvelope,
      remote: remoteEnvelope,
    });

    await cloudService.resolveConflict('KEEP_BOTH', 'Autosave');

    expect(useAuthStore.getState().syncStatus).toBe('SYNCED');
    expect(useAuthStore.getState().conflictData).toBeNull();

    // Verify backup slot was created with local data
    const backup = await orchestrator.loadSave('Autosave_Backup');
    expect(backup.player.cashMinorUnits).toBe(localEnvelope.player.cashMinorUnits);

    // Verify main Autosave slot has remote data
    const main = await orchestrator.loadSave('Autosave');
    expect(main.player.cashMinorUnits).toBe(55000);
  });
});
