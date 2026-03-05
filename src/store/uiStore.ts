import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';
import type { ViewType } from '@/types/task';
import { getLocalDateString } from '@/lib/utils';

interface UIState {
  sidebarCollapsed: boolean;
  activeView: ViewType;
  selectedListId: string;
  detailPanelTaskId: string | null;
  commandPaletteOpen: boolean;
  hiddenListIds: string[];
  toggleSidebar: () => void;
  setActiveView: (view: ViewType) => void;
  setSelectedListId: (id: string) => void;
  openDetailPanel: (taskId: string) => void;
  closeDetailPanel: () => void;
  toggleCommandPalette: () => void;
  toggleListVisibility: (listId: string) => void;
  isListHidden: (listId: string) => boolean;
  cleanupHiddenLists: (existingListIds: string[]) => void;
  setHiddenListIds: (ids: string[]) => void;
  // Focus Session
  focusTaskId: string | null;
  focusStartedAt: number | null;
  startFocusSession: (taskId: string) => void;
  endFocusSession: () => void;
  // Daily Plan
  dailyPlanConfirmed: boolean;
  dailyPlanDismissed: boolean;
  dailyPlanTaskIds: string[];
  confirmDailyPlan: (taskIds: string[]) => void;
  dismissDailyPlan: () => void;
  isDailyPlanNeeded: () => boolean;
  reopenDailyPlan: () => void;
}

function loadHiddenLists(): string[] {
  try {
    const stored = localStorage.getItem('node-hidden-lists');
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveHiddenListsLocal(ids: string[]) {
  localStorage.setItem('node-hidden-lists', JSON.stringify(ids));
}

async function syncHiddenListsToCloud(ids: string[]) {
  saveHiddenListsLocal(ids);
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      await supabase.auth.updateUser({
        data: { hidden_lists: ids }
      });
    }
  } catch (err) {
    console.error('Failed to sync hidden lists to cloud:', err);
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
    const current = get().hiddenListIds;
    let next: string[];
    if (current.includes(listId)) {
      next = current.filter(id => id !== listId);
    } else {
      next = [...current, listId];
    }
    syncHiddenListsToCloud(next);
    set({ hiddenListIds: next });
  },
  setHiddenListIds: (ids) => {
    saveHiddenListsLocal(ids);
    set({ hiddenListIds: ids });
  },
  isListHidden: (listId) => get().hiddenListIds.includes(listId),
  // Remove hidden IDs that don't correspond to any existing list
  cleanupHiddenLists: (existingListIds) => {
    const existingSet = new Set(existingListIds);
    const current = get().hiddenListIds;
    const cleaned = current.filter(id => existingSet.has(id));
    if (cleaned.length !== current.length) {
      saveHiddenListsLocal(cleaned);
      set({ hiddenListIds: cleaned });
    }
  },
  // Focus Session
  focusTaskId: null,
  focusStartedAt: null,
  startFocusSession: (taskId) => set({ focusTaskId: taskId, focusStartedAt: Date.now() }),
  endFocusSession: () => set({ focusTaskId: null, focusStartedAt: null }),
  // Daily Plan
  dailyPlanConfirmed: false,
  dailyPlanDismissed: false,
  dailyPlanTaskIds: [],
  confirmDailyPlan: (taskIds) => {
    const todayKey = `node-daily-plan-${getLocalDateString()}`;
    localStorage.setItem(todayKey, JSON.stringify({ confirmed: true, taskIds }));
    set({ dailyPlanConfirmed: true, dailyPlanTaskIds: taskIds });
  },
  dismissDailyPlan: () => {
    const todayKey = `node-daily-plan-${getLocalDateString()}`;
    localStorage.setItem(todayKey, JSON.stringify({ dismissed: true }));
    set({ dailyPlanDismissed: true });
  },
  isDailyPlanNeeded: () => {
    const todayKey = `node-daily-plan-${getLocalDateString()}`;
    const stored = localStorage.getItem(todayKey);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.confirmed) {
          // Restore pinned tasks
          set({ dailyPlanConfirmed: true, dailyPlanTaskIds: parsed.taskIds || [] });
          return false;
        }
        if (parsed.dismissed) {
          set({ dailyPlanDismissed: true });
          return false;
        }
      } catch { /* fallthrough */ }
    }
    return true;
  },
  reopenDailyPlan: () => {
    const todayKey = `node-daily-plan-${getLocalDateString()}`;
    localStorage.removeItem(todayKey);
    set({ dailyPlanConfirmed: false, dailyPlanDismissed: false, dailyPlanTaskIds: [] });
  },
}));
