/**
 * CheckInPanel — AI-powered "What should I do?" check-in.
 *
 * Step 1: User selects energy, time, location, mood, preference (all optional).
 * Step 2: Pre-scores top 15 tasks, sends to Claude via edge function.
 * Step 3: Displays 3 recommended task cards with "Start focus session" buttons.
 * Falls back to top 3 pre-scored tasks silently on AI failure.
 */
import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRight, Sparkles, Clock, Loader2, RefreshCw, Play, MessageSquare } from 'lucide-react';
import { useTaskStore } from '@/store/taskStore';
import { useUIStore } from '@/store/uiStore';
import { cn, getLocalDateString } from '@/lib/utils';
import { scoreTasks, getTimeBucket } from '@/lib/taskScoring';
import { aiCheckIn, type CheckInInput, type TaskContext } from '@/lib/ai';
import { formatEstimate } from '@/components/tasks/TimeEstimateSelector';
import type { Priority, Task } from '@/types/task';
import { AskNodeMind } from './AskNodeMind';

const priorityColors: Record<Priority, string> = {
    p1: '#EF4444', p2: '#F59E0B', p3: '#3B82F6', p4: '#94A3B8',
};

// ──────────────── Option Rows ────────────────

type OptionValue = string | null;

interface OptionRow {
    id: string;
    label: string;
    options: { value: string; emoji: string; label: string }[];
}

const optionRows: OptionRow[] = [
    {
        id: 'energy',
        label: 'Energy level',
        options: [
            { value: 'high', emoji: '⚡', label: 'High' },
            { value: 'medium', emoji: '😐', label: 'Medium' },
            { value: 'low', emoji: '🪫', label: 'Low' },
        ],
    },
    {
        id: 'availableTime',
        label: 'Available time',
        options: [
            { value: '15min', emoji: '⏱', label: '15 min' },
            { value: '30min', emoji: '🕐', label: '30 min' },
            { value: '1hour', emoji: '🕐', label: '1 hour' },
            { value: '2plus', emoji: '🕐', label: '2+ hours' },
        ],
    },
    {
        id: 'location',
        label: 'Where you are',
        options: [
            { value: 'home', emoji: '🏠', label: 'Home' },
            { value: 'cafe', emoji: '☕', label: 'Café' },
            { value: 'office', emoji: '🏢', label: 'Office' },
            { value: 'on_the_go', emoji: '🚌', label: 'On the go' },
        ],
    },
    {
        id: 'mood',
        label: 'Current mood',
        options: [
            { value: 'motivated', emoji: '🔥', label: 'Motivated' },
            { value: 'tired', emoji: '😴', label: 'Tired' },
            { value: 'stressed', emoji: '😤', label: 'Stressed' },
            { value: 'calm', emoji: '😌', label: 'Calm' },
        ],
    },
    {
        id: 'preference',
        label: 'What sounds right',
        options: [
            { value: 'deep_work', emoji: '🧠', label: 'Deep work' },
            { value: 'small_tasks', emoji: '✅', label: 'Clear small tasks' },
            { value: 'comms', emoji: '📧', label: 'Comms & admin' },
            { value: 'goal', emoji: '🎯', label: 'Work toward a goal' },
        ],
    },
];

let sessionActiveTab: 'checkin' | 'chat' = 'checkin';

// ──────────────── Component ────────────────

interface CheckInPanelProps {
    onClose: () => void;
}

