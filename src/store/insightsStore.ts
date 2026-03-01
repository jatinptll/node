/**
 * Insights Store — Behavioral Pattern Engine
 * Computes 5 productivity insights from existing task data.
 * Refresh once per session and cache results.
 */
import { create } from 'zustand';
import { useTaskStore } from './taskStore';
import { getLocalDateString } from '@/lib/utils';

export interface Insight {
    id: string;
    icon: string;
    title: string;
    detail: string;
    basis: string;
}

interface InsightsState {
    insights: Insight[];
    lastComputedAt: number | null;
    computeInsights: () => void;
}

export const useInsightsStore = create<InsightsState>((set, get) => ({
    insights: [],
    lastComputedAt: null,

    computeInsights: () => {
        // Only compute once per session (or if 30+ min has passed)
        const last = get().lastComputedAt;
        if (last && Date.now() - last < 30 * 60 * 1000) return;

        const { tasks, lists, workspaces } = useTaskStore.getState();
        const completed = tasks.filter(t => t.isCompleted && t.completedAt);

        if (completed.length < 3) {
            set({ insights: [], lastComputedAt: Date.now() });
            return;
        }

        const insights: Insight[] = [];

        // ── 1. Peak Productivity Window ──
        try {
            const hourCounts = new Map<number, number>();
            completed.forEach(t => {
                if (!t.completedAt) return;
                const hour = new Date(t.completedAt).getHours();
                hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
            });

            if (hourCounts.size > 0) {
                // Find top 3 consecutive hours
                const sorted = [...hourCounts.entries()].sort((a, b) => b[1] - a[1]);
                const peakHour = sorted[0][0];
                const formatHour = (h: number) => {
                    const ampm = h >= 12 ? 'pm' : 'am';
                    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
                    return `${h12}${ampm}`;
                };
                const endHour = (peakHour + 2) % 24;
                insights.push({
                    id: 'peak-hours',
                    icon: '⚡',
                    title: `Your peak is ${formatHour(peakHour)}–${formatHour(endHour)}`,
                    detail: `${sorted[0][1]} tasks completed in this window`,
                    basis: `Based on ${completed.length} completed tasks`,
                });
            }
        } catch { /* skip insight on error */ }

        // ── 2. Estimation Accuracy ──
        try {
            const withEstimates = completed.filter(t => t.estimatedMinutes && t.estimatedMinutes > 0 && t.createdAt && t.completedAt);
            if (withEstimates.length >= 3) {
                let totalRatio = 0;
                let count = 0;
                withEstimates.forEach(t => {
                    const actual = (new Date(t.completedAt!).getTime() - new Date(t.createdAt).getTime()) / 60_000;
                    if (actual > 0 && actual < 1440 * 7) { // ignore tasks that took > 7 days (likely not actively worked on)
                        totalRatio += actual / t.estimatedMinutes!;
                        count++;
                    }
                });
                if (count >= 3) {
                    const avgRatio = totalRatio / count;
                    if (avgRatio > 1.15) {
                        const pct = Math.round((avgRatio - 1) * 100);
                        insights.push({
                            id: 'estimation',
                            icon: '🎯',
                            title: `You underestimate by ~${pct}%`,
                            detail: `Tasks typically take longer than estimated`,
                            basis: `Based on ${count} estimated tasks`,
                        });
                    } else if (avgRatio < 0.85) {
                        const pct = Math.round((1 - avgRatio) * 100);
                        insights.push({
                            id: 'estimation',
                            icon: '🎯',
                            title: `You overestimate by ~${pct}%`,
                            detail: `You finish tasks faster than expected`,
                            basis: `Based on ${count} estimated tasks`,
                        });
                    } else {
                        insights.push({
                            id: 'estimation',
                            icon: '🎯',
                            title: `Your estimates are spot on`,
                            detail: `Tasks take roughly what you expect`,
                            basis: `Based on ${count} estimated tasks`,
                        });
                    }
                }
            }
        } catch { /* skip insight on error */ }

        // ── 3. Most Completed Task Type (by energy tag) ──
        try {
            const tagCounts = new Map<string, number>();
            completed.forEach(t => {
                if (t.energyTag) tagCounts.set(t.energyTag, (tagCounts.get(t.energyTag) || 0) + 1);
            });
            if (tagCounts.size > 0) {
                const topTag = [...tagCounts.entries()].sort((a, b) => b[1] - a[1])[0];
                const tagLabels: Record<string, string> = {
                    deep_focus: 'Deep Focus',
                    quick_win: 'Quick Wins',
                    comms: 'Communication',
                    routine: 'Routine',
                };
                const tagEmojis: Record<string, string> = {
                    deep_focus: '🧠',
                    quick_win: '⚡',
                    comms: '💬',
                    routine: '🔄',
                };
                insights.push({
                    id: 'task-type',
                    icon: tagEmojis[topTag[0]] || '📊',
                    title: `Most completed: ${tagLabels[topTag[0]] || topTag[0]}`,
                    detail: `${topTag[1]} tasks of this type finished`,
                    basis: 'Based on energy tag data',
                });
            }
        } catch { /* skip insight on error */ }

        // ── 4. Consistency Score (last 7 days) ──
        try {
            const last7Days = new Set<string>();
            const now = Date.now();
            completed.forEach(t => {
                if (!t.completedAt) return;
                const completedTime = new Date(t.completedAt).getTime();
                if (now - completedTime <= 7 * 86400000) {
                    last7Days.add(getLocalDateString(t.completedAt));
                }
            });
            const activeDays = last7Days.size;
            insights.push({
                id: 'consistency',
                icon: '🔥',
                title: `${activeDays}/7 days active this week`,
                detail: activeDays >= 5 ? 'Excellent consistency!' : activeDays >= 3 ? 'Good momentum, keep going' : 'Try to be active most days',
                basis: 'Last 7 days',
            });
        } catch { /* skip insight on error */ }

        // ── 5. Top Workspace ──
        try {
            const now = Date.now();
            const recentCompleted = completed.filter(t => t.completedAt && now - new Date(t.completedAt).getTime() <= 7 * 86400000);
            if (recentCompleted.length > 0) {
                const wsCounts = new Map<string, number>();
                recentCompleted.forEach(t => {
                    const list = lists.find(l => l.id === t.listId);
                    if (list) {
                        wsCounts.set(list.workspaceId, (wsCounts.get(list.workspaceId) || 0) + 1);
                    }
                });
                if (wsCounts.size > 0) {
                    const topWs = [...wsCounts.entries()].sort((a, b) => b[1] - a[1])[0];
                    const wsName = workspaces.find(w => w.id === topWs[0])?.name || topWs[0];
                    insights.push({
                        id: 'top-workspace',
                        icon: '📁',
                        title: `Top domain: ${wsName}`,
                        detail: `${topWs[1]} tasks completed this week`,
                        basis: 'Last 7 days',
                    });
                }
            }
        } catch { /* skip insight on error */ }

        set({ insights, lastComputedAt: Date.now() });
    },
}));
