/**
 * Insights Store — Behavioral Pattern Engine v2
 * Computes 10 productivity insights + a 6-metric scorecard from existing task data.
 * Supports trend tracking (up/down/neutral) and personalized recommendations.
 * Persists weekly snapshots to Supabase for historical comparison.
 */
import { create } from 'zustand';
import { useTaskStore } from './taskStore';
import { getLocalDateString } from '@/lib/utils';
import * as db from '@/lib/database';
import type { Task, Goal } from '@/types/task';

// ──────────────── Types ────────────────

export type InsightTrend = 'up' | 'down' | 'neutral';

export interface Insight {
    id: string;
    icon: string;
    title: string;
    detail: string;
    basis: string;
    trend: InsightTrend;
    recommendation: string;
}

export interface ScorecardMetrics {
    totalCompleted: number;
    completionRate30d: number;
    currentStreak: number;
    longestStreak: number;
    totalFocusMinutes: number;
    avgTasksPerActiveDay14d: number;
    // Trends (compared with prev snapshot)
    completionRateTrend: InsightTrend;
    streakTrend: InsightTrend;
    avgTasksTrend: InsightTrend;
}

export interface DailyActivity {
    date: string;
    count: number;
}

interface InsightsState {
    insights: Insight[];
    scorecard: ScorecardMetrics | null;
    dailyActivity28d: DailyActivity[];
    lastComputedAt: number | null;
    lastCompletedCount: number;
    previousSnapshot: any | null;
    computeInsights: () => void;
}

// ──────────────── Helpers ────────────────

function getMonday(d: Date): string {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    date.setDate(diff);
    return getLocalDateString(date);
}

function getDayOfWeekName(dayIndex: number): string {
    return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayIndex];
}

function compareTrend(current: number, previous: number | undefined | null, thresholdPct = 10): InsightTrend {
    if (previous === undefined || previous === null) return 'neutral';
    if (previous === 0 && current > 0) return 'up';
    if (previous === 0 && current === 0) return 'neutral';
    const changePct = ((current - previous) / Math.abs(previous)) * 100;
    if (changePct > thresholdPct) return 'up';
    if (changePct < -thresholdPct) return 'down';
    return 'neutral';
}

// ──────────────── Store ────────────────

