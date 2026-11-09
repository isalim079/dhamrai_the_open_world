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
import { FallbackScreen } from './components/FallbackScreen.js';
import { OAuthCallback } from './pages/OAuthCallback.js';
import { useSessionStore } from './state/useSessionStore.js';
import { useUIStore } from './state/useUIStore.js';
import { useAuthStore } from './state/useAuthStore.js';
import { authService } from './services/AuthService.js';
import { cloudSaveService } from './services/CloudSaveService.js';

export const App: React.FC = () => {
  const isWebGLSupported = useSessionStore((s) => s.isWebGLSupported);
  const webGLErrorMessage = useSessionStore((s) => s.webGLErrorMessage);
  const isDebugOverlayVisible = useUIStore((s) => s.isDebugOverlayVisible);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).__useAuthStore = useAuthStore;
      (window as any).__cloudSaveService = cloudSaveService;
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
  }, []);

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
        backgroundColor: '#0b0f19',
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
          <ConflictResolutionModal />
          {isDebugOverlayVisible && <PerformanceOverlay />}
        </>
      )}
    </div>
  );
};

export default App;
