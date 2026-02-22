import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTaskStore } from '@/store/taskStore';
import { useUIStore } from '@/store/uiStore';
import { useAuthStore } from '@/store/authStore';
import {
    CheckCircle2, Circle, Clock, AlertTriangle, TrendingUp, Target,
    Flame, CalendarDays, BookOpen, ArrowUpRight, ChevronRight,
    BarChart3, Zap, Trophy, Star, ArrowDown, ArrowUp
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Task, Priority } from '@/types/task';

/* ──────────────── Helpers ──────────────── */

const priorityConfig: Record<Priority, { label: string; color: string; bg: string }> = {
    p1: { label: 'Urgent', color: '#EF4444', bg: 'rgba(239,68,68,0.15)' },
    p2: { label: 'High', color: '#F59E0B', bg: 'rgba(245,158,11,0.15)' },
    p3: { label: 'Medium', color: '#3B82F6', bg: 'rgba(59,130,246,0.15)' },
    p4: { label: 'Low', color: '#94A3B8', bg: 'rgba(148,163,184,0.10)' },
};

const statusConfig = {
    todo: { label: 'To Do', color: '#94A3B8' },
    in_progress: { label: 'In Progress', color: '#3B82F6' },
    review: { label: 'Review', color: '#F59E0B' },
    done: { label: 'Done', color: '#10B981' },
};

function getGreeting() {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
}

function getDayOfYear(date: Date) {
    const start = new Date(date.getFullYear(), 0, 0);
    const diff = date.getTime() - start.getTime();
    return Math.floor(diff / 86400000);
}

function getWeekNumber(date: Date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

/* ──────────────── Stat Card ──────────────── */

const StatCard = ({ icon: Icon, label, value, subtitle, color, trend, delay = 0 }: {
    icon: any; label: string; value: number | string; subtitle?: string;
    color: string; trend?: { value: number; label: string }; delay?: number;
}) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay }}
        className="relative rounded-xl border border-border surface-1 p-4 hover:border-border hover:shadow-elevation-1 transition-all group overflow-hidden"
    >
        <div className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-[0.04]" style={{ backgroundColor: color, filter: 'blur(20px)' }} />
        <div className="flex items-start justify-between mb-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: color + '18' }}>
                <Icon className="w-4 h-4" style={{ color }} />
            </div>
            {trend && (
                <div className={cn("flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded-full", trend.value >= 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400")}>
                    {trend.value >= 0 ? <ArrowUp className="w-2.5 h-2.5" /> : <ArrowDown className="w-2.5 h-2.5" />}
                    {Math.abs(trend.value)}%
                </div>
            )}
        </div>
        <p className="text-2xl font-bold text-foreground font-mono">{value}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
        {subtitle && <p className="text-[10px] text-muted-foreground/60 mt-0.5">{subtitle}</p>}
    </motion.div>
);

/* ──────────────── Progress Ring ──────────────── */

const ProgressRing = ({ percent, size = 80, stroke = 6, color }: { percent: number; size?: number; stroke?: number; color: string }) => {
    const radius = (size - stroke) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percent / 100) * circumference;

    return (
        <svg width={size} height={size} className="transform -rotate-90">
            <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" strokeWidth={stroke} className="text-muted/20" />
            <motion.circle
                cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={stroke}
                strokeLinecap="round" strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset: offset }}
                transition={{ duration: 1, delay: 0.3, ease: 'easeOut' }}
            />
        </svg>
    );
};

/* ──────────────── Horizontal Bar ──────────────── */

const HBar = ({ label, count, total, color, delay = 0 }: { label: string; count: number; total: number; color: string; delay?: number }) => {
    const pct = total > 0 ? (count / total) * 100 : 0;
    return (
        <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-mono text-foreground">{count}</span>
            </div>
            <div className="h-2 bg-muted/30 rounded-full overflow-hidden">
                <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.8, delay, ease: 'easeOut' }}
                />
            </div>
        </div>
    );
};

/* ──────────────── Activity Heatmap (Last 12 Weeks) ──────────────── */

