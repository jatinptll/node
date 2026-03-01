import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useInsightsStore } from '@/store/insightsStore';
import { Lightbulb } from 'lucide-react';

export const InsightsCards = () => {
    const { insights, computeInsights } = useInsightsStore();

    useEffect(() => {
        computeInsights();
    }, [computeInsights]);

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
                        </p>
                        <p className="text-xs text-muted-foreground leading-relaxed mb-2">
                            {insight.detail}
                        </p>
                        <p className="text-[10px] text-muted-foreground/60 font-mono">
                            {insight.basis}
                        </p>
                    </motion.div>
                ))}
            </div>
        </motion.div>
    );
};
