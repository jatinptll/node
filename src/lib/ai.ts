/**
 * AI Check-In — calls OpenRouter API directly
 * Silent fallback: if the call fails or times out, returns null
 * and the caller falls back to pre-scored tasks.
 */

export interface CheckInInput {
    energy?: 'high' | 'medium' | 'low';
    availableTime?: '15min' | '30min' | '1hour' | '2plus';
    location?: 'home' | 'cafe' | 'office' | 'on_the_go';
    mood?: 'motivated' | 'tired' | 'stressed' | 'calm';
    preference?: 'deep_work' | 'small_tasks' | 'comms' | 'goal';
}

export interface TaskContext {
    id: string;
    title: string;
    priority: string;
    energyTag?: string;
    estimatedMinutes?: number;
    goalLinked: boolean;
    overdue: boolean;
    dueDate?: string;
}

export interface CheckInResult {
    tasks: string[];        // task IDs
    reasoning: string;      // warm one-sentence explanation
}

const TIMEOUT_MS = 10_000;
const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;

const SYSTEM_PROMPT = `You are a focus assistant inside a productivity app called Node. Given the user's current energy, available time, mood, and location, pick the 3 best tasks from the provided list for them to work on right now.

Prioritize fit over raw priority — a low-energy user shouldn't be given a 3-hour deep focus task. A stressed user should get quick wins. A motivated user with 2+ hours should get deep work.

Return ONLY valid JSON with this exact structure:
{"tasks": ["task_id_1", "task_id_2", "task_id_3"], "reasoning": "One warm sentence explaining your picks."}

Do not include any text outside the JSON object. Pick exactly 3 tasks. Use only task IDs from the provided list.`;

/**
 * Call the AI check-in API.
 * Returns null on any failure (caller should fall back to top 3 pre-scored).
 */
export async function aiCheckIn(
    userInput: CheckInInput,
    candidateTasks: TaskContext[],
    timeOfDay: string,
): Promise<CheckInResult | null> {
    try {
        if (!OPENROUTER_API_KEY) {
            console.error('[AI Check-in] VITE_OPENROUTER_API_KEY not configured.');
            return null;
        }

        console.log('[AI Check-in] Sending direct OpenRouter fetch request... candidate tasks:', candidateTasks.length);

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

        const userContext = [
            `Current time: ${timeOfDay}`,
            userInput?.energy ? `Energy level: ${userInput.energy}` : null,
            userInput?.availableTime ? `Available time: ${userInput.availableTime}` : null,
            userInput?.location ? `Location: ${userInput.location}` : null,
            userInput?.mood ? `Mood: ${userInput.mood}` : null,
            userInput?.preference ? `Preference: ${userInput.preference}` : null,
        ].filter(Boolean).join('\n');

        const taskList = (candidateTasks || []).map((t: any, i: number) =>
            `${i + 1}. ID: ${t.id} | Title: "${t.title}" | Priority: ${t.priority} | Energy: ${t.energyTag || 'none'} | Est: ${t.estimatedMinutes ? t.estimatedMinutes + 'min' : 'unknown'} | Goal-linked: ${t.goalLinked} | Overdue: ${t.overdue}${t.dueDate ? ' | Due: ' + t.dueDate : ''}`
        ).join('\n');

        const userMessage = `Here is my current context:\n${userContext}\n\nHere are my candidate tasks:\n${taskList}\n\nPick the 3 best tasks for me right now.`;

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                'HTTP-Referer': window.location.origin,
                'X-Title': 'Node',
            },
            body: JSON.stringify({
                model: 'openai/gpt-oss-120b', // Note: OpenRouter model identifier, confirm exact from docs, assuming openai/o3-120b
                messages: [
                    { role: 'system', content: SYSTEM_PROMPT },
                    { role: 'user', content: userMessage },
                ],
            }),
            signal: controller.signal,
        });

        clearTimeout(timeout);

        if (!response.ok) {
            console.error('[AI Check-in] HTTP Error:', response.status, response.statusText);
            const errText = await response.text();
            console.error('[AI Check-in] Details:', errText);
            return null;
        }

        const data = await response.json();
        console.log('[AI Check-in] Success! Result:', data);

        const textContent = data.choices?.[0]?.message?.content || '';

        // Parse JSON from model response
        const jsonMatch = textContent.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            console.error('[AI Check-in] Model did not return JSON. Text:', textContent);
            return null;
        }

        const parsed = JSON.parse(jsonMatch[0]);

        // Validate response shape
        if (parsed && Array.isArray(parsed.tasks) && typeof parsed.reasoning === 'string') {
            return parsed as CheckInResult;
        }

        console.error('[AI Check-in] Unexpected response shape:', parsed);
        return null;
    } catch (err: any) {
        console.error('[AI Check-in] Request failed or timed out:', err);
        return null;
    }
}
