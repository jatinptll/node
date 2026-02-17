import { create } from 'zustand';
import type { ViewType } from '@/types/task';

interface UIState {
  sidebarCollapsed: boolean;
  activeView: ViewType;
  selectedListId: string;
  detailPanelTaskId: string | null;
  commandPaletteOpen: boolean;
  toggleSidebar: () => void;
  setActiveView: (view: ViewType) => void;
  setSelectedListId: (id: string) => void;
  openDetailPanel: (taskId: string) => void;
  closeDetailPanel: () => void;
  toggleCommandPalette: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarCollapsed: false,
  activeView: 'list',
  selectedListId: 'inbox',
  detailPanelTaskId: null,
  commandPaletteOpen: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setActiveView: (view) => set({ activeView: view }),
  setSelectedListId: (id) => set({ selectedListId: id }),
  openDetailPanel: (taskId) => set({ detailPanelTaskId: taskId }),
  closeDetailPanel: () => set({ detailPanelTaskId: null }),
  toggleCommandPalette: () => set((s) => ({ commandPaletteOpen: !s.commandPaletteOpen })),
}));
