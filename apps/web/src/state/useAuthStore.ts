import { create } from 'zustand';
import type {
  AuthUserIdentity,
  CloudSyncStatus,
  CloudSaveMetadata,
  SaveEnvelopeV2,
} from '@dhamrai/shared-contracts';

const SESSION_STORAGE_KEY = 'dhamrai_session';

export interface StoredSession {
  sessionToken: string;
  user: AuthUserIdentity;
  exp: number;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: AuthUserIdentity | null;
  sessionToken: string | null;
  syncStatus: CloudSyncStatus;
  lastSyncedAtIso: string | null;
  cloudMetadata: CloudSaveMetadata | null;
  errorMessage: string | null;
  conflictData: { local: SaveEnvelopeV2; remote: SaveEnvelopeV2 } | null;
  isSaveManagerOpen: boolean;
  isConflictModalOpen: boolean;

  login: (sessionToken: string, user: AuthUserIdentity) => void;
  logout: () => void;
  setSyncStatus: (status: CloudSyncStatus, errorMessage?: string | null) => void;
  setCloudMetadata: (metadata: CloudSaveMetadata | null) => void;
  setLastSyncedAtIso: (iso: string | null) => void;
  setConflictData: (data: { local: SaveEnvelopeV2; remote: SaveEnvelopeV2 } | null) => void;
  openSaveManager: () => void;
  closeSaveManager: () => void;
  openConflictModal: () => void;
  closeConflictModal: () => void;
  restoreSessionFromStorage: () => StoredSession | null;
}

function parseTokenExpiry(token: string): number {
  try {
    const parts = token.split('.');
    if (parts.length >= 2 && parts[0]) {
      const base64 = parts[0].replace(/-/g, '+').replace(/_/g, '/');
      const json = JSON.parse(atob(base64));
      if (typeof json.exp === 'number') {
        return json.exp;
      }
    }
  } catch {
    // fallback
  }
  // Default to 7 days from now if unparseable
  return Math.floor(Date.now() / 1000) + 7 * 24 * 3600;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  isAuthenticated: false,
  user: null,
  sessionToken: null,
  syncStatus: typeof navigator !== 'undefined' && navigator.onLine === false ? 'OFFLINE' : 'LOCAL_ONLY',
  lastSyncedAtIso: null,
  cloudMetadata: null,
  errorMessage: null,
  conflictData: null,
  isSaveManagerOpen: false,
  isConflictModalOpen: false,

  login: (sessionToken: string, user: AuthUserIdentity) => {
    const exp = parseTokenExpiry(sessionToken);
    const sessionData: StoredSession = { sessionToken, user, exp };

    if (typeof window !== 'undefined' && window.sessionStorage) {
      try {
        window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionData));
      } catch (err) {
        console.warn('Failed to persist session in sessionStorage:', err);
      }
    }

    set({
      isAuthenticated: true,
      user,
      sessionToken,
      syncStatus: 'SYNCED',
      errorMessage: null,
    });
  },

  logout: () => {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      try {
        window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
      } catch (err) {
        console.warn('Failed to clear sessionStorage:', err);
      }
    }

    set({
      isAuthenticated: false,
      user: null,
      sessionToken: null,
      syncStatus: typeof navigator !== 'undefined' && navigator.onLine === false ? 'OFFLINE' : 'LOCAL_ONLY',
      errorMessage: null,
      conflictData: null,
      isConflictModalOpen: false,
      isSaveManagerOpen: false,
    });
  },

  setSyncStatus: (status: CloudSyncStatus, errorMessage: string | null = null) => {
    set({ syncStatus: status, errorMessage: errorMessage ?? null });
  },

  setCloudMetadata: (metadata: CloudSaveMetadata | null) => {
    set({ cloudMetadata: metadata });
  },

  setLastSyncedAtIso: (iso: string | null) => {
    set({ lastSyncedAtIso: iso });
  },

  setConflictData: (data: { local: SaveEnvelopeV2; remote: SaveEnvelopeV2 } | null) => {
    set({
      conflictData: data,
      isConflictModalOpen: data !== null,
      syncStatus: data !== null ? 'CONFLICT' : get().syncStatus,
    });
  },

  openSaveManager: () => set({ isSaveManagerOpen: true }),
  closeSaveManager: () => set({ isSaveManagerOpen: false }),
  openConflictModal: () => set({ isConflictModalOpen: true }),
  closeConflictModal: () => set({ isConflictModalOpen: false }),

  restoreSessionFromStorage: (): StoredSession | null => {
    if (typeof window === 'undefined' || !window.sessionStorage) return null;
    try {
      const raw = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw) as StoredSession;
      if (!data.sessionToken || !data.user || !data.exp) {
        window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
        return null;
      }
      const nowSec = Math.floor(Date.now() / 1000);
      if (data.exp <= nowSec) {
        // Expired
        window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
        return null;
      }
      return data;
    } catch {
      return null;
    }
  },
}));
