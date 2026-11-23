import React, { useEffect, useCallback } from 'react';
import { useUIStore } from '../state/useUIStore.js';
import { useGameStore } from '../state/useGameStore.js';
import {
  PHASE_1_DIALOGUE_TREES,
  BRASS_BELLS_CARGO_ITEM,
  createRepeatableFareDefinition,
} from '@dhamrai/game-core';
import { PHASE_1_ANCHORS, type DialogueChoice } from '@dhamrai/shared-contracts';
import { getActiveGameEngine } from '../engine/GameEngine.js';
import { getActiveAudioManager } from '../audio/index.js';

export const DialogueBox: React.FC = () => {
  const isDialogueOpen = useUIStore((s) => s.isDialogueOpen);
  const currentTreeId = useUIStore((s) => s.currentDialogueTreeId);
  const currentNodeId = useUIStore((s) => s.currentDialogueNodeId);
  const closeDialogue = useUIStore((s) => s.closeDialogue);
  const setDialogueNode = useUIStore((s) => s.setDialogueNode);

  const activateMission = useGameStore((s) => s.activateMission);
  const completeObjective = useGameStore((s) => s.completeObjective);
  const finishMission = useGameStore((s) => s.finishMission);
  const showToast = useGameStore((s) => s.showToast);

  const tree = currentTreeId ? PHASE_1_DIALOGUE_TREES[currentTreeId] : null;
  const activeNodeId = currentNodeId ?? (tree ? tree.initialNodeId : '');
  const node = tree ? tree.nodes[activeNodeId] : null;

  const handleChoice = useCallback((choice: DialogueChoice) => {
    const engine = useGameStore.getState().engine;
    const gameEngine = getActiveGameEngine();
    const audio = getActiveAudioManager();

    // Tactile UI click feedback
    audio?.ui.playDialogueClick();

    // 1. Mission 1: Board Student Farhana
    if (choice.actionTrigger === 'BOARD_PASSENGER') {
      audio?.ui.playMissionAccept();
      activateMission('mission_1_first_fare');
      completeObjective('mission_1_first_fare', 'obj_m1_pickup');
      gameEngine?.boardPassengerFarhana();
    }

    // 2. Mission 2: Inspect Rickshaw License Documents
    if (choice.actionTrigger === 'INSPECT_DOCUMENTS') {
      const hasLicense = engine?.inventory.hasItem('rickshaw_license_slip');
      if (hasLicense) {
        try {
          const m2Inst = useGameStore.getState().allMissions['mission_2_police_checkpoint'];
          if (!m2Inst || m2Inst.state === 'AVAILABLE') {
            activateMission('mission_2_police_checkpoint');
          }
          completeObjective('mission_2_police_checkpoint', 'obj_m2_approach');
          completeObjective('mission_2_police_checkpoint', 'obj_m2_show_docs');
          finishMission('mission_2_police_checkpoint');
          engine?.setWorldFlag('isMission2Done', true);
          showToast('কাগজপত্র যাচাই সম্পন্ন! (+৫ নাগরিক আস্থা)', 3500);
          if (choice.nextNodeId) {
            setDialogueNode(choice.nextNodeId);
          }
          return;
        } catch (err) {
          console.warn('Failed completing mission 2:', err);
        }
      } else {
        showToast('কাগজপত্র পাওয়া যায়নি! (No valid license in inventory)', 3500);
        setDialogueNode('node_strict_warning');
        return;
      }
    }

    // 3. Mission 3: Pick up Brass Cargo from Gouranga
    if (choice.actionTrigger === 'PICKUP_CARGO') {
      audio?.ui.playMissionAccept();
      try {
        const m3Inst = useGameStore.getState().allMissions['mission_3_artisan_order'];
        if (!m3Inst || m3Inst.state === 'AVAILABLE') {
          activateMission('mission_3_artisan_order');
        }
        completeObjective('mission_3_artisan_order', 'obj_m3_collect_cargo');
        if (engine && !engine.inventory.hasItem('brass_bells_cargo')) {
          engine.inventory.addItem(BRASS_BELLS_CARGO_ITEM);
          useGameStore.getState().syncFromEngine();
        }
        showToast('কাঁসার চালান তোলা হয়েছে! রথখোলায় নিয়ে যান (Cargo loaded)', 3500);
      } catch (err) {
        console.warn('Failed starting mission 3 cargo pickup:', err);
      }
    }

    // 4. Repeatable Fares: Board Kamal or Sufia
    if (choice.actionTrigger === 'START_FARE') {
      audio?.ui.playMissionAccept();
      const isKamal = currentTreeId === 'dialogue_fare_kamal';
      const passengerId = isKamal ? 'npc_passenger_kamal' : 'npc_passenger_sufia';
      const passengerNameBn = isKamal ? 'কামাল মিয়া' : 'সুফিয়া বেগম';
      const passengerNameEn = isKamal ? 'Kamal Mia' : 'Sufia Begum';
      const dropoffPos = isKamal
        ? PHASE_1_ANCHORS.THANA_JUNCTION_CHECKPOINT
        : PHASE_1_ANCHORS.KAYETPARA_METAL_WORKSHOP;
      const distanceM = isKamal ? 120 : 295;

      // Board passenger into vehicle 3D seat
      gameEngine?.boardPassenger(passengerId);

      // Create and register stable repeatable trip
      if (engine) {
        const tripId = `fare_trip_${Date.now()}`;
        const pickupPos = engine.player.position;
        const tripDef = createRepeatableFareDefinition(
          tripId,
          passengerNameBn,
          passengerNameEn,
          pickupPos,
          dropoffPos,
          distanceM
        );
        engine.missions.registerDefinition(tripDef);
        activateMission(tripId);
        useGameStore.getState().syncFromEngine();
        showToast(`${passengerNameBn} রিকশায় উঠেছেন! গন্তব্যে চলুন`, 3500);
      }
    }

    // 5. Milestone 13 — Tea stall consumables
    if (choice.actionTrigger === 'BUY_CHA' || choice.actionTrigger === 'BUY_BISCUITS') {
      if (!engine) {
        showToast('গেম লোড হয়নি (Game not ready)', 2500);
        return;
      }
      const itemId = choice.actionTrigger === 'BUY_CHA' ? 'cha_cup' : 'biscuits';
      const result = engine.purchaseConsumable(itemId, Date.now());
      if (!result.success) {
        audio?.ui.playDialogueClick();
        showToast('টাকা নেই! (Insufficient funds)', 3000);
        setDialogueNode('node_no_funds');
        return;
      }
      audio?.ui.playCoinPayout();
      useGameStore.getState().syncFromEngine();
      const label = itemId === 'cha_cup' ? 'চা' : 'বিস্কুট';
      showToast(`${label} কেনা হয়েছে — শক্তি পুনরুদ্ধার`, 3000);
    }

    // 6. Milestone 13 — Mistri / chain oil repairs
    if (
      choice.actionTrigger === 'REPAIR_TIRE' ||
      choice.actionTrigger === 'REPAIR_TUNE_UP' ||
      choice.actionTrigger === 'REPAIR_FULL' ||
      choice.actionTrigger === 'REPAIR_CHAIN_OIL'
    ) {
      if (!engine) {
        showToast('গেম লোড হয়নি (Game not ready)', 2500);
        return;
      }
      const serviceMap = {
        REPAIR_TIRE: 'tire_fix',
        REPAIR_TUNE_UP: 'tune_up',
        REPAIR_FULL: 'full_service',
        REPAIR_CHAIN_OIL: 'chain_oil',
      } as const;
      const serviceId = serviceMap[choice.actionTrigger];
      const result = engine.purchaseRepair(serviceId, Date.now());
      if (!result.success) {
        audio?.ui.playDialogueClick();
        showToast('টাকা নেই! (Insufficient funds)', 3000);
        if (choice.actionTrigger !== 'REPAIR_CHAIN_OIL') {
          setDialogueNode('node_no_funds');
        }
        return;
      }
      audio?.ui.playCoinPayout();
      useGameStore.getState().syncFromEngine();
      showToast('মেরামত সম্পন্ন! (Repair done)', 3000);
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
  }, [activateMission, completeObjective, finishMission, showToast, closeDialogue, setDialogueNode, currentTreeId]);

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
        if (e.key === '4' && node.choices[3]) handleChoice(node.choices[3]);
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
