import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTaskStore } from '@/store/taskStore';
import { useUIStore } from '@/store/uiStore';
import { X, CheckCircle2, Play, Pause } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatEstimate } from '@/components/tasks/TimeEstimateSelector';
import { toast } from 'sonner';

export const FocusOverlay = () => {
    const { focusTaskId, focusStartedAt, endFocusSession } = useUIStore();
    const { tasks, updateTask, toggleTask } = useTaskStore();
    const [elapsed, setElapsed] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const [showSummary, setShowSummary] = useState(false);
    const [finalMinutes, setFinalMinutes] = useState(0);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const task = focusTaskId ? tasks.find(t => t.id === focusTaskId) : null;

    // Timer tick
    useEffect(() => {
        if (!focusStartedAt || isPaused) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            return;
        }
        intervalRef.current = setInterval(() => {
            setElapsed(Math.floor((Date.now() - focusStartedAt) / 1000));
        }, 1000);
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [focusStartedAt, isPaused]);

    // Reset elapsed when session starts
    useEffect(() => {
        if (focusStartedAt) {
            setElapsed(0);
            setIsPaused(false);
            setShowSummary(false);
        }
    }, [focusStartedAt]);

    // Block navigation
    useEffect(() => {
        if (!focusTaskId) return;
        const handler = (e: BeforeUnloadEvent) => {
            e.preventDefault();
            e.returnValue = 'You have an active focus session. Are you sure you want to leave?';
        };
        window.addEventListener('beforeunload', handler);
        return () => window.removeEventListener('beforeunload', handler);
    }, [focusTaskId]);

    const formatTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
        return `${m}:${String(s).padStart(2, '0')}`;
    };

    const handleFinish = useCallback(() => {
        if (!task) return;
        const minutes = Math.max(1, Math.round(elapsed / 60));
        setFinalMinutes(minutes);

        // Log actual duration
        const prevDuration = task.actualDurationMinutes || 0;
        const prevSessions = task.focusSessionsCount || 0;
        updateTask(task.id, {
            actualDurationMinutes: prevDuration + minutes,
            focusSessionsCount: prevSessions + 1,
        });

        setShowSummary(true);
    }, [task, elapsed, updateTask]);

    const handleComplete = () => {
        if (task && !task.isCompleted) toggleTask(task.id);
        toast.success('Great work! Task completed.');
        endFocusSession();
    };

    const handleNotYet = () => {
        toast.success(`Logged ${finalMinutes} min focus session.`);
        endFocusSession();
    };

    const handleExit = () => {
        endFocusSession();
    };

    if (!focusTaskId || !task) return null;

    const estimatedSeconds = (task.estimatedMinutes || 0) * 60;
    const isOverEstimate = estimatedSeconds > 0 && elapsed > estimatedSeconds;
    const remainingSeconds = estimatedSeconds > 0 ? Math.max(0, estimatedSeconds - elapsed) : 0;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex items-center justify-center"
            >
                {/* Backdrop */}
                <div className="absolute inset-0 bg-background/95 backdrop-blur-xl" />

                {/* Content */}
                <motion.div
                    initial={{ opacity: 0, y: 40, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 40, scale: 0.95 }}
                    transition={{ duration: 0.4, ease: 'easeOut' }}
                    className="relative z-10 w-full max-w-lg mx-4 text-center"
                >
                    {!showSummary ? (
                        <>
                            {/* Exit button */}
                            <button
                                onClick={handleExit}
                                className="absolute -top-12 right-0 text-muted-foreground hover:text-foreground transition-colors text-xs font-mono flex items-center gap-1"
                            >
                                <X className="w-3.5 h-3.5" />
                                Exit without saving
                            </button>

                            {/* Task title */}
                            <p className="text-muted-foreground text-xs font-mono uppercase tracking-widest mb-3">
                                Focus Mode
                            </p>
                            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2 leading-tight px-4">
                                {task.title}
                            </h2>
                            {task.description && (
                                <p className="text-sm text-muted-foreground mb-8 line-clamp-2 px-8">
                                    {task.description}
                                </p>
                            )}

                            {/* Timer */}
                            <div className="mb-8">
                                <motion.p
                                    className={cn(
                                        "text-7xl sm:text-8xl font-mono font-bold tracking-tight transition-colors duration-500",
                                        isOverEstimate ? "text-amber-400" : "text-foreground"
                                    )}
                                    animate={isOverEstimate ? { color: ['hsl(var(--foreground))', '#F59E0B'] } : {}}
                                    transition={{ duration: 1 }}
                                >
                                    {formatTime(elapsed)}
                                </motion.p>

                                {/* Estimate countdown */}
                                {task.estimatedMinutes && task.estimatedMinutes > 0 && (
                                    <p className={cn(
                                        "text-sm font-mono mt-3 transition-colors",
                                        isOverEstimate ? "text-amber-400" : "text-muted-foreground"
                                    )}>
                                        {isOverEstimate
                                            ? `Over by ${formatEstimate(Math.round((elapsed - estimatedSeconds) / 60))}`
                                            : `${formatEstimate(Math.round(remainingSeconds / 60))} remaining`
                                        }
                                    </p>
                                )}
                            </div>

                            {/* Controls */}
                            <div className="flex items-center justify-center gap-4">
                                <button
                                    onClick={() => setIsPaused(!isPaused)}
                                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border surface-2 text-sm font-mono hover:border-primary/30 transition-all"
                                >
                                    {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                                    {isPaused ? 'Resume' : 'Pause'}
                                </button>
                                <button
                                    onClick={handleFinish}
                                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-mono font-medium hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
                                >
                                    <CheckCircle2 className="w-4 h-4" />
                                    Finish Session
                                </button>
                            </div>
                        </>
                    ) : (
                        /* Summary */
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.3 }}
                        >
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
                                className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-6"
                            >
                                <CheckCircle2 className="w-10 h-10 text-primary" />
                            </motion.div>

                            <h3 className="text-xl font-bold text-foreground mb-2">
                                Session Complete!
                            </h3>
                            <p className="text-sm text-muted-foreground mb-1">
                                You spent <strong className="text-foreground">{formatEstimate(finalMinutes)}</strong> on this task.
                            </p>
                            {task.estimatedMinutes && task.estimatedMinutes > 0 && (
                                <p className="text-xs text-muted-foreground font-mono">
                                    Estimated: {formatEstimate(task.estimatedMinutes)}
                                </p>
                            )}

                            <div className="flex items-center justify-center gap-3 mt-8">
                                <button
                                    onClick={handleNotYet}
                                    className="px-5 py-2.5 rounded-xl border border-border surface-2 text-sm font-mono hover:border-primary/30 transition-all"
                                >
                                    Not yet done
                                </button>
                                <button
                                    onClick={handleComplete}
                                    className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-mono font-medium hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
                                >
                                    Mark Complete ✓
                                </button>
                            </div>
                        </motion.div>
                    )}
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};