const ActivityHeatmap = ({ tasks }: { tasks: Task[] }) => {
    const weeks = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Get completion dates map
        const completionMap = new Map<string, number>();
        tasks.forEach(t => {
            if (t.completedAt) {
                const dateKey = new Date(t.completedAt).toISOString().split('T')[0];
                completionMap.set(dateKey, (completionMap.get(dateKey) || 0) + 1);
            }
        });

        // Find the Sunday 52 weeks ago
        const dayOfWeek = today.getDay(); // 0 = Sunday ... 6 = Saturday
        const totalDays = 52 * 7 + (dayOfWeek + 1);
        const startDate = new Date(today);
        startDate.setDate(today.getDate() - totalDays + 1);

        const weeksArray: { date: Date; count: number; isFuture: boolean; monthIdx: number }[][] = [];
        let currDate = new Date(startDate);

        for (let w = 0; w < 53; w++) {
            const week: { date: Date; count: number; isFuture: boolean; monthIdx: number }[] = [];
            for (let d = 0; d < 7; d++) {
                const key = currDate.toISOString().split('T')[0];
                week.push({
                    date: new Date(currDate),
                    count: completionMap.get(key) || 0,
                    isFuture: currDate.getTime() > today.getTime(),
                    monthIdx: currDate.getMonth(),
                });
                currDate.setDate(currDate.getDate() + 1);
            }
            weeksArray.push(week);
        }
        return weeksArray;
    }, [tasks]);

    const monthLabels = useMemo(() => {
        const labels: { label: string; colIndex: number }[] = [];
        let currentMonth = -1;
        weeks.forEach((week, i) => {
            const monthIdx = week[0].monthIdx;
            if (monthIdx !== currentMonth) {
                if (currentMonth !== -1 || week[0].date.getDate() <= 14) {
                    labels.push({
                        label: week[0].date.toLocaleString('default', { month: 'short' }),
                        colIndex: i
                    });
                }
                currentMonth = monthIdx;
            }
        });
        return labels;
    }, [weeks]);

    const getIntensity = (count: number, isFuture: boolean) => {
        if (isFuture) return 'bg-transparent';
        if (count === 0) return 'bg-black/5 dark:bg-white/10';
        if (count === 1) return 'bg-purple-500/30';
        if (count <= 3) return 'bg-purple-500/50';
        if (count <= 5) return 'bg-purple-500/70';
        return 'bg-purple-500';
    };

    return (
        <div className="flex flex-col w-full overflow-x-auto custom-scrollbar pb-2">
            <div className="flex text-[10px] text-muted-foreground mb-1 mt-1 relative" style={{ minWidth: 'max-content' }}>
                <div className="w-8 shrink-0" /> {/* Spacer for day labels */}
                <div className="flex-1 relative h-4">
                    {monthLabels.map((m, i) => (
                        <span
                            key={i}
                            className="absolute"
                            style={{ left: `calc(${m.colIndex} * 15px)` }}
                        >
                            {m.label}
                        </span>
                    ))}
                </div>
            </div>

            <div className="flex gap-[3px]" style={{ minWidth: 'max-content' }}>
                <div className="relative w-8 shrink-0 text-[10px] text-muted-foreground mr-1">
                    <span className="absolute top-[14px] leading-[12px] right-2">Mon</span>
                    <span className="absolute top-[44px] leading-[12px] right-2">Wed</span>
                    <span className="absolute top-[74px] leading-[12px] right-2">Fri</span>
                </div>

                {weeks.map((week, wi) => (
                    <div key={wi} className="flex flex-col gap-[3px]">
                        {week.map((day, di) => (
                            <motion.div
                                key={di}
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ duration: 0.2, delay: wi * 0.005 + di * 0.01 }}
                                className={cn("w-3 h-3 rounded-[2px] transition-colors shrink-0", getIntensity(day.count, day.isFuture))}
                                title={!day.isFuture ? `${day.date.toLocaleDateString()}: ${day.count} task${day.count !== 1 ? 's' : ''} completed` : ''}
                            />
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
};

/* ──────────────── Upcoming Deadlines ──────────────── */

const DeadlineItem = ({ task, onClick }: { task: Task; onClick: () => void }) => {
    const dueDate = task.dueDate ? new Date(task.dueDate) : null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const daysUntil = dueDate ? Math.ceil((dueDate.getTime() - today.getTime()) / 86400000) : null;

    const urgencyColor = daysUntil !== null
        ? daysUntil < 0 ? 'text-red-400' : daysUntil === 0 ? 'text-amber-400' : daysUntil <= 2 ? 'text-orange-400' : 'text-muted-foreground'
        : 'text-muted-foreground';

    const urgencyLabel = daysUntil !== null
        ? daysUntil < 0 ? `${Math.abs(daysUntil)}d overdue` : daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `${daysUntil}d left`
        : '';

    return (
        <button
            onClick={onClick}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:surface-3 transition-colors group"
        >
            <div className={cn("w-2 h-2 rounded-full flex-shrink-0", daysUntil !== null && daysUntil < 0 ? "bg-red-400 animate-pulse" : "bg-muted-foreground/40")} />
            <div className="flex-1 min-w-0 text-left">
                <p className="text-sm text-foreground truncate">{task.title}</p>
                <p className="text-[10px] text-muted-foreground font-mono">{task.listId}</p>
            </div>
            <div className="flex items-center gap-1.5">
                {task.source === 'classroom' && <BookOpen className="w-3 h-3 text-primary" />}
                <span className={cn("text-[11px] font-mono", urgencyColor)}>{urgencyLabel}</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>
    );
};

/* ──────────────── Weekly Sparkline ──────────────── */

const WeeklySparkline = ({ tasks }: { tasks: Task[] }) => {
    const data = useMemo(() => {
        const days: number[] = [];
        const today = new Date();
        for (let i = 6; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            const key = d.toISOString().split('T')[0];
            const count = tasks.filter(t => t.completedAt && new Date(t.completedAt).toISOString().split('T')[0] === key).length;
            days.push(count);
        }
        return days;
    }, [tasks]);

    const max = Math.max(...data, 1);
    const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const today = new Date().getDay();
    const orderedLabels: string[] = [];
    for (let i = 6; i >= 0; i--) {
        const idx = (today - i + 7) % 7;
        orderedLabels.push(dayLabels[idx === 0 ? 6 : idx - 1]);
    }

    return (
        <div className="flex items-end gap-1.5 h-16">
            {data.map((val, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <motion.div
                        className="w-full rounded-t-sm bg-gradient-to-t from-purple-600 to-purple-400 min-h-[2px]"
                        initial={{ height: 0 }}
                        animate={{ height: `${Math.max((val / max) * 100, 4)}%` }}
                        transition={{ duration: 0.6, delay: i * 0.08 }}
                    />
                    <span className="text-[9px] font-mono text-muted-foreground">{orderedLabels[i]}</span>
                </div>
            ))}
        </div>
    );
};

/* ══════════════════════════════════════════
   MAIN DASHBOARD
   ══════════════════════════════════════════ */

export const DashboardView = () => {
    const { tasks: allTasks, lists: allLists } = useTaskStore();
    const { setSelectedListId } = useUIStore();
    const { openDetailPanel } = useUIStore();
    const { hiddenListIds } = useUIStore();
    const { user } = useAuthStore();
    const [selectedTimeRange, setSelectedTimeRange] = useState<'week' | 'month' | 'all'>('week');

    // Filter out tasks and lists from hidden subjects
    const tasks = allTasks.filter(t => !hiddenListIds.has(t.listId));
    const lists = allLists.filter(l => !hiddenListIds.has(l.id));


    const displayName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'there';

    // ──── Core Metrics ────
    const stats = useMemo(() => {
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        const weekAgo = new Date(now.getTime() - 7 * 86400000);
        const monthAgo = new Date(now.getTime() - 30 * 86400000);

        const total = tasks.length;
        const completed = tasks.filter(t => t.isCompleted).length;
        const pending = total - completed;
        const overdue = tasks.filter(t => t.dueDate && !t.isCompleted && new Date(t.dueDate) < new Date(todayStr)).length;
        const dueToday = tasks.filter(t => t.dueDate === todayStr && !t.isCompleted).length;

        const completedThisWeek = tasks.filter(t => t.completedAt && new Date(t.completedAt) >= weekAgo).length;
        const completedLastWeek = tasks.filter(t => {
            if (!t.completedAt) return false;
            const d = new Date(t.completedAt);
            const twoWeeksAgo = new Date(now.getTime() - 14 * 86400000);
            return d >= twoWeeksAgo && d < weekAgo;
        }).length;
        const weeklyTrend = completedLastWeek > 0
            ? Math.round(((completedThisWeek - completedLastWeek) / completedLastWeek) * 100)
            : completedThisWeek > 0 ? 100 : 0;

        const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

        // Priority breakdown
        const byPriority = {
            p1: tasks.filter(t => t.priority === 'p1' && !t.isCompleted).length,
            p2: tasks.filter(t => t.priority === 'p2' && !t.isCompleted).length,
            p3: tasks.filter(t => t.priority === 'p3' && !t.isCompleted).length,
            p4: tasks.filter(t => t.priority === 'p4' && !t.isCompleted).length,
        };

        // Status breakdown
        const byStatus = {
            todo: tasks.filter(t => t.status === 'todo' && !t.isCompleted).length,
            in_progress: tasks.filter(t => t.status === 'in_progress' && !t.isCompleted).length,
            review: tasks.filter(t => t.status === 'review' && !t.isCompleted).length,
            done: completed,
        };

        // Source breakdown
        const classroomTasks = tasks.filter(t => t.source === 'classroom').length;
        const manualTasks = tasks.filter(t => t.source === 'manual').length;

        // Streak (consecutive days with completed tasks)
        let streak = 0;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        for (let i = 0; i < 365; i++) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            const key = d.toISOString().split('T')[0];
            const completedOnDay = tasks.some(t => t.completedAt && new Date(t.completedAt).toISOString().split('T')[0] === key);
            if (completedOnDay) streak++;
            else if (i > 0) break; // Allow today to be empty
        }

        // Upcoming deadlines
        const upcoming = tasks
            .filter(t => t.dueDate && !t.isCompleted)
            .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
            .slice(0, 8);

        // Per-list stats
        const listStats = lists.map(l => ({
            ...l,
            total: tasks.filter(t => t.listId === l.id).length,
            completed: tasks.filter(t => t.listId === l.id && t.isCompleted).length,
            pending: tasks.filter(t => t.listId === l.id && !t.isCompleted).length,
        })).filter(l => l.total > 0).sort((a, b) => b.total - a.total);

        return {
            total, completed, pending, overdue, dueToday,
            completedThisWeek, weeklyTrend, completionRate,
            byPriority, byStatus, classroomTasks, manualTasks,
            streak, upcoming, listStats,
        };
    }, [tasks, lists]);

    return (
        <div className="h-full overflow-y-auto animate-fade-in">
            <div className="max-w-[1400px] mx-auto p-6 space-y-6">

                {/* ──── Greeting Header ──── */}
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center justify-between"
                >
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">
                            {getGreeting()}, <span className="text-primary">{displayName}</span>
                        </h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            {stats.dueToday > 0
                                ? `You have ${stats.dueToday} task${stats.dueToday !== 1 ? 's' : ''} due today`
                                : stats.pending > 0
                                    ? `${stats.pending} task${stats.pending !== 1 ? 's' : ''} waiting for you`
                                    : 'All caught up! 🎉'}
                        </p>
                    </div>
                    <div className="flex items-center gap-1 border border-border rounded-lg p-0.5 text-xs font-mono">
                        {(['week', 'month', 'all'] as const).map(range => (
                            <button
                                key={range}
                                onClick={() => setSelectedTimeRange(range)}
                                className={cn(
                                    "px-3 py-1.5 rounded-md transition-all capitalize",
                                    selectedTimeRange === range
                                        ? "bg-primary text-primary-foreground"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                {range}
                            </button>
                        ))}
                    </div>
                </motion.div>

                {/* ──── Top Stat Cards ──── */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard icon={Target} label="Total Tasks" value={stats.total} color="#7C3AED" delay={0} />
                    <StatCard icon={CheckCircle2} label="Completed" value={stats.completed} color="#10B981" delay={0.05}
                        trend={stats.weeklyTrend !== 0 ? { value: stats.weeklyTrend, label: 'vs last week' } : undefined}
                        subtitle={`${stats.completedThisWeek} this week`}
                    />
                    <StatCard icon={Clock} label="In Progress" value={stats.byStatus.in_progress} color="#3B82F6" delay={0.1} />
                    <StatCard icon={AlertTriangle} label="Overdue" value={stats.overdue} color="#EF4444" delay={0.15}
                        subtitle={stats.overdue > 0 ? 'Needs attention' : 'None — great!'}
                    />
                </div>

                {/* ──── Middle Row ──── */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

                    {/* Completion Rate + Ring */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="rounded-xl border border-border surface-1 p-5"
                    >
                        <h3 className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-4">Completion Rate</h3>
                        <div className="flex items-center gap-6">
                            <div className="relative">
                                <ProgressRing percent={stats.completionRate} size={90} stroke={7} color="#7C3AED" />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="text-lg font-bold font-mono text-foreground">{stats.completionRate}%</span>
                                </div>
                            </div>
                            <div className="space-y-2 flex-1">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                    <span className="text-xs text-muted-foreground">Done</span>
                                    <span className="text-xs font-mono text-foreground ml-auto">{stats.completed}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                                    <span className="text-xs text-muted-foreground">Active</span>
                                    <span className="text-xs font-mono text-foreground ml-auto">{stats.byStatus.in_progress + stats.byStatus.review}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-slate-500" />
                                    <span className="text-xs text-muted-foreground">To Do</span>
                                    <span className="text-xs font-mono text-foreground ml-auto">{stats.byStatus.todo}</span>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Priority Breakdown */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.25 }}
                        className="rounded-xl border border-border surface-1 p-5"
                    >
                        <h3 className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-4">By Priority</h3>
                        <div className="space-y-3">
                            {(Object.entries(priorityConfig) as [Priority, typeof priorityConfig['p1']][]).map(([key, cfg], i) => (
                                <HBar key={key} label={cfg.label} count={stats.byPriority[key]} total={stats.pending} color={cfg.color} delay={0.3 + i * 0.08} />
                            ))}
                        </div>
                    </motion.div>

                    {/* Weekly Activity */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="rounded-xl border border-border surface-1 p-5"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xs font-mono uppercase tracking-wider text-muted-foreground">This Week</h3>
                            <div className="flex items-center gap-1.5">
                                <Flame className="w-3.5 h-3.5 text-orange-400" />
                                <span className="text-xs font-mono text-orange-400">{stats.streak} day streak</span>
                            </div>
                        </div>
                        <WeeklySparkline tasks={tasks} />
                        <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">Completed this week</span>
                            <span className="text-sm font-bold font-mono text-foreground">{stats.completedThisWeek}</span>
                        </div>
                    </motion.div>
                </div>

                {/* ──── Bottom Row ──── */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                    {/* Upcoming Deadlines */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.35 }}
                        className="rounded-xl border border-border surface-1 overflow-hidden"
                    >
                        <div className="px-5 py-3 border-b border-border flex items-center justify-between">
                            <h3 className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Upcoming Deadlines</h3>
                            <button
                                onClick={() => setSelectedListId('upcoming')}
                                className="text-[10px] font-mono text-primary hover:text-primary/80 flex items-center gap-1 transition-colors"
                            >
                                View all <ArrowUpRight className="w-3 h-3" />
                            </button>
                        </div>
                        <div className="divide-y divide-border/50">
                            {stats.upcoming.length > 0 ? (
                                stats.upcoming.map((task) => (
                                    <DeadlineItem key={task.id} task={task} onClick={() => openDetailPanel(task.id)} />
                                ))
                            ) : (
                                <div className="px-5 py-10 text-center">
                                    <CalendarDays className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                                    <p className="text-sm text-muted-foreground">No upcoming deadlines</p>
                                    <p className="text-[10px] text-muted-foreground/60">You're all clear!</p>
                                </div>
                            )}
                        </div>
                    </motion.div>

                    {/* Per-List Breakdown + Activity Heatmap */}
                    <div className="space-y-4">
                        {/* List Stats */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                            className="rounded-xl border border-border surface-1 p-5"
                        >
                            <h3 className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-4">Tasks by List</h3>
                            <div className="space-y-2">
                                {stats.listStats.slice(0, 6).map((list, i) => {
                                    const pct = list.total > 0 ? Math.round((list.completed / list.total) * 100) : 0;
                                    return (
                                        <button
                                            key={list.id}
                                            onClick={() => setSelectedListId(list.id)}
                                            className="w-full flex items-center gap-3 px-2 py-1.5 rounded-lg hover:surface-3 transition-colors group"
                                        >
                                            <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: list.color }} />
                                            <span className="text-xs text-foreground flex-1 text-left truncate">{list.name}</span>
                                            <div className="w-16 h-1.5 bg-muted/30 rounded-full overflow-hidden">
                                                <motion.div
                                                    className="h-full rounded-full"
                                                    style={{ backgroundColor: list.color }}
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${pct}%` }}
                                                    transition={{ duration: 0.8, delay: 0.4 + i * 0.06 }}
                                                />
                                            </div>
                                            <span className="text-[10px] font-mono text-muted-foreground w-10 text-right">{pct}%</span>
                                            <ChevronRight className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition" />
                                        </button>
                                    );
                                })}
                                {stats.listStats.length === 0 && (
                                    <p className="text-xs text-muted-foreground text-center py-4">No tasks yet</p>
                                )}
                            </div>
                        </motion.div>

                        {/* Activity Heatmap */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.45 }}
                            className="rounded-xl border border-border surface-1 p-5 overflow-hidden flex flex-col items-center"
                        >
                            <div className="w-full mb-3 px-1">
                                <h3 className="text-xs font-mono uppercase tracking-wider text-muted-foreground whitespace-nowrap">Activity (1 Year)</h3>
                            </div>
                            <div className="w-full">
                                <ActivityHeatmap tasks={tasks} />
                            </div>

                            <div className="flex items-center justify-between w-full mt-3 px-1" style={{ minWidth: 'max-content' }}>
                                <span className="text-[10px] text-muted-foreground mr-1">Learn how we count contributions</span>
                                <div className="flex items-center gap-1 shrink-0 ml-auto">
                                    <span className="text-[10px] text-muted-foreground mr-1">Less</span>
                                    {['bg-black/5 dark:bg-white/10', 'bg-purple-500/30', 'bg-purple-500/50', 'bg-purple-500/70', 'bg-purple-500'].map((cls, i) => (
                                        <div key={i} className={cn("w-3 h-3 rounded-[2px]", cls)} />
                                    ))}
                                    <span className="text-[10px] text-muted-foreground ml-1">More</span>
                                </div>
                            </div>
                        </motion.div>

                        {/* Quick Stats Footer */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 }}
                            className="grid grid-cols-3 gap-3"
                        >
                            <div className="rounded-xl border border-border surface-1 p-3 text-center">
                                <BookOpen className="w-4 h-4 text-primary mx-auto mb-1" />
                                <p className="text-lg font-bold font-mono text-foreground">{stats.classroomTasks}</p>
                                <p className="text-[10px] text-muted-foreground">From Classroom</p>
                            </div>
                            <div className="rounded-xl border border-border surface-1 p-3 text-center">
                                <Zap className="w-4 h-4 text-amber-400 mx-auto mb-1" />
                                <p className="text-lg font-bold font-mono text-foreground">{stats.manualTasks}</p>
                                <p className="text-[10px] text-muted-foreground">Manual Tasks</p>
                            </div>
                            <div className="rounded-xl border border-border surface-1 p-3 text-center">
                                <Trophy className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
                                <p className="text-lg font-bold font-mono text-foreground">{stats.streak}</p>
                                <p className="text-[10px] text-muted-foreground">Day Streak</p>
                            </div>
                        </motion.div>
                    </div>
                </div>

            </div>
        </div>
    );
};
