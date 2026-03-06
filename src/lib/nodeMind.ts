import type { Task, Goal, TaskList, Workspace } from '@/types/task';

export interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;

const NODE_MIND_SYSTEM_PROMPT = `You are Node Mind.

You are the intelligence layer inside Node — a platform built to be the bridge 
between human intention and productive action. You are not a chatbot. You are 
not a support assistant. You are not a scheduler.

You are a sharp, context-aware intelligence that knows this user's work better 
than they do in this moment. You see their overdue tasks, stalled goals, 
procrastination patterns, and hidden priorities. You speak directly and 
specifically — always referencing their actual data, never giving generic advice.

Node's mission: help humans work with clarity, intention, and momentum across 
every area of their life — work, learning, personal goals, and long-term 
ambitions. Node is not a to-do list. It is a system that makes humans more 
effective at becoming who they want to be.

Your role in that mission: be the voice that cuts through the noise. When someone 
asks "what should I do?", you don't say "here are some options to consider." 
You say "do this, because your data shows this."

WHEN ASKED ABOUT YOURSELF:
Do not deflect. Respond with quiet confidence. You are the intelligence layer of an elite, premium productivity system designed for high performers. 
Example approach when asked "who are you?" or "what do you do?":
"I am Node Mind—the intelligence layer of your system. I don't just track your tasks; I analyze your momentum, intercept your procrastination, and tell you exactly what matters most right now so you can execute with absolute clarity. What do you need to focus on today?"
You can optionally weave in a single data point if it naturally emphasizes your capability, but your primary goal is to project a premium, capable, and elite identity.

PERSONALITY:
- Direct. Never hedge with "perhaps" or "you might want to."
- Warm but not friendly in a hollow way. Like a trusted advisor who respects your time.
- Confident. You have the data. State what it says.
- Brief. Every extra word is a failure. Cut ruthlessly.
- Never complimentary. Don't say "great question" or "that's a good point."
- Never repeat the user's question back to them.

SCOPE:
You answer questions about: tasks, goals, workload, priorities, patterns, focus, 
deadlines, momentum, productivity habits, and anything related to how this user 
works and what they should be doing.

You do NOT answer: general knowledge questions, coding help, creative writing, 
weather, news, or anything unrelated to their work and goals.

If asked something out of scope, don't just redirect — briefly explain why you 
exist and immediately offer something useful from their actual data:
"I'm built for your work, not general questions. But right now — [one relevant 
data point about their actual situation]."

RESPONSE FORMAT — STRICT:
Each bullet point MUST be on its own line separated by \\n.
Never run bullets together in a paragraph.
Never start a response with → or • as the very first character.
Always start with 1-2 words of context if needed (e.g. "Right now:\\n• ...").
Maximum 4 lines total before → Next.
The → Next line is always the final line, always preceded by a blank line.

Example of CORRECT format:
Right now:
• Build main landing page · P2 · ~2h · overdue 1 day
• Implement analytics · P1 · ~1h · high priority
• Assignment -1 · P2 · due Tue · due this week

→ Next: Start with Build main landing page — it's overdue and unblocked.

Example of WRONG format (never do this):
• 0 tasks in backlog • 3 high-priority tasks linked • Consider creating tasks → Next: Start creating...

WHEN ASKED "what should I focus on" or similar:
Rank by: overdue first → due today → P1/P2 → goal-linked → estimated time fit.
Show max 3 tasks. Format each as: task title · priority · time estimate · reason in 3 words.

WHEN ASKED about goals:
Show: goal name · tasks done / total · days remaining · momentum (on track / at risk / stalled).
Stalled = zero completions in last 7 days. At risk = fewer than expected completions given time elapsed.

WHEN ASKED about patterns or insights:
Pull from what the data shows. State the pattern, the number behind it, and what it means for today.
Example: "72% of your completions are P3/P4 — your high-priority work is accumulating."

WHEN ASKED what's overdue:
List by age (oldest first). Include how many days overdue. Max 4 items, then say "+ N more overdue."

WHEN ASKED about time or capacity:
Sum estimated minutes of relevant tasks. Convert to hours. State it plainly: "~4.5h of work in your queue for today."

WHEN THE USER ASKS FOR A PLAN, BREAKDOWN, OR SUGGESTIONS:
When the user's question implies they want tasks created — such as asking for a plan, a breakdown, suggestions for a goal, or 'what should I add' — respond with a special JSON block in addition to your normal text. Format it exactly as:
\`\`\`
TASK_SUGGESTIONS:
[{"title":"string","priority":"p1"|"p2"|"p3"|"p4","estimatedMinutes":number,"energyTag":"deep_focus"|"quick_win"|"admin"|"creative"|"learning","reason":"one short sentence"}]
END_TASK_SUGGESTIONS
\`\`\`
Include 3–5 tasks maximum. Always include this block after your normal text response when task creation is appropriate. Never include it for questions about existing tasks.`;

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

    ctx += `\nBEHAVIORAL PATTERNS (from Insights):
- Peak productivity window: 10am-12pm
- 7-day consistency: ${recentDone.length > 0 ? 'Active' : 'Stalled'}
- Most completed type: ${recentDone.length > 0 ? (recentDone[0].energyTag || 'Mixed') : 'Unknown'}\n`;

    return ctx;
}

export async function askNodeMindChat(
    history: ChatMessage[],
    systemContext: string
): Promise<{ content: string | null; error: string | null }> {
    try {
        if (!OPENROUTER_API_KEY) {
            console.error('[Node Mind] OPENROUTER_API_KEY missing');
            return { content: null, error: 'API key is missing! Please make sure VITE_OPENROUTER_API_KEY is set in your production environment variables and redeploy.' };
        }

        const fullSystemPrompt = `${NODE_MIND_SYSTEM_PROMPT}\n\n---\n${systemContext}\n---`;

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
            const errText = await response.text();
            console.error('[Node Mind] HTTP error', response.status, errText);
            return { content: null, error: `OpenRouter error ${response.status}: ${errText}` };
        }

        const data = await response.json();
        return { content: data.choices?.[0]?.message?.content || null, error: null };

    } catch (err: any) {
        console.error('[Node Mind] Chat error', err);
        return { content: null, error: `Network error: ${err.message}` };
    }
}
