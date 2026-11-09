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

describe('Milestone 8 — Cloud Save Service & Lease Client', () => {
  let cloudService: CloudSaveService;
  let orchestrator: SaveOrchestrator;
  let engine: GameCoreEngine;

  const mockUser = {
    id: 'usr_test_789',
    googleSub: 'sub_9988',
    email: 'cloud_driver@dhamrai.test',
    name: 'Shakil Mia',
  };

  beforeEach(async () => {
    vi.useFakeTimers();

    // Setup in-memory orchestrator and engine
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
    useAuthStore.getState().login('mock_valid_token_xyz', mockUser);

    cloudService = new CloudSaveService();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('debounces rapid save events into a single coalesced background sync', async () => {
    const performSyncSpy = vi
      .spyOn(cloudService, 'performSync')
      .mockResolvedValue(undefined);

    // Trigger 3 rapid saves within 1 second
    cloudService.scheduleSync('Autosave', 3000);
    vi.advanceTimersByTime(500);
    cloudService.scheduleSync('Autosave', 3000);
    vi.advanceTimersByTime(500);
    cloudService.scheduleSync('Autosave', 3000);

    expect(performSyncSpy).not.toHaveBeenCalled();
    expect(useAuthStore.getState().syncStatus).toBe('PENDING_UPLOAD');

    // Advance beyond the 3000ms debounce threshold
    vi.advanceTimersByTime(3100);

    expect(performSyncSpy).toHaveBeenCalledTimes(1);
    expect(performSyncSpy).toHaveBeenCalledWith('Autosave');
  });

  it('acquires lease and uploads local save envelope when no remote save exists', async () => {
    // Mock fetch for GET (remote not found), POST /lease (granted), PUT (uploaded)
    global.fetch = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
      const u = String(url);
      if (u.includes('/api/cloud-save?slotName=')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            found: false,
            fileName: 'save.json',
            save: null,
          }),
        };
      }
      if (u.includes('/api/cloud-save/lease')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            slotName: 'Autosave',
            leaseToken: 'lease_token_123',
            acquiredAtMs: Date.now(),
            expiresAtMs: Date.now() + 30000,
          }),
        };
      }
      if (u.includes('/api/cloud-save') && init?.method === 'PUT') {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            version: 'ver_uuid_999',
            checksumSha256: 'a1b2c3d4e5f6',
            modifiedTime: new Date().toISOString(),
          }),
        };
      }
      return { ok: false, status: 404, json: async () => ({}) };
    });

    await cloudService.performSync('Autosave');

    expect(useAuthStore.getState().syncStatus).toBe('SYNCED');
    expect(useAuthStore.getState().lastSyncedAtIso).not.toBeNull();
    expect(useAuthStore.getState().cloudMetadata?.version).toBe('ver_uuid_999');
  });

  it('sets LOCKED_BY_OTHER_TAB status when lease returns 409 Conflict', async () => {
    global.fetch = vi.fn().mockImplementation(async (url: string) => {
      const u = String(url);
      if (u.includes('/api/cloud-save?slotName=')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ found: false, save: null }),
        };
      }
      if (u.includes('/api/cloud-save/lease')) {
        return {
          ok: false,
          status: 409,
          json: async () => ({
            message: 'Lease currently held by another active session',
          }),
        };
      }
      return { ok: false, status: 500, json: async () => ({}) };
    });

    await cloudService.performSync('Autosave');

    expect(useAuthStore.getState().syncStatus).toBe('LOCKED_BY_OTHER_TAB');
  });

  it('transitions to SYNC_ERROR on network drops and schedules backoff retry', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network request failed'));

    await cloudService.performSync('Autosave');

    expect(useAuthStore.getState().syncStatus).toBe('SYNC_ERROR');
    expect(useAuthStore.getState().errorMessage).toContain('Network request failed');
  });
});
