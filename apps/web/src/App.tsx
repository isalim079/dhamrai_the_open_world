import React from 'react';
import { CanvasContainer } from './components/CanvasContainer.js';
import { PerformanceOverlay } from './components/PerformanceOverlay.js';
import { FallbackScreen } from './components/FallbackScreen.js';
import { useSessionStore } from './state/useSessionStore.js';

export const App: React.FC = () => {
  const isWebGLSupported = useSessionStore((s) => s.isWebGLSupported);
  const webGLErrorMessage = useSessionStore((s) => s.webGLErrorMessage);

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
          <PerformanceOverlay />
        </>
      )}
    </div>
  );
};

export default App;
