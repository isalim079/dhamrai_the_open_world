import React, { useEffect, useRef } from 'react';
import { detectWebGL2Support } from '../engine/WebGLCapability.js';
import { GameEngine } from '../engine/GameEngine.js';
import { useSessionStore } from '../state/useSessionStore.js';

export const CanvasContainer: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const setWebGLSupport = useSessionStore((s) => s.setWebGLSupport);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // 1. Detect WebGL 2 support
    const diagnostic = detectWebGL2Support(canvas);
    if (!diagnostic.isSupported) {
      setWebGLSupport(false, diagnostic.errorMessage);
      return;
    }
    setWebGLSupport(true, null);

    // 2. Instantiate and start 3D GameEngine
    const engine = new GameEngine();
    engineRef.current = engine;

    engine
      .init(canvas)
      .then(() => {
        engine.start();
      })
      .catch((err) => {
        console.error('Failed to initialize 3D Game Engine:', err);
        setWebGLSupport(false, String(err));
      });

    // 3. Clean disposal on unmount
    return () => {
      if (engineRef.current) {
        engineRef.current.dispose();
        engineRef.current = null;
      }
    };
  }, [setWebGLSupport]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        display: 'block',
        width: '100%',
        height: '100%',
        touchAction: 'none',
      }}
    />
  );
};
