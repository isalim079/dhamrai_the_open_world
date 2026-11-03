import React from 'react';
import { useSessionStore } from '../state/useSessionStore.js';

export const PerformanceOverlay: React.FC = () => {
  const {
    playerPosition,
    isInVehicle,
    vehicleSpeedKph,
    cameraMode,
    activeChunkIds,
    loadedChunkCount,
    performance,
    bellRinging,
    statusMessage,
  } = useSessionStore();

  return (
    <>
      {/* Top Left: Game Info & Instructions */}
      <div
        style={{
          position: 'absolute',
          top: 12,
          left: 12,
          padding: '10px 14px',
          backgroundColor: 'rgba(13, 17, 23, 0.85)',
          border: '1px solid rgba(48, 54, 61, 0.8)',
          borderRadius: '8px',
          fontFamily: 'monospace',
          fontSize: '12px',
          color: '#c9d1d9',
          pointerEvents: 'none',
          lineHeight: '1.5',
          zIndex: 10,
        }}
      >
        <div style={{ color: '#58a6ff', fontWeight: 'bold', marginBottom: 4 }}>
          DHAMRAI LIFE — 3D VERTICAL SLICE
        </div>
        <div>
          Pos: <span style={{ color: '#7ee787' }}>X: {playerPosition.x.toFixed(1)}m</span>,{' '}
          <span style={{ color: '#7ee787' }}>Y: {playerPosition.y.toFixed(1)}m</span>,{' '}
          <span style={{ color: '#7ee787' }}>Z: {playerPosition.z.toFixed(1)}m</span>
        </div>
        <div>
          Mode:{' '}
          <span style={{ color: isInVehicle ? '#ffa657' : '#79c0ff', fontWeight: 'bold' }}>
            {isInVehicle ? `RICKSHAW (${vehicleSpeedKph.toFixed(1)} km/h)` : 'ON FOOT'}
          </span>{' '}
          | Cam: <span style={{ color: '#d2a8ff' }}>{cameraMode}</span>
        </div>
        <div style={{ marginTop: 6, borderTop: '1px solid #30363d', paddingTop: 6, color: '#8b949e' }}>
          Controls: [W/A/S/D] Move &middot; [Shift] Sprint &middot; [F] Enter/Exit &middot; [V] Camera &middot; [Space] Bell
        </div>
        {statusMessage && (
          <div style={{ marginTop: 4, color: '#e3b341' }}>
            {statusMessage}
          </div>
        )}
      </div>

      {/* Top Right: Performance Diagnostics HUD */}
      <div
        style={{
          position: 'absolute',
          top: 12,
          right: 12,
          padding: '10px 14px',
          backgroundColor: 'rgba(13, 17, 23, 0.85)',
          border: '1px solid rgba(48, 54, 61, 0.8)',
          borderRadius: '8px',
          fontFamily: 'monospace',
          fontSize: '12px',
          color: '#c9d1d9',
          pointerEvents: 'none',
          lineHeight: '1.5',
          textAlign: 'right',
          zIndex: 10,
        }}
      >
        <div style={{ color: performance.fps >= 30 ? '#7ee787' : '#f85149', fontWeight: 'bold' }}>
          {performance.fps} FPS ({performance.frameTimeMs.toFixed(1)} ms)
        </div>
        <div>Draw Calls: {performance.drawCalls} / 180 max</div>
        <div>Triangles: {performance.triangles.toLocaleString()} / 120,000 max</div>
        <div>Colliders: {performance.activeColliders} / 200 max</div>
        <div>
          Active Chunks: <span style={{ color: '#58a6ff' }}>{loadedChunkCount} / 16</span>
        </div>
        <div style={{ fontSize: '10px', color: '#8b949e', marginTop: 4, maxWidth: '240px' }}>
          {activeChunkIds.slice(0, 4).join(', ')}
          {activeChunkIds.length > 4 ? ` +${activeChunkIds.length - 4} more` : ''}
        </div>
      </div>

      {/* Bell ringing feedback banner */}
      {bellRinging && (
        <div
          style={{
            position: 'absolute',
            bottom: 32,
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '8px 20px',
            backgroundColor: '#e3b341',
            color: '#0d1117',
            fontWeight: 'bold',
            borderRadius: '20px',
            fontFamily: 'sans-serif',
            fontSize: '14px',
            zIndex: 20,
            boxShadow: '0 4px 12px rgba(227, 179, 65, 0.4)',
          }}
        >
          🔔 Tring Tring! (Rickshaw Bell)
        </div>
      )}
    </>
  );
};
