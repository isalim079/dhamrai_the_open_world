import { create } from 'zustand';
import {
  GameCoreEngine,
  MissionInstance,
} from '@dhamrai/game-core';
import {
  SaveOrchestrator,
  IndexedDBStorageAdapter,
  MemoryStorageAdapter,
  SaveSlotMetadata,
} from '@dhamrai/save-core';
import type {
  SaveEnvelopeV2,
  InventoryItem,
} from '@dhamrai/shared-contracts';
import { cloudSaveService } from '../services/CloudSaveService.js';
import { getActiveGameEngine } from '../engine/GameEngine.js';
import { getActiveAudioManager } from '../audio/index.js';

export interface GameState {
  engine: GameCoreEngine | null;
  orchestrator: SaveOrchestrator | null;
  isInitialized: boolean;
  isSaving: boolean;

  // Reactive projections from GameCoreEngine for React UI
  cashMinorUnits: number;
  cashFormattedBdt: string;
  reputation: number;
  inventoryItems: InventoryItem[];
  activeMissions: Record<string, MissionInstance>;
  allMissions: Record<string, MissionInstance>;
  currentActiveMissionId: string | null;
  saveSlots: SaveSlotMetadata[];
  lastSavedAtIso: string | null;
  toastMessage: string | null;

  initGame: (customEnvelope?: SaveEnvelopeV2) => Promise<void>;
  syncFromEngine: () => void;
  saveGame: (slotName?: string) => Promise<boolean>;
  loadGame: (slotName: string) => Promise<boolean>;
  exportSaveJson: (slotName?: string) => Promise<string | null>;
  importSaveJson: (jsonString: string) => Promise<boolean>;
  activateMission: (missionId: string) => void;
  completeObjective: (missionId: string, objectiveId: string) => void;
  finishMission: (missionId: string) => void;
  showToast: (msg: string, durationMs?: number) => void;
}

function formatPoishaToBdt(minorUnits: number): string {
  const taka = minorUnits / 100;
  return `৳${taka.toFixed(2)}`;
}

