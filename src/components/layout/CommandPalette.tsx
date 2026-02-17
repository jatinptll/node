import { motion, AnimatePresence } from 'framer-motion';
import { useUIStore } from '@/store/uiStore';
import { useTaskStore } from '@/store/taskStore';
import { Search, X } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

export const CommandPalette = () => {
  const { commandPaletteOpen, toggleCommandPalette, setSelectedListId } = useUIStore();
  const { tasks, lists } = useTaskStore();
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (commandPaletteOpen) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [commandPaletteOpen]);

  const results = query.length > 0
    ? [
      ...tasks.filter(t => t.title.toLowerCase().includes(query.toLowerCase())).slice(0, 5).map(t => ({
        id: t.id, label: t.title, type: 'task' as const, listId: t.listId,
      })),
      ...lists.filter(l => l.name.toLowerCase().includes(query.toLowerCase())).map(l => ({
        id: l.id, label: l.name, type: 'list' as const, listId: l.id,
      })),
    ]
    : [];

  return (
    <AnimatePresence>
      {commandPaletteOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/60 backdrop-blur-sm"
          onClick={toggleCommandPalette}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.15 }}
            className="w-full max-w-lg bg-card border border-border rounded-xl shadow-elevation-2 overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
              <Search className="w-4 h-4 text-muted-foreground" />
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search tasks, lists..."
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none font-mono"
              />
              <button onClick={toggleCommandPalette} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            {results.length > 0 && (
              <div className="max-h-64 overflow-y-auto py-1">
                {results.map(r => (
                  <button
                    key={r.id}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:surface-3 transition-colors text-left"
                    onClick={() => {
                      if (r.type === 'list') setSelectedListId(r.listId);
                      else setSelectedListId(r.listId);
                      toggleCommandPalette();
                    }}
                  >
                    <span className="text-xs text-muted-foreground font-mono uppercase">{r.type}</span>
                    <span>{r.label}</span>
                  </button>
                ))}
              </div>
            )}
            {query.length > 0 && results.length === 0 && (
              <div className="p-8 text-center text-muted-foreground text-sm">No results found</div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
