import React, { useState } from 'react';
import { useUIStore } from '../state/useUIStore.js';
import { useGameStore } from '../state/useGameStore.js';
import {
  PHASE_1_MISSIONS,
  LANDMARK_DEFINITIONS,
  PLOT_DEFINITIONS,
  BUILDING_TEMPLATES,
} from '@dhamrai/game-core';

export const JournalModal: React.FC = () => {
  const isJournalOpen = useUIStore((s) => s.isJournalOpen);
  const toggleJournal = useUIStore((s) => s.toggleJournal);
  const allMissions = useGameStore((s) => s.allMissions);
  const engine = useGameStore((s) => s.engine);

  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'COMPLETED' | 'LANDMARKS' | 'PROPERTY'>(
    'ACTIVE'
  );
  const discoveredIds = new Set(engine?.getDiscoveredLandmarkIds() ?? []);
  const discoveredCount = discoveredIds.size;
  const ownedPlotIds = new Set(engine?.getOwnedPlotIds() ?? []);
  const inspectedPlotIds = new Set(engine?.getInspectedPlotIds() ?? []);
  const plotBuildings = engine?.getPlotBuildings() ?? {};

  if (!isJournalOpen) return null;

  const allMissionDefs: Record<string, import('@dhamrai/shared-contracts').MissionDefinition> = { ...PHASE_1_MISSIONS };
  if (engine) {
    for (const id of Object.keys(allMissions)) {
      if (!allMissionDefs[id]) {
        const def = engine.missions.getDefinition(id);
        if (def) allMissionDefs[id] = def;
      }
    }
  }

  const activeMissionList = Object.entries(allMissionDefs).filter(([id]) => {
    const inst = allMissions[id];
    return inst ? inst.state === 'ACTIVE' || inst.state === 'AVAILABLE' : true;
  });

  const completedMissionList = Object.entries(allMissionDefs).filter(([id]) => {
    const inst = allMissions[id];
    return inst && inst.state === 'COMPLETED';
  });

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
        zIndex: 100,
        backdropFilter: 'blur(6px)',
      }}
      onClick={toggleJournal}
    >
      <div
        style={{
          width: '90%',
          maxWidth: '680px',
          maxHeight: '80vh',
          backgroundColor: '#0d1117',
          border: '1px solid #30363d',
          borderRadius: '12px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.8)',
          color: '#c9d1d9',
          fontFamily: 'system-ui, -apple-system, sans-serif',
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
              ডায়েরি ও কর্মতালিকা (Journal & Tasks)
            </h2>
            <div style={{ fontSize: '12px', color: '#8b949e', marginTop: 2 }}>
              ধামরাই পৌরসভা জীবনযাত্রা
            </div>
          </div>
          <button
            onClick={toggleJournal}
            style={{
              background: 'none',
              border: 'none',
              color: '#8b949e',
              cursor: 'pointer',
              fontSize: '18px',
            }}
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid #21262d', backgroundColor: '#0d1117' }}>
          <button
            onClick={() => setActiveTab('ACTIVE')}
            style={{
              flex: 1,
              padding: '10px 14px',
              backgroundColor: activeTab === 'ACTIVE' ? '#161b22' : 'transparent',
              border: 'none',
              borderBottom: activeTab === 'ACTIVE' ? '2px solid #58a6ff' : 'none',
              color: activeTab === 'ACTIVE' ? '#58a6ff' : '#8b949e',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            চলতি দায়িত্ব ({activeMissionList.length})
          </button>
          <button
            onClick={() => setActiveTab('COMPLETED')}
            style={{
              flex: 1,
              padding: '10px 14px',
              backgroundColor: activeTab === 'COMPLETED' ? '#161b22' : 'transparent',
              border: 'none',
              borderBottom: activeTab === 'COMPLETED' ? '2px solid #58a6ff' : 'none',
              color: activeTab === 'COMPLETED' ? '#58a6ff' : '#8b949e',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            সম্পন্ন কাজ ({completedMissionList.length})
          </button>
          <button
            onClick={() => setActiveTab('LANDMARKS')}
            style={{
              flex: 1,
              padding: '10px 14px',
              backgroundColor: activeTab === 'LANDMARKS' ? '#161b22' : 'transparent',
              border: 'none',
              borderBottom: activeTab === 'LANDMARKS' ? '2px solid #58a6ff' : 'none',
              color: activeTab === 'LANDMARKS' ? '#58a6ff' : '#8b949e',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            ধামরাই পরিচিতি ({discoveredCount}/{LANDMARK_DEFINITIONS.length})
          </button>
          <button
            onClick={() => setActiveTab('PROPERTY')}
            style={{
              flex: 1,
              padding: '10px 14px',
              backgroundColor: activeTab === 'PROPERTY' ? '#161b22' : 'transparent',
              border: 'none',
              borderBottom: activeTab === 'PROPERTY' ? '2px solid #58a6ff' : 'none',
              color: activeTab === 'PROPERTY' ? '#58a6ff' : '#8b949e',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            সম্পত্তি ({ownedPlotIds.size}/{PLOT_DEFINITIONS.length})
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {activeTab === 'ACTIVE' && (
            <>
              {activeMissionList.map(([id, def]) => {
                const inst = allMissions[id];
                const completedIds = inst?.completedObjectiveIds ?? [];
                return (
                  <div
                    key={id}
                    style={{
                      backgroundColor: '#161b22',
                      border: '1px solid #30363d',
                      borderRadius: '8px',
                      padding: '14px 16px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#f0f6fc' }}>
                          {def.bengaliTitle}
                        </div>
                        <div style={{ fontSize: '12px', color: '#8b949e' }}>
                          {def.englishTitle}
                        </div>
                      </div>
                      <div style={{ backgroundColor: '#238636', color: '#fff', fontSize: '12px', padding: '2px 8px', borderRadius: '12px', fontWeight: 'bold' }}>
                        ৳{(def.rewardMinorUnits / 100).toFixed(2)}
                      </div>
                    </div>

                    <div style={{ fontSize: '13px', color: '#c9d1d9', marginTop: 8, lineHeight: '1.4' }}>
                      {def.description}
                    </div>

                    {/* Objectives Checklist */}
                    <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {def.objectives.map((obj) => {
                        const isDone = completedIds.includes(obj.id);
                        return (
                          <div
                            key={obj.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8,
                              fontSize: '13px',
                              color: isDone ? '#7ee787' : '#8b949e',
                            }}
                          >
                            <span>{isDone ? '✓' : '○'}</span>
                            <span>{obj.bengaliTitle}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </>
          )}

          {activeTab === 'COMPLETED' && (
            <>
              {completedMissionList.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#8b949e' }}>
                  এখনো কোনো কাজ সম্পন্ন হয়নি। রথখোলা থেকে ফারহানাকে হার্ডিঞ্জ স্কুলে পৌঁছে দিন!
                </div>
              ) : (
                completedMissionList.map(([id, def]) => (
                  <div
                    key={id}
                    style={{
                      backgroundColor: '#161b22',
                      border: '1px solid #238636',
                      borderRadius: '8px',
                      padding: '12px 16px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#f0f6fc' }}>
                        ✓ {def.bengaliTitle}
                      </div>
                      <div style={{ fontSize: '12px', color: '#7ee787', marginTop: 2 }}>
                        পুরস্কার গৃহীত: ৳{(def.rewardMinorUnits / 100).toFixed(2)} BDT (+{def.reputationDelta} সুনাম)
                      </div>
                    </div>
                  </div>
                ))
              )}
            </>
          )}

          {activeTab === 'PROPERTY' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontSize: '12px', color: '#8b949e', marginBottom: 4 }}>
                কাল্পনিক প্লট স্তর — আসল খতিয়ান নয়। রথখোলার কাছে [E] দিয়ে পরিদর্শন / ক্রয় / নির্মাণ / ভাড়া।
                {engine?.hasRepairGarage() ? ' · গ্যারেজ মালিকানা: মেরামতে ছাড় সক্রিয়।' : ''}
              </div>
              {PLOT_DEFINITIONS.map((plot) => {
                const owned = ownedPlotIds.has(plot.id);
                const seen = inspectedPlotIds.has(plot.id) || owned;
                const building = plotBuildings[plot.id] ?? 'none';
                const buildingLabel =
                  building !== 'none' && BUILDING_TEMPLATES[building]
                    ? `${BUILDING_TEMPLATES[building].nameBn} / ${BUILDING_TEMPLATES[building].nameEn}`
                    : 'কোনো ভবন নেই';
                return (
                  <div
                    key={plot.id}
                    style={{
                      backgroundColor: '#161b22',
                      padding: '12px 14px',
                      borderRadius: '8px',
                      border: `1px solid ${owned ? '#238636' : '#30363d'}`,
                      opacity: seen ? 1 : 0.55,
                    }}
                  >
                    <strong style={{ color: owned ? '#3fb950' : seen ? '#58a6ff' : '#8b949e' }}>
                      {owned ? '✓ মালিকানা · ' : seen ? '○ পরিদর্শিত · ' : '○ '}
                      {seen ? `${plot.nameBn} (${plot.nameEn})` : '??? — অদেখা প্লট'}
                    </strong>
                    {seen && (
                      <>
                        <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#c9d1d9' }}>
                          {plot.blurbBn}
                        </p>
                        <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#8b949e' }}>
                          দাম ৳{(plot.priceMinorUnits / 100).toFixed(0)} · জোনিং {plot.zoning} · ভাড়া ৳
                          {(plot.rentalIncomeMinorUnits / 100).toFixed(0)}
                        </p>
                        {owned && (
                          <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#7ee787' }}>
                            ভবন: {buildingLabel}
                          </p>
                        )}
                        <p style={{ margin: '6px 0 0', fontSize: '10px', color: '#6e7681' }}>
                          {plot.sourceNote}
                        </p>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'LANDMARKS' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontSize: '12px', color: '#8b949e', marginBottom: 4 }}>
                কাছাকাছি গেলে ল্যান্ডমার্ক আবিষ্কৃত হয়। উৎস নোটগুলি প্রকল্পের পরিচিতি — সার্টিফাইড ইতিহাস নয়।
              </div>
              {LANDMARK_DEFINITIONS.map((lm) => {
                const unlocked = discoveredIds.has(lm.id);
                return (
                  <div
                    key={lm.id}
                    style={{
                      backgroundColor: '#161b22',
                      padding: '12px 14px',
                      borderRadius: '8px',
                      border: `1px solid ${unlocked ? '#238636' : '#30363d'}`,
                      opacity: unlocked ? 1 : 0.55,
                    }}
                  >
                    <strong style={{ color: unlocked ? '#58a6ff' : '#8b949e' }}>
                      {unlocked ? '✓ ' : '○ '}
                      {unlocked ? `${lm.nameBn} (${lm.nameEn})` : '??? — অনাবিষ্কৃত'}
                    </strong>
                    {unlocked ? (
                      <>
                        <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#c9d1d9' }}>
                          {lm.blurbBn}
                        </p>
                        <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#8b949e' }}>
                          {lm.blurbEn}
                        </p>
                        <p style={{ margin: '6px 0 0', fontSize: '10px', color: '#6e7681' }}>
                          Source: {lm.sourceNote}
                        </p>
                      </>
                    ) : (
                      <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#8b949e' }}>
                        এই স্থানে পৌঁছালে আবিষ্কার হবে।
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
