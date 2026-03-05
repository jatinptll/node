import { useState, useMemo } from 'react';
import { useTaskStore } from '@/store/taskStore';
import { useUIStore } from '@/store/uiStore';
import { TaskItem } from '@/components/tasks/TaskItem';
import { TaskCreationRow } from '@/components/tasks/TaskCreationRow';
import { formatEstimate } from '@/components/tasks/TimeEstimateSelector';
import { getLocalDateString } from '@/lib/utils';
import { AlertCircle, CalendarDays, Sparkles, Clock, ChevronDown } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { scoreTasks, getTimeBucket } from '@/lib/taskScoring';

// ──────────────── Collapsible Section ────────────────

const CollapsibleSection = ({
    icon,
    title,
    subtitle,
    count,
    colorClass,
    children,
    defaultOpen = true,
}: {
    icon: React.ReactNode;
    title: string;
    subtitle?: React.ReactNode;
    count: number;
    colorClass: string;
    children: React.ReactNode;
    defaultOpen?: boolean;
}) => {
    const [open, setOpen] = useState(defaultOpen);

    return (
        <div className="space-y-3">
            <div>
                <button
                    onClick={() => setOpen(!open)}
                    className="w-full flex items-center gap-2 group cursor-pointer"
                >
                    <h3 className={cn("text-sm font-mono uppercase tracking-widest flex items-center gap-2", colorClass)}>
                        {icon}
                        {title}
                    </h3>
                    <span className={cn(
                        "text-[10px] font-mono px-1.5 py-0.5 rounded-full",
                        colorClass,
                        "opacity-60"
                    )}>
                        {count}
                    </span>
                    <ChevronDown className={cn(
                        "w-3.5 h-3.5 text-muted-foreground ml-auto transition-transform duration-200",
                        !open && "-rotate-90"
                    )} />
                </button>
                {subtitle && open && (
                    <p className="text-xs text-muted-foreground font-mono mt-1 opacity-80">{subtitle}</p>
                )}
            </div>
            <AnimatePresence initial={false}>
                {open && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: 'easeInOut' }}
                        className="overflow-hidden"
                    >
                        {children}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// ──────────────── Main View ────────────────

export const TodayView = () => {
    const { tasks } = useTaskStore();
    const { hiddenListIds, dailyPlanConfirmed, dailyPlanTaskIds } = useUIStore();

    const todayStr = getLocalDateString();
    const tomorrowStr = getLocalDateString(Date.now() + 86400000);
    const timeBucket = getTimeBucket();

    const allActive = tasks.filter(t => !t.isCompleted && !hiddenListIds.includes(t.listId));

    const overdueTasks = allActive.filter(t => t.dueDate && t.dueDate < todayStr);
    const todayTasks = allActive.filter(t => t.dueDate === todayStr);

    // Pinned tasks from the morning plan (exclude if already in overdue/today)
    const overdueTodayIds = new Set([...overdueTasks.map(t => t.id), ...todayTasks.map(t => t.id)]);
    const pinnedTasks = dailyPlanConfirmed
        ? dailyPlanTaskIds
            .map(id => tasks.find(t => t.id === id))
            .filter((t): t is NonNullable<typeof t> => !!t && !t.isCompleted && !overdueTodayIds.has(t.id))
        : [];

    // ── Suggested for You: full scoring algorithm ──
    const suggestedTasks = useMemo(() => {
        // Exclude tasks already shown in other sections
        const excludeIds = new Set([
            ...overdueTasks.map(t => t.id),
            ...todayTasks.map(t => t.id),
            ...pinnedTasks.map(t => t.id),
        ]);

        const candidates = allActive.filter(t => !excludeIds.has(t.id));
        const scored = scoreTasks(candidates, timeBucket, todayStr, tomorrowStr);

        // Return top 5
        return scored.slice(0, 5);
    }, [tasks, allActive, overdueTasks, todayTasks, pinnedTasks, timeBucket, todayStr, tomorrowStr]);

    const todayEstimatedMins = [...overdueTasks, ...todayTasks, ...pinnedTasks].reduce((acc, t) => acc + (t.estimatedMinutes || 0), 0);
    const totalHours = todayEstimatedMins / 60;
    const isOverloaded = todayEstimatedMins > 480; // 8 hours

    return (
        <div className="max-w-2xl mx-auto px-4 py-6 animate-fade-in space-y-8">

            {/* Time Tracking Summary */}
            <div className={`p-4 rounded-xl border ${isOverloaded ? 'bg-destructive/10 border-destructive/20' : 'bg-surface-2 border-border'}`}>
                <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${isOverloaded ? 'bg-destructive/20 text-destructive' : 'bg-primary/20 text-primary'}`}>
                        <Clock className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-lg flex items-center gap-2">
                            Time Commitment
                            {isOverloaded && <span className="text-xs bg-destructive text-destructive-foreground px-2 py-0.5 rounded-full font-mono font-medium">Overloaded</span>}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">
                            You have <strong className={isOverloaded ? "text-destructive" : "text-foreground"}> {formatEstimate(todayEstimatedMins)} </strong>
                            ({totalHours.toFixed(1)} hours) of estimated work scheduled for today.
                        </p>
                        {isOverloaded && (
                            <div className="flex items-center gap-1.5 mt-2 text-xs text-destructive font-mono">
                                <AlertCircle className="w-3.5 h-3.5" />
                                This exceeds the recommended 8 hours a day.
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Task Creation */}
            <div className="mb-4">
                <TaskCreationRow />
            </div>

            {/* Pinned from Morning Plan */}
            {pinnedTasks.length > 0 && (
                <CollapsibleSection
                    icon="📌"
                    title="Suggested Plan"
                    subtitle="Tasks from your morning plan."
                    count={pinnedTasks.length}
                    colorClass="text-amber-500"
                >
                    <div className="space-y-0.5">
                        <AnimatePresence mode="popLayout">
                            {pinnedTasks.map(task => (
                                <TaskItem key={task.id} task={task} />
                            ))}
                        </AnimatePresence>
                    </div>
                </CollapsibleSection>
            )}

            {/* Overdue */}
            {overdueTasks.length > 0 && (
                <CollapsibleSection
                    icon={<AlertCircle className="w-4 h-4" />}
                    title="Overdue"
                    count={overdueTasks.length}
                    colorClass="text-destructive"
                >
                    <div className="space-y-0.5">
                        <AnimatePresence mode="popLayout">
                            {overdueTasks.map(task => (
                                <TaskItem key={task.id} task={task} />
                            ))}
                        </AnimatePresence>
                    </div>
                </CollapsibleSection>
            )}

            {/* Due Today */}
            <CollapsibleSection
                icon={<CalendarDays className="w-4 h-4" />}
                title="Due Today"
                count={todayTasks.length}
                colorClass="text-primary"
            >
                {todayTasks.length > 0 ? (
                    <div className="space-y-0.5">
                        <AnimatePresence mode="popLayout">
                            {todayTasks.map(task => (
                                <TaskItem key={task.id} task={task} />
                            ))}
                        </AnimatePresence>
                    </div>
                ) : (
                    <div className="text-center py-6 bg-surface-2 rounded-xl border border-dashed border-border">
                        <span className="text-2xl mb-2 block">🎉</span>
                        <p className="text-sm font-mono text-muted-foreground">Nothing scheduled for today!</p>
                    </div>
                )}
            </CollapsibleSection>

            {/* Suggested for You — full scoring with "why" labels */}
            {suggestedTasks.length > 0 && (
                <CollapsibleSection
                    icon={<Sparkles className="w-4 h-4" />}
                    title="Suggested for you"
                    subtitle={
                        <span>
                            <span className="opacity-60">Updates as your day changes</span>
                        </span>
                    }
                    count={suggestedTasks.length}
                    colorClass="text-info"
                >
                    <div className="space-y-0.5">
                        <AnimatePresence mode="popLayout">
                            {suggestedTasks.map(task => (
                                <div key={task.id} className="relative">
                                    <TaskItem task={task} />
                                    {/* Why label overlay */}
                                    <span className="absolute top-1/2 -translate-y-1/2 right-3 text-[9px] font-mono text-muted-foreground/50 hidden sm:inline pointer-events-none">
                                        {task.reason}
                                    </span>
                                </div>
                            ))}
                        </AnimatePresence>
                    </div>
                </CollapsibleSection>
            )}

        </div>
    );
};
