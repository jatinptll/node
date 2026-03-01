import { useState } from 'react';
import { useTaskStore } from '@/store/taskStore';
import { useUIStore } from '@/store/uiStore';
import { Plus } from 'lucide-react';
import type { Priority } from '@/types/task';
import { TimeEstimateSelector } from './TimeEstimateSelector';
import { MAX_TITLE_LENGTH } from '@/lib/constants';

export const TaskCreationRow = ({ listId, goalId }: { listId?: string, goalId?: string }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<Priority>('p4');
  const [estimatedMinutes, setEstimatedMinutes] = useState<number | undefined>();
  const { addTask, lists, workspaces } = useTaskStore();
  const { selectedListId } = useUIStore();

  const handleSubmit = () => {
    if (!title.trim()) return;
    const isDashboard = selectedListId === 'dashboard' || selectedListId === 'today' || selectedListId === 'upcoming' || selectedListId === 'completed';
    // If we're inside a goal view, the selectedListId is the goalId, so it won't be found in lists.
    let targetListId = listId;
    if (!targetListId) {
      const currentListOrView = lists.find(l => l.id === selectedListId);
      if (currentListOrView) {
        targetListId = currentListOrView.id;
      } else {
        // Fallback to first personal list or first available list
        const personalWorkspace = workspaces.find(w => w.type === 'personal');
        const defaultList = lists.find(l => l.workspaceId === (personalWorkspace ? personalWorkspace.id : workspaces[0]?.id)) || lists[0];
        targetListId = defaultList?.id || 'personal';
      }
    }

    addTask({ title: title.trim(), listId: targetListId, priority, status: 'todo', estimatedMinutes, goalId });
    setTitle('');
    setPriority('p4');
    setEstimatedMinutes(undefined);
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
        maxLength={MAX_TITLE_LENGTH}
        className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none mb-2"
      />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          {(['p1', 'p2', 'p3', 'p4'] as Priority[]).map(p => (
            <button
              key={p}
              onClick={() => setPriority(p)}
              className={`text-xs font-mono px-2 py-0.5 rounded transition-colors ${priority === p ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:surface-3'
                }`}
            >
              {p.toUpperCase()}
            </button>
          ))}
          <TimeEstimateSelector value={estimatedMinutes} onChange={setEstimatedMinutes} />
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { setIsExpanded(false); setTitle(''); }} className="text-xs text-muted-foreground hover:text-foreground">Cancel</button>
          <button onClick={handleSubmit} className="text-xs bg-primary text-primary-foreground px-3 py-1 rounded-md hover:bg-primary/90 transition-colors font-mono">Add</button>
        </div>
      </div>
    </div>
  );
};
