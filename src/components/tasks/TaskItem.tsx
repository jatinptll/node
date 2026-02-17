import { motion } from 'framer-motion';
import { useTaskStore } from '@/store/taskStore';
import { useUIStore } from '@/store/uiStore';
import { cn } from '@/lib/utils';
import { GripVertical, BookOpen } from 'lucide-react';
import type { Task } from '@/types/task';

const priorityColors: Record<string, string> = {
  p1: 'bg-destructive',
  p2: 'bg-warning',
  p3: 'bg-info',
  p4: 'bg-muted-foreground/30',
};

const priorityLabels: Record<string, string> = {
  p1: 'P1',
  p2: 'P2',
  p3: 'P3',
  p4: 'P4',
};

const getDueDateInfo = (dueDate?: string) => {
  if (!dueDate) return null;
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  if (dueDate < today) return { label: 'Overdue', className: 'text-destructive bg-destructive/10' };
  if (dueDate === today) return { label: 'Today', className: 'text-warning bg-warning/10' };
  if (dueDate === tomorrow) return { label: 'Tomorrow', className: 'text-foreground bg-muted' };
  const date = new Date(dueDate);
  return {
    label: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    className: 'text-muted-foreground bg-muted',
  };
};

export const TaskItem = ({ task }: { task: Task }) => {
  const { toggleTask } = useTaskStore();
  const { openDetailPanel } = useUIStore();
  const dueInfo = getDueDateInfo(task.dueDate);
  const completedSubtasks = task.subtasks.filter(s => s.isCompleted).length;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="group flex items-center gap-3 px-3 py-2.5 rounded-lg hover:surface-3 transition-colors cursor-pointer border border-transparent hover:border-border"
      onClick={() => openDetailPanel(task.id)}
    >
      {/* Drag handle */}
      <GripVertical className="w-4 h-4 text-muted-foreground/0 group-hover:text-muted-foreground/50 transition-colors flex-shrink-0 cursor-grab" />

      {/* Checkbox */}
      <button
        onClick={(e) => { e.stopPropagation(); toggleTask(task.id); }}
        className={cn(
          "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0",
          task.isCompleted
            ? "bg-primary border-primary"
            : "border-muted-foreground/40 hover:border-primary"
        )}
      >
        {task.isCompleted && (
          <motion.svg
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.2 }}
            width="10" height="10" viewBox="0 0 10 10"
          >
            <motion.path d="M2 5 L4 7 L8 3" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </motion.svg>
        )}
      </button>

      {/* Title */}
      <span className={cn(
        "flex-1 text-sm truncate transition-all",
        task.isCompleted ? "line-through text-muted-foreground" : "text-foreground"
      )}>
        {task.title}
      </span>

      {/* Badges */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {task.source === 'classroom' && (
          <span className="flex items-center gap-1 text-xs bg-primary/15 text-primary px-1.5 py-0.5 rounded font-mono">
            <BookOpen className="w-3 h-3" />
            <span className="hidden sm:inline">Classroom</span>
          </span>
        )}
        {task.subtasks.length > 0 && (
          <span className="text-xs text-muted-foreground font-mono">{completedSubtasks}/{task.subtasks.length}</span>
        )}
        {dueInfo && (
          <span className={cn("text-xs px-1.5 py-0.5 rounded font-mono", dueInfo.className)}>{dueInfo.label}</span>
        )}
        <span className={cn("w-2 h-2 rounded-full flex-shrink-0", priorityColors[task.priority])} title={priorityLabels[task.priority]} />
      </div>
    </motion.div>
  );
};
