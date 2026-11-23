import React, { useEffect } from 'react';
import { useUIStore } from '../state/useUIStore.js';
import { useSettingsStore } from '../state/useSettingsStore.js';

export const SettingsModal: React.FC = () => {
  const open = useUIStore((s) => s.isSettingsOpen);
  const toggle = useUIStore((s) => s.toggleSettings);
  const hydrate = useSettingsStore((s) => s.hydrate);
  const reduceMotion = useSettingsStore((s) => s.reduceMotion);
  const highContrast = useSettingsStore((s) => s.highContrast);
  const showKeyHints = useSettingsStore((s) => s.showKeyHints);
  const diagnosticsConsent = useSettingsStore((s) => s.diagnosticsConsent);
  const fontScale = useSettingsStore((s) => s.fontScale);
  const setReduceMotion = useSettingsStore((s) => s.setReduceMotion);
  const setHighContrast = useSettingsStore((s) => s.setHighContrast);
  const setShowKeyHints = useSettingsStore((s) => s.setShowKeyHints);
  const setDiagnosticsConsent = useSettingsStore((s) => s.setDiagnosticsConsent);
  const setFontScale = useSettingsStore((s) => s.setFontScale);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  if (!open) return null;

  const row = (label: string, control: React.ReactNode) => (
    <label
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 16,
        padding: '10px 0',
        borderBottom: '1px solid #21262d',
        fontSize: 13,
        color: '#c9d1d9',
      }}
    >
      <span>{label}</span>
      {control}
    </label>
  );

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: 'rgba(0,0,0,0.75)',
        zIndex: 110,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={toggle}
    >
      <div
        style={{
          width: '90%',
          maxWidth: 420,
          background: highContrast ? '#000' : '#0d1117',
          border: `1px solid ${highContrast ? '#fff' : '#30363d'}`,
          borderRadius: 12,
          padding: 20,
          color: '#f0f6fc',
          fontSize: `${13 * fontScale}px`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>সেটিংস / Settings</h2>
          <button
            type="button"
            onClick={toggle}
            style={{ background: 'none', border: 'none', color: '#8b949e', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>
        {row(
          'গতি কমান (Reduce motion)',
          <input type="checkbox" checked={reduceMotion} onChange={(e) => setReduceMotion(e.target.checked)} />
        )}
        {row(
          'উচ্চ বৈসাদৃশ্য (High contrast)',
          <input type="checkbox" checked={highContrast} onChange={(e) => setHighContrast(e.target.checked)} />
        )}
        {row(
          'কীবোর্ড ইঙ্গিত (Key hints)',
          <input type="checkbox" checked={showKeyHints} onChange={(e) => setShowKeyHints(e.target.checked)} />
        )}
        {row(
          `ফন্ট স্কেল (${fontScale.toFixed(2)})`,
          <input
            type="range"
            min={0.85}
            max={1.4}
            step={0.05}
            value={fontScale}
            onChange={(e) => setFontScale(Number(e.target.value))}
          />
        )}
        {row(
          'ডায়াগনস্টিকস সম্মতি (Diagnostics opt-in)',
          <input
            type="checkbox"
            checked={diagnosticsConsent}
            onChange={(e) => setDiagnosticsConsent(e.target.checked)}
          />
        )}
        <p style={{ fontSize: 11, color: '#8b949e', marginTop: 12 }}>
          সেটিংস শুধু এই ডিভাইসে থাকে (localStorage)। সেভ ফাইলে যায় না। ডায়াগনস্টিকস অপ্ট-ইন ছাড়া
          পারফরম্যান্স ওভারলে দেখাবে না।
        </p>
        <p style={{ fontSize: 11, color: '#6e7681' }}>[O] সেটিংস · [F3] ডিবাগ (সম্মতি লাগবে)</p>
      </div>
    </div>
  );
};
