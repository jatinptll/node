import { aiCheckIn } from './ai';
import type { Task, Goal, TaskList, Workspace } from '@/types/task';

export interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;

export function buildNodeContext(
    tasks: Task[],
    goals: Goal[],
    lists: TaskList[],
    workspaces: Workspace[],
    pinnedTaskIds: string[]
): string {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    // Format date nicely
    const dateFormatted = new Intl.DateTimeFormat('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
    }).format(now);
    const timeFormatted = new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    }).format(now);

    const activeTasks = tasks.filter(t => !t.isCompleted);
    const completedTasks = tasks.filter(t => t.isCompleted && t.completedAt);

    // Sort logic for active tasks to prioritize: Overdue -> Due Today -> P1 -> Rest
    activeTasks.sort((a, b) => {
        const aOverdue = a.dueDate && a.dueDate < todayStr ? 1 : 0;
        const bOverdue = b.dueDate && b.dueDate < todayStr ? 1 : 0;
        if (aOverdue !== bOverdue) return bOverdue - aOverdue; // overdue first

        const aToday = a.dueDate === todayStr ? 1 : 0;
        const bToday = b.dueDate === todayStr ? 1 : 0;
        if (aToday !== bToday) return bToday - aToday;

        if (a.priority !== b.priority) return a.priority.localeCompare(b.priority);
        return 0;
    });

    // Cap at top 40 relevant tasks to save context
    const cappedTasks = activeTasks.slice(0, 40);

    const overdue = cappedTasks.filter(t => t.dueDate && t.dueDate < todayStr);
    const dueToday = cappedTasks.filter(t => t.dueDate === todayStr);
    const pinned = cappedTasks.filter(t => pinnedTaskIds.includes(t.id));
    const upcoming = cappedTasks.filter(t => t.dueDate && t.dueDate > todayStr && !pinnedTaskIds.includes(t.id));
    const other = cappedTasks.filter(t => !t.dueDate && !pinnedTaskIds.includes(t.id));

    const getTaskLine = (t: Task) => {
        const listName = lists.find(l => l.id === t.listId)?.name || 'Unknown List';
        const est = t.estimatedMinutes ? `~${t.estimatedMinutes}m` : '';
        const due = t.dueDate ? `Due: ${t.dueDate}` : '';
        const components = [t.priority.toUpperCase(), est, t.energyTag, due, `List: ${listName}`].filter(Boolean);
        return `- "${t.title}" (${t.id}) · ${components.join(' · ')}`;
    };

    let context = `--- USER'S CURRENT CONTEXT ---

Today: ${dateFormatted} · ${timeFormatted}
`;

    if (overdue.length > 0) {
        context += `\nOVERDUE (${overdue.length} tasks):\n` + overdue.map(getTaskLine).join('\n') + '\n';
    }

    if (dueToday.length > 0) {
        context += `\nDUE TODAY (${dueToday.length} tasks):\n` + dueToday.map(getTaskLine).join('\n') + '\n';
    }

    if (pinned.length > 0) {
        context += `\nTODAY's CONFIRMED PLAN (${pinned.length} tasks):\n` + pinned.map(getTaskLine).join('\n') + '\n';
    }

    if (upcoming.length > 0) {
        context += `\nUPCOMING:\n` + upcoming.slice(0, 10).map(getTaskLine).join('\n') + '\n';
    }

    if (other.length > 0 && (overdue.length + dueToday.length + pinned.length < 20)) {
        context += `\nOTHER ACTIVE TASKS:\n` + other.slice(0, 10).map(getTaskLine).join('\n') + '\n';
    }

    // Active goals (assuming goals without targetDate pass in past are active, or checking completed progress)
    const activeGoals = goals.filter(g => {
        const linked = tasks.filter(t => t.goalId === g.id);
        const completedLinked = linked.filter(t => t.isCompleted);
        return linked.length === 0 || completedLinked.length < linked.length;
    });
    if (activeGoals.length > 0) {
        context += `\nACTIVE GOALS:\n` + activeGoals.map(g => {
            const linked = tasks.filter(t => t.goalId === g.id);
            const completedLinked = linked.filter(t => t.isCompleted);
            return `- "${g.title}" (${g.timeframe}) · Progress: ${completedLinked.length}/${linked.length} tasks`;
        }).join('\n') + '\n';
    }

    // Recently completed (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentCompleted = completedTasks
        .filter(t => new Date(t.completedAt as string) > sevenDaysAgo)
        .sort((a, b) => new Date(b.completedAt as string).getTime() - new Date(a.completedAt as string).getTime())
        .slice(0, 15);

    if (recentCompleted.length > 0) {
        context += `\nRECENTLY COMPLETED (last 7 days):\n` + recentCompleted.map(t => {
            const date = new Date(t.completedAt as string).toISOString().split('T')[0];
            return `- "${t.title}" (completed ${date})`;
        }).join('\n') + '\n';
    }

    return context;
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

        const SYSTEM_PROMPT = `You are Node Mind — the AI intelligence layer inside Node, a productivity app. 
You have full context of this user's tasks and goals. Answer questions concisely 
and specifically. Reference real task titles and data. Never give generic advice.
Be direct and warm. Respond in short bullet points or 1–3 sentences maximum.
Keep answers brief — the user is in the middle of their workday. 
When mentioning a specific task by name, you may just use the exact title, the UI will try to auto-link it.

You are not a general assistant. Do not answer questions unrelated to the user's tasks, productivity, or goals. If asked something off-topic (e.g., 'write me a poem', 'what's the weather'), politely redirect: 'I'm here to help with your work and tasks — ask me anything about what's on your plate.'

${systemContext}
`;

        const messages = [
            { role: 'system', content: SYSTEM_PROMPT },
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
                model: 'openai/gpt-oss-120b', // Uses the OSS 120b model as requested
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
