import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTaskStore } from '@/store/taskStore';
import { useUIStore } from '@/store/uiStore';
import { cn } from '@/lib/utils';
import { BookOpen } from 'lucide-react';
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
  const { toggleTask, lists } = useTaskStore();
  const { openDetailPanel, selectedListId } = useUIStore();
  const dueInfo = getDueDateInfo(task.dueDate);
  const completedSubtasks = task.subtasks.filter(s => s.isCompleted).length;

  const parentList = lists.find(l => l.id === task.listId);
  const showListTag = parentList && selectedListId !== parentList.id;

  const [localCompleted, setLocalCompleted] = useState(task.isCompleted);
  const [isAnimating, setIsAnimating] = useState(false);

  // Keep local state in sync unless we are mid-animation
  useEffect(() => {
    if (!isAnimating) {
      setLocalCompleted(task.isCompleted);
    }
  }, [task.isCompleted, isAnimating]);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isAnimating) return;

    setLocalCompleted(!localCompleted);
    setIsAnimating(true);

    // Allow bounce animation to play before unmounting/moving to completed section
    setTimeout(() => {
      toggleTask(task.id);
      setIsAnimating(false);
    }, 400);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="group flex items-center gap-3 px-3 py-2.5 rounded-lg hover:surface-3 transition-colors cursor-pointer border border-transparent hover:border-border"
      onClick={() => openDetailPanel(task.id)}
    >
      {/* Checkbox */}
      <motion.button
        whileTap={{ scale: 0.8 }}
        animate={localCompleted ? { scale: [1, 1.35, 1], rotate: [0, 15, -15, 0] } : { scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 400, damping: 10 }}
        onClick={handleToggle}
        className={cn(
          "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors flex-shrink-0",
          localCompleted
            ? "bg-primary border-primary"
            : "border-muted-foreground/40 hover:border-primary"
        )}
      >
        {localCompleted && (
          <motion.svg
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.2 }}
            width="10" height="10" viewBox="0 0 10 10"
          >
            <motion.path d="M2 5 L4 7 L8 3" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </motion.svg>
        )}
      </motion.button>

      {/* Title */}
      <span className={cn(
        "flex-1 text-sm truncate transition-all",
        localCompleted ? "line-through text-muted-foreground" : "text-foreground"
      )}>
        {task.title}
      </span>

      {/* Badges */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {showListTag && parentList ? (
          <span
            className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded font-mono truncate max-w-[120px]"
            style={{ backgroundColor: `${parentList.color}15`, color: parentList.color }}
          >
            {parentList.isAcademic && <BookOpen className="w-3 h-3" />}
            <span className="hidden sm:inline truncate">{parentList.courseName || parentList.name}</span>
          </span>
        ) : task.source === 'classroom' && (
          <span className="flex items-center gap-1 text-[10px] bg-primary/15 text-primary px-1.5 py-0.5 rounded font-mono">
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
