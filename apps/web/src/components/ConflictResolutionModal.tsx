import React, { useState } from 'react';
import { useAuthStore } from '../state/useAuthStore.js';
import { cloudSaveService, type ConflictResolutionChoice } from '../services/CloudSaveService.js';

export const ConflictResolutionModal: React.FC = () => {
  const isConflictModalOpen = useAuthStore((s) => s.isConflictModalOpen);
  const conflictData = useAuthStore((s) => s.conflictData);
  const [isResolving, setIsResolving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isConflictModalOpen || !conflictData) return null;

  const { local, remote } = conflictData;

  const handleResolve = async (choice: ConflictResolutionChoice) => {
    setIsResolving(true);
    setErrorMessage(null);
    try {
      await cloudSaveService.resolveConflict(choice, local.slotName || 'Autosave');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(`অসঙ্গতি সমাধান ব্যর্থ হয়েছে: ${msg}`);
      setIsResolving(false);
    }
  };

  const formatBdt = (poisha: number) => `৳${(poisha / 100).toFixed(2)}`;

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(0, 0, 0, 0.82)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 120,
        backdropFilter: 'blur(8px)',
      }}
    >
      <div
        style={{
          width: '92%',
          maxWidth: '680px',
          backgroundColor: '#0d1117',
          border: '1px solid #d29922',
          borderRadius: '12px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 8px 36px rgba(210, 153, 34, 0.25)',
          color: '#c9d1d9',
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            backgroundColor: '#1b170c',
            borderBottom: '1px solid #d29922',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <span style={{ fontSize: '24px' }}>⚠️</span>
          <div>
            <h2 style={{ margin: 0, fontSize: '18px', color: '#e3b341' }}>
              সেভ ফাইল অসঙ্গতি সনাক্ত হয়েছে (Save Conflict Detected)
            </h2>
            <div style={{ fontSize: '12px', color: '#8b949e', marginTop: 2 }}>
              আপনার ডিভাইসের লোকাল সেভ এবং ক্লাউডের সেভের মধ্যে ভিন্নতা রয়েছে।
            </div>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: '20px' }}>
          {errorMessage && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: '6px',
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid #ef4444',
                color: '#fca5a5',
                fontSize: '13px',
                marginBottom: '16px',
              }}
            >
              {errorMessage}
            </div>
          )}

          <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#c9d1d9' }}>
            নিচের তুলনা দেখে নির্বাচন করুন আপনি কোন অগ্রগতি বজায় রাখতে চান। কোনো সেভ অপরটির উপর নীরবে প্রতিস্থাপিত হবে না।
          </p>

          {/* Comparison Cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '16px',
              marginBottom: '20px',
            }}
          >
            {/* Local Card */}
            <div
              style={{
                backgroundColor: '#161b22',
                border: '1px solid #30363d',
                borderRadius: '8px',
                padding: '14px',
              }}
            >
              <div
                style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#58a6ff',
                  marginBottom: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                💾 বর্তমান ডিভাইস (Local Device)
              </div>
              <div style={{ fontSize: '12px', color: '#8b949e', marginBottom: '6px' }}>
                তারিখ:{' '}
                <strong style={{ color: '#f0f6fc' }}>
                  {new Date(local.updatedAtIso).toLocaleString()}
                </strong>
              </div>
              <div style={{ fontSize: '12px', color: '#8b949e', marginBottom: '6px' }}>
                নগদ ব্যালেন্স:{' '}
                <strong style={{ color: '#f0f6fc' }}>
                  {formatBdt(local.player?.cashMinorUnits ?? 0)}
                </strong>
              </div>
              <div style={{ fontSize: '12px', color: '#8b949e', marginBottom: '6px' }}>
                সুনাম (Reputation):{' '}
                <strong style={{ color: '#f59e0b' }}>
                  ★ {local.player?.reputation ?? 0}
                </strong>
              </div>
              <div style={{ fontSize: '11px', color: '#6e7681', fontFamily: 'monospace' }}>
                SHA: {local.checksumSha256?.slice(0, 12)}...
              </div>
            </div>

            {/* Cloud Card */}
            <div
              style={{
                backgroundColor: '#161b22',
                border: '1px solid #30363d',
                borderRadius: '8px',
                padding: '14px',
              }}
            >
              <div
                style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#3fb950',
                  marginBottom: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                ☁️ গুগল ড্রাইভ (Google Drive)
              </div>
              <div style={{ fontSize: '12px', color: '#8b949e', marginBottom: '6px' }}>
                তারিখ:{' '}
                <strong style={{ color: '#f0f6fc' }}>
                  {new Date(remote.updatedAtIso).toLocaleString()}
                </strong>
              </div>
              <div style={{ fontSize: '12px', color: '#8b949e', marginBottom: '6px' }}>
                নগদ ব্যালেন্স:{' '}
                <strong style={{ color: '#f0f6fc' }}>
                  {formatBdt(remote.player?.cashMinorUnits ?? 0)}
                </strong>
              </div>
              <div style={{ fontSize: '12px', color: '#8b949e', marginBottom: '6px' }}>
                সুনাম (Reputation):{' '}
                <strong style={{ color: '#f59e0b' }}>
                  ★ {remote.player?.reputation ?? 0}
                </strong>
              </div>
              <div style={{ fontSize: '11px', color: '#6e7681', fontFamily: 'monospace' }}>
                SHA: {remote.checksumSha256?.slice(0, 12)}...
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button
              onClick={() => handleResolve('KEEP_CLOUD')}
              disabled={isResolving}
              style={{
                padding: '12px',
                backgroundColor: '#238636',
                border: '1px solid rgba(240, 246, 252, 0.1)',
                borderRadius: '6px',
                color: '#ffffff',
                fontSize: '13px',
                fontWeight: 600,
                cursor: isResolving ? 'wait' : 'pointer',
                textAlign: 'left',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span>☁️ ক্লাউড সেভ গ্রহণ করুন (Use Cloud Save)</span>
              <span style={{ fontSize: '11px', opacity: 0.8 }}>ড্রাইভের সেভ দিয়ে লোড করবে</span>
            </button>

            <button
              onClick={() => handleResolve('KEEP_LOCAL')}
              disabled={isResolving}
              style={{
                padding: '12px',
                backgroundColor: '#1f6feb',
                border: '1px solid rgba(240, 246, 252, 0.1)',
                borderRadius: '6px',
                color: '#ffffff',
                fontSize: '13px',
                fontWeight: 600,
                cursor: isResolving ? 'wait' : 'pointer',
                textAlign: 'left',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span>💾 বর্তমান সেভ ক্লাউডে রাখুন (Keep Local Save)</span>
              <span style={{ fontSize: '11px', opacity: 0.8 }}>ড্রাইভের সেভ প্রতিস্থাপন করবে</span>
            </button>

            <button
              onClick={() => handleResolve('KEEP_BOTH')}
              disabled={isResolving}
              style={{
                padding: '12px',
                backgroundColor: '#21262d',
                border: '1px solid #30363d',
                borderRadius: '6px',
                color: '#f0f6fc',
                fontSize: '13px',
                fontWeight: 500,
                cursor: isResolving ? 'wait' : 'pointer',
                textAlign: 'left',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span>📂 দুটিই সংরক্ষণ করুন (Keep Both)</span>
              <span style={{ fontSize: '11px', color: '#8b949e' }}>
                লোকাল ব্যাকআপ রেখে ক্লাউড সেভ লোড করবে
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
