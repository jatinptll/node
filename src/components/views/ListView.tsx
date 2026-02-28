import { AnimatePresence, motion } from 'framer-motion';
import { useTaskStore } from '@/store/taskStore';
import { useUIStore } from '@/store/uiStore';
import { TaskItem } from '@/components/tasks/TaskItem';
import { TaskCreationRow } from '@/components/tasks/TaskCreationRow';
import { formatEstimate } from '@/components/tasks/TimeEstimateSelector';
import { ChevronDown, Loader2 } from 'lucide-react';
import { useState } from 'react';

export const ListView = () => {
  const { selectedListId } = useUIStore();
  const { getTasksForList, lists, loadOlderTasks, olderTasksLoaded } = useTaskStore();
  const [showCompletedState, setShowCompletedState] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);

  const showCompleted = selectedListId === 'completed' || showCompletedState;

  const allTasks = getTasksForList(selectedListId);
  const activeTasks = allTasks.filter(t => !t.isCompleted);
  const completedTasks = allTasks.filter(t => t.isCompleted);
  const currentList = lists.find(l => l.id === selectedListId);

  const totalTasks = allTasks.length;
  const completedCount = completedTasks.length;
  const progress = totalTasks > 0 ? (completedCount / totalTasks) * 100 : 0;

  const totalEstimatedMins = activeTasks.reduce((acc, t) => acc + (t.estimatedMinutes || 0), 0);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 animate-fade-in">
      {/* Progress bar */}
      {totalTasks > 0 && selectedListId !== 'upcoming' && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-mono text-muted-foreground flex items-center gap-2">
              <span>{completedCount} of {totalTasks} completed</span>
              {totalEstimatedMins > 0 && (
                <>
                  <span>·</span>
                  <span>~{formatEstimate(totalEstimatedMins)} remaining</span>
                </>
              )}
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
      {selectedListId !== 'completed' && (
        <div className="mb-4">
          <TaskCreationRow />
        </div>
      )}

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
      {(completedTasks.length > 0 || !olderTasksLoaded) && (
        <div className="mt-6">
          <button
            onClick={() => setShowCompletedState(!showCompletedState)}
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

                {/* Load More Older Tasks Button */}
                {!olderTasksLoaded && (
                  <div className="pt-4 flex justify-center">
                    <button
                      onClick={async () => {
                        setLoadingOlder(true);
                        await loadOlderTasks();
                        setLoadingOlder(false);
                      }}
                      disabled={loadingOlder}
                      className="text-xs font-mono text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2 px-4 py-2 rounded-md hover:bg-muted/50"
                    >
                      {loadingOlder ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        completedTasks.length === 0 ? 'Load completed tasks' : 'Load older completed tasks'
                      )}
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};