export const useInsightsStore = create<InsightsState>((set, get) => ({
    insights: [],
    scorecard: null,
    dailyActivity28d: [],
    lastComputedAt: null,
    lastCompletedCount: 0,
    previousSnapshot: null,

    computeInsights: () => {
        const { tasks } = useTaskStore.getState();
        const completedCount = tasks.filter(t => t.isCompleted && t.completedAt).length;

        // Only recompute if: never computed, 30+ min passed, OR completed count changed
        const last = get().lastComputedAt;
        const prevCount = get().lastCompletedCount;
        const timeFresh = last && Date.now() - last < 30 * 60 * 1000;
        if (timeFresh && completedCount === prevCount) return;

        const { lists, workspaces, goals, userId } = useTaskStore.getState();
        const completed = tasks.filter(t => t.isCompleted && t.completedAt);
        const now = Date.now();
        const nowDate = new Date();

        if (completed.length < 3) {
            set({ insights: [], scorecard: null, dailyActivity28d: [], lastComputedAt: Date.now(), lastCompletedCount: completedCount });
            return;
        }

        // ── Fetch previous snapshot for trend comparison ──
        const weekStart = getMonday(nowDate);
        let prevSnapshot: any = null;

        // Fire async fetch + save in background (don't block UI)
        if (userId) {
            db.fetchPreviousInsightSnapshot(userId, weekStart)
                .then(snap => {
                    prevSnapshot = snap;
                    set({ previousSnapshot: snap });
                })
                .catch(() => { /* ignore */ });
        }

        // ── Compute Helper Data ──
        const thisWeekCompleted = completed.filter(t =>
            t.completedAt && now - new Date(t.completedAt).getTime() <= 7 * 86400000
        );
        const lastWeekCompleted = completed.filter(t => {
            if (!t.completedAt) return false;
            const elapsed = now - new Date(t.completedAt).getTime();
            return elapsed > 7 * 86400000 && elapsed <= 14 * 86400000;
        });

        const insights: Insight[] = [];

        // ══════════════════════════════════════
        // EXISTING INSIGHTS (Upgraded)
        // ══════════════════════════════════════

        // ── 1. Peak Productivity Window ──
        try {
            const hourCounts = new Map<number, number>();
            completed.forEach(t => {
                if (!t.completedAt) return;
                const hour = new Date(t.completedAt).getHours();
                hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
            });

            if (hourCounts.size > 0) {
                const sorted = [...hourCounts.entries()].sort((a, b) => b[1] - a[1]);
                const peakHour = sorted[0][0];
                const peakCount = sorted[0][1];
                const formatHour = (h: number) => {
                    const ampm = h >= 12 ? 'pm' : 'am';
                    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
                    return `${h12}${ampm}`;
                };
                const endHour = (peakHour + 2) % 24;

                // Trend: compare this week's peak hour completions vs last week
                const thisWeekPeakCount = thisWeekCompleted.filter(t =>
                    t.completedAt && new Date(t.completedAt).getHours() >= peakHour && new Date(t.completedAt).getHours() <= peakHour + 2
                ).length;
                const lastWeekPeakCount = lastWeekCompleted.filter(t =>
                    t.completedAt && new Date(t.completedAt).getHours() >= peakHour && new Date(t.completedAt).getHours() <= peakHour + 2
                ).length;

                insights.push({
                    id: 'peak-hours',
                    icon: '⚡',
                    title: `Your peak is ${formatHour(peakHour)}–${formatHour(endHour)}`,
                    detail: `${peakCount} tasks completed in this window across all time`,
                    basis: `Based on ${completed.length} completed tasks`,
                    trend: compareTrend(thisWeekPeakCount, lastWeekPeakCount),
                    recommendation: `Schedule your P1 tasks between ${formatHour(peakHour)}–${formatHour(endHour)} when you're most effective.`,
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
                    if (actual > 0 && actual < 1440 * 7) {
                        totalRatio += actual / t.estimatedMinutes!;
                        count++;
                    }
                });
                if (count >= 3) {
                    const avgRatio = totalRatio / count;
                    const ratioMultiplier = avgRatio.toFixed(1);

                    // Trend: compare ratio from recent estimates vs older ones
                    let recentRatio = 0, recentCount = 0;
                    withEstimates.slice(-Math.ceil(count / 2)).forEach(t => {
                        const actual = (new Date(t.completedAt!).getTime() - new Date(t.createdAt).getTime()) / 60_000;
                        if (actual > 0 && actual < 1440 * 7) {
                            recentRatio += actual / t.estimatedMinutes!;
                            recentCount++;
                        }
                    });
                    const recentAvg = recentCount > 0 ? recentRatio / recentCount : avgRatio;
                    // For estimation, "improving" means getting closer to 1.0
                    const oldDist = Math.abs(avgRatio - 1);
                    const newDist = Math.abs(recentAvg - 1);
                    const estTrend: InsightTrend = newDist < oldDist - 0.05 ? 'up' : newDist > oldDist + 0.05 ? 'down' : 'neutral';

                    if (avgRatio > 1.15) {
                        const pct = Math.round((avgRatio - 1) * 100);
                        insights.push({
                            id: 'estimation',
                            icon: '🎯',
                            title: `You underestimate by ~${pct}%`,
                            detail: `Tasks take ${ratioMultiplier}× longer than your estimates`,
                            basis: `Based on ${count} estimated tasks`,
                            trend: estTrend,
                            recommendation: `Try adding a ${pct}% buffer when estimating your next tasks — your tasks take ${ratioMultiplier}× longer than estimated.`,
                        });
                    } else if (avgRatio < 0.85) {
                        const pct = Math.round((1 - avgRatio) * 100);
                        insights.push({
                            id: 'estimation',
                            icon: '🎯',
                            title: `You overestimate by ~${pct}%`,
                            detail: `You finish tasks at ${ratioMultiplier}× the estimated time`,
                            basis: `Based on ${count} estimated tasks`,
                            trend: estTrend,
                            recommendation: `You finish ${pct}% faster than expected — try taking on one extra task per day to maximize your output.`,
                        });
                    } else {
                        insights.push({
                            id: 'estimation',
                            icon: '🎯',
                            title: `Your estimates are spot on`,
                            detail: `Tasks take roughly what you expect (${ratioMultiplier}× ratio)`,
                            basis: `Based on ${count} estimated tasks`,
                            trend: estTrend,
                            recommendation: `Great calibration! Keep estimating — it helps you plan realistic daily workloads.`,
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
                    deep_focus: 'Deep Focus', quick_win: 'Quick Wins',
                    comms: 'Communication', routine: 'Routine',
                };
                const tagEmojis: Record<string, string> = {
                    deep_focus: '🧠', quick_win: '⚡', comms: '💬', routine: '🔄',
                };

                // Find second most to give recommendation
                const otherTags = [...tagCounts.entries()].sort((a, b) => b[1] - a[1]).slice(1);
                const leastTag = otherTags.length > 0 ? otherTags[otherTags.length - 1] : null;

                // Trend 
                const thisWeekTagCount = thisWeekCompleted.filter(t => t.energyTag === topTag[0]).length;
                const lastWeekTagCount = lastWeekCompleted.filter(t => t.energyTag === topTag[0]).length;

                insights.push({
                    id: 'task-type',
                    icon: tagEmojis[topTag[0]] || '📊',
                    title: `Most completed: ${tagLabels[topTag[0]] || topTag[0]}`,
                    detail: `${topTag[1]} tasks of this type finished`,
                    basis: 'Based on energy tag data',
                    trend: compareTrend(thisWeekTagCount, lastWeekTagCount),
                    recommendation: leastTag
                        ? `You do great at ${tagLabels[topTag[0]] || topTag[0]}. Try scheduling more ${tagLabels[leastTag[0]] || leastTag[0]} tasks to build a balanced skill set.`
                        : `You're focused on ${tagLabels[topTag[0]] || topTag[0]} — consider diversifying your task types.`,
                });
            }
        } catch { /* skip insight on error */ }

        // ── 4. Consistency Score (last 7 days) ──
        try {
            const last7Days = new Set<string>();
            completed.forEach(t => {
                if (!t.completedAt) return;
                const completedTime = new Date(t.completedAt).getTime();
                if (now - completedTime <= 7 * 86400000) {
                    last7Days.add(getLocalDateString(t.completedAt));
                }
            });
            const prev7Days = new Set<string>();
            completed.forEach(t => {
                if (!t.completedAt) return;
                const elapsed = now - new Date(t.completedAt).getTime();
                if (elapsed > 7 * 86400000 && elapsed <= 14 * 86400000) {
                    prev7Days.add(getLocalDateString(t.completedAt));
                }
            });

            const activeDays = last7Days.size;
            const prevActiveDays = prev7Days.size;
            const missedDays = 7 - activeDays;

            let recText = '';
            if (activeDays >= 5) {
                recText = `Excellent streak! You were active ${activeDays}/7 days — maintain this rhythm by planning tomorrow's first task tonight.`;
            } else if (activeDays >= 3) {
                recText = `You missed ${missedDays} days last week. Try completing one quick win on slow days to maintain momentum.`;
            } else {
                recText = `Only ${activeDays} active days last week. Start small — commit to completing just 1 task each day this week.`;
            }

            insights.push({
                id: 'consistency',
                icon: '🔥',
                title: `${activeDays}/7 days active this week`,
                detail: activeDays >= 5 ? 'Excellent consistency!' : activeDays >= 3 ? 'Good momentum, keep going' : 'Try to be active most days',
                basis: 'Last 7 days',
                trend: compareTrend(activeDays, prevActiveDays),
                recommendation: recText,
            });
        } catch { /* skip insight on error */ }

        // ── 5. Top Workspace ──
        try {
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
                    const sorted = [...wsCounts.entries()].sort((a, b) => b[1] - a[1]);
                    const topWs = sorted[0];
                    const wsName = workspaces.find(w => w.id === topWs[0])?.name || topWs[0];

                    // Find the least active workspace for recommendation
                    const leastWs = sorted.length > 1 ? sorted[sorted.length - 1] : null;
                    const leastWsName = leastWs ? (workspaces.find(w => w.id === leastWs[0])?.name || leastWs[0]) : null;

                    // Trend
                    const prevRecentCompleted = completed.filter(t => {
                        if (!t.completedAt) return false;
                        const elapsed = now - new Date(t.completedAt).getTime();
                        return elapsed > 7 * 86400000 && elapsed <= 14 * 86400000;
                    });
                    const prevWsCount = prevRecentCompleted.filter(t => {
                        const list = lists.find(l => l.id === t.listId);
                        return list && list.workspaceId === topWs[0];
                    }).length;

                    insights.push({
                        id: 'top-workspace',
                        icon: '📁',
                        title: `Top domain: ${wsName}`,
                        detail: `${topWs[1]} tasks completed this week`,
                        basis: 'Last 7 days',
                        trend: compareTrend(topWs[1], prevWsCount),
                        recommendation: leastWsName
                            ? `You're crushing it in ${wsName} — consider applying the same focus to your ${leastWsName} tasks.`
                            : `Great focus on ${wsName}! Keep this momentum going.`,
                    });
                }
            }
        } catch { /* skip insight on error */ }

        // ══════════════════════════════════════
        // NEW INSIGHTS
        // ══════════════════════════════════════

        // ── 6. Task Completion Velocity ──
        try {
            const past28d = completed.filter(t =>
                t.completedAt && now - new Date(t.completedAt).getTime() <= 28 * 86400000
            );
            if (past28d.length >= 3) {
                // Split into two 14-day windows
                const recentHalf = past28d.filter(t =>
                    t.completedAt && now - new Date(t.completedAt).getTime() <= 14 * 86400000
                );
                const olderHalf = past28d.filter(t => {
                    if (!t.completedAt) return false;
                    const elapsed = now - new Date(t.completedAt).getTime();
                    return elapsed > 14 * 86400000 && elapsed <= 28 * 86400000;
                });

                const recentDays = new Set(recentHalf.map(t => getLocalDateString(t.completedAt!)));
                const olderDays = new Set(olderHalf.map(t => getLocalDateString(t.completedAt!)));

                const recentRate = recentDays.size > 0 ? recentHalf.length / recentDays.size : 0;
                const olderRate = olderDays.size > 0 ? olderHalf.length / olderDays.size : 0;

                const velocityTrend = compareTrend(recentRate, olderRate, 15);
                const changePct = olderRate > 0 ? Math.round(((recentRate - olderRate) / olderRate) * 100) : 0;

                let recText = '';
                if (velocityTrend === 'up') {
                    recText = `You're accelerating — a great time to tackle a goal you've been putting off.`;
                } else if (velocityTrend === 'down') {
                    recText = `Your pace has slowed. Try starting your day with one quick win to build momentum.`;
                } else {
                    recText = `Consistent pace at ${recentRate.toFixed(1)} tasks/day. Push for one extra task to level up.`;
                }

                const changeStr = changePct !== 0 && olderRate > 0
                    ? ` (${changePct > 0 ? '+' : ''}${changePct}% vs previous fortnight)`
                    : '';

                insights.push({
                    id: 'velocity',
                    icon: '🚀',
                    title: `${recentRate.toFixed(1)} tasks/day on active days`,
                    detail: `Averaging ${recentRate.toFixed(1)} completions per active day${changeStr}`,
                    basis: `Based on ${past28d.length} tasks over 28 days`,
                    trend: velocityTrend,
                    recommendation: recText,
                });
            }
        } catch { /* skip insight on error */ }

        // ── 7. Procrastination Pattern ──
        try {
            const withDates = completed.filter(t => t.createdAt && t.completedAt);
            if (withDates.length >= 5) {
                const buckets = { sameDay: 0, nextDay: 0, thisWeek: 0, deferred: 0 };
                withDates.forEach(t => {
                    const daysDiff = (new Date(t.completedAt!).getTime() - new Date(t.createdAt).getTime()) / 86400000;
                    if (daysDiff <= 1) buckets.sameDay++;
                    else if (daysDiff <= 2) buckets.nextDay++;
                    else if (daysDiff <= 7) buckets.thisWeek++;
                    else buckets.deferred++;
                });

                const total = withDates.length;
                const sameDayPct = Math.round((buckets.sameDay / total) * 100);
                const deferredPct = Math.round((buckets.deferred / total) * 100);

                // Trend: compare recent half vs older half
                const halfIdx = Math.floor(withDates.length / 2);
                const recentHalf = withDates.slice(halfIdx);
                const recentDeferred = recentHalf.filter(t => {
                    const diff = (new Date(t.completedAt!).getTime() - new Date(t.createdAt).getTime()) / 86400000;
                    return diff > 7;
                }).length;
                const recentDeferredPct = recentHalf.length > 0 ? (recentDeferred / recentHalf.length) * 100 : 0;
                // For procrastination, lower deferred is "improving" (up)
                const procTrend: InsightTrend = recentDeferredPct < deferredPct - 5 ? 'up' : recentDeferredPct > deferredPct + 5 ? 'down' : 'neutral';

                if (deferredPct >= 50) {
                    insights.push({
                        id: 'procrastination',
                        icon: '😬',
                        title: `Most tasks sit 7+ days before completion`,
                        detail: `${deferredPct}% of completed tasks were deferred over a week`,
                        basis: `Based on ${total} completed tasks`,
                        trend: procTrend,
                        recommendation: `Try breaking your next big task into subtasks — smaller pieces get done ${sameDayPct > 20 ? `faster (${sameDayPct}% of your quick tasks finish same-day)` : 'faster'}.`,
                    });
                } else if (sameDayPct >= 50) {
                    insights.push({
                        id: 'procrastination',
                        icon: '✅',
                        title: `You finish tasks quickly — ${sameDayPct}% done same-day`,
                        detail: `${buckets.sameDay} of ${total} tasks completed within 24 hours`,
                        basis: `Based on ${total} completed tasks`,
                        trend: procTrend,
                        recommendation: `You're a same-day finisher. Make sure you're adding enough challenging tasks to your queue.`,
                    });
                } else {
                    const topBucket = Math.max(buckets.sameDay, buckets.nextDay, buckets.thisWeek, buckets.deferred);
                    const topLabel = topBucket === buckets.sameDay ? 'same day' : topBucket === buckets.nextDay ? 'next day' : topBucket === buckets.thisWeek ? 'within a week' : '7+ days';
                    insights.push({
                        id: 'procrastination',
                        icon: '⏳',
                        title: `Most tasks take ${topLabel} to complete`,
                        detail: `${sameDayPct}% same-day, ${deferredPct}% deferred 7+ days`,
                        basis: `Based on ${total} completed tasks`,
                        trend: procTrend,
                        recommendation: `Try tackling one task immediately when you add it today — building a same-day habit boosts productivity.`,
                    });
                }
            }
        } catch { /* skip insight on error */ }

        // ── 8. Goal Momentum ──
        try {
            if (goals.length > 0) {
                const goalProgress = new Map<string, { title: string; recentCompletions: number }>();
                goals.forEach(g => {
                    goalProgress.set(g.id, { title: g.title, recentCompletions: 0 });
                });

                const recent14d = completed.filter(t =>
                    t.completedAt && now - new Date(t.completedAt).getTime() <= 14 * 86400000
                );

                recent14d.forEach(t => {
                    if (t.goalId && goalProgress.has(t.goalId)) {
                        goalProgress.get(t.goalId)!.recentCompletions++;
                    }
                });

                const activeGoals = [...goalProgress.entries()];
                const leadingGoal = activeGoals.sort((a, b) => b[1].recentCompletions - a[1].recentCompletions)[0];
                const stalledGoals = activeGoals.filter(g => g[1].recentCompletions === 0);

                // Trend
                const prev14d = completed.filter(t => {
                    if (!t.completedAt) return false;
                    const elapsed = now - new Date(t.completedAt).getTime();
                    return elapsed > 14 * 86400000 && elapsed <= 28 * 86400000;
                });
                const prevGoalCompletions = prev14d.filter(t => t.goalId && goals.some(g => g.id === t.goalId)).length;
                const currentGoalCompletions = recent14d.filter(t => t.goalId && goals.some(g => g.id === t.goalId)).length;
                const goalTrend = compareTrend(currentGoalCompletions, prevGoalCompletions);

                if (stalledGoals.length > 0 && stalledGoals.length >= goals.length / 2) {
                    insights.push({
                        id: 'goal-momentum',
                        icon: '🎯',
                        title: `${stalledGoals.length} of your goals have had no progress in 14 days`,
                        detail: `Stalled: ${stalledGoals.map(g => `"${g[1].title}"`).slice(0, 2).join(', ')}`,
                        basis: 'Last 14 days',
                        trend: goalTrend,
                        recommendation: `Pick one stalled goal and schedule a single task from it in your next daily plan.`,
                    });
                } else if (leadingGoal && leadingGoal[1].recentCompletions > 0) {
                    insights.push({
                        id: 'goal-momentum',
                        icon: '🎯',
                        title: `Leading goal: "${leadingGoal[1].title}"`,
                        detail: `${leadingGoal[1].recentCompletions} task${leadingGoal[1].recentCompletions !== 1 ? 's' : ''} completed toward this goal recently`,
                        basis: 'Last 14 days',
                        trend: goalTrend,
                        recommendation: `You're on track with "${leadingGoal[1].title}". Complete ${Math.max(2, Math.ceil(leadingGoal[1].recentCompletions * 0.5))} more tasks this week to stay ahead.`,
                    });
                }
            }
        } catch { /* skip insight on error */ }

        // ── 9. Priority Distribution ──
        try {
            const recent14d = completed.filter(t =>
                t.completedAt && now - new Date(t.completedAt).getTime() <= 14 * 86400000
            );
            if (recent14d.length >= 5) {
                const p1Count = recent14d.filter(t => t.priority === 'p1').length;
                const p2Count = recent14d.filter(t => t.priority === 'p2').length;
                const p3Count = recent14d.filter(t => t.priority === 'p3').length;
                const p4Count = recent14d.filter(t => t.priority === 'p4').length;
                const total = recent14d.length;
                const highPriorityPct = Math.round(((p1Count + p2Count) / total) * 100);
                const lowPriorityPct = Math.round(((p3Count + p4Count) / total) * 100);

                // Trend: is high-priority % improving?
                const prev14d = completed.filter(t => {
                    if (!t.completedAt) return false;
                    const elapsed = now - new Date(t.completedAt).getTime();
                    return elapsed > 14 * 86400000 && elapsed <= 28 * 86400000;
                });
                const prevHighPct = prev14d.length > 0
                    ? ((prev14d.filter(t => t.priority === 'p1' || t.priority === 'p2').length) / prev14d.length) * 100
                    : null;
                const priorityTrend = prevHighPct !== null ? compareTrend(highPriorityPct, prevHighPct) : 'neutral' as InsightTrend;

                if (lowPriorityPct > 70) {
                    insights.push({
                        id: 'priority-distribution',
                        icon: '📊',
                        title: `${lowPriorityPct}% of completions are low priority`,
                        detail: `P1: ${p1Count}, P2: ${p2Count}, P3: ${p3Count}, P4: ${p4Count} — you may be avoiding important work`,
                        basis: `Last 14 days (${total} tasks)`,
                        trend: priorityTrend,
                        recommendation: `Start tomorrow by completing one P1 or P2 task before anything else.`,
                    });
                } else if (highPriorityPct >= 40) {
                    insights.push({
                        id: 'priority-distribution',
                        icon: '📊',
                        title: `Healthy priority mix — ${highPriorityPct}% are P1/P2`,
                        detail: `P1: ${p1Count}, P2: ${p2Count}, P3: ${p3Count}, P4: ${p4Count}`,
                        basis: `Last 14 days (${total} tasks)`,
                        trend: priorityTrend,
                        recommendation: `Keep it up! Prioritize one P1 task in your daily plan each morning.`,
                    });
                } else {
                    insights.push({
                        id: 'priority-distribution',
                        icon: '📊',
                        title: `${highPriorityPct}% high-priority completions`,
                        detail: `P1: ${p1Count}, P2: ${p2Count}, P3: ${p3Count}, P4: ${p4Count}`,
                        basis: `Last 14 days (${total} tasks)`,
                        trend: priorityTrend,
                        recommendation: `Try tackling at least one P1 or P2 task per day to shift the balance toward meaningful work.`,
                    });
                }
            }
        } catch { /* skip insight on error */ }

        // ── 10. Best Day of the Week ──
        try {
            const past56d = completed.filter(t =>
                t.completedAt && now - new Date(t.completedAt).getTime() <= 56 * 86400000
            );
            if (past56d.length >= 7) {
                const dayCounts: number[] = [0, 0, 0, 0, 0, 0, 0]; // Sun-Sat
                const dayWeeks: Set<string>[] = Array.from({ length: 7 }, () => new Set<string>());

                past56d.forEach(t => {
                    if (!t.completedAt) return;
                    const d = new Date(t.completedAt);
                    const dayIdx = d.getDay();
                    dayCounts[dayIdx]++;
                    dayWeeks[dayIdx].add(getMonday(d));
                });

                // Average completions per occurrence of each day
                const dayAvgs = dayCounts.map((count, i) => {
                    const weekCount = dayWeeks[i].size || 1;
                    return count / weekCount;
                });

                const bestDayIdx = dayAvgs.indexOf(Math.max(...dayAvgs));
                const worstDayIdx = dayAvgs.indexOf(Math.min(...dayAvgs));
                const bestDayName = getDayOfWeekName(bestDayIdx);
                const worstDayName = getDayOfWeekName(worstDayIdx);
                const bestAvg = dayAvgs[bestDayIdx];
                const worstAvg = dayAvgs[worstDayIdx];
                const ratio = worstAvg > 0 ? (bestAvg / worstAvg).toFixed(1) : '∞';

                // Trend: is the best day getting even better?
                const thisWeekBest = thisWeekCompleted.filter(t =>
                    t.completedAt && new Date(t.completedAt).getDay() === bestDayIdx
                ).length;
                const lastWeekBest = lastWeekCompleted.filter(t =>
                    t.completedAt && new Date(t.completedAt).getDay() === bestDayIdx
                ).length;

                insights.push({
                    id: 'best-day',
                    icon: '📅',
                    title: `${bestDayName} is your most productive day`,
                    detail: `Averaging ${bestAvg.toFixed(1)} completions — ${ratio}× your ${worstDayName} average`,
                    basis: `Last 8 weeks`,
                    trend: compareTrend(thisWeekBest, lastWeekBest),
                    recommendation: `Schedule your most important work on ${bestDayName}s. Save admin tasks for ${worstDayName}s.`,
                });
            }
        } catch { /* skip insight on error */ }

        // ══════════════════════════════════════
        // SCORECARD METRICS
        // ══════════════════════════════════════

        let scorecard: ScorecardMetrics | null = null;
        try {
            const totalCompleted = completed.length;

            // Completion rate (last 30d)
            const thirtyDaysAgo = now - 30 * 86400000;
            const createdLast30d = tasks.filter(t => new Date(t.createdAt).getTime() >= thirtyDaysAgo);
            const completedLast30d = createdLast30d.filter(t => t.isCompleted);
            const completionRate30d = createdLast30d.length > 0 ? Math.round((completedLast30d.length / createdLast30d.length) * 100) : 0;

            // Current streak
            let currentStreak = 0;
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const completionDates = new Set(completed.map(t => getLocalDateString(t.completedAt!)));
            for (let i = 0; i < 365; i++) {
                const d = new Date(today);
                d.setDate(d.getDate() - i);
                const key = getLocalDateString(d);
                if (completionDates.has(key)) {
                    currentStreak++;
                } else if (i > 0) {
                    break;
                }
            }

            // Longest streak (all time)
            let longestStreak = 0;
            let tempStreak = 0;
            const sortedDates = [...completionDates].sort();
            for (let i = 0; i < sortedDates.length; i++) {
                if (i === 0) {
                    tempStreak = 1;
                } else {
                    const prevDate = new Date(sortedDates[i - 1] + 'T00:00:00');
                    const currDate = new Date(sortedDates[i] + 'T00:00:00');
                    const diffDays = (currDate.getTime() - prevDate.getTime()) / 86400000;
                    if (diffDays === 1) {
                        tempStreak++;
                    } else {
                        tempStreak = 1;
                    }
                }
                longestStreak = Math.max(longestStreak, tempStreak);
            }

            // Total focus time
            const totalFocusMinutes = tasks.reduce((acc, t) => acc + (t.actualDurationMinutes || 0), 0);

            // Avg tasks per active day (last 14d)
            const recent14dCompleted = completed.filter(t =>
                t.completedAt && now - new Date(t.completedAt).getTime() <= 14 * 86400000
            );
            const activeDays14d = new Set(recent14dCompleted.map(t => getLocalDateString(t.completedAt!)));
            const avgTasksPerActiveDay14d = activeDays14d.size > 0
                ? Math.round((recent14dCompleted.length / activeDays14d.size) * 10) / 10
                : 0;

            // Trends from previous snapshot
            const prevScorecard = get().previousSnapshot?.scorecard;
            const completionRateTrend = compareTrend(completionRate30d, prevScorecard?.completionRate30d);
            const streakTrend = compareTrend(currentStreak, prevScorecard?.currentStreak);
            const avgTasksTrend = compareTrend(avgTasksPerActiveDay14d, prevScorecard?.avgTasksPerActiveDay14d);

            scorecard = {
                totalCompleted,
                completionRate30d,
                currentStreak,
                longestStreak,
                totalFocusMinutes,
                avgTasksPerActiveDay14d,
                completionRateTrend,
                streakTrend,
                avgTasksTrend,
            };
        } catch { /* skip scorecard on error */ }

        // ══════════════════════════════════════
        // 28-DAY ACTIVITY DATA
        // ══════════════════════════════════════

        const dailyActivity28d: DailyActivity[] = [];
        try {
            const completionMap = new Map<string, number>();
            completed.forEach(t => {
                if (t.completedAt && now - new Date(t.completedAt).getTime() <= 28 * 86400000) {
                    const key = getLocalDateString(t.completedAt);
                    completionMap.set(key, (completionMap.get(key) || 0) + 1);
                }
            });
            for (let i = 27; i >= 0; i--) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                const key = getLocalDateString(d);
                dailyActivity28d.push({ date: key, count: completionMap.get(key) || 0 });
            }
        } catch { /* empty array on error */ }

        set({ insights, scorecard, dailyActivity28d, lastComputedAt: Date.now(), lastCompletedCount: completedCount });

        // ── Save snapshot to Supabase (fire and forget) ──
        if (userId && scorecard) {
            db.upsertInsightSnapshot(userId, weekStart, insights, scorecard)
                .catch(err => console.error('Failed to save insight snapshot:', err));
        }
    },
}));
