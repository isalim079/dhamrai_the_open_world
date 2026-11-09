import { useAuthStore } from '../state/useAuthStore.js';
import { useGameStore } from '../state/useGameStore.js';
import { verifySaveIntegrity } from '@dhamrai/save-core';
import type {
  SaveEnvelopeV2,
  SaveLeaseDto,
  CloudSaveSyncResult,
} from '@dhamrai/shared-contracts';

export type ConflictResolutionChoice = 'KEEP_CLOUD' | 'KEEP_LOCAL' | 'KEEP_BOTH';

export class CloudSaveService {
  private static _instance: CloudSaveService;
  private _debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private _retryTimer: ReturnType<typeof setTimeout> | null = null;
  private _retryCount = 0;
  private _maxRetries = 4;
  private _broadcastChannel: BroadcastChannel | null = null;
  private _isSyncInProgress = false;
  private _lastKnownRemoteVersion: string | null = null;

  public static getInstance(): CloudSaveService {
    if (!CloudSaveService._instance) {
      CloudSaveService._instance = new CloudSaveService();
    }
    return CloudSaveService._instance;
  }

  public get lastKnownRemoteVersion(): string | null {
    return this._lastKnownRemoteVersion;
  }

  constructor() {
    this._initNetworkListeners();
    this._initBroadcastChannel();
  }

  private _initNetworkListeners(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('online', () => {
      const auth = useAuthStore.getState();
      if (auth.isAuthenticated) {
        auth.setSyncStatus('SYNCING');
        this.performSync('Autosave').catch(console.warn);
      } else {
        auth.setSyncStatus('LOCAL_ONLY');
      }
    });

    window.addEventListener('offline', () => {
      useAuthStore.getState().setSyncStatus('OFFLINE');
    });
  }

  private _initBroadcastChannel(): void {
    if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') return;

    try {
      this._broadcastChannel = new BroadcastChannel('dhamrai_sync');
      this._broadcastChannel.onmessage = (event) => {
        if (event.data?.type === 'CLOUD_SAVE_COMMITTED') {
          const { version, slotName, checksumSha256 } = event.data;
          this._lastKnownRemoteVersion = version;
          const auth = useAuthStore.getState();
          if (auth.cloudMetadata && auth.cloudMetadata.slotName === slotName) {
            auth.setCloudMetadata({
              ...auth.cloudMetadata,
              version,
              checksumSha256,
              updatedAtIso: new Date().toISOString(),
            });
          }
        }
      };
    } catch (err) {
      console.warn('BroadcastChannel not supported in this environment:', err);
    }
  }

  /**
   * Acquires a lease lock from the backend PostgreSQL lease manager.
   */
  public async acquireLease(
    slotName: string,
    expectedVersion?: string,
    ttlMs?: number
  ): Promise<SaveLeaseDto> {
    const sessionToken = useAuthStore.getState().sessionToken;
    if (!sessionToken) {
      throw new Error('Cannot acquire save lease: unauthenticated.');
    }

    const response = await fetch('/api/cloud-save/lease', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionToken}`,
      },
      body: JSON.stringify({ slotName, expectedVersion, ttlMs }),
    });

    if (response.status === 409) {
      const err = await response.json().catch(() => ({}));
      useAuthStore.getState().setSyncStatus('LOCKED_BY_OTHER_TAB', err.message);
      throw new Error(err.message || 'Lease currently held by another session');
    }

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || `Failed to acquire lease: ${response.status}`);
    }

    return (await response.json()) as SaveLeaseDto;
  }

  /**
   * Uploads a validated SaveEnvelopeV2 to the Google Drive hidden appDataFolder via backend.
   */
  public async uploadCloudSave(
    envelope: SaveEnvelopeV2,
    leaseToken: string,
    expectedVersion?: string
  ): Promise<CloudSaveSyncResult> {
    const sessionToken = useAuthStore.getState().sessionToken;
    if (!sessionToken) {
      throw new Error('Cannot upload save: unauthenticated.');
    }

    // Client-side SHA-256 pre-verification
    await verifySaveIntegrity(envelope as unknown as Record<string, unknown>);

    const response = await fetch('/api/cloud-save', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionToken}`,
      },
      body: JSON.stringify({
        save: envelope,
        leaseToken,
        expectedVersion,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || `Upload failed with status ${response.status}`);
    }

    const result = (await response.json()) as CloudSaveSyncResult;
    this._lastKnownRemoteVersion = result.version;

    // Broadcast commit to other tabs
    if (this._broadcastChannel) {
      this._broadcastChannel.postMessage({
        type: 'CLOUD_SAVE_COMMITTED',
        version: result.version,
        slotName: envelope.slotName,
        checksumSha256: result.checksumSha256,
      });
    }

