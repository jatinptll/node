import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTaskStore } from '@/store/taskStore';
import { useUIStore } from '@/store/uiStore';
import { cn, getLocalDateString } from '@/lib/utils';
import { BookOpen, Clock, AlertTriangle, Diamond, Crosshair } from 'lucide-react';
import type { Task } from '@/types/task';
import { ENERGY_TAGS } from '@/lib/energy_tags';
import { formatEstimate } from './TimeEstimateSelector';

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
  const today = getLocalDateString();
  const tomorrow = getLocalDateString(Date.now() + 86400000);
  if (dueDate < today) return { label: 'Overdue', className: 'text-destructive bg-destructive/10' };
  if (dueDate === today) return { label: 'Today', className: 'text-warning bg-warning/10' };
  if (dueDate === tomorrow) return { label: 'Tomorrow', className: 'text-foreground bg-muted' };
  const date = new Date(dueDate);
  return {
    label: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    className: 'text-muted-foreground bg-muted',
  };
};

export const TaskItem = ({ task, isOverlay }: { task: Task; isOverlay?: boolean }) => {
  const { toggleTask, lists, goals } = useTaskStore();
  const { openDetailPanel, detailPanelTaskId, selectedListId } = useUIStore();
  const dueInfo = getDueDateInfo(task.dueDate);
  const completedSubtasks = task.subtasks.filter(s => s.isCompleted).length;

  const isSelected = detailPanelTaskId === task.id;
  const parentList = lists.find(l => l.id === task.listId);
  const goal = task.goalId ? goals.find(g => g.id === task.goalId) : null;
  const isGoalView = selectedListId === task.goalId;
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

    // Update store and database immediately to prevent data loss on unmount/reload
    toggleTask(task.id);

    // Allow bounce animation to play before resetting animation lock
    setTimeout(() => {
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
        {task.energyTag && (
          <span className="text-xs" title={ENERGY_TAGS.find(t => t.value === task.energyTag)?.label}>
            {ENERGY_TAGS.find(t => t.value === task.energyTag)?.emoji}
          </span>
        )}
        {task.estimatedMinutes && (
          <span className="flex items-center gap-1 text-[10px] bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded font-mono">
            <Clock className="w-3 h-3" />
            {formatEstimate(task.estimatedMinutes)}
          </span>
        )}
        {(task.deferralCount || 0) >= 2 && (
          <span className="flex items-center gap-1 text-[10px] bg-warning/20 text-warning px-1.5 py-0.5 rounded font-mono" title="Deferred multiple times">
            <AlertTriangle className="w-3 h-3" />
            {(task.deferralCount || 0)}
          </span>
        )}
        {goal && !isGoalView && (
          <span className="flex items-center gap-1 text-[10px] bg-purple-500/10 text-purple-400 px-1.5 py-0.5 rounded font-mono">
            <Diamond className="w-3 h-3" />
            <span className="hidden sm:inline">{goal.title}</span>
          </span>
        )}
        {!task.isCompleted && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              useUIStore.getState().startFocusSession(task.id);
            }}
            className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all"
            title="Start Focus Session"
          >
            <Crosshair className="w-3.5 h-3.5" />
          </button>
        )}
        <span className={cn("w-2 h-2 rounded-full flex-shrink-0", priorityColors[task.priority])} title={priorityLabels[task.priority]} />
      </div>
    </motion.div>
  );
};
