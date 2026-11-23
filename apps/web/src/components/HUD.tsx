import React from 'react';
import { useSessionStore } from '../state/useSessionStore.js';
import { useGameStore } from '../state/useGameStore.js';
import { useUIStore } from '../state/useUIStore.js';
import { useAuthStore } from '../state/useAuthStore.js';
import { PHASE_1_MISSIONS } from '@dhamrai/game-core';
import { getActiveAudioManager } from '../audio/index.js';
import { useSettingsStore } from '../state/useSettingsStore.js';

const MeterRow: React.FC<{
  label: string;
  labelEn: string;
  value: number;
  color: string;
  invert?: boolean;
}> = ({ label, labelEn, value, color, invert }) => {
  const fill = Math.max(0, Math.min(100, invert ? value : value));
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 10, color: '#8b949e', width: 42 }} title={labelEn}>
        {label}
      </span>
      <div
        style={{
          flex: 1,
          height: 6,
          backgroundColor: '#21262d',
          borderRadius: 3,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${fill}%`,
            height: '100%',
            backgroundColor: color,
            transition: 'width 0.2s linear',
          }}
        />
      </div>
      <span style={{ fontSize: 10, color: '#c9d1d9', width: 28, textAlign: 'right', fontFamily: 'monospace' }}>
        {Math.round(value)}
      </span>
    </div>
  );
};

export const HUD: React.FC = () => {
  const playerPosition = useSessionStore((s) => s.playerPosition);
  const isInVehicle = useSessionStore((s) => s.isInVehicle);
  const vehicleSpeedKph = useSessionStore((s) => s.vehicleSpeedKph);
  const statusMessage = useSessionStore((s) => s.statusMessage);
  const bellRinging = useSessionStore((s) => s.bellRinging);
  const isAudioMuted = useSessionStore((s) => s.isAudioMuted);
  const gameClockLabel = useSessionStore((s) => s.gameClockLabel);
  const weatherLabel = useSessionStore((s) => s.weatherLabel);
  const dayPhase = useSessionStore((s) => s.dayPhase);
  const staminaPercent = useSessionStore((s) => s.staminaPercent);
  const damagePercent = useSessionStore((s) => s.damagePercent);
  const tirePressurePercent = useSessionStore((s) => s.tirePressurePercent);
  const isPunctured = useSessionStore((s) => s.isPunctured);
  const sprintBlocked = useSessionStore((s) => s.sprintBlocked);
  const policeHeat = useSessionStore((s) => s.policeHeat);
  const activeFineMinorUnits = useSessionStore((s) => s.activeFineMinorUnits);
  const policeStopActive = useSessionStore((s) => s.policeStopActive);
  const objectiveBearingDeg = useSessionStore((s) => s.objectiveBearingDeg);
  const objectiveDistanceM = useSessionStore((s) => s.objectiveDistanceM);
  const hasActiveObjective = useSessionStore((s) => s.hasActiveObjective);

  const cashFormatted = useGameStore((s) => s.cashFormattedBdt);
  const reputation = useGameStore((s) => s.reputation);
  const currentMissionId = useGameStore((s) => s.currentActiveMissionId);
  const allMissions = useGameStore((s) => s.allMissions);
  const toastMessage = useGameStore((s) => s.toastMessage);

  const isDialogueOpen = useUIStore((s) => s.isDialogueOpen);
  const isJournalOpen = useUIStore((s) => s.isJournalOpen);
  const isInventoryOpen = useUIStore((s) => s.isInventoryOpen);
  const showKeyHints = useSettingsStore((s) => s.showKeyHints);

  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const syncStatus = useAuthStore((s) => s.syncStatus);
  const openSaveManager = useAuthStore((s) => s.openSaveManager);
  const openConflictModal = useAuthStore((s) => s.openConflictModal);

  // Derive active mission definition & current objective (supporting dynamic repeatable fare trips)
  const engine = useGameStore((s) => s.engine);
  const missionDef = currentMissionId && currentMissionId !== 'repeatable_fares'
    ? (engine?.missions.getDefinition(currentMissionId) || PHASE_1_MISSIONS[currentMissionId] || null)
    : null;
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

      {/* Milestone 15 — Compass / bearing to objective */}
      {hasActiveObjective && !isModalOpen && (
        <div
          style={{
            position: 'absolute',
            top: toastMessage ? 58 : 18,
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2,
            zIndex: 35,
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              backgroundColor: 'rgba(13, 17, 23, 0.88)',
              border: '2px solid #f1c40f',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(0,0,0,0.45)',
            }}
          >
            <span
              style={{
                display: 'inline-block',
                fontSize: 22,
                color: '#f1c40f',
                transform: `rotate(${objectiveBearingDeg}deg)`,
                lineHeight: 1,
              }}
            >
              ▲
            </span>
          </div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: '#f1c40f',
              backgroundColor: 'rgba(13,17,23,0.85)',
              padding: '2px 10px',
              borderRadius: 10,
              fontFamily: 'monospace',
            }}
          >
            {Math.round(objectiveDistanceM)}m
          </div>
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

        {/* Milestone 12 — Clock & Weather */}
        <div
          style={{
            marginTop: 6,
            fontSize: '12px',
            display: 'flex',
            gap: 10,
            alignItems: 'center',
            borderTop: '1px solid #30363d',
            paddingTop: 6,
          }}
        >
          <span style={{ color: '#f0c674', fontWeight: 700, fontFamily: 'monospace' }}>
            🕒 {gameClockLabel}
          </span>
          <span style={{ color: '#8b949e', textTransform: 'capitalize' }}>{dayPhase}</span>
          <span style={{ color: weatherLabel.includes('Rain') || weatherLabel.includes('বৃষ্টি') ? '#79c0ff' : '#7ee787' }}>
            {weatherLabel} [N]
          </span>
        </div>

        {/* Milestone 13 — Stamina & Vehicle Condition */}
        <div
          style={{
            marginTop: 8,
            borderTop: '1px solid #30363d',
            paddingTop: 8,
            display: 'flex',
            flexDirection: 'column',
            gap: 5,
            minWidth: 210,
          }}
        >
          <MeterRow
            label="শক্তি"
            labelEn="Stamina"
            value={staminaPercent}
            color={sprintBlocked ? '#f85149' : staminaPercent < 30 ? '#d29922' : '#3fb950'}
          />
          <MeterRow
            label="ক্ষতি"
            labelEn="Damage"
            value={damagePercent}
            invert
            color={damagePercent > 60 ? '#f85149' : damagePercent > 30 ? '#d29922' : '#8b949e'}
          />
          <MeterRow
            label="টায়ার"
            labelEn="Tire"
            value={tirePressurePercent}
            color={isPunctured ? '#f85149' : tirePressurePercent < 30 ? '#d29922' : '#58a6ff'}
          />
          {isPunctured && (
            <div style={{ fontSize: 11, color: '#f85149', fontWeight: 700 }}>
              পাংচার — মিস্ত্রি দেখুন (Puncture)
            </div>
          )}
          {sprintBlocked && !isPunctured && (
            <div style={{ fontSize: 11, color: '#d29922', fontWeight: 600 }}>
              স্প্রিন্ট বন্ধ — চা খান (Sprint blocked)
            </div>
          )}

          {/* Milestone 14 — Police heat / fine */}
          {(policeHeat >= 15 || policeStopActive) && (
            <div style={{ marginTop: 4, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <MeterRow
                label="হিট"
                labelEn="Police heat"
                value={policeHeat}
                color={policeHeat >= 70 ? '#f85149' : policeHeat >= 40 ? '#d29922' : '#e3b341'}
              />
              {policeStopActive && (
                <div style={{ fontSize: 11, color: '#f85149', fontWeight: 700 }}>
                  জরিমানা ৳{(activeFineMinorUnits / 100).toFixed(0)} — [E] স্টপ
                </div>
              )}
            </div>
          )}
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
        {currentMissionId === 'repeatable_fares' ? (
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
              উন্মুক্ত শহর (Open World)
            </div>
            <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#7ee787', marginTop: 2 }}>
              যাত্রী পরিবহন চালু (Repeatable Fares)
            </div>
            <div style={{ marginTop: 4, fontSize: '12px', color: '#e3b341' }}>
              রথখোলা স্ট্যান্ডে যাত্রীর সাথে কথা বলুন [E]
            </div>
          </div>
        ) : missionDef ? (
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
        ) : null}
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

      {/* Bottom Left: Audio Status & Mute Control */}
      <button
        onClick={() => {
          const audio = getActiveAudioManager();
          const nextMuted = audio ? audio.toggleMute() : !isAudioMuted;
          useSessionStore.getState().setIsAudioMuted(nextMuted);
        }}
        title="শব্দ চালু/বন্ধ করুন [M]"
        style={{
          position: 'absolute',
          bottom: 12,
          left: 12,
          padding: '6px 12px',
          backgroundColor: 'rgba(13, 17, 23, 0.85)',
          border: isAudioMuted ? '1px solid #f85149' : '1px solid rgba(88, 166, 255, 0.4)',
          borderRadius: '6px',
          fontSize: '11px',
          color: isAudioMuted ? '#f85149' : '#7ee787',
          fontFamily: 'monospace',
          cursor: 'pointer',
          zIndex: 15,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <span>{isAudioMuted ? '🔇' : '🔊'}</span>
        <span>{isAudioMuted ? 'নিঃশব্দ (Muted) [M]' : 'শব্দ সক্রিয় (Audio) [M]'}</span>
      </button>

      {/* Bottom Right: Key Controls Helper — M36 gated by showKeyHints */}
      {showKeyHints && (
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
        [E] কথা বলুন · [F] রিকশা · [J] ডায়েরি · [I] থলে · [O] সেটিংস · [M] শব্দ · [N] আবহাওয়া
        {import.meta.env.DEV ? ' · [F3] ডিবাগ' : ''}
      </div>
      )}
    </>
  );
};
