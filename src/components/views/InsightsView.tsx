import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useInsightsStore, type InsightTrend } from '@/store/insightsStore';
import { useTaskStore } from '@/store/taskStore';
import { Lightbulb, TrendingUp, ArrowUp, ArrowDown, Minus, Flame, Target, Clock, Trophy, Zap, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';

// ──────────────── Trend Pill ────────────────

const TrendPill = ({ trend }: { trend: InsightTrend }) => {
    if (trend === 'neutral') return null;
    const isUp = trend === 'up';
    return (
        <span className={cn(
            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium",
            isUp ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"
        )}>
            {isUp ? <ArrowUp className="w-2.5 h-2.5" /> : <ArrowDown className="w-2.5 h-2.5" />}
            {isUp ? 'Improving' : 'Declining'}
        </span>
    );
};

const TrendArrow = ({ trend }: { trend: InsightTrend }) => {
    if (trend === 'neutral') return <Minus className="w-3 h-3 text-muted-foreground/40" />;
    return trend === 'up'
        ? <ArrowUp className="w-3 h-3 text-emerald-400" />
        : <ArrowDown className="w-3 h-3 text-red-400" />;
};

// ──────────────── Chart Tooltip ────────────────

const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="rounded-lg border border-border bg-popover px-3 py-2 shadow-elevation-2">
            <p className="text-xs font-mono text-muted-foreground">{label}</p>
            <p className="text-sm font-bold text-foreground">{payload[0].value} task{payload[0].value !== 1 ? 's' : ''}</p>
        </div>
    );
};

// ──────────────── Scorecard Tile ────────────────

const ScorecardTile = ({ icon: Icon, label, value, subtitle, trend, color, delay = 0 }: {
    icon: any; label: string; value: string | number; subtitle?: string;
    trend?: InsightTrend; color: string; delay?: number;
}) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay }}
        className="relative rounded-xl border border-border/60 p-4 overflow-hidden group hover:border-border hover:shadow-elevation-1 transition-all"
        style={{
            background: `linear-gradient(135deg, ${color}08 0%, transparent 60%)`,
        }}
    >
        {/* Glassmorphism glow */}
        <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full opacity-[0.07]" style={{ backgroundColor: color, filter: 'blur(16px)' }} />

        <div className="flex items-center justify-between mb-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: color + '18' }}>
                <Icon className="w-4 h-4" style={{ color }} />
            </div>
            {trend && <TrendArrow trend={trend} />}
        </div>

        <p className="text-2xl font-bold text-foreground font-mono leading-none">{value}</p>
        <p className="text-[10px] text-muted-foreground mt-1.5 leading-tight">{label}</p>
        {subtitle && <p className="text-[9px] text-muted-foreground/50 mt-0.5">{subtitle}</p>}
    </motion.div>
);

// ──────────────── Main View ────────────────

