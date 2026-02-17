import { useEffect } from 'react';
import { useUIStore } from '@/store/uiStore';

export const useKeyboardShortcuts = () => {
  const { toggleSidebar, toggleCommandPalette } = useUIStore();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === 'b') {
        e.preventDefault();
        toggleSidebar();
      }
      if (mod && e.key === 'k') {
        e.preventDefault();
        toggleCommandPalette();
      }
      if (e.key === 'Escape') {
        useUIStore.getState().closeDetailPanel();
        if (useUIStore.getState().commandPaletteOpen) toggleCommandPalette();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [toggleSidebar, toggleCommandPalette]);
};
