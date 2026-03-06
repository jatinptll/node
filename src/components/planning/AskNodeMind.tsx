import { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Loader2, CheckSquare, Square, CornerDownRight, CheckCircle2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useTaskStore } from '@/store/taskStore';
import { useUIStore } from '@/store/uiStore';
import { askNodeMindChat, buildNodeContext, type ChatMessage } from '@/lib/nodeMind';
import { cn } from '@/lib/utils';
import type { Task, Priority, TaskList, Workspace, EnergyTag } from '@/types/task';

// --- Task Suggestion Parser ---
const extractSuggestions = (text: string) => {
    const startIdx = text.indexOf('TASK_SUGGESTIONS:');
    const endIdx = text.indexOf('END_TASK_SUGGESTIONS');
    if (startIdx === -1 || endIdx === -1) return { rawText: text, suggestions: null };

    let jsonStr = text.substring(startIdx + 'TASK_SUGGESTIONS:'.length, endIdx).trim();
    const beforeBlock = text.substring(0, startIdx).trim();
    const afterBlock = text.substring(endIdx + 'END_TASK_SUGGESTIONS'.length).trim();

    // Clean jsonStr in case of markdown formatting
    jsonStr = jsonStr.replace(/```json\n?/gi, '').replace(/```\n?/g, '').trim();

    let suggestions: TaskSuggestion[] | null = null;
    try {
        suggestions = JSON.parse(jsonStr);
    } catch (e) {
        console.error("Failed to parse task suggestions", e);
    }

    return { rawText: (beforeBlock + '\n\n' + afterBlock).trim(), suggestions };
}

export interface TaskSuggestion {
    title: string;
    priority?: Priority;
    estimatedMinutes?: number;
    energyTag?: EnergyTag;
    reason?: string;
}

