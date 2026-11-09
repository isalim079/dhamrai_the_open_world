import React, { useEffect, useCallback } from 'react';
import { useUIStore } from '../state/useUIStore.js';
import { useGameStore } from '../state/useGameStore.js';
import { PHASE_1_DIALOGUE_TREES } from '@dhamrai/game-core';
import type { DialogueChoice } from '@dhamrai/shared-contracts';

export const DialogueBox: React.FC = () => {
  const isDialogueOpen = useUIStore((s) => s.isDialogueOpen);
  const currentTreeId = useUIStore((s) => s.currentDialogueTreeId);
  const currentNodeId = useUIStore((s) => s.currentDialogueNodeId);
  const closeDialogue = useUIStore((s) => s.closeDialogue);
  const setDialogueNode = useUIStore((s) => s.setDialogueNode);

  const activateMission = useGameStore((s) => s.activateMission);
  const completeObjective = useGameStore((s) => s.completeObjective);

  const tree = currentTreeId ? PHASE_1_DIALOGUE_TREES[currentTreeId] : null;
  const activeNodeId = currentNodeId ?? (tree ? tree.initialNodeId : '');
  const node = tree ? tree.nodes[activeNodeId] : null;

  const handleChoice = useCallback((choice: DialogueChoice) => {
    // Execute action triggers
    if (choice.actionTrigger === 'BOARD_PASSENGER') {
      activateMission('mission_1_first_fare');
      completeObjective('mission_1_first_fare', 'obj_m1_pickup');
      if (typeof window !== 'undefined' && (window as any).__dhamrai_engine) {
        (window as any).__dhamrai_engine.boardPassengerFarhana();
      }
    }

    if (choice.actionTrigger === 'CLOSE_DIALOGUE') {
      closeDialogue();
      return;
    }

    if (choice.nextNodeId) {
      setDialogueNode(choice.nextNodeId);
    } else {
      closeDialogue();
    }
  }, [activateMission, completeObjective, closeDialogue, setDialogueNode]);

  // Keyboard shortcut support: [1], [2], [Escape]
  useEffect(() => {
    if (!isDialogueOpen || !node) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeDialogue();
        return;
      }
      if (node.choices && node.choices.length > 0) {
        if (e.key === '1' && node.choices[0]) handleChoice(node.choices[0]);
        if (e.key === '2' && node.choices[1]) handleChoice(node.choices[1]);
        if (e.key === '3' && node.choices[2]) handleChoice(node.choices[2]);
      } else if (e.key === 'Enter' || e.key === ' ' || e.key === 'e' || e.key === 'E') {
        closeDialogue();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isDialogueOpen, node, closeDialogue, handleChoice]);

  if (!isDialogueOpen || !tree || !node) return null;

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 24,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '90%',
        maxWidth: '720px',
        backgroundColor: 'rgba(13, 17, 23, 0.94)',
        border: '2px solid rgba(88, 166, 255, 0.6)',
        borderRadius: '12px',
        padding: '18px 22px',
        color: '#f0f6fc',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        zIndex: 50,
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(8px)',
      }}
    >
      {/* Speaker Badge */}
      <div
        style={{
          display: 'inline-block',
          backgroundColor: '#1f6feb',
          color: '#ffffff',
          padding: '3px 12px',
          borderRadius: '12px',
          fontSize: '12px',
          fontWeight: 'bold',
          marginBottom: '8px',
          letterSpacing: '0.5px',
        }}
      >
        {node.speakerId.replace(/^npc_/, '').replace(/_/g, ' ').toUpperCase()}
      </div>

      {/* Bilingual Dialogue Text */}
      <div style={{ marginBottom: 14 }}>
        {/* Bengali Text (Primary) */}
        <div
          style={{
            fontSize: '16px',
            lineHeight: 1.6,
            fontWeight: 500,
            color: '#f0f6fc',
            marginBottom: 4,
          }}
        >
          {node.textBn}
        </div>
        {/* English Text (Secondary translation) */}
        <div
          style={{
            fontSize: '13px',
            lineHeight: 1.4,
            color: '#8b949e',
            fontStyle: 'italic',
          }}
        >
          {node.textEn}
        </div>
      </div>

      {/* Dialogue Choices */}
      {node.choices && node.choices.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {node.choices.map((choice, index) => (
            <button
              key={index}
              onClick={() => handleChoice(choice)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: 'rgba(33, 38, 45, 0.9)',
                border: '1px solid #30363d',
                borderRadius: '8px',
                padding: '10px 14px',
                color: '#c9d1d9',
                fontSize: '14px',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s ease-in-out',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(56, 139, 253, 0.2)';
                e.currentTarget.style.borderColor = '#58a6ff';
                e.currentTarget.style.color = '#ffffff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(33, 38, 45, 0.9)';
                e.currentTarget.style.borderColor = '#30363d';
                e.currentTarget.style.color = '#c9d1d9';
              }}
            >
              <div>
                <span
                  style={{
                    display: 'inline-block',
                    width: 22,
                    fontWeight: 'bold',
                    color: '#58a6ff',
                  }}
                >
                  [{index + 1}]
                </span>
                <span>{choice.textBn}</span>
                <span style={{ color: '#8b949e', marginLeft: 8, fontSize: '12px' }}>
                  ({choice.textEn})
                </span>
              </div>
              <span style={{ color: '#58a6ff', fontSize: '12px' }}>↵</span>
            </button>
          ))}
        </div>
      ) : (
        /* End of dialogue branch dismiss prompt */
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
          <button
            onClick={closeDialogue}
            style={{
              backgroundColor: '#238636',
              border: 'none',
              borderRadius: '6px',
              padding: '6px 16px',
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: 'bold',
              cursor: 'pointer',
            }}
          >
            বিদায় / Close [Enter]
          </button>
        </div>
      )}
    </div>
  );
};
