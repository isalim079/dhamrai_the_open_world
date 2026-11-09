import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useAuthStore } from '../src/state/useAuthStore.js';
import type { AuthUserIdentity } from '@dhamrai/shared-contracts';

class MockStorage implements Storage {
  private _store: Record<string, string> = {};
  get length() {
    return Object.keys(this._store).length;
  }
  clear() {
    this._store = {};
  }
  getItem(key: string) {
    return this._store[key] ?? null;
  }
  key(index: number) {
    return Object.keys(this._store)[index] ?? null;
  }
  removeItem(key: string) {
    delete this._store[key];
  }
  setItem(key: string, value: string) {
    this._store[key] = String(value);
  }
}

describe('Milestone 8 — Auth Store & Session Management', () => {
  const mockUser: AuthUserIdentity = {
    id: 'usr_test_123',
    googleSub: 'google_sub_456',
    email: 'driver@dhamrai.test',
    name: 'Farhana Hossain',
  };

  const createMockToken = (expSec: number): string => {
    const payload = {
      userId: 'usr_test_123',
      googleSub: 'google_sub_456',
      email: 'driver@dhamrai.test',
      exp: expSec,
    };
    const b64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
    return `${b64}.mock_hmac_signature`;
  };

  const originalWindow = (globalThis as any).window;
  const mockStorage = new MockStorage();

  beforeEach(() => {
    mockStorage.clear();
    (globalThis as any).window = {
      sessionStorage: mockStorage,
    };
    useAuthStore.getState().logout();
  });

  afterEach(() => {
    (globalThis as any).window = originalWindow;
  });

  it('initializes with unauthenticated local-only state', () => {
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
    expect(state.sessionToken).toBeNull();
    expect(['LOCAL_ONLY', 'OFFLINE']).toContain(state.syncStatus);
  });

  it('stores authenticated session in memory and sessionStorage on login', () => {
    const futureExp = Math.floor(Date.now() / 1000) + 7 * 24 * 3600;
    const token = createMockToken(futureExp);

    useAuthStore.getState().login(token, mockUser);

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.user).toEqual(mockUser);
    expect(state.sessionToken).toBe(token);
    expect(state.syncStatus).toBe('SYNCED');

    // Verify sessionStorage persistence
    const storedRaw = window.sessionStorage.getItem('dhamrai_session');
    expect(storedRaw).not.toBeNull();
    const parsed = JSON.parse(storedRaw!);
    expect(parsed.sessionToken).toBe(token);
    expect(parsed.user.email).toBe(mockUser.email);
  });

  it('purges session from store and sessionStorage on logout', () => {
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    const token = createMockToken(futureExp);

    useAuthStore.getState().login(token, mockUser);
    expect(useAuthStore.getState().isAuthenticated).toBe(true);

    useAuthStore.getState().logout();

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
    expect(state.sessionToken).toBeNull();
    expect(window.sessionStorage.getItem('dhamrai_session')).toBeNull();
  });

  it('restores valid unexpired session from sessionStorage', () => {
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    const token = createMockToken(futureExp);

    window.sessionStorage.setItem(
      'dhamrai_session',
      JSON.stringify({ sessionToken: token, user: mockUser, exp: futureExp })
    );

    const restored = useAuthStore.getState().restoreSessionFromStorage();
    expect(restored).not.toBeNull();
    expect(restored?.sessionToken).toBe(token);
    expect(restored?.user.name).toBe('Farhana Hossain');
  });

  it('rejects and purges expired session from sessionStorage', () => {
    const pastExp = Math.floor(Date.now() / 1000) - 60; // 1 minute ago
    const token = createMockToken(pastExp);

    window.sessionStorage.setItem(
      'dhamrai_session',
      JSON.stringify({ sessionToken: token, user: mockUser, exp: pastExp })
    );

    const restored = useAuthStore.getState().restoreSessionFromStorage();
    expect(restored).toBeNull();
    expect(window.sessionStorage.getItem('dhamrai_session')).toBeNull();
  });

  it('manages modal visibility states cleanly', () => {
    const store = useAuthStore.getState();

    store.openSaveManager();
    expect(useAuthStore.getState().isSaveManagerOpen).toBe(true);

    store.closeSaveManager();
    expect(useAuthStore.getState().isSaveManagerOpen).toBe(false);

    store.openConflictModal();
    expect(useAuthStore.getState().isConflictModalOpen).toBe(true);

    store.closeConflictModal();
    expect(useAuthStore.getState().isConflictModalOpen).toBe(false);
  });
});
