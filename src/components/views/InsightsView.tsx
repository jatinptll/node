import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useInsightsStore } from '@/store/insightsStore';
import { useTaskStore } from '@/store/taskStore';
import { Lightbulb, TrendingUp } from 'lucide-react';

export const InsightsView = () => {
    const { insights, computeInsights } = useInsightsStore();
    const { tasks } = useTaskStore();

    useEffect(() => {
        computeInsights();
    }, [computeInsights]);

    const completed = tasks.filter(t => t.isCompleted);
    const totalFocusMinutes = tasks.reduce((acc, t) => acc + (t.actualDurationMinutes || 0), 0);
    const totalFocusSessions = tasks.reduce((acc, t) => acc + (t.focusSessionsCount || 0), 0);

    return (
        <div className="max-w-2xl mx-auto px-4 py-6 animate-fade-in space-y-8">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-400/20 flex items-center justify-center">
                    <Lightbulb className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-foreground">Insights</h2>
                    <p className="text-xs text-muted-foreground font-mono">How you work, based on your data</p>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl border border-border surface-1 p-4 text-center">
                    <p className="text-2xl font-bold font-mono text-foreground">{completed.length}</p>
                    <p className="text-xs text-muted-foreground mt-1">Tasks completed</p>
                </div>
                <div className="rounded-xl border border-border surface-1 p-4 text-center">
                    <p className="text-2xl font-bold font-mono text-foreground">{totalFocusSessions}</p>
                    <p className="text-xs text-muted-foreground mt-1">Focus sessions</p>
                </div>
                <div className="rounded-xl border border-border surface-1 p-4 text-center">
                    <p className="text-2xl font-bold font-mono text-foreground">
                        {totalFocusMinutes >= 60 ? `${(totalFocusMinutes / 60).toFixed(1)}h` : `${totalFocusMinutes}m`}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Focus time</p>
                </div>
            </div>

            {/* Insights Cards */}
            {insights.length > 0 ? (
                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-primary" />
                        <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Behavioral Patterns</span>
                    </div>
                    <div className="grid gap-3">
                        {insights.map((insight, i) => (
                            <motion.div
                                key={insight.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.08 }}
                                className="rounded-xl border border-border surface-1 p-5 hover:border-primary/30 transition-all"
                            >
                                <div className="flex items-start gap-4">
                                    <div className="text-3xl">{insight.icon}</div>
                                    <div className="flex-1">
                                        <p className="text-base font-semibold text-foreground mb-1">
                                            {insight.title}
                                        </p>
                                        <p className="text-sm text-muted-foreground leading-relaxed">
                                            {insight.detail}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground/50 font-mono mt-2">
                                            {insight.basis}
                                        </p>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
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
        </div>
    );
};
