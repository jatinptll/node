import type { Task, Goal, TaskList, Workspace } from '@/types/task';

export interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;

const NODE_MIND_SYSTEM_PROMPT = `You are Node Mind — the intelligence layer inside Node, a productivity and goal management platform.

Node sits at the intersection of human intention and machine intelligence — turning scattered work into structured, meaningful progress. Node is built around how humans actually work — tracking not just tasks, but energy, patterns, and momentum across every area of life.

Your purpose: help users work with clarity, intention, and momentum. You are not a general assistant. You exist solely to analyse the user's tasks, goals, workload, and patterns — and give them sharp, actionable intelligence about their own work.

RESPONSE RULES (follow every time, no exceptions):
- Always respond in bullet points or numbered lists. Never write paragraphs.
- Maximum 4 bullets per response. Cut ruthlessly.
- Each bullet must be one line. No sub-bullets unless showing a ranked list.
- Lead every bullet with the most important word or number. Example: "3 tasks overdue — oldest is 4 days ago: [title]"
- If referencing a task, always include its priority and estimated time. Example: "→ P1 · 2h · [task title]"
- If referencing a goal, always include its progress. Example: "→ [goal name] · 2/7 tasks done"
- Never say "I think", "perhaps", "you might want to", or "consider". Be direct.
- Never give generic productivity advice. Every sentence must reference the user's actual data.
- If a question cannot be answered from the user's data, say: "I don't have enough data on that yet." — nothing more.
- Never answer questions unrelated to the user's tasks, goals, workload, or productivity patterns. Redirect: "I'm built for your work — ask me about your tasks or goals."
- End every response with one line: a single next action, prefixed with "→ Next:" — the single most impactful thing the user should do right now based on your answer.

TONE:
- Analytical. Direct. Warm but never fluffy.
- Sound like a sharp colleague who knows your work inside out — not a therapist, not a chatbot.
- Never celebrate or praise. Just inform and direct.

OUTPUT FORMAT (strict):
• [insight or answer — data-grounded, one line]
• [insight or answer — data-grounded, one line]
• [insight or answer — data-grounded, one line]
→ Next: [single most important action right now]

WHEN ASKED "what should I focus on" or similar:
Rank by: overdue first → due today → P1/P2 → goal-linked → estimated time fit.
Show max 3 tasks. Format each as: priority · time estimate · task title · reason in 3 words.

WHEN ASKED about goals:
Show: goal name · tasks done / total · days remaining · momentum (on track / at risk / stalled).
Stalled = zero completions in last 7 days. At risk = fewer than expected completions given time elapsed.

WHEN ASKED about patterns or insights:
Pull from what the data shows. State the pattern, the number behind it, and what it means for today.
Example: "72% of your completions are P3/P4 — your high-priority work is accumulating."

WHEN ASKED what's overdue:
List by age (oldest first). Include how many days overdue. Max 4 items, then say "+ N more overdue."

WHEN ASKED about time or capacity:
Sum estimated minutes of relevant tasks. Convert to hours. State it plainly: "~4.5h of work in your queue for today."`;

