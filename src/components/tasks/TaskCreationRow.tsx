import { useState } from 'react';
import { useTaskStore } from '@/store/taskStore';
import { useUIStore } from '@/store/uiStore';
import { Plus } from 'lucide-react';
import type { Priority } from '@/types/task';

export const TaskCreationRow = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<Priority>('p4');
  const { addTask } = useTaskStore();
  const { selectedListId } = useUIStore();

  const handleSubmit = () => {
    if (!title.trim()) return;
    addTask({ title: title.trim(), listId: selectedListId, priority, status: 'todo' });
    setTitle('');
    setPriority('p4');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit();
    if (e.key === 'Escape') { setIsExpanded(false); setTitle(''); }
  };

  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:surface-3 rounded-lg transition-colors border border-dashed border-border hover:border-primary/30"
      >
        <Plus className="w-4 h-4" />
        <span className="font-mono text-xs">Add a task</span>
      </button>
    );
  }

  return (
    <div className="border border-primary/30 rounded-lg p-3 surface-2 glow-sm">
      <input
        autoFocus
        value={title}
        onChange={e => setTitle(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Task title..."
        className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none mb-2"
      />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          {(['p1', 'p2', 'p3', 'p4'] as Priority[]).map(p => (
            <button
              key={p}
              onClick={() => setPriority(p)}
              className={`text-xs font-mono px-2 py-0.5 rounded transition-colors ${
                priority === p ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:surface-3'
              }`}
            >
              {p.toUpperCase()}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { setIsExpanded(false); setTitle(''); }} className="text-xs text-muted-foreground hover:text-foreground">Cancel</button>
          <button onClick={handleSubmit} className="text-xs bg-primary text-primary-foreground px-3 py-1 rounded-md hover:bg-primary/90 transition-colors font-mono">Add</button>
        </div>
      </div>
    </div>
  );
};
