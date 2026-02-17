import { motion } from 'framer-motion';
import { useTaskStore } from '@/store/taskStore';
import { useUIStore } from '@/store/uiStore';
import { Plus, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Task, TaskStatus } from '@/types/task';
import {
  DndContext, closestCorners, DragOverlay,
  type DragEndEvent, type DragStartEvent,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useState } from 'react';

const columnConfig: { id: TaskStatus; label: string; color: string }[] = [
  { id: 'todo', label: 'To Do', color: '#94A3B8' },
  { id: 'in_progress', label: 'In Progress', color: '#3B82F6' },
  { id: 'review', label: 'Review', color: '#F59E0B' },
  { id: 'done', label: 'Done', color: '#10B981' },
];

const priorityColors: Record<string, string> = {
  p1: 'border-l-destructive',
  p2: 'border-l-warning',
  p3: 'border-l-info',
  p4: 'border-l-muted-foreground/30',
};

const KanbanCard = ({ task }: { task: Task }) => {
  const { openDetailPanel } = useUIStore();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const completedSubs = task.subtasks.filter(s => s.isCompleted).length;
  const subProgress = task.subtasks.length > 0 ? (completedSubs / task.subtasks.length) * 100 : 0;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "rounded-lg border border-border bg-card p-3 cursor-grab active:cursor-grabbing transition-shadow border-l-4",
        priorityColors[task.priority],
        isDragging ? "opacity-50 shadow-glow-purple" : "hover:border-border hover:shadow-elevation-1"
      )}
      onClick={() => openDetailPanel(task.id)}
    >
      {task.labels.length > 0 && (
        <div className="flex gap-1 mb-2">
          {task.labels.map(l => (
            <span key={l.id} className="text-[10px] px-1.5 py-0.5 rounded-full font-mono" style={{ backgroundColor: l.color + '22', color: l.color }}>
              {l.name}
            </span>
          ))}
        </div>
      )}

      <p className={cn("text-sm font-medium mb-1.5 line-clamp-2", task.isCompleted && "line-through text-muted-foreground")}>
        {task.title}
      </p>

      {task.description && (
        <p className="text-xs text-muted-foreground line-clamp-1 mb-2">{task.description}</p>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {task.source === 'classroom' && <BookOpen className="w-3 h-3 text-primary" />}
          {task.dueDate && (
            <span className="text-[10px] font-mono text-muted-foreground">
              {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          )}
        </div>
        {task.subtasks.length > 0 && (
          <div className="flex items-center gap-1.5">
            <div className="w-12 h-1 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full" style={{ width: `${subProgress}%` }} />
            </div>
            <span className="text-[10px] font-mono text-muted-foreground">{completedSubs}/{task.subtasks.length}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export const KanbanView = () => {
  const { selectedListId } = useUIStore();
  const { getTasksByStatus, moveTask } = useTaskStore();
  const [activeId, setActiveId] = useState<string | null>(null);

  const tasksByStatus = getTasksByStatus(selectedListId);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const taskId = active.id as string;
    const overId = over.id as string;

    // Check if dropped on a column
    const targetColumn = columnConfig.find(c => c.id === overId);
    if (targetColumn) {
      moveTask(taskId, targetColumn.id);
    }
  };

  return (
    <div className="h-full overflow-x-auto p-4 animate-fade-in">
      <DndContext collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex gap-4 h-full min-w-max">
          {columnConfig.map(col => {
            const tasks = tasksByStatus[col.id] || [];
            return (
              <div key={col.id} className="w-72 flex flex-col rounded-xl surface-1 border border-border overflow-hidden flex-shrink-0">
                {/* Column header */}
                <div className="px-3 py-2.5 border-b border-border" style={{ borderTopColor: col.color, borderTopWidth: 3 }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: col.color }} />
                      <span className="text-xs font-mono font-semibold text-foreground uppercase tracking-wider">{col.label}</span>
                      <span className="text-xs text-muted-foreground font-mono">{tasks.length}</span>
                    </div>
                    <button className="text-muted-foreground hover:text-foreground">
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Cards */}
                <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy} id={col.id}>
                  <div className="flex-1 overflow-y-auto p-2 space-y-2" style={{ maxHeight: 'calc(100vh - 200px)' }}>
                    {tasks.map(task => (
                      <KanbanCard key={task.id} task={task} />
                    ))}
                    {tasks.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground/40 text-xs font-mono">
                        No tasks
                      </div>
                    )}
                  </div>
                </SortableContext>
              </div>
            );
          })}
        </div>
      </DndContext>
    </div>
  );
};
