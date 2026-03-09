import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';
import type { ViewType } from '@/types/task';
import { getLocalDateString } from '@/lib/utils';
import type { ChatMessage } from '@/lib/nodeMind';

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
  dailyPlanDismissCount: number;
  confirmDailyPlan: (taskIds: string[]) => void;
  dismissDailyPlan: () => void;
  isDailyPlanNeeded: () => boolean;
  // Check-in panel
  checkInOpen: boolean;
  openCheckIn: () => void;
  closeCheckIn: () => void;
  // NodeMind Chat
  nodeMindMessages: ChatMessage[];
  setNodeMindMessages: (messages: ChatMessage[]) => void;
  // Feedback Modal
  feedbackModalOpen: boolean;
  feedbackModalType: 'bug' | 'feature' | 'feedback' | null;
  openFeedbackModal: (type?: 'bug' | 'feature' | 'feedback') => void;
  closeFeedbackModal: () => void;
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

// ── Daily plan meta: local + cloud sync ──

function loadDailyPlanLocal(): { confirmed: boolean; dismissed: boolean; taskIds: string[]; dismissCount: number } {
  const todayKey = `node-daily-plan-${getLocalDateString()}`;
  try {
    const stored = localStorage.getItem(todayKey);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        confirmed: !!parsed.confirmed,
        dismissed: !!parsed.dismissed,
        taskIds: parsed.taskIds || [],
        dismissCount: parsed.dismissCount || 0,
      };
    }
  } catch { /* fallthrough */ }
  return { confirmed: false, dismissed: false, taskIds: [], dismissCount: 0 };
}

function saveDailyPlanLocal(data: { confirmed?: boolean; dismissed?: boolean; taskIds?: string[]; dismissCount?: number }) {
  const todayKey = `node-daily-plan-${getLocalDateString()}`;
  const existing = loadDailyPlanLocal();
  const merged = { ...existing, ...data };
  localStorage.setItem(todayKey, JSON.stringify(merged));
}

async function syncDailyPlanToCloud(meta: { lastConfirmedDate?: string; dismissCountToday?: number }) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from('profiles').update({
        daily_plan_meta: meta,
      }).eq('id', session.user.id);
    }
  } catch (err) {
    console.error('Failed to sync daily plan meta:', err);
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

  // ── Daily Plan (with 3-dismiss limit) ──
  dailyPlanConfirmed: false,
  dailyPlanDismissed: false,
  dailyPlanTaskIds: [],
  dailyPlanDismissCount: 0,

  confirmDailyPlan: (taskIds) => {
    const today = getLocalDateString();
    saveDailyPlanLocal({ confirmed: true, taskIds, dismissCount: 0 });
    set({ dailyPlanConfirmed: true, dailyPlanTaskIds: taskIds });
    syncDailyPlanToCloud({ lastConfirmedDate: today, dismissCountToday: 0 });
  },

  dismissDailyPlan: () => {
    const currentCount = get().dailyPlanDismissCount;
    const newCount = currentCount + 1;

    if (newCount >= 3) {
      // Third dismissal — mark as fully dismissed for the day
      const today = getLocalDateString();
      saveDailyPlanLocal({ dismissed: true, dismissCount: newCount });
      set({ dailyPlanDismissed: true, dailyPlanDismissCount: newCount });
      syncDailyPlanToCloud({ lastConfirmedDate: today, dismissCountToday: newCount });
    } else {
      // 1st or 2nd dismissal — close modal but allow it to return on next open
      saveDailyPlanLocal({ dismissCount: newCount });
      set({ dailyPlanDismissed: true, dailyPlanDismissCount: newCount });
    }
  },

  isDailyPlanNeeded: () => {
    const local = loadDailyPlanLocal();

    if (local.confirmed) {
      set({ dailyPlanConfirmed: true, dailyPlanTaskIds: local.taskIds, dailyPlanDismissCount: local.dismissCount });
      return false;
    }
    if (local.dismissed) {
      // Fully dismissed (3 times) — don't show again
      set({ dailyPlanDismissed: true, dailyPlanDismissCount: local.dismissCount });
      return false;
    }

    // Restore dismiss count so modal knows which variation to show
    set({ dailyPlanDismissCount: local.dismissCount, dailyPlanDismissed: false });
    return true;
  },

  // ── Check-in Panel ──
  checkInOpen: false,
  openCheckIn: () => set({ checkInOpen: true }),
  closeCheckIn: () => set({ checkInOpen: false }),

  // ── NodeMind Chat ──
  nodeMindMessages: [],
  setNodeMindMessages: (messages) => set({ nodeMindMessages: messages }),

  // ── Feedback Modal ──
  feedbackModalOpen: false,
  feedbackModalType: null,
  openFeedbackModal: (type) => set({ feedbackModalOpen: true, feedbackModalType: type || null }),
  closeFeedbackModal: () => set({ feedbackModalOpen: false, feedbackModalType: null }),
}));
