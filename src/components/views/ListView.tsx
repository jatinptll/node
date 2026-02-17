import { AnimatePresence, motion } from 'framer-motion';
import { useTaskStore } from '@/store/taskStore';
import { useUIStore } from '@/store/uiStore';
import { TaskItem } from '@/components/tasks/TaskItem';
import { TaskCreationRow } from '@/components/tasks/TaskCreationRow';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';

export const ListView = () => {
  const { selectedListId } = useUIStore();
  const { getTasksForList, lists } = useTaskStore();
  const [showCompleted, setShowCompleted] = useState(false);

  const allTasks = getTasksForList(selectedListId);
  const activeTasks = allTasks.filter(t => !t.isCompleted);
  const completedTasks = allTasks.filter(t => t.isCompleted);
  const currentList = lists.find(l => l.id === selectedListId);

  const totalTasks = allTasks.length;
  const completedCount = completedTasks.length;
  const progress = totalTasks > 0 ? (completedCount / totalTasks) * 100 : 0;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 animate-fade-in">
      {/* Progress bar */}
      {totalTasks > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-mono text-muted-foreground">
              {completedCount} of {totalTasks} completed
            </span>
            <span className="text-xs font-mono text-muted-foreground">{Math.round(progress)}%</span>
          </div>
          <div className="h-1 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-primary rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>
        </div>
      )}

      {/* Task creation */}
      <div className="mb-4">
        <TaskCreationRow />
      </div>

      {/* Active tasks */}
      <div className="space-y-0.5">
        <AnimatePresence mode="popLayout">
          {activeTasks.map(task => (
            <TaskItem key={task.id} task={task} />
          ))}
        </AnimatePresence>
      </div>

      {activeTasks.length === 0 && completedTasks.length === 0 && (
        <div className="text-center py-16">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl surface-2 flex items-center justify-center">
            <span className="text-2xl">💎</span>
          </div>
          <p className="text-muted-foreground text-sm font-mono">No tasks yet</p>
          <p className="text-muted-foreground/60 text-xs mt-1">Add your first task above</p>
        </div>
      )}

      {/* Completed section */}
      {completedTasks.length > 0 && (
        <div className="mt-6">
          <button
            onClick={() => setShowCompleted(!showCompleted)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
          >
            <ChevronDown className={`w-4 h-4 transition-transform ${showCompleted ? '' : '-rotate-90'}`} />
            <span className="font-mono text-xs">{completedTasks.length} Completed</span>
          </button>
          <AnimatePresence>
            {showCompleted && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="space-y-0.5 overflow-hidden"
              >
                {completedTasks.map(task => (
                  <TaskItem key={task.id} task={task} />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};
