import { useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useInsightsStore, type InsightTrend } from '@/store/insightsStore';
import { Lightbulb, ArrowUp, ArrowDown, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

const TrendArrowInline = ({ trend }: { trend: InsightTrend }) => {
    if (trend === 'neutral') return null;
    return trend === 'up'
        ? <ArrowUp className="w-3 h-3 text-emerald-400 inline-block ml-1" />
        : <ArrowDown className="w-3 h-3 text-red-400 inline-block ml-1" />;
};

export const InsightsCards = () => {
    const { insights, computeInsights } = useInsightsStore();

    useEffect(() => {
        computeInsights();
    }, [computeInsights]);

    // Find the best recommendation: insight with the most significant trend change
    const topRecommendation = useMemo(() => {
        if (insights.length === 0) return null;
        // Prioritize non-neutral trends; from those, pick the first one (they're already in priority order)
        const withTrend = insights.filter(i => i.trend !== 'neutral' && i.recommendation);
        if (withTrend.length > 0) return withTrend[0];
        // If all neutral, pick the first insight with a recommendation
        const withRec = insights.filter(i => i.recommendation);
        return withRec.length > 0 ? withRec[0] : null;
    }, [insights]);

    if (insights.length === 0) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55 }}
            className="space-y-3"
        >
            <div className="flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Insights</span>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 hide-scrollbar snap-x snap-mandatory">
                {insights.map((insight, i) => (
                    <motion.div
                        key={insight.id}
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ delay: 0.6 + i * 0.08 }}
                        className="min-w-[220px] max-w-[260px] flex-shrink-0 snap-start rounded-xl border border-border surface-1 p-4 hover:border-primary/30 hover:shadow-elevation-1 transition-all group"
                    >
                        <div className="text-2xl mb-2">{insight.icon}</div>
                        <p className="text-sm font-semibold text-foreground mb-1 leading-snug">
                            {insight.title}
                            <TrendArrowInline trend={insight.trend} />
                        </p>
                        <p className="text-xs text-muted-foreground leading-relaxed mb-2">
                            {insight.detail}
                        </p>
                        <p className="text-[10px] text-muted-foreground/60 font-mono">
                            {insight.basis}
                        </p>
                    </motion.div>
                ))}

                {/* Top Action Recommendation Card */}
                {topRecommendation && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ delay: 0.6 + insights.length * 0.08 }}
                        className="min-w-[280px] max-w-[320px] flex-shrink-0 snap-start rounded-xl border-2 border-primary/25 surface-1 p-4 hover:border-primary/40 hover:shadow-elevation-1 transition-all group"
                        style={{
                            background: `linear-gradient(135deg, hsl(var(--primary) / 0.04) 0%, transparent 100%)`,
                        }}
                    >
                        <div className="flex items-center gap-2 mb-3">
                            <Sparkles className="w-4 h-4 text-primary" />
                            <span className="text-[10px] font-mono text-primary uppercase tracking-wider font-medium">Your top action this week</span>
                        </div>
                        <p className="text-sm text-foreground leading-relaxed">
                            {topRecommendation.recommendation}
                        </p>
                        <p className="text-[10px] text-muted-foreground/60 font-mono mt-3">
                            From: {topRecommendation.title}
                        </p>
                    </motion.div>
                )}
            </div>
        </motion.div>
    );
};
