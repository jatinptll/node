import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';
import type { ViewType } from '@/types/task';

interface UIState {
  sidebarCollapsed: boolean;
  activeView: ViewType;
  selectedListId: string;
  detailPanelTaskId: string | null;
  commandPaletteOpen: boolean;
  hiddenListIds: Set<string>;
  toggleSidebar: () => void;
  setActiveView: (view: ViewType) => void;
  setSelectedListId: (id: string) => void;
  openDetailPanel: (taskId: string) => void;
  closeDetailPanel: () => void;
  toggleCommandPalette: () => void;
  toggleListVisibility: (listId: string) => void;
  isListHidden: (listId: string) => boolean;
  cleanupHiddenLists: (existingListIds: string[]) => void;
  setHiddenListIds: (ids: Set<string>) => void;
}

function loadHiddenLists(): Set<string> {
  try {
    const stored = localStorage.getItem('node-hidden-lists');
    return stored ? new Set(JSON.parse(stored)) : new Set();
  } catch {
    return new Set();
  }
}

function saveHiddenLists(ids: Set<string>) {
  localStorage.setItem('node-hidden-lists', JSON.stringify(Array.from(ids)));
}


async function syncHiddenListsToCloud(ids: Set<string>) {
  localStorage.setItem('node-hidden-lists', JSON.stringify(Array.from(ids)));
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user) {
    await supabase.auth.updateUser({
      data: { hidden_lists: Array.from(ids) }
    });
  }
}

export const useUIStore = create<UIState>((set, get) => ({
  sidebarCollapsed: typeof window !== 'undefined' ? window.innerWidth < 768 : false,
  activeView: 'list',
  selectedListId: 'dashboard',
  detailPanelTaskId: null,
  commandPaletteOpen: false,
  hiddenListIds: loadHiddenLists(),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setActiveView: (view) => set({ activeView: view }),
  setSelectedListId: (id) => set({ selectedListId: id }),
  openDetailPanel: (taskId) => set({ detailPanelTaskId: taskId }),
  closeDetailPanel: () => set({ detailPanelTaskId: null }),
  toggleCommandPalette: () => set((s) => ({ commandPaletteOpen: !s.commandPaletteOpen })),
  toggleListVisibility: (listId) => {
    set((s) => {
      const next = new Set(s.hiddenListIds);
      if (next.has(listId)) {
        next.delete(listId);
      } else {
        next.add(listId);
      }
      syncHiddenListsToCloud(next);
      return { hiddenListIds: next };
    });
  },
  setHiddenListIds: (ids) => {
    saveHiddenLists(ids);
    set({ hiddenListIds: ids });
  },
  isListHidden: (listId) => get().hiddenListIds.has(listId),
  // Remove hidden IDs that don't correspond to any existing list
  cleanupHiddenLists: (existingListIds) => {
    const existingSet = new Set(existingListIds);
    const current = get().hiddenListIds;
    const cleaned = new Set<string>();
    for (const id of current) {
      if (existingSet.has(id)) {
        cleaned.add(id);
      }
    }
    if (cleaned.size !== current.size) {
      saveHiddenLists(cleaned);
      set({ hiddenListIds: cleaned });
    }
  },
}));