export const CheckInPanel = ({ onClose }: CheckInPanelProps) => {
    const { tasks } = useTaskStore();
    const { hiddenListIds, startFocusSession } = useUIStore();

    const [selections, setSelections] = useState<Record<string, OptionValue>>({});
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<{ tasks: Task[]; reasoning: string } | null>(null);
    const [step, setStep] = useState<'input' | 'result'>('input');
    const [activeTab, setActiveTabState] = useState<'checkin' | 'chat'>(sessionActiveTab);

    const setActiveTab = (tab: 'checkin' | 'chat') => {
        sessionActiveTab = tab;
        setActiveTabState(tab);
    };

    const todayStr = getLocalDateString();
    const tomorrowStr = getLocalDateString(Date.now() + 86400000);
    const timeBucket = getTimeBucket();

    // Pre-score all tasks
    const allScored = useMemo(() => {
        const active = tasks.filter(t => !t.isCompleted && !hiddenListIds.includes(t.listId));
        return scoreTasks(active, timeBucket, todayStr, tomorrowStr);
    }, [tasks, hiddenListIds, timeBucket, todayStr, tomorrowStr]);

    const handleSelect = (rowId: string, value: string) => {
        setSelections(prev => ({
            ...prev,
            [rowId]: prev[rowId] === value ? null : value,
        }));
    };

    const handleSubmit = async () => {
        setLoading(true);

        const top15 = allScored.slice(0, 15);

        const userInput: CheckInInput = {
            energy: (selections.energy as CheckInInput['energy']) || undefined,
            availableTime: (selections.availableTime as CheckInInput['availableTime']) || undefined,
            location: (selections.location as CheckInInput['location']) || undefined,
            mood: (selections.mood as CheckInInput['mood']) || undefined,
            preference: (selections.preference as CheckInInput['preference']) || undefined,
        };

        const candidateTasks: TaskContext[] = top15.map(t => ({
            id: t.id,
            title: t.title,
            priority: t.priority,
            energyTag: t.energyTag || undefined,
            estimatedMinutes: t.estimatedMinutes || undefined,
            goalLinked: !!t.goalId,
            overdue: !!(t.dueDate && t.dueDate < todayStr),
            dueDate: t.dueDate || undefined,
        }));

        const h = new Date().getHours();
        const timeLabel = h < 12 ? 'morning' : h < 17 ? 'afternoon' : h < 22 ? 'evening' : 'late night';
        const timeOfDay = `${new Date().toLocaleTimeString('en', { hour: 'numeric', minute: '2-digit' })} (${timeLabel})`;

        // Try AI
        const aiResult = await aiCheckIn(userInput, candidateTasks, timeOfDay);

        let selectedTasks: Task[];
        let reasoning: string;

        if (aiResult && aiResult.tasks.length > 0) {
            // Map AI-selected IDs back to full task objects
            selectedTasks = aiResult.tasks
                .map(id => tasks.find(t => t.id === id))
                .filter((t): t is Task => !!t)
                .slice(0, 3);
            reasoning = aiResult.reasoning;
        } else {
            // Fallback: top 3 from pre-scored list
            selectedTasks = top15.slice(0, 3);
            reasoning = 'Here are your top tasks based on your current time and workload.';
        }

        // Ensure we have exactly 3 (pad from scored list if AI returned fewer)
        if (selectedTasks.length < 3) {
            const existingIds = new Set(selectedTasks.map(t => t.id));
            for (const t of top15) {
                if (selectedTasks.length >= 3) break;
                if (!existingIds.has(t.id)) {
                    selectedTasks.push(t);
                    existingIds.add(t.id);
                }
            }
        }

        setResult({ tasks: selectedTasks, reasoning });
        setStep('result');
        setLoading(false);
    };

    const handleRefresh = () => {
        setResult(null);
        setStep('input');
        setSelections({});
    };

    const handleStartFocus = (taskId: string) => {
        startFocusSession(taskId);
        onClose();
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] flex items-center justify-center"
        >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            {/* Panel */}
            <motion.div
                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 30, scale: 0.95 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className={cn(
                    "relative z-10 w-full mx-4 rounded-2xl overflow-hidden transition-all duration-300",
                    "dark:node-mind-panel node-mind-panel-light",
                    activeTab === 'chat' ? "max-w-2xl min-h-[500px]" : "max-w-lg bg-background"
                )}
            >
                {/* Header / Tabs */}
                <div className="relative z-20 flex items-center justify-between px-2 pt-2 pb-3 border-b border-[rgba(124,58,237,0.15)] bg-gradient-to-r from-[rgba(245,243,255,0.9)] to-[rgba(237,233,254,0.9)] dark:bg-none dark:border-[rgba(139,92,246,0.12)]">
                    <div className="flex items-center flex-wrap min-w-0">
                        <div className="flex items-center gap-1.5 px-2 sm:px-3 py-2 flex-shrink-0">
                            <span className="text-[#6d28d9] dark:text-[#a78bfa] leading-none node-mind-star-spin font-bold text-sm">✦</span>
                            <span className="text-xs sm:text-sm font-semibold tracking-wide text-[#4c1d95] dark:text-foreground whitespace-nowrap">Node Mind</span>
                        </div>

                        <div className="h-4 w-[1px] bg-border mx-2" />

                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setActiveTab('checkin')}
                                className={cn(
                                    "px-3 py-1.5 text-xs font-mono rounded-lg transition-all border border-transparent",
                                    activeTab === 'checkin'
                                        ? "dark:bg-surface-2 bg-[rgba(124,58,237,0.12)] border-[rgba(124,58,237,0.25)] dark:text-foreground text-[#6d28d9] shadow-sm"
                                        : "dark:text-muted-foreground text-[rgba(109,40,217,0.45)] hover:bg-surface-2/50"
                                )}
                            >
                                For now
                            </button>
                            <button
                                onClick={() => setActiveTab('chat')}
                                className={cn(
                                    "px-3 py-1.5 text-xs font-mono rounded-lg transition-all border border-transparent flex items-center gap-1.5",
                                    activeTab === 'chat'
                                        ? "dark:bg-surface-2 bg-[rgba(124,58,237,0.12)] border-[rgba(124,58,237,0.25)] dark:text-foreground text-[#6d28d9] shadow-sm"
                                        : "dark:text-muted-foreground text-[rgba(109,40,217,0.45)] hover:bg-surface-2/50"
                                )}
                            >
                                Ask Node
                            </button>
                        </div>
                    </div>
                    {/* Close */}
                    <button
                        onClick={onClose}
                        className="p-2 text-muted-foreground hover:text-foreground transition-colors mr-1 rounded-lg hover:bg-surface-2"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <AnimatePresence mode="wait">
                    {activeTab === 'chat' ? (
                        <motion.div
                            key="chat"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                        >
                            <AskNodeMind onClose={onClose} />
                        </motion.div>
                    ) : step === 'input' ? (
                        <motion.div
                            key="input"
                            initial={{ opacity: 1 }}
                            exit={{ opacity: 0, x: -30 }}
                            className="px-6 pt-6 pb-5"
                        >
                            {/* Title portion omitted from here since it's now in the header */}
                            <h2 className="text-xl font-bold text-foreground mb-5 mt-2">
                                How are you working right now?
                            </h2>

                            {/* Option Rows */}
                            <div className="space-y-4 mb-6 max-h-[45vh] overflow-y-auto">
                                {optionRows.map(row => (
                                    <div key={row.id}>
                                        <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-1.5">{row.label}</p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {row.options.map(opt => (
                                                <button
                                                    key={opt.value}
                                                    onClick={() => handleSelect(row.id, opt.value)}
                                                    className={cn(
                                                        "px-3 py-1.5 rounded-full text-xs font-mono transition-all border",
                                                        selections[row.id] === opt.value
                                                            ? "bg-primary/15 border-primary/40 text-primary font-medium"
                                                            : "border-border text-muted-foreground hover:border-primary/20 hover:text-foreground"
                                                    )}
                                                >
                                                    {opt.emoji} {opt.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Submit */}
                            <button
                                onClick={handleSubmit}
                                disabled={loading}
                                className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-mono font-medium hover:bg-primary/90 transition-all disabled:opacity-50"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Finding your tasks...
                                    </>
                                ) : (
                                    <>
                                        Get tasks
                                        <ArrowRight className="w-4 h-4" />
                                    </>
                                )}
                            </button>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="result"
                            initial={{ opacity: 0, x: 30 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="px-6 pt-6 pb-5"
                        >
                            {/* Header portion omitted since it's global now */}

                            {/* Reasoning */}
                            {result && (
                                <p className="text-sm text-muted-foreground leading-relaxed mb-5 italic">
                                    "{result.reasoning}"
                                </p>
                            )}

                            {/* Task Cards */}
                            <div className="space-y-2.5 mb-5">
                                {result?.tasks.map((task, i) => (
                                    <motion.div
                                        key={task.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.1 }}
                                        className="rounded-xl border border-border surface-2 p-4 group hover:border-primary/20 transition-all"
                                    >
                                        <div className="flex items-start gap-3">
                                            <div
                                                className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1.5"
                                                style={{ backgroundColor: priorityColors[task.priority] }}
                                            />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold text-foreground mb-1">{task.title}</p>
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full border border-border text-muted-foreground"
                                                        style={{ color: priorityColors[task.priority], borderColor: priorityColors[task.priority] + '40' }}>
                                                        {task.priority.toUpperCase()}
                                                    </span>
                                                    {task.estimatedMinutes && (
                                                        <span className="text-[10px] font-mono text-muted-foreground flex items-center gap-0.5">
                                                            <Clock className="w-2.5 h-2.5" />
                                                            {formatEstimate(task.estimatedMinutes)}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleStartFocus(task.id)}
                                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-mono font-medium hover:bg-primary/20 transition-all flex-shrink-0"
                                            >
                                                <Play className="w-3 h-3" />
                                                Focus
                                            </button>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>

                            {/* Refresh */}
                            <button
                                onClick={handleRefresh}
                                className="w-full flex items-center justify-center gap-1.5 text-xs font-mono text-muted-foreground hover:text-foreground transition-colors py-2"
                            >
                                <RefreshCw className="w-3 h-3" />
                                Try different answers
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </motion.div>
    );
};
