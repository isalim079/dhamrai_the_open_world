import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../state/useAuthStore.js';
import { useUIStore } from '../state/useUIStore.js';
import { useGameStore } from '../state/useGameStore.js';
import { authService } from '../services/AuthService.js';
import { cloudSaveService } from '../services/CloudSaveService.js';

export const SaveManagerModal: React.FC = () => {
  const isAuthModalOpen = useAuthStore((s) => s.isSaveManagerOpen);
  const isUIModalOpen = useUIStore((s) => s.isSaveManagerOpen);
  const isOpen = isAuthModalOpen || isUIModalOpen;

  const closeSaveManager = () => {
    useAuthStore.getState().closeSaveManager();
    useUIStore.getState().setSaveManagerOpen(false);
  };

  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const syncStatus = useAuthStore((s) => s.syncStatus);
  const cloudMetadata = useAuthStore((s) => s.cloudMetadata);
  const lastSyncedAtIso = useAuthStore((s) => s.lastSyncedAtIso);
  const errorMessage = useAuthStore((s) => s.errorMessage);

  const cashFormattedBdt = useGameStore((s) => s.cashFormattedBdt);
  const reputation = useGameStore((s) => s.reputation);
  const lastSavedAtIso = useGameStore((s) => s.lastSavedAtIso);
  const saveGame = useGameStore((s) => s.saveGame);
  const exportSaveJson = useGameStore((s) => s.exportSaveJson);
  const importSaveJson = useGameStore((s) => s.importSaveJson);

  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isSyncingNow, setIsSyncingNow] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        closeSaveManager();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSignIn = async () => {
    setIsSigningIn(true);
    setFeedback(null);
    try {
      await authService.openGoogleLoginPopup();
      setFeedback('গুগল সাইন-ইন সফল হয়েছে! (Signed in successfully)');
      cloudSaveService.scheduleSync('Autosave', 500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setFeedback(`সাইন-ইন ব্যর্থ: ${msg}`);
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    await authService.logout();
    setFeedback('সাইন-আউট সম্পন্ন হয়েছে। (Signed out successfully)');
  };

  const handleSyncNow = async () => {
    setIsSyncingNow(true);
    setFeedback(null);
    try {
      await cloudSaveService.performSync('Autosave');
      setFeedback('ক্লাউড সিঙ্ক সফলভাবে সম্পন্ন হয়েছে! (Cloud sync complete)');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setFeedback(`সিঙ্ক ব্যর্থ: ${msg}`);
    } finally {
      setIsSyncingNow(false);
    }
  };

  const handleExport = async () => {
    const json = await exportSaveJson('Autosave');
    if (!json) return;
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dhamrai_save_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setFeedback('সেভ ফাইল সফলভাবে ডাউনলোড হয়েছে। (Save exported)');
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const text = reader.result as string;
        const ok = await importSaveJson(text);
        if (ok) {
          setFeedback('সেভ সফলভাবে লোড করা হয়েছে! (Save imported successfully)');
          cloudSaveService.scheduleSync('Autosave', 1000);
        } else {
          setFeedback('সেভ ফাইল ইমপোর্ট ব্যর্থ হয়েছে। (Import failed)');
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setFeedback(`ইমপোর্ট ত্রুটি: ${msg}`);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 110,
        backdropFilter: 'blur(6px)',
      }}
      onClick={closeSaveManager}
    >
      <div
        style={{
          width: '90%',
          maxWidth: '680px',
          maxHeight: '85vh',
          backgroundColor: '#0d1117',
          border: '1px solid #30363d',
          borderRadius: '12px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.8)',
          color: '#c9d1d9',
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid #21262d',
            backgroundColor: '#161b22',
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: '18px', color: '#f0f6fc' }}>
              অ্যাকাউন্ট ও ক্লাউড সেভ ব্যবস্থাপনা (Account & Cloud Save)
            </h2>
            <div style={{ fontSize: '12px', color: '#8b949e', marginTop: 2 }}>
              ধামরাই পৌরসভা জীবনযাত্রা — গুগল ড্রাইভ ব্যাকআপ
            </div>
          </div>
          <button
            onClick={closeSaveManager}
            style={{
              background: 'none',
              border: 'none',
              color: '#8b949e',
              fontSize: '20px',
              cursor: 'pointer',
              padding: '4px 8px',
            }}
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div
          style={{
            padding: '20px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          {feedback && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: '6px',
                backgroundColor: feedback.includes('ব্যর্থ') || feedback.includes('ত্রুটি')
                  ? 'rgba(239, 68, 68, 0.15)'
                  : 'rgba(16, 185, 129, 0.15)',
                border: feedback.includes('ব্যর্থ') || feedback.includes('ত্রুটি')
                  ? '1px solid #ef4444'
                  : '1px solid #10b981',
                color: feedback.includes('ব্যর্থ') || feedback.includes('ত্রুটি')
                  ? '#fca5a5'
                  : '#6ee7b7',
                fontSize: '13px',
              }}
            >
              {feedback}
            </div>
          )}

          {/* Account Profile Card */}
          <div
            style={{
              backgroundColor: '#161b22',
              border: '1px solid #30363d',
              borderRadius: '8px',
              padding: '16px',
            }}
          >
            <h3
              style={{
                margin: '0 0 12px 0',
                fontSize: '14px',
                color: '#58a6ff',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              গুগল অ্যাকাউন্ট পরিচিতি (Google Account)
            </h3>

            {isAuthenticated && user ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '50%',
                      backgroundColor: '#238636',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '18px',
                      fontWeight: 'bold',
                      color: '#ffffff',
                    }}
                  >
                    {user.name ? user.name[0]?.toUpperCase() : '👤'}
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: '15px',
                        fontWeight: 600,
                        color: '#f0f6fc',
                      }}
                    >
                      {user.name || 'অজ্ঞাত চালক (Driver)'}
                    </div>
                    <div style={{ fontSize: '13px', color: '#8b949e' }}>
                      {user.email}
                    </div>
                    <div style={{ fontSize: '11px', color: '#6e7681', marginTop: 2 }}>
                      আইডি: {user.id}
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleSignOut}
                  style={{
                    padding: '8px 14px',
                    backgroundColor: '#21262d',
                    border: '1px solid #30363d',
                    borderRadius: '6px',
                    color: '#f85149',
                    fontSize: '13px',
                    cursor: 'pointer',
                    fontWeight: 500,
                  }}
                >
                  সাইন আউট (Sign Out)
                </button>
              </div>
            ) : (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}
              >
                <div>
                  <div style={{ fontSize: '14px', color: '#f0f6fc', fontWeight: 500 }}>
                    গুগল সাইন-ইন সক্রিয় নয় (Not Signed In)
                  </div>
                  <div style={{ fontSize: '12px', color: '#8b949e', marginTop: 2 }}>
                    গুগল ড্রাইভ appDataFolder-এ সুরক্ষিত ক্লাউড সেভের জন্য সাইন ইন করুন।
                  </div>
                </div>

                <button
                  onClick={handleSignIn}
                  disabled={isSigningIn}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 16px',
                    backgroundColor: '#238636',
                    border: '1px solid rgba(240, 246, 252, 0.1)',
                    borderRadius: '6px',
                    color: '#ffffff',
                    fontSize: '13px',
                    cursor: isSigningIn ? 'wait' : 'pointer',
                    fontWeight: 600,
                  }}
                >
                  {isSigningIn ? 'অপেক্ষা করুন...' : 'গুগল সাইন ইন (Sign In)'}
                </button>
              </div>
            )}
          </div>

          {/* Cloud Save Sync Status Card */}
          <div
            style={{
              backgroundColor: '#161b22',
              border: '1px solid #30363d',
              borderRadius: '8px',
              padding: '16px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '12px',
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontSize: '14px',
                  color: '#58a6ff',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                ক্লাউড সেভ অবস্থা (Cloud Save Status)
              </h3>
              <div
                style={{
                  padding: '4px 10px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: 600,
                  backgroundColor:
                    syncStatus === 'SYNCED'
                      ? 'rgba(16, 185, 129, 0.2)'
                      : syncStatus === 'SYNCING'
                      ? 'rgba(59, 130, 246, 0.2)'
                      : syncStatus === 'CONFLICT' || syncStatus === 'SYNC_ERROR'
                      ? 'rgba(239, 68, 68, 0.2)'
                      : 'rgba(107, 114, 128, 0.2)',
                  color:
                    syncStatus === 'SYNCED'
                      ? '#34d399'
                      : syncStatus === 'SYNCING'
                      ? '#60a5fa'
                      : syncStatus === 'CONFLICT' || syncStatus === 'SYNC_ERROR'
                      ? '#f87171'
                      : '#9ca3af',
                  border:
                    syncStatus === 'SYNCED'
                      ? '1px solid #10b981'
                      : syncStatus === 'SYNCING'
                      ? '1px solid #3b82f6'
                      : syncStatus === 'CONFLICT' || syncStatus === 'SYNC_ERROR'
                      ? '1px solid #ef4444'
                      : '1px solid #4b5563',
                }}
              >
                {syncStatus === 'SYNCED' && '☁️ সিঙ্ক সম্পন্ন (Synced)'}
                {syncStatus === 'SYNCING' && '🔄 সিঙ্ক হচ্ছে... (Syncing)'}
                {syncStatus === 'PENDING_UPLOAD' && '⏳ অপেক্ষমাণ (Pending)'}
                {syncStatus === 'LOCAL_ONLY' && '💾 লোকাল সেভ (Local Only)'}
                {syncStatus === 'OFFLINE' && '⚡ অফলাইন (Offline)'}
                {syncStatus === 'LOCKED_BY_OTHER_TAB' && '🔒 অন্য ট্যাবে সক্রিয় (Locked)'}
                {syncStatus === 'CONFLICT' && '⚠️ অসঙ্গতি (Conflict)'}
                {syncStatus === 'SYNC_ERROR' && '❌ সিঙ্ক ত্রুটি (Sync Error)'}
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '12px',
                fontSize: '13px',
                marginBottom: '16px',
              }}
            >
              <div
                style={{
                  backgroundColor: '#0d1117',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  border: '1px solid #21262d',
                }}
              >
                <div style={{ color: '#8b949e', fontSize: '11px' }}>ক্লাউড স্লট (Slot)</div>
                <div style={{ color: '#f0f6fc', fontWeight: 500, marginTop: 2 }}>Autosave</div>
              </div>

              <div
                style={{
                  backgroundColor: '#0d1117',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  border: '1px solid #21262d',
                }}
              >
                <div style={{ color: '#8b949e', fontSize: '11px' }}>রিমোট সংস্করণ (Version)</div>
                <div
                  style={{
                    color: '#f0f6fc',
                    fontWeight: 500,
                    marginTop: 2,
                    fontFamily: 'monospace',
                  }}
                >
                  {cloudMetadata?.version
                    ? `${cloudMetadata.version.slice(0, 12)}...`
                    : 'N/A'}
                </div>
              </div>

              <div
                style={{
                  backgroundColor: '#0d1117',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  border: '1px solid #21262d',
                }}
              >
                <div style={{ color: '#8b949e', fontSize: '11px' }}>
                  সর্বশেষ সিঙ্ক (Last Sync)
                </div>
                <div style={{ color: '#f0f6fc', fontWeight: 500, marginTop: 2 }}>
                  {lastSyncedAtIso
                    ? new Date(lastSyncedAtIso).toLocaleTimeString()
                    : 'অপেক্ষমাণ (Pending)'}
                </div>
              </div>

              <div
                style={{
                  backgroundColor: '#0d1117',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  border: '1px solid #21262d',
                }}
              >
                <div style={{ color: '#8b949e', fontSize: '11px' }}>
                  SHA-256 চেকার (Checksum)
                </div>
                <div
                  style={{
                    color: '#f0f6fc',
                    fontWeight: 500,
                    marginTop: 2,
                    fontFamily: 'monospace',
                  }}
                >
                  {cloudMetadata?.checksumSha256
                    ? `${cloudMetadata.checksumSha256.slice(0, 10)}...`
                    : 'যাচাইকৃত (Verified)'}
                </div>
              </div>
            </div>

            {errorMessage && (
              <div
                style={{
                  marginBottom: '14px',
                  fontSize: '12px',
                  color: '#f85149',
                }}
              >
                ত্রুটি বার্তা: {errorMessage}
              </div>
            )}

            <button
              onClick={handleSyncNow}
              disabled={!isAuthenticated || isSyncingNow}
              style={{
                width: '100%',
                padding: '10px',
                backgroundColor: isAuthenticated ? '#1f6feb' : '#21262d',
                border: '1px solid rgba(240, 246, 252, 0.1)',
                borderRadius: '6px',
                color: isAuthenticated ? '#ffffff' : '#6e7681',
                fontSize: '13px',
                fontWeight: 600,
                cursor: isAuthenticated && !isSyncingNow ? 'pointer' : 'not-allowed',
              }}
            >
              {isSyncingNow ? 'সিঙ্ক হচ্ছে...' : '🔄 এখনই ক্লাউডে সিঙ্ক করুন (Sync Now)'}
            </button>
          </div>

          {/* Local Dexie Save Card */}
          <div
            style={{
              backgroundColor: '#161b22',
              border: '1px solid #30363d',
              borderRadius: '8px',
              padding: '16px',
            }}
          >
            <h3
              style={{
                margin: '0 0 12px 0',
                fontSize: '14px',
                color: '#58a6ff',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              লোকাল সেভ ও ব্যাকআপ (Local Dexie Save & Backup)
            </h3>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '13px',
                marginBottom: '12px',
                color: '#8b949e',
              }}
            >
              <div>
                ব্যালেন্স: <strong style={{ color: '#f0f6fc' }}>{cashFormattedBdt}</strong>
              </div>
              <div>
                সুনাম (Reputation):{' '}
                <strong style={{ color: '#f59e0b' }}>★ {reputation}</strong>
              </div>
              <div>
                সর্বশেষ লোকাল সেভ:{' '}
                <strong style={{ color: '#f0f6fc' }}>
                  {lastSavedAtIso
                    ? new Date(lastSavedAtIso).toLocaleTimeString()
                    : 'স্বয়ংক্রিয়'}
                </strong>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button
                onClick={() => {
                  saveGame('Autosave');
                  cloudSaveService.scheduleSync('Autosave', 500);
                }}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  backgroundColor: '#21262d',
                  border: '1px solid #30363d',
                  borderRadius: '6px',
                  color: '#f0f6fc',
                  fontSize: '13px',
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
              >
                💾 লোকাল সেভ (Manual Save)
              </button>

              <button
                onClick={handleExport}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  backgroundColor: '#21262d',
                  border: '1px solid #30363d',
                  borderRadius: '6px',
                  color: '#f0f6fc',
                  fontSize: '13px',
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
              >
                📥 সেভ এক্সপোর্ট (Export JSON)
              </button>

              <label
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  backgroundColor: '#21262d',
                  border: '1px solid #30363d',
                  borderRadius: '6px',
                  color: '#f0f6fc',
                  fontSize: '13px',
                  cursor: 'pointer',
                  fontWeight: 500,
                  textAlign: 'center',
                }}
              >
                📤 সেভ ইমপোর্ট (Import JSON)
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={handleImport}
                  style={{ display: 'none' }}
                />
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
