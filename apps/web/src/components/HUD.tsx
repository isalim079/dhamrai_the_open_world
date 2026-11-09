import React from 'react';
import { useSessionStore } from '../state/useSessionStore.js';
import { useGameStore } from '../state/useGameStore.js';
import { useUIStore } from '../state/useUIStore.js';
import { useAuthStore } from '../state/useAuthStore.js';
import { PHASE_1_MISSIONS } from '@dhamrai/game-core';

export const HUD: React.FC = () => {
  const playerPosition = useSessionStore((s) => s.playerPosition);
  const isInVehicle = useSessionStore((s) => s.isInVehicle);
  const vehicleSpeedKph = useSessionStore((s) => s.vehicleSpeedKph);
  const statusMessage = useSessionStore((s) => s.statusMessage);
  const bellRinging = useSessionStore((s) => s.bellRinging);

  const cashFormatted = useGameStore((s) => s.cashFormattedBdt);
  const reputation = useGameStore((s) => s.reputation);
  const currentMissionId = useGameStore((s) => s.currentActiveMissionId);
  const allMissions = useGameStore((s) => s.allMissions);
  const toastMessage = useGameStore((s) => s.toastMessage);

  const isDialogueOpen = useUIStore((s) => s.isDialogueOpen);
  const isJournalOpen = useUIStore((s) => s.isJournalOpen);
  const isInventoryOpen = useUIStore((s) => s.isInventoryOpen);

  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const syncStatus = useAuthStore((s) => s.syncStatus);
  const openSaveManager = useAuthStore((s) => s.openSaveManager);
  const openConflictModal = useAuthStore((s) => s.openConflictModal);

  // Derive active mission definition & current objective
  const missionDef = currentMissionId ? PHASE_1_MISSIONS[currentMissionId] : null;
  const missionInst = currentMissionId ? allMissions[currentMissionId] : null;

  let currentObjective = null;
  let distanceToTargetM: number | null = null;

  if (missionDef && missionInst) {
    const uncompleted = missionDef.objectives.find(
      (o) => !missionInst.completedObjectiveIds.includes(o.id)
    );
    if (uncompleted) {
      currentObjective = uncompleted;
      const dx = playerPosition.x - uncompleted.targetPosition.x;
      const dz = playerPosition.z - uncompleted.targetPosition.z;
      distanceToTargetM = Math.round(Math.hypot(dx, dz));
    }
  }

  // If full-screen or modal is open, hide active prompts to prevent visual clutter
  const isModalOpen = isDialogueOpen || isJournalOpen || isInventoryOpen;

  return (
    <>
      {/* Toast Notification (Top Center) */}
      {toastMessage && (
        <div
          style={{
            position: 'absolute',
            top: 18,
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: '#238636',
            color: '#ffffff',
            padding: '8px 24px',
            borderRadius: '24px',
            fontSize: '14px',
            fontWeight: 'bold',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
            zIndex: 60,
            pointerEvents: 'none',
          }}
        >
          {toastMessage}
        </div>
      )}

      {/* Top Left: Player Status Bar */}
      <div
        style={{
          position: 'absolute',
          top: 12,
          left: 12,
          padding: '10px 16px',
          backgroundColor: 'rgba(13, 17, 23, 0.9)',
          border: '1px solid rgba(48, 54, 61, 0.8)',
          borderRadius: '10px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          color: '#c9d1d9',
          pointerEvents: 'none',
          zIndex: 20,
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
          {/* Cash Balance in BDT */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ color: '#7ee787', fontSize: '18px', fontWeight: 'bold' }}>
              {cashFormatted}
            </span>
          </div>

          <span style={{ color: '#30363d' }}>|</span>

          {/* Transport Reputation */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ color: '#e3b341', fontSize: '14px', fontWeight: 'bold' }}>
              ★ {reputation}
            </span>
            <span style={{ fontSize: '11px', color: '#8b949e' }}>সুনাম</span>
          </div>
        </div>

        {/* Locomotion & Speed */}
        <div style={{ fontSize: '12px', color: '#8b949e', display: 'flex', gap: 8, alignItems: 'center' }}>
          <span
            style={{
              color: isInVehicle ? '#ffa657' : '#79c0ff',
              fontWeight: 600,
            }}
          >
            {isInVehicle ? `রিকশা (${vehicleSpeedKph.toFixed(1)} km/h)` : 'হেঁটে চলছেন (ON FOOT)'}
          </span>
          <span>·</span>
          <span>
            X: {playerPosition.x.toFixed(0)}m, Z: {playerPosition.z.toFixed(0)}m
          </span>
        </div>
      </div>

      {/* Top Right: Account Pill & Mission Tracker */}
      <div
        style={{
          position: 'absolute',
          top: 12,
          right: 12,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: 8,
          zIndex: 25,
        }}
      >
        {/* Account & Sync Pill */}
        {!isAuthenticated ? (
          <button
            onClick={openSaveManager}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 12px',
              backgroundColor: 'rgba(13, 17, 23, 0.9)',
              border: '1px solid rgba(88, 166, 255, 0.6)',
              borderRadius: '20px',
              color: '#58a6ff',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
              transition: 'background-color 0.2s',
            }}
          >
            <span>👤</span>
            <span>সাইন ইন (Sign In)</span>
          </button>
        ) : syncStatus === 'CONFLICT' ? (
          <button
            onClick={openConflictModal}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 12px',
              backgroundColor: 'rgba(210, 153, 34, 0.2)',
              border: '1px solid #d29922',
              borderRadius: '20px',
              color: '#e3b341',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
            }}
          >
            <span>⚠️</span>
            <span>অসঙ্গতি (Conflict)</span>
          </button>
        ) : syncStatus === 'SYNCING' ? (
          <button
            onClick={openSaveManager}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 12px',
              backgroundColor: 'rgba(59, 130, 246, 0.2)',
              border: '1px solid #3b82f6',
              borderRadius: '20px',
              color: '#60a5fa',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
            }}
          >
            <span style={{ display: 'inline-block' }}>🔄</span>
            <span>সিঙ্ক হচ্ছে...</span>
          </button>
        ) : syncStatus === 'SYNC_ERROR' ? (
          <button
            onClick={openSaveManager}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 12px',
              backgroundColor: 'rgba(239, 68, 68, 0.2)',
              border: '1px solid #ef4444',
              borderRadius: '20px',
              color: '#f87171',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
            }}
          >
            <span>❌</span>
            <span>সিঙ্ক ত্রুটি (Sync Error)</span>
          </button>
        ) : syncStatus === 'OFFLINE' ? (
          <button
            onClick={openSaveManager}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 12px',
              backgroundColor: 'rgba(107, 114, 128, 0.2)',
              border: '1px solid #6b7280',
              borderRadius: '20px',
              color: '#9ca3af',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
            }}
          >
            <span>⚡</span>
            <span>অফলাইন (Offline)</span>
          </button>
        ) : (
          <button
            onClick={openSaveManager}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 12px',
              backgroundColor: 'rgba(13, 17, 23, 0.9)',
              border: '1px solid rgba(46, 160, 67, 0.6)',
              borderRadius: '20px',
              color: '#7ee787',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
            }}
          >
            <span style={{ color: '#2ea043' }}>●</span>
            <span>☁️ সিঙ্ক সম্পন্ন | {user?.name?.split(' ')[0] || 'ড্রাইভার'}</span>
          </button>
        )}

        {/* Mission & Objective Tracker */}
        {missionDef && (
          <div
            style={{
              padding: '10px 16px',
              backgroundColor: 'rgba(13, 17, 23, 0.9)',
              border: '1px solid rgba(88, 166, 255, 0.5)',
              borderRadius: '10px',
              fontFamily: 'system-ui, -apple-system, sans-serif',
              color: '#c9d1d9',
              pointerEvents: 'none',
              textAlign: 'right',
              maxWidth: '320px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
            }}
          >
            <div style={{ fontSize: '11px', color: '#58a6ff', fontWeight: 'bold', textTransform: 'uppercase' }}>
              বর্তমান দায়িত্ব (Current Mission)
            </div>
            <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#f0f6fc', marginTop: 2 }}>
              {missionDef.bengaliTitle}
            </div>
            {currentObjective ? (
              <div style={{ marginTop: 4, fontSize: '12px', color: '#e3b341' }}>
                {currentObjective.bengaliTitle}
                {distanceToTargetM !== null && (
                  <span style={{ color: '#7ee787', marginLeft: 6, fontWeight: 'bold' }}>
                    ({distanceToTargetM}m)
                  </span>
                )}
              </div>
            ) : (
              <div style={{ marginTop: 4, fontSize: '12px', color: '#7ee787' }}>
                ✓ মিশন সম্পন্ন (Completed)
              </div>
            )}
          </div>
        )}
      </div>

      {/* Center Bottom: Contextual Action Prompt */}
      {!isModalOpen && statusMessage && (
        <div
          style={{
            position: 'absolute',
            bottom: 40,
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: 'rgba(13, 17, 23, 0.85)',
            border: '1px solid rgba(88, 166, 255, 0.4)',
            borderRadius: '20px',
            padding: '8px 22px',
            fontSize: '13px',
            color: '#f0f6fc',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            zIndex: 20,
            pointerEvents: 'none',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.6)',
          }}
        >
          {statusMessage}
        </div>
      )}

      {/* Bell Ringing Animation Banner */}
      {bellRinging && (
        <div
          style={{
            position: 'absolute',
            bottom: 90,
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: '#e3b341',
            color: '#0d1117',
            fontWeight: 'bold',
            borderRadius: '20px',
            padding: '8px 24px',
            fontFamily: 'sans-serif',
            fontSize: '14px',
            zIndex: 25,
            boxShadow: '0 4px 16px rgba(227, 179, 65, 0.5)',
            pointerEvents: 'none',
          }}
        >
          🔔 Tring Tring! (Rickshaw Bell)
        </div>
      )}

      {/* Bottom Right: Key Controls Helper */}
      <div
        style={{
          position: 'absolute',
          bottom: 12,
          right: 12,
          padding: '6px 12px',
          backgroundColor: 'rgba(13, 17, 23, 0.75)',
          borderRadius: '6px',
          fontSize: '11px',
          color: '#8b949e',
          fontFamily: 'monospace',
          zIndex: 15,
          pointerEvents: 'none',
        }}
      >
        [E] কথা বলুন · [F] রিকশা · [J] ডায়েরি · [I] থলে · [F3] ডিবাগ
      </div>
    </>
  );
};