    return result;
  }

  /**
   * Fetches player save envelope from Google Drive hidden appDataFolder.
   */
  public async downloadCloudSave(slotName: string): Promise<{
    found: boolean;
    fileName: string;
    save: SaveEnvelopeV2 | null;
    version: string | null;
    checksumSha256: string | null;
  }> {
    const sessionToken = useAuthStore.getState().sessionToken;
    if (!sessionToken) {
      throw new Error('Cannot download cloud save: unauthenticated.');
    }

    const url = `/api/cloud-save?slotName=${encodeURIComponent(slotName)}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${sessionToken}`,
      },
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || `Download failed with status ${response.status}`);
    }

    const data = await response.json();
    if (data.found && data.save) {
      // Cryptographic SHA-256 integrity verification
      await verifySaveIntegrity(data.save);
      this._lastKnownRemoteVersion = data.version;
    }

    return data;
  }

  /**
   * Schedules a debounced synchronization (default 3-second debounce window).
   * Rapid saves coalesce into a single background upload.
   */
  public scheduleSync(slotName = 'Autosave', debounceMs = 3000): void {
    if (this._debounceTimer) {
      clearTimeout(this._debounceTimer);
    }

    const auth = useAuthStore.getState();
    if (!auth.isAuthenticated) {
      auth.setSyncStatus(
        typeof navigator !== 'undefined' && !navigator.onLine ? 'OFFLINE' : 'LOCAL_ONLY'
      );
      return;
    }

    auth.setSyncStatus('PENDING_UPLOAD');

    this._debounceTimer = setTimeout(() => {
      this._debounceTimer = null;
      this.performSync(slotName).catch((err) => {
        console.warn('Debounced cloud sync error:', err);
      });
    }, debounceMs);
  }

  /**
   * Immediately executes cloud synchronization with local-first authority,
   * lease locking, and deterministic conflict detection.
   */
  public async performSync(slotName = 'Autosave'): Promise<void> {
    const auth = useAuthStore.getState();
    if (!auth.isAuthenticated) {
      auth.setSyncStatus(
        typeof navigator !== 'undefined' && navigator.onLine === false ? 'OFFLINE' : 'LOCAL_ONLY'
      );
      return;
    }

    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      auth.setSyncStatus('OFFLINE');
      return;
    }

    if (this._isSyncInProgress) return;
    this._isSyncInProgress = true;
    auth.setSyncStatus('SYNCING');

    try {
      const orchestrator = useGameStore.getState().orchestrator;
      if (!orchestrator) {
        throw new Error('SaveOrchestrator is not initialized');
      }

      // 1. Read local save envelope
      let localEnvelope: SaveEnvelopeV2 | null = null;
      try {
        localEnvelope = await orchestrator.loadSave(slotName);
      } catch {
        localEnvelope = null;
      }

      // 2. Fetch remote cloud save
      const remote = await this.downloadCloudSave(slotName);

      // Scenario A: No remote save exists yet -> Clean initial upload
      if (!remote.found || !remote.save) {
        if (!localEnvelope) {
          // Neither local nor remote exists; nothing to sync yet
          auth.setSyncStatus('SYNCED');
          this._isSyncInProgress = false;
          return;
        }

        const lease = await this.acquireLease(slotName);
        const uploadResult = await this.uploadCloudSave(localEnvelope, lease.leaseToken);

        auth.setSyncStatus('SYNCED');
        auth.setLastSyncedAtIso(new Date().toISOString());
        auth.setCloudMetadata({
          found: true,
          fileName: uploadResult.fileName || 'save.json',
          slotName,
          version: uploadResult.version,
          checksumSha256: uploadResult.checksumSha256,
          updatedAtIso: localEnvelope.updatedAtIso,
        });
        this._retryCount = 0;
        this._isSyncInProgress = false;
        return;
      }

      const remoteSave = remote.save;

      // Scenario B: No local save exists -> Clean download & hydrate local
      if (!localEnvelope) {
        await orchestrator.writeEnvelope(slotName, remoteSave);
        await useGameStore.getState().loadGame(slotName);

        auth.setSyncStatus('SYNCED');
        auth.setLastSyncedAtIso(new Date().toISOString());
        auth.setCloudMetadata({
          found: true,
          fileName: remote.fileName,
          slotName,
          version: remote.version,
          checksumSha256: remote.checksumSha256,
          updatedAtIso: remoteSave.updatedAtIso,
        });
        this._retryCount = 0;
        this._isSyncInProgress = false;
        return;
      }

      // Scenario C: Identical content -> No network write needed
      if (localEnvelope.checksumSha256 === remoteSave.checksumSha256) {
        auth.setSyncStatus('SYNCED');
        auth.setLastSyncedAtIso(new Date().toISOString());
        auth.setCloudMetadata({
          found: true,
          fileName: remote.fileName,
          slotName,
          version: remote.version,
          checksumSha256: remote.checksumSha256,
          updatedAtIso: remoteSave.updatedAtIso,
        });
        this._retryCount = 0;
        this._isSyncInProgress = false;
        return;
      }

      // Scenario D: Checksum differs -> Compare timestamps for deterministic resolution
      const localTime = new Date(localEnvelope.updatedAtIso).getTime();
      const remoteTime = new Date(remoteSave.updatedAtIso).getTime();

      if (localTime > remoteTime) {
        // Fast-forward upload: Local save is newer
        const lease = await this.acquireLease(slotName, remote.version ?? undefined);
        const uploadResult = await this.uploadCloudSave(
          localEnvelope,
          lease.leaseToken,
          remote.version ?? undefined
        );

        auth.setSyncStatus('SYNCED');
        auth.setLastSyncedAtIso(new Date().toISOString());
        auth.setCloudMetadata({
          found: true,
          fileName: uploadResult.fileName || 'save.json',
          slotName,
          version: uploadResult.version,
          checksumSha256: uploadResult.checksumSha256,
          updatedAtIso: localEnvelope.updatedAtIso,
        });
        this._retryCount = 0;
      } else {
        // Divergence or Remote is newer: NEVER silently overwrite; trigger interactive modal
        auth.setConflictData({
          local: localEnvelope,
          remote: remoteSave,
        });
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.warn('Sync failed:', errorMsg);

      if (errorMsg.includes('locked by another') || errorMsg.includes('Lease currently held')) {
        auth.setSyncStatus('LOCKED_BY_OTHER_TAB', errorMsg);
      } else {
        auth.setSyncStatus('SYNC_ERROR', errorMsg);
        this._scheduleRetry(slotName);
      }
    } finally {
      this._isSyncInProgress = false;
    }
  }

  /**
   * Resolves an interactive save conflict deterministically.
   */
  public async resolveConflict(
    choice: ConflictResolutionChoice,
    slotName = 'Autosave'
  ): Promise<void> {
    const auth = useAuthStore.getState();
    const conflict = auth.conflictData;
    if (!conflict) return;

    const orchestrator = useGameStore.getState().orchestrator;
    if (!orchestrator) return;

    auth.setSyncStatus('SYNCING');

    try {
      if (choice === 'KEEP_CLOUD') {
        // Hydrate local engine with cloud save
        await orchestrator.writeEnvelope(slotName, conflict.remote);
        await useGameStore.getState().loadGame(slotName);
        auth.setConflictData(null);
        auth.setSyncStatus('SYNCED');
        auth.setLastSyncedAtIso(new Date().toISOString());
      } else if (choice === 'KEEP_LOCAL') {
        // Overwrite cloud save with local save
        const lease = await this.acquireLease(slotName);
        const uploadResult = await this.uploadCloudSave(conflict.local, lease.leaseToken);
        auth.setConflictData(null);
        auth.setSyncStatus('SYNCED');
        auth.setLastSyncedAtIso(new Date().toISOString());
        auth.setCloudMetadata({
          found: true,
          fileName: uploadResult.fileName || 'save.json',
          slotName,
          version: uploadResult.version,
          checksumSha256: uploadResult.checksumSha256,
          updatedAtIso: conflict.local.updatedAtIso,
        });
      } else if (choice === 'KEEP_BOTH') {
        // Back up local save into Autosave_Backup, then adopt cloud save
        const backupSlotName = `${slotName}_Backup`;
        await orchestrator.writeEnvelope(backupSlotName, conflict.local);
        await orchestrator.writeEnvelope(slotName, conflict.remote);
        await useGameStore.getState().loadGame(slotName);
        auth.setConflictData(null);
        auth.setSyncStatus('SYNCED');
        auth.setLastSyncedAtIso(new Date().toISOString());
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      auth.setSyncStatus('SYNC_ERROR', errorMsg);
      throw err;
    }
  }

  private _scheduleRetry(slotName: string): void {
    if (this._retryCount >= this._maxRetries) return;

    this._retryCount++;
    const backoffDelays = [5000, 10000, 20000, 40000];
    const delay = backoffDelays[this._retryCount - 1] || 40000;

    if (this._retryTimer) clearTimeout(this._retryTimer);
    this._retryTimer = setTimeout(() => {
      this._retryTimer = null;
      this.performSync(slotName).catch(console.warn);
    }, delay);
  }
}

export const cloudSaveService = CloudSaveService.getInstance();
