/**
 * Task Scoring Engine — shared scoring logic for Daily Plan + Suggested For You.
 *
 * Scores every incomplete task on a multi-factor point system.
 * The same algorithm is used by MorningPlanModal, TodayView suggestions,
 * and the AI Check-In pre-ranking.
 */
import { getLocalDateString } from '@/lib/utils';
import type { Task } from '@/types/task';

export type TimeBucket = 'morning' | 'afternoon' | 'evening' | 'late_night';
export type SuggestionReason =
    | 'Overdue'
    | 'Due today'
    | 'Due tomorrow'
    | 'High priority'
    | 'Deep focus window'
    | 'Quick win'
    | 'Linked to goal'
    | 'Deferred too long'
    | 'Routine / admin time';

export interface ScoredTask extends Task {
    score: number;
    reason: SuggestionReason;
}

/**
 * Get the current time-of-day bucket.
 */
export function getTimeBucket(hour?: number): TimeBucket {
    const h = hour ?? new Date().getHours();
    if (h >= 5 && h < 12) return 'morning';
    if (h >= 12 && h < 17) return 'afternoon';
    if (h >= 17 && h < 22) return 'evening';
    return 'late_night';
}

/**
 * Score an array of tasks, returning them sorted best-first.
 *
 * @param tasks         — incomplete, non-hidden tasks
 * @param timeBucket    — current time of day
 * @param todayStr      — YYYY-MM-DD for today (pass in to avoid recalculating per task)
 * @param tomorrowStr   — YYYY-MM-DD for tomorrow
 */
export function scoreTasks(
    tasks: Task[],
    timeBucket: TimeBucket,
    todayStr?: string,
    tomorrowStr?: string,
): ScoredTask[] {
    const today = todayStr ?? getLocalDateString();
    const tomorrow = tomorrowStr ?? getLocalDateString(Date.now() + 86400000);

    return tasks
        .map(t => {
            let score = 0;
            let topReason: SuggestionReason = 'High priority';
            let topReasonScore = 0;

            const track = (pts: number, reason: SuggestionReason) => {
                score += pts;
                if (pts > topReasonScore) {
                    topReasonScore = pts;
                    topReason = reason;
                }
            };

            // ── Due-date factors ──
            if (t.dueDate && t.dueDate < today) track(100, 'Overdue');
            if (t.dueDate === today) track(80, 'Due today');
            if (t.dueDate === tomorrow) track(40, 'Due tomorrow');

            // ── Priority ──
            if (t.priority === 'p1') track(30, 'High priority');
            if (t.priority === 'p2') track(20, 'High priority');
            if (t.priority === 'p3') score += 5;

            // ── Energy tag (base) ──
            if (t.energyTag === 'deep_focus') track(15, 'Deep focus window');
            if (t.energyTag === 'quick_win') track(12, 'Quick win');

            // ── Goal-linked ──
            if (t.goalId) track(10, 'Linked to goal');

            // ── Deferred repeatedly ──
            if ((t.deferralCount || 0) >= 2) track(8, 'Deferred too long');

            // ── Time-of-day multipliers (applied on top) ──
            switch (timeBucket) {
                case 'morning':
                    if (t.energyTag === 'deep_focus') {
                        score += 10;
                        if (topReasonScore < 25) { topReason = 'Deep focus window'; topReasonScore = 25; }
                    }
                    break;
                case 'afternoon':
                    if (t.energyTag === 'quick_win') {
                        score += 10;
                        if (topReasonScore < 22) { topReason = 'Quick win'; topReasonScore = 22; }
                    }
                    break;
                case 'evening':
                    if (t.energyTag === 'routine' || t.energyTag === 'comms') {
                        score += 10;
                        if (topReasonScore < 20) { topReason = 'Routine / admin time'; topReasonScore = 20; }
                    }
                    break;
                case 'late_night':
                    // Only surface P1 tasks meaningfully — deprioritize everything else
                    if (t.priority !== 'p1') score = Math.floor(score * 0.5);
                    break;
            }

            // ── Slight penalty: no due date + no estimate = vague work ──
            if (!t.dueDate && !t.estimatedMinutes) score -= 3;

            return { ...t, score, reason: topReason };
        })
        .sort((a, b) => b.score - a.score);
}
