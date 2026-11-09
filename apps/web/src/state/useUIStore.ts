import { create } from 'zustand';

export interface UIState {
  isDialogueOpen: boolean;
  currentDialogueTreeId: string | null;
  currentDialogueNodeId: string | null;
  isJournalOpen: boolean;
  isInventoryOpen: boolean;
  isSaveManagerOpen: boolean;
  isDebugOverlayVisible: boolean;

  openDialogue: (treeId: string, nodeId?: string) => void;
  closeDialogue: () => void;
  setDialogueNode: (nodeId: string) => void;
  toggleJournal: () => void;
  setJournalOpen: (open: boolean) => void;
  toggleInventory: () => void;
  setInventoryOpen: (open: boolean) => void;
  toggleSaveManager: () => void;
  setSaveManagerOpen: (open: boolean) => void;
  toggleDebugOverlay: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  isDialogueOpen: false,
  currentDialogueTreeId: null,
  currentDialogueNodeId: null,
  isJournalOpen: false,
  isInventoryOpen: false,
  isSaveManagerOpen: false,
  isDebugOverlayVisible: false, // F3 toggles performance debug overlay

  openDialogue: (treeId, nodeId) =>
    set({
      isDialogueOpen: true,
      currentDialogueTreeId: treeId,
      currentDialogueNodeId: nodeId ?? null,
      isJournalOpen: false,
      isInventoryOpen: false,
    }),

  closeDialogue: () =>
    set({
      isDialogueOpen: false,
      currentDialogueTreeId: null,
      currentDialogueNodeId: null,
    }),

  setDialogueNode: (nodeId) => set({ currentDialogueNodeId: nodeId }),

  toggleJournal: () =>
    set((s) => ({
      isJournalOpen: !s.isJournalOpen,
      isInventoryOpen: false,
      isSaveManagerOpen: false,
    })),

  setJournalOpen: (open) => set({ isJournalOpen: open }),

  toggleInventory: () =>
    set((s) => ({
      isInventoryOpen: !s.isInventoryOpen,
      isJournalOpen: false,
      isSaveManagerOpen: false,
    })),

  setInventoryOpen: (open) => set({ isInventoryOpen: open }),

  toggleSaveManager: () =>
    set((s) => ({
      isSaveManagerOpen: !s.isSaveManagerOpen,
      isJournalOpen: false,
      isInventoryOpen: false,
    })),

  setSaveManagerOpen: (open) => set({ isSaveManagerOpen: open }),

  toggleDebugOverlay: () =>
    set((s) => ({ isDebugOverlayVisible: !s.isDebugOverlayVisible })),
}));