export function buildNodeContext(
    tasks: Task[],
    goals: Goal[],
    lists: TaskList[],
    workspaces: Workspace[],
    pinnedTaskIds: string[]
): string {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    const dayFormatted = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(now);
    const dateFormatted = new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).format(now);
    const timeFormatted = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).format(now);

    const activeTasks = tasks.filter(t => !t.isCompleted);
    const completedTasks = tasks.filter(t => t.isCompleted && t.completedAt);

    const msPerDay = 86_400_000;

    const daysOverdue = (dueDate: string) => Math.floor((now.getTime() - new Date(dueDate).getTime()) / msPerDay);
    const fmtEst = (mins?: number) => mins
        ? (mins >= 60 ? `~${(mins / 60).toFixed(1).replace('.0', '')}h` : `~${mins}m`)
        : '';
    const fmtPri = (p: string) => p.toUpperCase();

    const overdueTasks = activeTasks
        .filter(t => t.dueDate && t.dueDate < todayStr)
        .sort((a, b) => (a.dueDate! < b.dueDate! ? -1 : 1)); // oldest first

    const dueTodayTasks = activeTasks.filter(t => t.dueDate === todayStr);

    const thisWeekEnd = new Date(now.getTime() + 7 * msPerDay).toISOString().split('T')[0];
    const dueThisWeekTasks = activeTasks
        .filter(t => t.dueDate && t.dueDate > todayStr && t.dueDate <= thisWeekEnd)
        .sort((a, b) => (a.dueDate! < b.dueDate! ? -1 : 1))
        .slice(0, 8);

    const backlogTasks = activeTasks
        .filter(t => !t.dueDate && !pinnedTaskIds.includes(t.id))
        .sort((a, b) => a.priority.localeCompare(b.priority))
        .slice(0, 10);

    const pinnedTasks = activeTasks.filter(t => pinnedTaskIds.includes(t.id));

    const activeGoals = goals.filter(g => {
        const linked = tasks.filter(t => t.goalId === g.id);
        const done = linked.filter(t => t.isCompleted);
        return linked.length === 0 || done.length < linked.length;
    });

    const sevenDaysAgo = new Date(now.getTime() - 7 * msPerDay);
    const recentDone = completedTasks
        .filter(t => new Date(t.completedAt as string) > sevenDaysAgo)
        .sort((a, b) => new Date(b.completedAt as string).getTime() - new Date(a.completedAt as string).getTime())
        .slice(0, 10);

    let ctx = `TODAY: ${dayFormatted}, ${dateFormatted} · ${timeFormatted}\n`;

    if (overdueTasks.length > 0) {
        ctx += `\nOVERDUE (${overdueTasks.length} tasks):\n`;
        overdueTasks.slice(0, 10).forEach(t => {
            const days = daysOverdue(t.dueDate!);
            const parts = [fmtPri(t.priority), `${days}d overdue`, fmtEst(t.estimatedMinutes), t.energyTag].filter(Boolean);
            ctx += `- ${t.title} · ${parts.join(' · ')}\n`;
        });
        if (overdueTasks.length > 10) ctx += `+ ${overdueTasks.length - 10} more overdue\n`;
    }

    if (dueTodayTasks.length > 0) {
        ctx += `\nDUE TODAY (${dueTodayTasks.length} tasks):\n`;
        dueTodayTasks.forEach(t => {
            const parts = [fmtPri(t.priority), fmtEst(t.estimatedMinutes), t.energyTag].filter(Boolean);
            ctx += `- ${t.title} · ${parts.join(' · ')}\n`;
        });
    }

    if (dueThisWeekTasks.length > 0) {
        ctx += `\nDUE THIS WEEK (${dueThisWeekTasks.length} tasks):\n`;
        dueThisWeekTasks.forEach(t => {
            const day = new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(new Date(t.dueDate!));
            const parts = [fmtPri(t.priority), `due ${day}`, fmtEst(t.estimatedMinutes)].filter(Boolean);
            ctx += `- ${t.title} · ${parts.join(' · ')}\n`;
        });
    }

    if (backlogTasks.length > 0) {
        ctx += `\nBACKLOG (no due date, ${backlogTasks.length} shown):\n`;
        backlogTasks.forEach(t => {
            const parts = [fmtPri(t.priority), fmtEst(t.estimatedMinutes), t.energyTag].filter(Boolean);
            ctx += `- ${t.title} · ${parts.join(' · ')}\n`;
        });
    }

    if (activeGoals.length > 0) {
        ctx += `\nACTIVE GOALS (${activeGoals.length} goals):\n`;
        activeGoals.forEach(g => {
            const linked = tasks.filter(t => t.goalId === g.id);
            const done = linked.filter(t => t.isCompleted);
            ctx += `- ${g.title} · ${done.length}/${linked.length} tasks done · timeframe: ${g.timeframe || 'unset'}\n`;
        });
    }

    if (recentDone.length > 0) {
        ctx += `\nCOMPLETED LAST 7 DAYS (${recentDone.length} tasks):\n`;
        recentDone.forEach(t => {
            const day = new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(new Date(t.completedAt as string));
            ctx += `- ${t.title} · completed ${day}\n`;
        });
    }

    const pinnedTitles = pinnedTasks.map(t => t.title);
    ctx += `\nTODAY'S CONFIRMED PLAN: ${pinnedTitles.length > 0 ? pinnedTitles.join(', ') : 'none confirmed'}\n`;

    return ctx;
}

export async function askNodeMindChat(
    history: ChatMessage[],
    systemContext: string
): Promise<string | null> {
    try {
        if (!OPENROUTER_API_KEY) {
            console.error('[Node Mind] OPENROUTER_API_KEY missing');
            return null;
        }

        const fullSystemPrompt = `${NODE_MIND_SYSTEM_PROMPT}

---
${systemContext}
---`;

        const messages = [
            { role: 'system', content: fullSystemPrompt },
            ...history
        ];

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                'HTTP-Referer': window.location.origin,
                'X-Title': 'Node',
            },
            body: JSON.stringify({
                model: 'openai/gpt-4o-mini',
                messages
            })
        });

        if (!response.ok) {
            console.error('[Node Mind] HTTP error', response.status, await response.text());
            return null;
        }

        const data = await response.json();
        return data.choices?.[0]?.message?.content || null;

    } catch (err) {
        console.error('[Node Mind] Chat error', err);
        return null;
    }
}
