import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useTaskStore } from '@/store/taskStore';
import { useUIStore } from '@/store/uiStore';
import { X, BookOpen, Calendar, Flag, Trash2, Diamond } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { MAX_TITLE_LENGTH, MAX_DESCRIPTION_LENGTH } from '@/lib/constants';
import type { Priority, EnergyTag } from '@/types/task';
import { ENERGY_TAGS } from '@/lib/energy_tags';
import { TimeEstimateSelector } from './TimeEstimateSelector';

const priorityOptions: { value: Priority; label: string; color: string }[] = [
  { value: 'p1', label: 'Urgent', color: 'bg-destructive' },
  { value: 'p2', label: 'High', color: 'bg-warning' },
  { value: 'p3', label: 'Medium', color: 'bg-info' },
  { value: 'p4', label: 'Low', color: 'bg-muted-foreground/30' },
];

export const TaskDetailPanel = ({ taskId }: { taskId: string }) => {
  const { tasks, toggleTask, updateTask, deleteTask, lists, goals } = useTaskStore();
  const { closeDetailPanel } = useUIStore();
  const isMobile = useIsMobile();
  const task = tasks.find(t => t.id === taskId);
  const [localCompleted, setLocalCompleted] = useState(task?.isCompleted || false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [localTitle, setLocalTitle] = useState(task?.title || '');
  const [localDesc, setLocalDesc] = useState(task?.description || '');

  // Debounced DB write for text fields
  const debounceRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const debouncedUpdate = useCallback((field: string, value: string) => {
    if (debounceRef.current[field]) clearTimeout(debounceRef.current[field]);
    debounceRef.current[field] = setTimeout(() => {
      updateTask(taskId, { [field]: value });
    }, 500);
  }, [taskId, updateTask]);

  // Flush pending debounced writes on unmount
  useEffect(() => {
    return () => {
      Object.values(debounceRef.current).forEach(clearTimeout);
      // Persist any pending changes immediately
      if (localTitle !== task?.title) updateTask(taskId, { title: localTitle });
      if (localDesc !== (task?.description || '')) updateTask(taskId, { description: localDesc });
    };
  }, []);

  // Sync local text state when switching tasks
  useEffect(() => {
    if (task) {
      setLocalTitle(task.title);
      setLocalDesc(task.description || '');
    }
  }, [taskId]);

  // Keep local state in sync from parent unless mid-animation
  useEffect(() => {
    if (!isAnimating && task) {
      setLocalCompleted(task.isCompleted);
    }
  }, [task, task?.isCompleted, isAnimating]);

  if (!task) return null;

  const parentList = lists.find(l => l.id === task?.listId);

  const handleToggle = () => {
    if (isAnimating) return;
    setLocalCompleted(!localCompleted);
    setIsAnimating(true);

    // Update store and database immediately to prevent data loss on unmount/reload
    toggleTask(task.id);

    setTimeout(() => {
      setIsAnimating(false);
    }, 400);
  };

  return (
    <>
      {isMobile && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={closeDetailPanel}
          className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm md:hidden"
        />
      )}
      <motion.aside
        initial={{ x: isMobile ? '100%' : 380, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: isMobile ? '100%' : 380, opacity: 0 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className={cn(
          "border-l border-border surface-1 flex flex-col overflow-y-auto flex-shrink-0 bg-background",
          isMobile ? "fixed inset-y-0 right-0 w-full z-50 shadow-elevation-3" : "w-[380px] relative"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Task Details</span>
          <button onClick={closeDetailPanel} className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:surface-3">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Completion toggle + Title */}
          <div className="flex items-start gap-3">
            <motion.button
              whileTap={{ scale: 0.8 }}
              animate={localCompleted ? { scale: [1, 1.35, 1], rotate: [0, 15, -15, 0] } : { scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
              onClick={handleToggle}
              className={cn(
                "w-6 h-6 rounded-full border-2 flex items-center justify-center mt-1 flex-shrink-0 transition-colors",
                localCompleted ? "bg-primary border-primary" : "border-muted-foreground/40 hover:border-primary"
              )}
            >
              {localCompleted && (
                <motion.svg
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.2 }}
                  width="12" height="12" viewBox="0 0 10 10"
                >
                  <motion.path d="M2 5 L4 7 L8 3" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                </motion.svg>
              )}
            </motion.button>
            <textarea
              value={localTitle}
              onChange={e => {
                const val = e.target.value.slice(0, MAX_TITLE_LENGTH);
                setLocalTitle(val);
                debouncedUpdate('title', val);
              }}
              maxLength={MAX_TITLE_LENGTH}
              className={cn(
                "flex-1 bg-transparent text-lg font-semibold outline-none resize-none align-top overflow-hidden min-h-[28px]",
                localCompleted ? "line-through text-muted-foreground" : "text-foreground"
              )}
              rows={1}
              ref={el => {
                if (el) {
                  el.style.height = 'auto';
                  el.style.height = el.scrollHeight + 'px';
                }
              }}
              onInput={e => {
                e.currentTarget.style.height = 'auto';
                e.currentTarget.style.height = e.currentTarget.scrollHeight + 'px';
              }}
            />
          </div>

          {/* Description */}
          <textarea
            value={localDesc}
            onChange={e => {
              const val = e.target.value.slice(0, MAX_DESCRIPTION_LENGTH);
              setLocalDesc(val);
              debouncedUpdate('description', val);
            }}
            maxLength={MAX_DESCRIPTION_LENGTH}
            placeholder="Add a description..."
            className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none resize-none min-h-[80px] p-3 rounded-lg border border-border focus:border-primary/30 focus:glow-sm transition-all"
          />

          {/* Subject / Classroom badge */}
          {parentList && parentList.isAcademic ? (
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-lg border font-mono text-sm"
              style={{ backgroundColor: `${parentList.color}15`, borderColor: `${parentList.color}30`, color: parentList.color }}
            >
              <BookOpen className="w-4 h-4" />
              <span className="truncate">{parentList.courseName || parentList.name}</span>
              {task.source === 'classroom' && (
                <span className="ml-auto text-xs opacity-70 truncate">Classroom Link</span>
              )}
            </div>
          ) : task.source === 'classroom' ? (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 border border-primary/20">
              <BookOpen className="w-4 h-4 text-primary" />
              <span className="text-sm text-primary font-mono">Google Classroom Assignment</span>
            </div>
          ) : null}

          {/* Details section */}
          <div className="space-y-3">
            <h3 className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Details</h3>

            {/* Due date & Time Estimate */}
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <input
                  type="date"
                  value={task.dueDate || ''}
                  onChange={e => updateTask(task.id, { dueDate: e.target.value || undefined })}
                  className="bg-transparent text-sm text-foreground border border-border rounded-md px-2 py-1 outline-none focus:border-primary/40"
                />
              </div>

              <div className="flex items-center">
                <TimeEstimateSelector
                  value={task.estimatedMinutes}
                  onChange={(estimatedMinutes) => updateTask(task.id, { estimatedMinutes })}
                />
              </div>
            </div>

            {/* Priority */}
            <div className="flex items-start sm:items-center gap-3">
              <Flag className="w-4 h-4 text-muted-foreground mt-2 sm:mt-0 flex-shrink-0" />
              <div className="flex flex-wrap items-center gap-1 border border-border/80 rounded-lg p-1">
                {priorityOptions.map(p => (
                  <button
                    key={p.value}
                    onClick={() => updateTask(task.id, { priority: p.value })}
                    className={cn(
                      "flex items-center gap-1.5 text-xs font-mono px-2.5 py-1.5 rounded-md transition-colors",
                      task.priority === p.value ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-surface-2 hover:text-foreground"
                    )}
                  >
                    <div className={cn("w-2 h-2 rounded-full flex-shrink-0", p.color)} />
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Energy Tags */}
            <div className="flex items-start sm:items-center gap-3">
              <span className="w-4 h-4 text-muted-foreground mt-2 sm:mt-0 flex-shrink-0 flex items-center justify-center text-[10px]">⚡</span>
              <div className="flex flex-wrap items-center gap-1 border border-border/80 rounded-lg p-1">
                {ENERGY_TAGS.map(tag => (
                  <button
                    key={tag.value}
                    onClick={() => updateTask(task.id, { energyTag: task.energyTag === tag.value ? undefined : tag.value })}
                    className={cn(
                      "flex items-center gap-1.5 text-xs font-mono px-2.5 py-1.5 rounded-md transition-colors border",
                      task.energyTag === tag.value
                        ? cn(tag.color, "shadow-sm")
                        : "border-transparent text-muted-foreground hover:bg-surface-2 hover:text-foreground"
                    )}
                  >
                    <span>{tag.emoji}</span>
                    <span className={task.energyTag === tag.value ? 'font-medium' : ''}>{tag.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Goal Link */}
            {goals.length > 0 && (
              <div className="flex items-center gap-3 pt-2">
                <Diamond className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <select
                  value={task.goalId || ''}
                  onChange={(e) => updateTask(task.id, { goalId: e.target.value || undefined })}
                  className="bg-transparent text-sm text-foreground border border-border/80 rounded-md px-2 py-1.5 outline-none focus:border-primary/50 hover:border-primary/30 transition-all font-mono flex-1 max-w-full cursor-pointer"
                >
                  <option value="" className="bg-background text-foreground">No Goal Assigned</option>
                  {goals.map(g => (
                    <option key={g.id} value={g.id} className="bg-background text-foreground">{g.title}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Subtasks */}
          <div className="space-y-2">
            <h3 className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
              Subtasks
              {task.subtasks.length > 0 && (
                <span className="ml-2 text-muted-foreground/70">
                  {task.subtasks.filter(s => s.isCompleted).length} of {task.subtasks.length} done
                </span>
              )}
            </h3>

            {/* Progress bar */}
            {task.subtasks.length > 0 && (
              <div className="h-1 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-300"
                  style={{ width: `${(task.subtasks.filter(s => s.isCompleted).length / task.subtasks.length) * 100}%` }}
                />
              </div>
            )}

            {/* Subtask list — incomplete first, then completed */}
            {[...task.subtasks]
              .sort((a, b) => (a.isCompleted === b.isCompleted ? a.sortOrder - b.sortOrder : a.isCompleted ? 1 : -1))
              .map(st => (
                <div key={st.id} className="flex items-start gap-2 px-2 py-1.5 rounded-md hover:bg-surface-2 group transition-colors">
                  <button
                    onClick={() => {
                      const updated = task.subtasks.map(s =>
                        s.id === st.id ? { ...s, isCompleted: !s.isCompleted } : s
                      );
                      updateTask(task.id, { subtasks: updated });
                    }}
                    className={cn(
                      "w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors mt-0.5",
                      st.isCompleted ? "bg-primary border-primary" : "border-muted-foreground/40 hover:border-primary"
                    )}
                  >
                    {st.isCompleted && (
                      <svg width="8" height="8" viewBox="0 0 10 10">
                        <path d="M2 5 L4 7 L8 3" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    )}
                  </button>
                  <span className={cn("text-sm flex-1 min-w-0 break-words", st.isCompleted ? "line-through text-muted-foreground" : "text-foreground")}>
                    {st.title}
                  </span>
                  <button
                    onClick={() => {
                      const updated = task.subtasks.filter(s => s.id !== st.id);
                      updateTask(task.id, { subtasks: updated });
                    }}
                    className="w-5 h-5 flex items-center justify-center rounded text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all flex-shrink-0 mt-0.5"
                    title="Remove subtask"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}

            {/* Add subtask input */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Add a subtask..."
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 outline-none px-2 py-1.5 rounded-md border border-border/50 focus:border-primary/30 transition-colors font-mono"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                    const newSubtask = {
                      id: `st${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                      title: e.currentTarget.value.trim(),
                      isCompleted: false,
                      sortOrder: task.subtasks.length,
                    };
                    updateTask(task.id, { subtasks: [...task.subtasks, newSubtask] });
                    e.currentTarget.value = '';
                  }
                }}
              />
            </div>
          </div>

          {/* Focus Session */}
          {!task.isCompleted && (
            <button
              onClick={() => {
                useUIStore.getState().startFocusSession(task.id);
                closeDetailPanel();
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-mono rounded-lg border border-primary/30 text-primary hover:bg-primary/10 transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
              </svg>
              Start Focus Session
            </button>
          )}
          {(task.actualDurationMinutes || task.focusSessionsCount) ? (
            <div className="text-xs text-muted-foreground font-mono text-center">
              {task.focusSessionsCount || 0} focus session{(task.focusSessionsCount || 0) !== 1 ? 's' : ''} · {task.actualDurationMinutes || 0} min total
            </div>
          ) : null}

          {/* Delete */}
          {showDeleteConfirm ? (
            <div className="w-full flex flex-col items-center gap-2 p-3 rounded-lg border border-destructive/30 bg-destructive/5">
              <p className="text-xs font-mono text-destructive">Delete this task permanently?</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="text-xs font-mono px-3 py-1.5 rounded-md border border-border hover:surface-3 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    deleteTask(task.id);
                    closeDetailPanel();
                  }}
                  className="text-xs font-mono px-3 py-1.5 rounded-md bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 mt-auto text-sm font-mono text-destructive bg-destructive/10 md:bg-transparent md:hover:bg-destructive/10 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Delete Task
            </button>
          )}
        </div>
      </motion.aside>
    </>
  );
};