const TaskSuggestionCard = ({
    suggestions,
    onAddTasks,
    defaultListId,
    lists,
    workspaces
}: {
    suggestions: TaskSuggestion[],
    onAddTasks: (tasks: TaskSuggestion[], listId: string) => void,
    defaultListId: string,
    lists: TaskList[],
    workspaces: Workspace[]
}) => {
    const [selectedIdx, setSelectedIdx] = useState<Set<number>>(new Set(suggestions.map((_, i) => i)));
    const [status, setStatus] = useState<'idle' | 'success'>('idle');
    const [selectedListId, setSelectedListId] = useState<string>(defaultListId);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Group lists by workspace
    const listsByWorkspace = useMemo(() => {
        const grouped: Record<string, { wsName: string, lists: TaskList[] }> = {};
        workspaces.forEach(ws => {
            grouped[ws.id] = { wsName: ws.name, lists: [] };
        });
        lists.forEach(l => {
            if (grouped[l.workspaceId]) {
                grouped[l.workspaceId].lists.push(l);
            }
        });
        return grouped;
    }, [lists, workspaces]);

    const filteredWorkspaces = useMemo(() => {
        const q = searchQuery.toLowerCase();
        return Object.values(listsByWorkspace)
            .map(group => ({
                ...group,
                lists: group.lists.filter(l => l.name.toLowerCase().includes(q) || group.wsName.toLowerCase().includes(q))
            }))
            .filter(group => group.lists.length > 0);
    }, [listsByWorkspace, searchQuery]);

    const selectedListName = useMemo(() => {
        const list = lists.find(l => l.id === selectedListId);
        if (!list) return 'Select list...';
        const ws = workspaces.find(w => w.id === list.workspaceId);
        return ws ? `${ws.name} › ${list.name}` : list.name;
    }, [selectedListId, lists, workspaces]);

    if (status === 'success') {
        return (
            <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-3 text-[#86efac] text-sm flex items-center gap-1.5 font-medium"
            >
                <CheckCircle2 className="w-4 h-4" />
                {selectedIdx.size} tasks added to {selectedListName}
            </motion.div>
        );
    }

    const toggleAll = () => {
        if (selectedIdx.size === suggestions.length) setSelectedIdx(new Set());
        else setSelectedIdx(new Set(suggestions.map((_, i) => i)));
    };

    const toggleOne = (i: number) => {
        const next = new Set(selectedIdx);
        if (next.has(i)) next.delete(i);
        else next.add(i);
        setSelectedIdx(next);
    };

    const handleCreate = () => {
        if (!selectedListId) return;
        const toCreate = suggestions.filter((_, i) => selectedIdx.has(i));
        onAddTasks(toCreate, selectedListId);
        setStatus('success');
    };

    const energyEmoji: Record<string, string> = {
        deep_focus: '🧠', quick_win: '⚡', admin: '📋', creative: '🎨', learning: '📚'
    };

    const priorityColors: Record<string, string> = {
        p1: '#EF4444', p2: '#F59E0B', p3: '#3B82F6', p4: '#94A3B8'
    };

    return (
        <motion.div
            initial={{ y: 12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.25 }}
            className="mt-4 bg-[rgba(124,58,237,0.08)] border border-[rgba(124,58,237,0.25)] rounded-2xl p-4 w-full"
        >
            <div className="flex items-center justify-between mb-3">
                <span className="text-[#a78bfa] text-[11px] uppercase tracking-widest font-semibold flex items-center gap-1.5">
                    <span className="node-mind-avatar-pulse mt-[1px]">✦</span> Suggested tasks
                </span>
                <button
                    onClick={toggleAll}
                    className="text-[11px] text-[#a78bfa] hover:text-[#c4b5fd] transition-colors"
                >
                    {selectedIdx.size === suggestions.length ? 'Deselect all' : 'Select all'}
                </button>
            </div>

            <div className="space-y-1.5">
                {suggestions.map((sug, i) => {
                    const isSelected = selectedIdx.has(i);
                    return (
                        <motion.div
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.3 + (i * 0.05) }}
                            key={i}
                            onClick={() => toggleOne(i)}
                            className={cn(
                                "flex items-start gap-2.5 p-2 rounded-xl cursor-pointer transition-colors border border-transparent",
                                isSelected ? "bg-[rgba(124,58,237,0.12)] border-[rgba(124,58,237,0.2)]" : "hover:bg-[rgba(255,255,255,0.03)]"
                            )}
                        >
                            <div className="mt-[2px] text-[#a78bfa]">
                                {isSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4 opacity-50" />}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-2 mb-1">
                                    <span className="text-[13.5px] font-medium text-[rgba(226,220,255,0.9)] truncate">{sug.title}</span>
                                    <span
                                        className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-sm"
                                        style={{ backgroundColor: `${priorityColors[sug.priority || 'p4']}20`, color: priorityColors[sug.priority || 'p4'] }}
                                    >
                                        {sug.priority?.toUpperCase()}
                                    </span>
                                    {sug.estimatedMinutes && (
                                        <span className="text-xs text-muted-foreground font-mono">
                                            {sug.estimatedMinutes >= 60 ? `~${(sug.estimatedMinutes / 60).toFixed(1).replace('.0', '')}h` : `~${sug.estimatedMinutes}m`}
                                        </span>
                                    )}
                                    {sug.energyTag && <span className="text-xs">{energyEmoji[sug.energyTag] || ''}</span>}
                                </div>
                                {sug.reason && (
                                    <p className="text-[11.5px] text-[rgba(167,139,250,0.5)] leading-tight">{sug.reason}</p>
                                )}
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            <div className="mt-3 flex items-center gap-2 relative">
                <span className="text-[12px] text-[rgba(167,139,250,0.6)]">Add to:</span>
                <button
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="flex items-center gap-1.5 bg-[rgba(124,58,237,0.1)] border border-[rgba(124,58,237,0.25)] rounded-lg px-3 py-1.5 hover:bg-[rgba(124,58,237,0.15)] transition-colors text-[12.5px] text-[rgba(226,220,255,0.95)]"
                >
                    <span className="truncate max-w-[180px]">{selectedListName}</span>
                    <span className="text-[10px] text-[rgba(167,139,250,0.8)] opacity-60">▼</span>
                </button>

                <AnimatePresence>
                    {isDropdownOpen && (
                        <motion.div
                            initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}
                            className="absolute bottom-full mb-1 left-12 w-[240px] max-h-[220px] overflow-y-auto bg-surface-1 border border-border shadow-elevation-3 rounded-xl p-2 z-50 flex flex-col"
                            style={{ scrollbarWidth: 'none' }}
                        >
                            <input
                                type="text"
                                autoFocus
                                placeholder="Search lists..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full bg-surface-2 border border-border rounded-lg px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 mb-2"
                            />
                            {filteredWorkspaces.length === 0 ? (
                                <div className="text-center py-4 text-xs text-muted-foreground">No lists found</div>
                            ) : (
                                <div className="space-y-3 flex-1 overflow-y-auto">
                                    {filteredWorkspaces.map(group => (
                                        <div key={group.wsName}>
                                            <div className="px-2 py-1 text-[10px] uppercase font-bold text-muted-foreground/60 tracking-wider">
                                                {group.wsName}
                                            </div>
                                            {group.lists.map(list => (
                                                <button
                                                    key={list.id}
                                                    onClick={() => {
                                                        setSelectedListId(list.id);
                                                        setIsDropdownOpen(false);
                                                        setSearchQuery('');
                                                    }}
                                                    className={cn(
                                                        "w-full text-left px-2 py-1.5 rounded-md text-sm transition-colors flex items-center gap-2",
                                                        selectedListId === list.id ? "bg-primary/10 text-primary" : "text-foreground hover:bg-surface-2"
                                                    )}
                                                >
                                                    {list.name}
                                                </button>
                                            ))}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <div className="flex items-center gap-3 mt-4 pt-3 border-t border-[rgba(124,58,237,0.15)]">
                <button
                    onClick={handleCreate}
                    disabled={selectedIdx.size === 0 || !selectedListId}
                    className="bg-[#7c3aed] hover:bg-[#6d28d9] disabled:opacity-50 disabled:hover:bg-[#7c3aed] text-white text-xs font-semibold px-4 py-2 rounded-full transition-colors"
                >
                    Create {selectedIdx.size} task{selectedIdx.size !== 1 && 's'}
                </button>
            </div>
        </motion.div>
    );
}

// Extract actual tasks referenced in the message to make them clickable
const MessageContent = ({ content, tasks, onTaskClick }: { content: string; tasks: Task[]; onTaskClick: (task: Task) => void }) => {
    const sortedTasks = useMemo(() => {
        return [...tasks].sort((a, b) => b.title.length - a.title.length);
    }, [tasks]);

    const processedContent = useMemo(() => {
        const text = content
            .replace(/\\n/g, '\n')
            .replace(/\\•/g, '•')
            .replace(/(?:\s*)•(?:\s*)/g, '\n- ') // force Markdown lists on any raw bullets
            .trim();

        // Parse bullets before handling markdown links
        const lines = text.split('\n');
        let parsedText = '';
        let nextBlock = '';

        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('→ Next:')) {
                nextBlock = line; // Save for bottom
            } else if (trimmed.startsWith('•') || trimmed.startsWith('-') || trimmed.startsWith('*')) {
                // Ensure there is a newline before starting a new bullet 
                let styledLine = line;
                styledLine = styledLine.replace(/\b(P[1-4])\b/g, '[$1](#meta)');
                styledLine = styledLine.replace(/(~[\d]+[a-z]+)/gi, '[$1](#meta)');
                styledLine = styledLine.replace(/\b(overdue\s+[a-z0-9\s]+(?=\s*·|$))/gi, '[$1](#meta)');
                styledLine = styledLine.replace(/\b(due\s+[a-z0-9\s]+(?=\s*·|$))/gi, '[$1](#meta)');
                parsedText += `\n${styledLine}`;
            } else {
                parsedText += `\n${line}`;
            }
        }

        parsedText = parsedText.trim();
        if (nextBlock) {
            parsedText += `\n\n${nextBlock}`;
        }

        sortedTasks.forEach(task => {
            if (!task.title || task.title.trim().length < 3) return;
            const escapedTitle = task.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(`(?<!\\[)(${escapedTitle})(?!\\]\\(task:\\/\\/)`, 'gi');
            parsedText = parsedText.replace(regex, (match) => `[${match}](task://${task.id})`);
        });
        return parsedText;
    }, [content, sortedTasks]);

    return (
        <div className="prose prose-sm max-w-none font-sans leading-relaxed
                        prose-p:my-1.5 prose-ul:my-2 prose-ol:my-2 prose-ul:list-none prose-ul:pl-0 
                        prose-li:my-1 dark:prose-strong:text-white prose-strong:text-[#4c1d95]">
            <ReactMarkdown
                components={{
                    a: ({ node, ...props }) => {
                        const href = props.href || '';
                        if (href === '#meta') {
                            return <span className="opacity-80 dark:opacity-100 text-[#6d28d9] dark:text-[rgba(226,220,255,0.8)]">{props.children}</span>;
                        }
                        if (href.startsWith('task://')) {
                            const taskId = href.replace('task://', '');
                            const task = tasks.find(t => t.id === taskId);
                            return (
                                <a
                                    className="cursor-pointer font-bold dark:text-[#e2dcff] text-[#4c1d95] dark:hover:text-[#a78bfa] hover:text-[#7c3aed] transition-colors dark:decoration-[rgba(167,139,250,0.4)] decoration-[rgba(124,58,237,0.3)] underline underline-offset-4 decoration-2"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        if (task) onTaskClick(task);
                                    }}
                                >
                                    {props.children}
                                </a>
                            );
                        }
                        return <a {...props} className="cursor-pointer font-medium dark:text-[#c4b5fd] text-[#6d28d9] hover:underline" />
                    },
                    p: ({ node, children }) => {
                        const isNextLine = typeof children?.[0] === 'string' && (children[0] as string).includes('→ Next:');
                        if (isNextLine) {
                            const newChildren = Array.isArray(children) ? [...children] : [children];
                            newChildren[0] = typeof newChildren[0] === 'string' ? (newChildren[0] as string).replace(/→\s*/, '') : newChildren[0];
                            return (
                                <p className="border-l-[3px] border-l-[#7c3aed] dark:bg-[rgba(124,58,237,0.08)] bg-[rgba(124,58,237,0.1)] px-3 py-2 rounded-r-lg mt-3 dark:text-[rgba(226,220,255,0.95)] text-[#3b0764]">
                                    {newChildren}
                                </p>
                            );
                        }

                        // If it's just • bullets but didn't get caught by ul/li, wrap them nicely
                        const textContent = typeof children?.[0] === 'string' ? children[0] : '';
                        if (typeof textContent === 'string' && (textContent.startsWith('•') || textContent.startsWith('-') || textContent.startsWith('*'))) {
                            return <p className="dark:text-[rgba(226,220,255,0.9)] text-[#1e1b4b] whitespace-pre-wrap">{children}</p>;
                        }

                        return <p className="dark:text-[rgba(226,220,255,0.9)] text-[#1e1b4b]">{children}</p>;
                    },
                    li: ({ node, children }) => (
                        <li className="flex gap-2 dark:text-[rgba(226,220,255,0.9)] text-[#1e1b4b] items-start">
                            <span className="text-[#a78bfa] shrink-0 font-bold mt-[1px]">▸</span>
                            <span>{children}</span>
                        </li>
                    )
                }}
            >
                {processedContent}
            </ReactMarkdown>
        </div>
    );
};

const STARTER_PROMPTS = [
    "What should I focus on right now?",
    "What's most overdue right now?",
    "Which goal needs attention?",
    "What should I finish today?",
];

export const AskNodeMind = ({ onClose }: { onClose: () => void }) => {
    const { tasks, goals, lists, workspaces, addTask } = useTaskStore();
    const { openDetailPanel, dailyPlanTaskIds, selectedListId, nodeMindMessages: messages, setNodeMindMessages: setMessages } = useUIStore();

    const pinnedTaskIds: string[] = dailyPlanTaskIds || [];

    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, loading]);

    const handleSend = async (text: string = input) => {
        const trimmed = text.trim();
        if (!trimmed) return;

        setInput('');
        setError(null);
        setLoading(true);

        const newMessages: ChatMessage[] = [...messages, { role: 'user', content: trimmed }];
        const historyToKeep = newMessages.length > 16 ? newMessages.slice(newMessages.length - 16) : newMessages;

        setMessages(historyToKeep);

        const context = buildNodeContext(tasks, goals, lists, workspaces, pinnedTaskIds);
        const response = await askNodeMindChat(historyToKeep, context);

        if (response.content) {
            setMessages([...historyToKeep, { role: 'assistant', content: response.content }]);
        } else {
            setError(response.error || "Something went wrong. Try again.");
        }

        setLoading(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleTaskClick = (task: Task) => {
        openDetailPanel(task.id);
        onClose();
    };

    // Determine default target list
    const determineTargetList = (chatHistory: ChatMessage[]) => {
        const allText = chatHistory.map(m => m.content.toLowerCase()).join(' ');

        // 1. Check if conversation mentions a goal -> use its list
        const activeGoals = goals.filter(g => (g as unknown as { status: string }).status === 'in_progress' || (g as unknown as { status: string }).status === 'not_started');
        for (const goal of goals) {
            if (goal.title && allText.includes(goal.title.toLowerCase())) {
                const goalTasks = tasks.filter(t => t.goalId === goal.id);
                if (goalTasks.length > 0) return goalTasks[0].listId;
            }
        }

        // 2. Check if conversation mentions a workspace/project by name
        for (const ws of workspaces) {
            if (allText.includes(ws.name.toLowerCase())) {
                const wLists = lists.filter(l => l.workspaceId === ws.id);
                if (wLists.length > 0) return wLists[0].id;
            }
        }
        for (const list of lists) {
            if (allText.includes(list.name.toLowerCase())) return list.id;
        }

        // 3. Current active view (fallback only if it's a real list)
        const coreViews = ['dashboard', 'today', 'upcoming', 'completed', 'insights'];
        if (selectedListId && !coreViews.includes(selectedListId)) {
            // make sure it's not a generic academic list ideally, but using it is fine if active
            return selectedListId;
        }

        // 4. Default inbox
        return lists[0]?.id || '';
    };

    return (
        <div className="flex flex-col h-[500px]">
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
                {messages.length === 0 ? (
                    <div className="h-full flex flex-col justify-center items-center pb-12 pt-4 px-4 sm:p-[40px_32px] gap-[20px]">
                        <div className="flex flex-col items-center">
                            <motion.div
                                initial={{ scale: 0.85 }}
                                animate={{ scale: 1 }}
                                transition={{ type: "spring", stiffness: 200, damping: 20 }}
                                className="w-12 h-12 rounded-full dark:node-mind-ai-avatar node-mind-ai-avatar-light flex items-center justify-center mb-2 shadow-lg flex-shrink-0"
                            >
                                <span className="text-xl dark:drop-shadow-none drop-shadow-[0_0_4px_rgba(255,255,255,0.6)] text-white node-mind-star-spin">✦</span>
                            </motion.div>
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.3, duration: 0.5 }}
                                className="dark:hidden text-[#9333ea] text-[13px] tracking-[0.06em] font-light"
                            >
                                Your work intelligence
                            </motion.div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-[500px] w-full mt-2">
                            <AnimatePresence>
                                {STARTER_PROMPTS.map((starter, i) => (
                                    <motion.button
                                        key={starter}
                                        initial={{ opacity: 0, y: 16 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.07, type: "spring", stiffness: 200, damping: 20 }}
                                        onClick={() => handleSend(starter)}
                                        className="dark:bg-[rgba(124,58,237,0.1)] dark:border-[rgba(124,58,237,0.25)] border border-transparent dark:text-[#c4b5fd] dark:hover:bg-[rgba(124,58,237,0.2)] dark:hover:border-[#a855f7]/50 dark:hover:text-white node-mind-chip-light px-4 py-2 rounded-full text-[13px] text-center w-full"
                                    >
                                        {starter}
                                    </motion.button>
                                ))}
                            </AnimatePresence>
                        </div>
                    </div>
                ) : (
                    <>
                        {messages.map((msg, i) => {
                            if (msg.role === 'user') {
                                return (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ duration: 0.25, ease: 'easeOut' }}
                                        className="flex ml-auto max-w-[85%] flex-row-reverse"
                                    >
                                        <div className="node-mind-user-bubble px-4 py-2.5">
                                            {msg.content}
                                        </div>
                                    </motion.div>
                                );
                            } else {
                                const { rawText, suggestions } = extractSuggestions(msg.content);

                                // Processed text words for stagger effect - disabled direct word-stagger here to keep simple Markdown render
                                // We'll just fade the whole bubble in nicely to support rich markdown easily.
                                return (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.3 }}
                                        className="flex gap-3 max-w-[95%] items-start"
                                    >
                                        <div className="w-7 h-7 rounded-full dark:node-mind-ai-avatar node-mind-ai-avatar-light flex items-center justify-center flex-shrink-0 mt-0.5">
                                            <span className="text-xs dark:drop-shadow-none drop-shadow-[0_0_2px_rgba(255,255,255,0.6)] text-white node-mind-star-spin">✦</span>
                                        </div>

                                        <div className="flex-1 min-w-0 pt-1">
                                            <MessageContent content={rawText} tasks={tasks} onTaskClick={handleTaskClick} />
                                            {suggestions && suggestions.length > 0 && (
                                                <TaskSuggestionCard
                                                    suggestions={suggestions}
                                                    workspaces={workspaces}
                                                    lists={lists}
                                                    defaultListId={determineTargetList(messages)}
                                                    onAddTasks={(selectedTasks, chosenListId) => {
                                                        // Attempt to find a matching goal by seeing if a goal title appears in conversation
                                                        let detectedGoalId: string | undefined = undefined;
                                                        const activeGoals = goals.filter(g => (g as unknown as { status: string }).status === 'in_progress' || (g as unknown as { status: string }).status === 'not_started');
                                                        const allText = messages.map(m => m.content.toLowerCase()).join(' ');
                                                        for (const goal of goals) {
                                                            if (goal.title && allText.includes(goal.title.toLowerCase())) {
                                                                detectedGoalId = goal.id;
                                                                break;
                                                            }
                                                        }

                                                        selectedTasks.forEach(st => {
                                                            addTask({
                                                                title: st.title,
                                                                status: 'todo',
                                                                priority: st.priority,
                                                                estimatedMinutes: st.estimatedMinutes,
                                                                energyTag: st.energyTag,
                                                                listId: chosenListId,
                                                                goalId: detectedGoalId,
                                                            });
                                                        });
                                                    }}
                                                />
                                            )}
                                        </div>
                                    </motion.div>
                                );
                            }
                        })}
                    </>
                )}

                {loading && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3 max-w-[85%] items-end">
                        <div className="w-7 h-7 rounded-full dark:node-mind-ai-avatar node-mind-ai-avatar-light flex items-center justify-center flex-shrink-0">
                            <span className="text-xs dark:drop-shadow-none drop-shadow-[0_0_2px_rgba(255,255,255,0.6)] text-white node-mind-star-spin">✦</span>
                        </div>
                        <div className="bg-[rgba(124,58,237,0.1)] border border-[rgba(124,58,237,0.15)] rounded-full px-4 py-2.5 flex items-center gap-2 h-9">
                            <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1.2, delay: 0 }} className="w-1.5 h-1.5 bg-[#a78bfa] rounded-full" />
                            <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1.2, delay: 0.4 }} className="w-1.5 h-1.5 bg-[#a78bfa] rounded-full" />
                            <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1.2, delay: 0.8 }} className="w-1.5 h-1.5 bg-[#a78bfa] rounded-full" />
                        </div>
                    </motion.div>
                )}

                {error && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-center">
                        <span className="text-xs text-destructive bg-destructive/10 px-3 py-1 rounded-full">{error}</span>
                    </motion.div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="relative p-4 border-t dark:border-[rgba(139,92,246,0.1)] border-transparent mb-2 mt-auto">
                <div className="absolute inset-0 block dark:hidden bg-gradient-to-t from-[rgba(237,233,254,0.8)] to-transparent pointer-events-none" />
                <div className="relative flex items-end">
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask anything about your work..."
                        className="w-full dark:bg-[rgba(255,255,255,0.04)] bg-[rgba(255,255,255,0.85)] backdrop-blur-[12px] border dark:border-[rgba(139,92,246,0.2)] border-[rgba(124,58,237,0.2)] dark:shadow-none shadow-[0_2px_12px_rgba(109,40,217,0.08),inset_0_1px_0_rgba(255,255,255,0.9)] rounded-[14px] pl-4 pr-12 py-3 text-[14px] dark:text-white text-foreground dark:placeholder-[rgba(167,139,250,0.4)] placeholder-[rgba(147,51,234,0.45)] resize-none focus:outline-none dark:focus:border-[rgba(139,92,246,0.5)] focus:border-[rgba(124,58,237,0.5)] focus:ring-[3px] dark:focus:ring-[rgba(124,58,237,0.1)] focus:ring-[rgba(124,58,237,0.12)] focus:shadow-[0_0_0_3px_rgba(124,58,237,0.12),0_4px_20px_rgba(109,40,217,0.1)] min-h-[48px] max-h-[120px] transition-all"
                        rows={1}
                        style={{ scrollbarWidth: 'none' }}
                    />
                    <button
                        onClick={() => handleSend()}
                        disabled={!input.trim() || loading}
                        className="absolute right-2 bottom-[8px] w-8 h-8 rounded-full dark:bg-gradient-to-br bg-gradient-to-br from-[#7c3aed] dark:to-[#6d28d9] to-[#9333ea] text-white flex items-center justify-center disabled:opacity-30 disabled:from-surface-3 disabled:to-surface-3 transition-all dark:hover:brightness-110 hover:shadow-[0_6px_24px_rgba(124,58,237,0.5)] hover:scale-[1.05] active:scale-[0.94] active:shadow-[0_2px_10px_rgba(124,58,237,0.2)] shadow-[0_4px_16px_rgba(124,58,237,0.35)] dark:shadow-md"
                    >
                        <CornerDownRight className="w-4 h-4 ml-0.5 dark:drop-shadow-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.2)]" />
                    </button>
                </div>
            </div>
        </div>
    );
};