export const InsightsView = () => {
    const { insights, scorecard, dailyActivity28d, computeInsights } = useInsightsStore();
    const { tasks, loadOlderTasks, olderTasksLoaded } = useTaskStore();

    useEffect(() => {
        // Load older completed tasks first to ensure insights have full data
        if (!olderTasksLoaded) {
            loadOlderTasks().then(() => computeInsights());
        } else {
            computeInsights();
        }
    }, [computeInsights, loadOlderTasks, olderTasksLoaded]);

    const totalFocusSessions = tasks.reduce((acc, t) => acc + (t.focusSessionsCount || 0), 0);

    // Format focus time
    const formatFocusTime = (minutes: number): string => {
        if (minutes >= 60) {
            const h = Math.floor(minutes / 60);
            const m = minutes % 60;
            return m > 0 ? `${h}h ${m}m` : `${h}h`;
        }
        return `${minutes}m`;
    };

    // Format chart X axis dates
    const formatChartDate = (dateStr: string): string => {
        const d = new Date(dateStr + 'T00:00:00');
        const day = d.getDay();
        // Show Mon/Wed/Fri/Sun labels only
        if (day === 1 || day === 3 || day === 5 || day === 0) {
            return d.toLocaleDateString('en', { month: 'short', day: 'numeric' });
        }
        return '';
    };

    return (
        <div className="h-full overflow-y-auto animate-fade-in">
            <div className="max-w-[900px] mx-auto px-4 py-6 space-y-8">

                {/* ──── Header ──── */}
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-amber-400/20 flex items-center justify-center">
                        <Lightbulb className="w-5 h-5 text-amber-400" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-foreground">Insights</h2>
                        <p className="text-xs text-muted-foreground font-mono">How you work, based on your data</p>
                    </div>
                </div>

                {/* ═══════════════════════════════════════
                   SECTION 1: PRODUCTIVITY SCORECARD
                   ═══════════════════════════════════════ */}
                {scorecard && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.1 }}
                    >
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                            <ScorecardTile
                                icon={Target}
                                label="Tasks Completed"
                                value={scorecard.totalCompleted}
                                subtitle="All time"
                                color="#7C3AED"
                                delay={0}
                            />
                            <ScorecardTile
                                icon={BarChart3}
                                label="Completion Rate"
                                value={`${scorecard.completionRate30d}%`}
                                subtitle="Last 30 days"
                                trend={scorecard.completionRateTrend}
                                color="#3B82F6"
                                delay={0.05}
                            />
                            <ScorecardTile
                                icon={Flame}
                                label="Current Streak"
                                value={`${scorecard.currentStreak} day${scorecard.currentStreak !== 1 ? 's' : ''}`}
                                subtitle={scorecard.currentStreak > 0 ? '🔥' : undefined}
                                trend={scorecard.streakTrend}
                                color="#F59E0B"
                                delay={0.1}
                            />
                            <ScorecardTile
                                icon={Trophy}
                                label="Longest Streak"
                                value={`${scorecard.longestStreak} days`}
                                subtitle="All time best"
                                color="#10B981"
                                delay={0.15}
                            />
                            <ScorecardTile
                                icon={Clock}
                                label="Focus Time"
                                value={formatFocusTime(scorecard.totalFocusMinutes)}
                                subtitle={`${totalFocusSessions} session${totalFocusSessions !== 1 ? 's' : ''}`}
                                color="#EC4899"
                                delay={0.2}
                            />
                            <ScorecardTile
                                icon={Zap}
                                label="Tasks/Active Day"
                                value={scorecard.avgTasksPerActiveDay14d}
                                subtitle="Last 14 days"
                                trend={scorecard.avgTasksTrend}
                                color="#F97316"
                                delay={0.25}
                            />
                        </div>
                    </motion.div>
                )}

                {/* ═══════════════════════════════════════
                   SECTION 2: BEHAVIORAL PATTERNS
                   ═══════════════════════════════════════ */}
                {insights.length > 0 ? (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className="space-y-4"
                    >
                        <div className="flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-primary" />
                            <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Behavioral Patterns</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {insights.map((insight, i) => (
                                <motion.div
                                    key={insight.id}
                                    initial={{ opacity: 0, y: 12 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.35 + i * 0.06 }}
                                    className="rounded-xl border border-border surface-1 p-5 hover:border-primary/20 hover:shadow-elevation-1 transition-all group flex flex-col"
                                >
                                    {/* Header row */}
                                    <div className="flex items-start gap-3 mb-3">
                                        <div className="text-3xl leading-none flex-shrink-0">{insight.icon}</div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <p className="text-base font-semibold text-foreground leading-tight">{insight.title}</p>
                                                <TrendPill trend={insight.trend} />
                                            </div>
                                            <p className="text-sm text-muted-foreground leading-relaxed mt-1">{insight.detail}</p>
                                        </div>
                                    </div>

                                    {/* Recommendation block */}
                                    <div className="mt-auto pt-3 border-t border-border/50">
                                        <div className="flex items-start gap-2 rounded-lg bg-primary/[0.04] border border-primary/10 px-3 py-2.5">
                                            <span className="text-primary text-xs mt-0.5 flex-shrink-0">→</span>
                                            <p className="text-xs text-foreground/80 leading-relaxed">{insight.recommendation}</p>
                                        </div>
                                    </div>

                                    {/* Basis */}
                                    <p className="text-[10px] text-muted-foreground/50 font-mono mt-2">{insight.basis}</p>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                ) : (
                    <div className="text-center py-12 bg-surface-2 rounded-xl border border-dashed border-border">
                        <span className="text-3xl mb-3 block">📊</span>
                        <p className="text-sm font-mono text-muted-foreground">
                            Complete a few more tasks to unlock insights.
                        </p>
                        <p className="text-xs text-muted-foreground/60 font-mono mt-1">
                            We need at least 3 completed tasks to start analyzing.
                        </p>
                    </div>
                )}

                {/* ═══════════════════════════════════════
                   SECTION 3: 28-DAY ACTIVITY CHART
                   ═══════════════════════════════════════ */}
                {dailyActivity28d.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        className="rounded-xl border border-border surface-1 p-5"
                    >
                        <div className="mb-4">
                            <h3 className="text-xs font-mono uppercase tracking-wider text-muted-foreground">28-Day Activity</h3>
                            <p className="text-[10px] text-muted-foreground/60 mt-0.5">Tasks completed per day</p>
                        </div>

                        <div className="h-[200px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={dailyActivity28d} barCategoryGap="15%">
                                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} vertical={false} />
                                    <XAxis
                                        dataKey="date"
                                        tickFormatter={formatChartDate}
                                        tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                                        axisLine={{ stroke: 'hsl(var(--border))' }}
                                        tickLine={false}
                                        interval={0}
                                    />
                                    <YAxis
                                        allowDecimals={false}
                                        tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                                        axisLine={false}
                                        tickLine={false}
                                        width={24}
                                    />
                                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--primary) / 0.08)' }} />
                                    <Bar
                                        dataKey="count"
                                        fill="hsl(var(--primary))"
                                        radius={[3, 3, 0, 0]}
                                        maxBarSize={18}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </motion.div>
                )}

            </div>
        </div>
    );
};