export const useGameStore = create<GameState>((set, get) => ({
  engine: null,
  orchestrator: null,
  isInitialized: false,
  isSaving: false,

  cashMinorUnits: 25000,
  cashFormattedBdt: '৳250.00',
  reputation: 10,
  inventoryItems: [],
  activeMissions: {},
  allMissions: {},
  currentActiveMissionId: 'mission_1_first_fare',
  saveSlots: [],
  lastSavedAtIso: null,
  toastMessage: null,

  initGame: async (customEnvelope?: SaveEnvelopeV2) => {
    // 1. Storage adapter selection (IndexedDB in browser, Memory in headless/node)
    const isIndexedDBAvailable =
      typeof window !== 'undefined' &&
      typeof window.indexedDB !== 'undefined';

    const adapter = isIndexedDBAvailable
      ? new IndexedDBStorageAdapter('DhamraiLifeSaveDB')
      : new MemoryStorageAdapter();

    const orchestrator = new SaveOrchestrator(adapter);
    await orchestrator.init();

    // 2. Hydrate engine from provided envelope, existing autosave, or create new game
    let engine: GameCoreEngine;
    let isFresh = false;
    if (customEnvelope) {
      engine = GameCoreEngine.fromSaveEnvelope(customEnvelope);
    } else {
      try {
        const slots = await orchestrator.listSlots();
        const autosaveSlot = slots.find((s) => s.slotName === 'Autosave');
        if (autosaveSlot) {
          engine = await orchestrator.restoreEngine('Autosave');
        } else {
          engine = GameCoreEngine.createNewGame();
          isFresh = true;
        }
      } catch {
        engine = GameCoreEngine.createNewGame();
        isFresh = true;
      }
    }

    // 3. Process Daily Vehicle Rent on session resume for non-fresh saves
    if (!isFresh) {
      const lastRentMs = (engine.getWorldFlag<number>('lastRentChargedMs') as number) ?? 0;
      const now = Date.now();
      const TWENTY_HOURS_MS = 20 * 60 * 60 * 1000;
      if (now - lastRentMs >= TWENTY_HOURS_MS) {
        if (engine.economy.balanceMinorUnits >= 5000) {
          engine.processDailyVehicleRent(now);
          engine.setWorldFlag('lastRentChargedMs', now);
          get().showToast('দৈনিক রিকশা ভাড়া: ৳৫০ কর্তন করা হয়েছে (Daily rent ৳50 paid)', 4000);
        } else {
          get().showToast('ভাড়া দেওয়ার মতো টাকা নেই! (Insufficient funds for daily rent)', 4000);
        }
      }
    } else {
      // Mark fresh game rent timestamp
      engine.setWorldFlag('lastRentChargedMs', Date.now());
    }

    const slots = await orchestrator.listSlots();

    set({
      engine,
      orchestrator,
      isInitialized: true,
      saveSlots: slots,
    });

    get().syncFromEngine();

    // Reconcile 3D entities if GameEngine is mounted
    getActiveGameEngine()?.applyDomainToRuntime();
  },

  syncFromEngine: () => {
    const { engine } = get();
    if (!engine) return;

    const cash = engine.economy.balanceMinorUnits;
    const rep = engine.player.reputations.transportReputation;
    const items = [...engine.inventory.items];
    const allM = engine.missions.getAllInstances();

    const activeM: Record<string, MissionInstance> = {};
    let curActive: string | null = null;
    for (const [id, m] of Object.entries(allM)) {
      if (m.state === 'ACTIVE') {
        activeM[id] = m;
        if (!curActive) curActive = id;
      }
    }

    // Progression transition when no mission is currently ACTIVE
    if (!curActive) {
      if (allM['mission_1_first_fare']?.state === 'AVAILABLE') {
        curActive = 'mission_1_first_fare';
      } else if (allM['mission_2_police_checkpoint']?.state === 'AVAILABLE') {
        curActive = 'mission_2_police_checkpoint';
      } else if (allM['mission_3_artisan_order']?.state === 'AVAILABLE') {
        curActive = 'mission_3_artisan_order';
      } else if (allM['mission_4_market_parcel']?.state === 'AVAILABLE') {
        curActive = 'mission_4_market_parcel';
      } else if (allM['mission_5_vendor_day']?.state === 'AVAILABLE') {
        curActive = 'mission_5_vendor_day';
      } else if (
        allM['mission_1_first_fare']?.state === 'COMPLETED' &&
        allM['mission_2_police_checkpoint']?.state === 'COMPLETED' &&
        allM['mission_3_artisan_order']?.state === 'COMPLETED' &&
        allM['mission_4_market_parcel']?.state === 'COMPLETED' &&
        allM['mission_5_vendor_day']?.state === 'COMPLETED'
      ) {
        curActive = 'repeatable_fares';
      }
    }

    set({
      cashMinorUnits: cash,
      cashFormattedBdt: formatPoishaToBdt(cash),
      reputation: rep,
      inventoryItems: items,
      activeMissions: activeM,
      allMissions: allM,
      currentActiveMissionId: curActive,
    });
  },

  saveGame: async (slotName = 'Autosave') => {
    const { engine, orchestrator } = get();
    if (!engine || !orchestrator) return false;

    // Capture actual 3D runtime transforms and vehicle state before persisting
    getActiveGameEngine()?.syncRuntimeToDomain();

    set({ isSaving: true });
    try {
      const metadata = await orchestrator.saveEngine(slotName, engine);
      const slots = await orchestrator.listSlots();
      set({
        saveSlots: slots,
        lastSavedAtIso: metadata.updatedAtIso,
        isSaving: false,
      });
      get().showToast(`সংরক্ষিত (Saved: ${slotName})`, 2500);
      try {
        cloudSaveService.scheduleSync(slotName, 3000);
      } catch {
        // Ignored; local save succeeded
      }
      return true;
    } catch (err) {
      console.warn('Save failed:', err);
      set({ isSaving: false });
      return false;
    }
  },

  loadGame: async (slotName: string) => {
    const { orchestrator } = get();
    if (!orchestrator) return false;

    try {
      const engine = await orchestrator.restoreEngine(slotName);
      set({ engine });
      get().syncFromEngine();

      // Reconcile 3D entities to restored domain state
      getActiveGameEngine()?.applyDomainToRuntime();

      get().showToast(`লোড সম্পন্ন (Loaded: ${slotName})`, 2500);
      return true;
    } catch (err) {
      console.warn('Load failed:', err);
      return false;
    }
  },

  exportSaveJson: async (slotName = 'Autosave') => {
    const { orchestrator } = get();
    if (!orchestrator) return null;
    try {
      return await orchestrator.exportSaveToJson(slotName);
    } catch (err) {
      console.warn('Export failed:', err);
      return null;
    }
  },

  importSaveJson: async (jsonString: string) => {
    const { orchestrator } = get();
    if (!orchestrator) return false;
    try {
      const envelope = await orchestrator.importSaveFromJson(jsonString, 'Imported');
      const engine = GameCoreEngine.fromSaveEnvelope(envelope);
      set({ engine });
      const slots = await orchestrator.listSlots();
      set({ saveSlots: slots });
      get().syncFromEngine();

      // Reconcile 3D entities to imported domain state
      getActiveGameEngine()?.applyDomainToRuntime();

      get().showToast('সংরক্ষণ ফাইল ইম্পোর্ট সম্পন্ন (Save Imported)', 3000);
      return true;
    } catch (err) {
      console.warn('Import failed:', err);
      return false;
    }
  },

  activateMission: (missionId: string) => {
    const { engine } = get();
    if (!engine) return;
    try {
      engine.missions.activateMission(missionId);
      get().syncFromEngine();
      get().showToast(`মিশন শুরু: ${missionId}`, 3000);
    } catch (err) {
      console.warn('Failed to activate mission:', err);
    }
  },

  completeObjective: (missionId: string, objectiveId: string) => {
    const { engine } = get();
    if (!engine) return;
    try {
      engine.missions.completeObjective(missionId, objectiveId);
      get().syncFromEngine();
    } catch (err) {
      console.warn('Failed to complete objective:', err);
    }
  },

  finishMission: (missionId: string) => {
    const { engine } = get();
    if (!engine) return;
    try {
      const res = engine.completeMission(missionId);
      get().syncFromEngine();
      if (res.payoutApplied || res.success) {
        const audio = getActiveAudioManager();
        if (missionId.startsWith('fare_trip_')) {
          audio?.ui.playCoinPayout();
        } else {
          audio?.ui.playMissionComplete();
          if (res.payoutApplied && (res.payoutMinorUnits ?? 0) > 0) {
            setTimeout(() => audio?.ui.playCoinPayout(), 350);
          }
        }

        const taka = (res.payoutMinorUnits ?? 0) / 100;
        get().showToast(
          `🎉 মিশন সম্পন্ন! +৳${taka.toFixed(2)} | +${res.reputationDelta ?? 0} সুনাম`,
          4000
        );

        // Mission unlock notification for player guidance
        if (missionId === 'mission_1_first_fare') {
          setTimeout(() => {
            get().showToast('নতুন মিশন উন্মুক্ত: চেকপোস্ট ও মালামাল পরিবহন! [J] ডায়েরি দেখুন', 4000);
          }, 1500);
        }

        // Trigger autosave on mission completion
        get().saveGame('Autosave').catch(() => {});
      }
    } catch (err) {
      console.warn('Failed to complete mission:', err);
    }
  },

  showToast: (msg: string, durationMs = 3000) => {
    set({ toastMessage: msg });
    setTimeout(() => {
      if (get().toastMessage === msg) {
        set({ toastMessage: null });
      }
    }, durationMs);
  },
}));
