import { motion } from 'framer-motion';
import { useTaskStore } from '@/store/taskStore';
import { useUIStore } from '@/store/uiStore';
import { X, BookOpen, Calendar, Flag, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Priority } from '@/types/task';

const priorityOptions: { value: Priority; label: string; color: string }[] = [
  { value: 'p1', label: 'Urgent', color: 'bg-destructive' },
  { value: 'p2', label: 'High', color: 'bg-warning' },
  { value: 'p3', label: 'Medium', color: 'bg-info' },
  { value: 'p4', label: 'Low', color: 'bg-muted-foreground/30' },
];

export const TaskDetailPanel = ({ taskId }: { taskId: string }) => {
  const { tasks, toggleTask, updateTask, deleteTask } = useTaskStore();
  const { closeDetailPanel } = useUIStore();
  const task = tasks.find(t => t.id === taskId);

  if (!task) return null;

  return (
    <motion.aside
      initial={{ x: 380, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 380, opacity: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="w-[380px] border-l border-border surface-1 overflow-y-auto flex-shrink-0"
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
          <button
            onClick={() => toggleTask(task.id)}
            className={cn(
              "w-6 h-6 rounded-full border-2 flex items-center justify-center mt-0.5 flex-shrink-0 transition-all",
              task.isCompleted ? "bg-primary border-primary" : "border-muted-foreground/40 hover:border-primary"
            )}
          >
            {task.isCompleted && (
              <svg width="12" height="12" viewBox="0 0 10 10">
                <path d="M2 5 L4 7 L8 3" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            )}
          </button>
          <input
            value={task.title}
            onChange={e => updateTask(task.id, { title: e.target.value })}
            className={cn(
              "flex-1 bg-transparent text-lg font-semibold outline-none",
              task.isCompleted ? "line-through text-muted-foreground" : "text-foreground"
            )}
          />
        </div>

        {/* Description */}
        <textarea
          value={task.description || ''}
          onChange={e => updateTask(task.id, { description: e.target.value })}
          placeholder="Add a description..."
          className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none resize-none min-h-[80px] p-3 rounded-lg border border-border focus:border-primary/30 focus:glow-sm transition-all"
        />

        {/* Classroom badge */}
        {task.source === 'classroom' && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 border border-primary/20">
            <BookOpen className="w-4 h-4 text-primary" />
            <span className="text-sm text-primary font-mono">Google Classroom Assignment</span>
          </div>
        )}

        {/* Details section */}
        <div className="space-y-3">
          <h3 className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Details</h3>

          {/* Due date */}
          <div className="flex items-center gap-3">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <input
              type="date"
              value={task.dueDate || ''}
              onChange={e => updateTask(task.id, { dueDate: e.target.value || undefined })}
              className="bg-transparent text-sm text-foreground border border-border rounded-md px-2 py-1 outline-none focus:border-primary/40"
            />
          </div>

          {/* Priority */}
          <div className="flex items-center gap-3">
            <Flag className="w-4 h-4 text-muted-foreground" />
            <div className="flex items-center gap-1">
              {priorityOptions.map(p => (
                <button
                  key={p.value}
                  onClick={() => updateTask(task.id, { priority: p.value })}
                  className={cn(
                    "flex items-center gap-1.5 text-xs font-mono px-2 py-1 rounded-md transition-colors",
                    task.priority === p.value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:surface-3"
                  )}
                >
                  <div className={cn("w-2 h-2 rounded-full", p.color)} />
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Subtasks */}
        {task.subtasks.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
              Subtasks ({task.subtasks.filter(s => s.isCompleted).length}/{task.subtasks.length})
            </h3>
            {task.subtasks.map(st => (
              <div key={st.id} className="flex items-center gap-2 px-2 py-1.5">
                <div className={cn(
                  "w-4 h-4 rounded border flex items-center justify-center",
                  st.isCompleted ? "bg-primary border-primary" : "border-muted-foreground/40"
                )}>
                  {st.isCompleted && (
                    <svg width="8" height="8" viewBox="0 0 10 10">
                      <path d="M2 5 L4 7 L8 3" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  )}
                </div>
                <span className={cn("text-sm", st.isCompleted ? "line-through text-muted-foreground" : "text-foreground")}>
                  {st.title}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Delete */}
        <div className="pt-4 border-t border-border">
          <button
            onClick={() => { deleteTask(task.id); closeDetailPanel(); }}
            className="flex items-center gap-2 text-sm text-destructive hover:text-destructive/80 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Delete task
          </button>
        </div>
      </div>
    </motion.aside>
  );
};
