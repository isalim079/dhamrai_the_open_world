import React, { useEffect } from 'react';
import { CanvasContainer } from './components/CanvasContainer.js';
import { HUD } from './components/HUD.js';
import { Minimap } from './components/Minimap.js';
import { DialogueBox } from './components/DialogueBox.js';
import { JournalModal } from './components/JournalModal.js';
import { InventoryModal } from './components/InventoryModal.js';
import { SaveManagerModal } from './components/SaveManagerModal.js';
import { ConflictResolutionModal } from './components/ConflictResolutionModal.js';
import { PerformanceOverlay } from './components/PerformanceOverlay.js';
import { SettingsModal } from './components/SettingsModal.js';
import { FallbackScreen } from './components/FallbackScreen.js';
import { OAuthCallback } from './pages/OAuthCallback.js';
import { useSessionStore } from './state/useSessionStore.js';
import { useUIStore } from './state/useUIStore.js';
import { useAuthStore } from './state/useAuthStore.js';
import { useSettingsStore } from './state/useSettingsStore.js';
import { authService } from './services/AuthService.js';
import { cloudSaveService } from './services/CloudSaveService.js';

export const App: React.FC = () => {
  const isWebGLSupported = useSessionStore((s) => s.isWebGLSupported);
  const webGLErrorMessage = useSessionStore((s) => s.webGLErrorMessage);
  const isDebugOverlayVisible = useUIStore((s) => s.isDebugOverlayVisible);
  const diagnosticsConsent = useSettingsStore((s) => s.diagnosticsConsent);
  const highContrast = useSettingsStore((s) => s.highContrast);
  const fontScale = useSettingsStore((s) => s.fontScale);
  const reduceMotion = useSettingsStore((s) => s.reduceMotion);
  const hydrateSettings = useSettingsStore((s) => s.hydrate);

  useEffect(() => {
    hydrateSettings();
    if (import.meta.env.DEV && typeof window !== 'undefined') {
      (window as any).__useAuthStore = useAuthStore;
      (window as any).__cloudSaveService = cloudSaveService;
      (window as any).__dhamrai_useSettingsStore = useSettingsStore;
      (window as any).addEventListener('dhamrai_test_conflict', (e: any) => {
        if (e.detail) {
          useAuthStore.getState().setConflictData(e.detail);
        }
      });
    }

    // Restore session on boot / reload
    authService.restoreSession().then((restored) => {
      if (restored) {
        cloudSaveService.performSync('Autosave').catch(console.warn);
      }
    });
  }, [hydrateSettings]);

  useEffect(() => {
    document.documentElement.dataset.reduceMotion = reduceMotion ? '1' : '0';
    document.documentElement.style.setProperty(
      '--dhamrai-motion',
      reduceMotion ? '0s' : '0.2s'
    );
  }, [reduceMotion]);

  if (typeof window !== 'undefined' && window.location.pathname.startsWith('/oauth')) {
    return <OAuthCallback />;
  }

  return (
    <div
      style={{
        position: 'relative',
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        backgroundColor: highContrast ? '#000000' : '#0b0f19',
        fontSize: `${16 * fontScale}px`,
      }}
    >
      {!isWebGLSupported ? (
        <FallbackScreen errorMessage={webGLErrorMessage} />
      ) : (
        <>
          <CanvasContainer />
          <HUD />
          <Minimap />
          <DialogueBox />
          <JournalModal />
          <InventoryModal />
          <SaveManagerModal />
          <SettingsModal />
          <ConflictResolutionModal />
          {isDebugOverlayVisible && diagnosticsConsent && <PerformanceOverlay />}
        </>
      )}
    </div>
  );
};

export default App;
