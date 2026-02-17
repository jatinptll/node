import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTaskStore } from '@/store/taskStore';
import { useUIStore } from '@/store/uiStore';
import { Plus, BookOpen, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Task, TaskStatus } from '@/types/task';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  type DragEndEvent,
  type DragStartEvent,
  type DragOverEvent,
} from '@dnd-kit/core';

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

/* ───────────────── Draggable Card ───────────────── */
const KanbanCard = ({ task, isDragOverlay }: { task: Task; isDragOverlay?: boolean }) => {
  const { openDetailPanel } = useUIStore();
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.id,
    data: { task },
  });

  const completedSubs = task.subtasks.filter(s => s.isCompleted).length;
  const subProgress = task.subtasks.length > 0 ? (completedSubs / task.subtasks.length) * 100 : 0;

  return (
    <div
      ref={!isDragOverlay ? setNodeRef : undefined}
      className={cn(
        "rounded-lg border border-border bg-card p-3 transition-all border-l-4 group",
        priorityColors[task.priority],
        isDragging && !isDragOverlay && "opacity-30 scale-95",
        isDragOverlay && "shadow-elevation-3 scale-105 rotate-1 ring-2 ring-primary/30",
        !isDragging && !isDragOverlay && "hover:border-border hover:shadow-elevation-1"
      )}
    >
      <div className="flex items-start gap-2">
        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          className="mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground flex-shrink-0"
        >
          <GripVertical className="w-3.5 h-3.5" />
        </button>

        <div
          className="flex-1 min-w-0 cursor-pointer"
          onClick={() => !isDragOverlay && openDetailPanel(task.id)}
        >
          {task.labels.length > 0 && (
            <div className="flex gap-1 mb-1.5 flex-wrap">
              {task.labels.map(l => (
                <span
                  key={l.id}
                  className="text-[10px] px-1.5 py-0.5 rounded-full font-mono"
                  style={{ backgroundColor: l.color + '22', color: l.color }}
                >
                  {l.name}
                </span>
              ))}
            </div>
          )}

          <p className={cn(
            "text-sm font-medium mb-1 line-clamp-2",
            task.isCompleted && "line-through text-muted-foreground"
          )}>
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
      </div>
    </div>
  );
};

/* ───────────────── Droppable Column ───────────────── */
const KanbanColumn = ({
  col,
  tasks,
  isOver,
}: {
  col: { id: TaskStatus; label: string; color: string };
  tasks: Task[];
  isOver: boolean;
}) => {
  const { setNodeRef } = useDroppable({
    id: col.id,
    data: { status: col.id },
  });

  return (
    <div
      className={cn(
        "w-72 flex flex-col rounded-xl surface-1 border border-border overflow-hidden flex-shrink-0 transition-all duration-200",
        isOver && "ring-2 ring-primary/40 border-primary/30 bg-primary/5"
      )}
    >
      {/* Column header */}
      <div className="px-3 py-2.5 border-b border-border" style={{ borderTopColor: col.color, borderTopWidth: 3 }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: col.color }} />
            <span className="text-xs font-mono font-semibold text-foreground uppercase tracking-wider">{col.label}</span>
            <span className="text-xs text-muted-foreground font-mono bg-muted/50 px-1.5 py-0.5 rounded-full">
              {tasks.length}
            </span>
          </div>
          <button className="text-muted-foreground hover:text-foreground transition-colors">
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Cards */}
      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 overflow-y-auto p-2 space-y-2 min-h-[120px] transition-colors duration-200",
          isOver && "bg-primary/5"
        )}
        style={{ maxHeight: 'calc(100vh - 200px)' }}
      >
        <AnimatePresence mode="popLayout">
          {tasks.map(task => (
            <motion.div
              key={task.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15 }}
            >
              <KanbanCard task={task} />
            </motion.div>
          ))}
        </AnimatePresence>
        {tasks.length === 0 && (
          <div className={cn(
            "text-center py-8 text-xs font-mono rounded-lg border-2 border-dashed transition-colors",
            isOver
              ? "border-primary/40 text-primary/60 bg-primary/5"
              : "border-transparent text-muted-foreground/40"
          )}>
            {isOver ? 'Drop here' : 'No tasks'}
          </div>
        )}
      </div>
    </div>
  );
};

/* ───────────────── Main Kanban View ───────────────── */
export const KanbanView = () => {
  const { selectedListId } = useUIStore();
  const { getTasksByStatus, moveTask, tasks: allTasks } = useTaskStore();
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [overColumnId, setOverColumnId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  const tasksByStatus = getTasksByStatus(selectedListId);

  const handleDragStart = (event: DragStartEvent) => {
    const task = event.active.data.current?.task as Task | undefined;
    if (task) {
      setActiveTask(task);
    } else {
      // Fallback: find task by ID
      const found = allTasks.find(t => t.id === event.active.id);
      setActiveTask(found || null);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const overId = event.over?.id as string | null;
    if (overId && columnConfig.some(c => c.id === overId)) {
      setOverColumnId(overId);
    } else {
      setOverColumnId(null);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveTask(null);
    setOverColumnId(null);

    const { active, over } = event;
    if (!over) return;

    const taskId = active.id as string;
    const overId = over.id as string;

    // Check if dropped on a column
    const targetColumn = columnConfig.find(c => c.id === overId);
    if (targetColumn) {
      // Find the current task status to avoid unnecessary updates
      const task = allTasks.find(t => t.id === taskId);
      if (task && task.status !== targetColumn.id) {
        moveTask(taskId, targetColumn.id);
      }
    }
  };

  const handleDragCancel = () => {
    setActiveTask(null);
    setOverColumnId(null);
  };

  return (
    <div className="h-full overflow-x-auto p-4 animate-fade-in">
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="flex gap-4 h-full min-w-max">
          {columnConfig.map(col => {
            const tasks = tasksByStatus[col.id] || [];
            return (
              <KanbanColumn
                key={col.id}
                col={col}
                tasks={tasks}
                isOver={overColumnId === col.id}
              />
            );
          })}
        </div>

        {/* Drag overlay  — ghost card following cursor */}
        <DragOverlay dropAnimation={{
          duration: 200,
          easing: 'ease-out',
        }}>
          {activeTask ? <KanbanCard task={activeTask} isDragOverlay /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
};
