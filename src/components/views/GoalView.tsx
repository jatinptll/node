import { useState, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useTaskStore } from '@/store/taskStore';
import { useUIStore } from '@/store/uiStore';
import { TaskItem } from '@/components/tasks/TaskItem';
import { TaskCreationRow } from '@/components/tasks/TaskCreationRow';
import { formatEstimate } from '@/components/tasks/TimeEstimateSelector';
import { ChevronDown, Target, Edit2, Trash2, CalendarDays } from 'lucide-react';
import { GoalDialog } from '@/components/tasks/GoalDialog';
import { Button } from '@/components/ui/button';
import { sortActiveTasks, sortCompletedTasks, paginate, PAGE_SIZE } from '@/lib/taskSorting';
import { PaginationBar } from '@/components/PaginationBar';

export const GoalView = ({ goalId }: { goalId: string }) => {
    const { goals, tasks, deleteGoal } = useTaskStore();
    const { setSelectedListId } = useUIStore();
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [showCompleted, setShowCompleted] = useState(false);
    const [activePage, setActivePage] = useState(0);
    const [completedPage, setCompletedPage] = useState(0);

    const goal = goals.find(g => g.id === goalId);
    const goalTasks = tasks.filter(t => t.goalId === goalId);

    const activeTasks = useMemo(() => sortActiveTasks(goalTasks.filter(t => !t.isCompleted)), [goalTasks]);
    const completedTasks = useMemo(() => sortCompletedTasks(goalTasks.filter(t => t.isCompleted)), [goalTasks]);

    const paginatedActive = useMemo(() => paginate(activeTasks, activePage, PAGE_SIZE), [activeTasks, activePage]);
    const paginatedCompleted = useMemo(() => paginate(completedTasks, completedPage, PAGE_SIZE), [completedTasks, completedPage]);

    const totalTasks = goalTasks.length;
    const completedCount = completedTasks.length;
    const progress = totalTasks > 0 ? (completedCount / totalTasks) * 100 : 0;
    const totalEstimatedMins = activeTasks.reduce((acc, t) => acc + (t.estimatedMinutes || 0), 0);

    if (!goal) return <div className="p-8 text-center text-muted-foreground font-mono">Goal not found</div>;

    return (
        <div className="max-w-2xl mx-auto px-4 py-6 animate-fade-in">
            <div className="flex items-start justify-between mb-6">
                <div>
                    <h2 className="text-2xl font-semibold flex items-center gap-2">
                        <Target className="w-6 h-6 text-primary" />
                        {goal.title}
                    </h2>
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground font-mono">
                        <span className="capitalize px-2 py-0.5 rounded-full bg-surface-2">{goal.timeframe}</span>
                        {goal.targetDate && (
                            <span className="flex items-center gap-1">
                                <CalendarDays className="w-3.5 h-3.5" />
                                {new Date(goal.targetDate).toLocaleDateString()}
                            </span>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => setEditDialogOpen(true)}>
                        <Edit2 className="w-4 h-4 text-muted-foreground" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => {
                        if (confirm('Delete this goal and unlink its tasks?')) {
                            deleteGoal(goal.id);
                            setSelectedListId('dashboard');
                        }
                    }}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                </div>
            </div>

            {/* Progress bar */}
            <div className="mb-6 bg-surface-2 p-4 rounded-xl border border-border/50">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium flex items-center gap-2 text-foreground">
                        <span>{completedCount} of {totalTasks} tasks completed</span>
                        {totalEstimatedMins > 0 && (
                            <span className="text-muted-foreground text-xs font-mono">
                                · ~{formatEstimate(totalEstimatedMins)} work remaining
                            </span>
                        )}
                    </span>
                    <span className="text-sm font-mono font-bold text-primary">{Math.round(progress)}%</span>
                </div>
                <div className="h-2.5 bg-background rounded-full overflow-hidden shadow-inner">
                    <motion.div
                        className="h-full bg-primary rounded-full relative overflow-hidden"
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.5, ease: 'easeOut' }}
                    >
                        <div className="absolute inset-0 bg-white/20 w-full animate-shimmer" style={{
                            backgroundImage: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
                            transform: 'skewX(-20deg)',
                        }} />
                    </motion.div>
                </div>
            </div>

            <div className="mb-6">
                <TaskCreationRow goalId={goal.id} />
            </div>

            <div className="space-y-0.5">
                <AnimatePresence mode="popLayout">
                    {paginatedActive.map(task => (
                        <TaskItem key={task.id} task={task} />
                    ))}
                </AnimatePresence>
            </div>
            <PaginationBar
                currentPage={activePage}
                totalItems={activeTasks.length}
                pageSize={PAGE_SIZE}
                onPageChange={setActivePage}
            />

            {activeTasks.length === 0 && completedTasks.length === 0 && (
                <div className="text-center py-12">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-surface-2 flex items-center justify-center glow-sm">
                        <Target className="w-8 h-8 text-primary/50" />
                    </div>
                    <p className="text-muted-foreground text-sm font-mono">No tasks linked to this goal.</p>
                    <p className="text-muted-foreground/60 text-xs mt-1">Add a task above to start making progress.</p>
                </div>
            )}

            {/* Completed section */}
            {completedTasks.length > 0 && (
                <div className="mt-8">
                    <button
                        onClick={() => setShowCompleted(!showCompleted)}
                        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3"
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
                                {paginatedCompleted.map(task => (
                                    <TaskItem key={task.id} task={task} />
                                ))}
                                <PaginationBar
                                    currentPage={completedPage}
                                    totalItems={completedTasks.length}
                                    pageSize={PAGE_SIZE}
                                    onPageChange={setCompletedPage}
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            )}

            <GoalDialog open={editDialogOpen} onOpenChange={setEditDialogOpen} goalId={goal.id} />
        </div>
    );
};
