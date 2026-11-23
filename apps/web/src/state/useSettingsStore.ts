/**
 * Milestone 36/38 — Accessibility + diagnostics settings (localStorage only; not save schema).
 */

import { create } from 'zustand';

const STORAGE_KEY = 'dhamrai_client_settings_v1';

export interface ClientSettings {
  reduceMotion: boolean;
  highContrast: boolean;
  showKeyHints: boolean;
  /** Milestone 38 — opt-in diagnostics; default false (privacy-safe) */
  diagnosticsConsent: boolean;
  fontScale: number;
}

const DEFAULTS: ClientSettings = {
  reduceMotion: false,
  highContrast: false,
  showKeyHints: true,
  diagnosticsConsent: false,
  fontScale: 1,
};

function load(): ClientSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw) as Partial<ClientSettings>;
    return {
      reduceMotion: !!parsed.reduceMotion,
      highContrast: !!parsed.highContrast,
      showKeyHints: parsed.showKeyHints !== false,
      diagnosticsConsent: !!parsed.diagnosticsConsent,
      fontScale: Math.min(1.4, Math.max(0.85, Number(parsed.fontScale) || 1)),
    };
  } catch {
    return { ...DEFAULTS };
  }
}

function persist(s: ClientSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    /* ignore quota */
  }
}

interface SettingsState extends ClientSettings {
  hydrated: boolean;
  hydrate: () => void;
  setReduceMotion: (v: boolean) => void;
  setHighContrast: (v: boolean) => void;
  setShowKeyHints: (v: boolean) => void;
  setDiagnosticsConsent: (v: boolean) => void;
  setFontScale: (v: number) => void;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  ...DEFAULTS,
  hydrated: false,
  hydrate: () => {
    const loaded = load();
    set({ ...loaded, hydrated: true });
  },
  setReduceMotion: (v) => {
    set({ reduceMotion: v });
    persist({ ...get(), reduceMotion: v });
  },
  setHighContrast: (v) => {
    set({ highContrast: v });
    persist({ ...get(), highContrast: v });
  },
  setShowKeyHints: (v) => {
    set({ showKeyHints: v });
    persist({ ...get(), showKeyHints: v });
  },
  setDiagnosticsConsent: (v) => {
    set({ diagnosticsConsent: v });
    persist({ ...get(), diagnosticsConsent: v });
  },
  setFontScale: (v) => {
    const fontScale = Math.min(1.4, Math.max(0.85, v));
    set({ fontScale });
    persist({ ...get(), fontScale });
  },
}));
