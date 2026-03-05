import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTaskStore } from '@/store/taskStore';
import { useUIStore } from '@/store/uiStore';
import { getLocalDateString } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { X, Sparkles, Clock, Flag, Target, CheckCircle2 } from 'lucide-react';
import { formatEstimate } from '@/components/tasks/TimeEstimateSelector';
import { scoreTasks, getTimeBucket } from '@/lib/taskScoring';
import type { Task, Priority } from '@/types/task';

const priorityConfig: Record<Priority, { label: string; color: string }> = {
    p1: { label: 'P1', color: '#EF4444' },
    p2: { label: 'P2', color: '#F59E0B' },
    p3: { label: 'P3', color: '#3B82F6' },
    p4: { label: 'P4', color: '#94A3B8' },
};

export const MorningPlanModal = () => {
    const { tasks } = useTaskStore();
    const { confirmDailyPlan, dismissDailyPlan, dailyPlanDismissCount } = useUIStore();
    const { hiddenListIds } = useUIStore();
    const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());
    const [confirmed, setConfirmed] = useState(false);

    const todayStr = getLocalDateString();
    const tomorrowStr = getLocalDateString(Date.now() + 86400000);
    const timeBucket = getTimeBucket();

    const suggestedTasks = useMemo(() => {
        const active = tasks.filter(t => !t.isCompleted && !hiddenListIds.includes(t.listId));
        const scored = scoreTasks(active, timeBucket, todayStr, tomorrowStr);
        // Cap at 7 tasks
        return scored.slice(0, 7);
    }, [tasks, todayStr, tomorrowStr, hiddenListIds, timeBucket]);

    const visibleTasks = suggestedTasks.filter(t => !removedIds.has(t.id));
    const totalEstimate = visibleTasks.reduce((acc, t) => acc + (t.estimatedMinutes || 0), 0);

    // Third-time variant: softer tone
    const isThirdAttempt = dailyPlanDismissCount >= 2;

    const getGreeting = () => {
        const h = new Date().getHours();
        if (h < 12) return 'Good morning';
        if (h < 17) return 'Good afternoon';
        return 'Good evening';
    };

    const handleRemove = (id: string) => {
        setRemovedIds(prev => new Set(prev).add(id));
    };

    const handleConfirm = () => {
        setConfirmed(true);
        const planTaskIds = visibleTasks.map(t => t.id);
        setTimeout(() => {
            confirmDailyPlan(planTaskIds);
        }, 1500);
    };

    const handleDismiss = () => {
        dismissDailyPlan();
    };

    if (suggestedTasks.length === 0) {
        // No tasks to suggest, auto-dismiss
        dismissDailyPlan();
        return null;
    }

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] flex items-center justify-center"
        >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleDismiss} />

            {/* Modal */}
            <motion.div
                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 30, scale: 0.95 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                className="relative z-10 w-full max-w-md mx-4 rounded-2xl border border-border bg-background surface-1 shadow-elevation-3 overflow-hidden"
            >
                <AnimatePresence mode="wait">
                    {!confirmed ? (
                        <motion.div
                            key="plan"
                            initial={{ opacity: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                        >
                            {/* Header */}
                            <div className="px-6 pt-6 pb-4">
                                <button
                                    onClick={handleDismiss}
                                    className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                                <div className="flex items-center gap-2 mb-2">
                                    <Sparkles className="w-5 h-5 text-amber-400" />
                                    <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Daily Plan</span>
                                </div>
                                <h2 className="text-xl font-bold text-foreground">
                                    {isThirdAttempt
                                        ? "Last check — here's what Node has for you today. No pressure."
                                        : `${getGreeting()}. Here's your suggested plan for today.`
                                    }
                                </h2>
                                {totalEstimate > 0 && (
                                    <p className="text-xs text-muted-foreground font-mono mt-2 flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        ~{formatEstimate(totalEstimate)} estimated work
                                    </p>
                                )}
                            </div>

                            {/* Task List */}
                            <div className="px-6 pb-4 space-y-1 max-h-[40vh] overflow-y-auto">
                                <AnimatePresence>
                                    {visibleTasks.map((task, i) => (
                                        <motion.div
                                            key={task.id}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: 20, height: 0, marginBottom: 0 }}
                                            transition={{ delay: i * 0.05 }}
                                            className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border surface-2 group"
                                        >
                                            {/* Priority dot */}
                                            <div
                                                className="w-2 h-2 rounded-full flex-shrink-0"
                                                style={{ backgroundColor: priorityConfig[task.priority].color }}
                                            />

                                            {/* Task info */}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm text-foreground truncate">{task.title}</p>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    {task.dueDate && task.dueDate < todayStr && (
                                                        <span className="text-[10px] font-mono text-destructive">Overdue</span>
                                                    )}
                                                    {task.dueDate === todayStr && (
                                                        <span className="text-[10px] font-mono text-amber-500">Due today</span>
                                                    )}
                                                    {task.estimatedMinutes && (
                                                        <span className="text-[10px] font-mono text-muted-foreground flex items-center gap-0.5">
                                                            <Clock className="w-2.5 h-2.5" />
                                                            {formatEstimate(task.estimatedMinutes)}
                                                        </span>
                                                    )}
                                                    {task.goalId && (
                                                        <span className="text-[10px] font-mono text-purple-400 flex items-center gap-0.5">
                                                            <Target className="w-2.5 h-2.5" />
                                                            Goal
                                                        </span>
                                                    )}
                                                    {/* Why label */}
                                                    <span className="text-[10px] font-mono text-muted-foreground/60">
                                                        • {task.reason}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Remove button */}
                                            <button
                                                onClick={() => handleRemove(task.id)}
                                                className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all flex-shrink-0"
                                            >
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </div>

                            {/* Footer */}
                            <div className="px-6 py-4 border-t border-border flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3">
                                <button
                                    onClick={handleDismiss}
                                    className="text-xs font-mono text-muted-foreground hover:text-foreground transition-colors py-2 w-full sm:w-auto text-center"
                                >
                                    Maybe later
                                </button>
                                <button
                                    onClick={handleConfirm}
                                    disabled={visibleTasks.length === 0}
                                    className="flex items-center justify-center gap-2 px-5 py-2.5 sm:py-2 rounded-lg bg-primary text-primary-foreground text-sm font-mono font-medium hover:bg-primary/90 transition-all disabled:opacity-50 w-full sm:w-auto"
                                >
                                    <Sparkles className="w-3.5 h-3.5" />
                                    Looks good, let's go
                                </button>
                            </div>
                        </motion.div>
                    ) : (
                        /* Confirmed state */
                        <motion.div
                            key="confirmed"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="px-6 py-12 text-center"
                        >
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                                className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4"
                            >
                                <CheckCircle2 className="w-8 h-8 text-primary" />
                            </motion.div>
                            <h3 className="text-lg font-bold text-foreground mb-1">
                                You've got a plan. Let's do this. 🎯
                            </h3>
                            <p className="text-xs text-muted-foreground font-mono">
                                {visibleTasks.length} tasks pinned to your Today view
                            </p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </motion.div>
    );
};
