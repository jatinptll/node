/**
 * AskNodeMind — Chat interface for Node Mind.
 */
import { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useTaskStore } from '@/store/taskStore';
import { useUIStore } from '@/store/uiStore';
import { askNodeMindChat, buildNodeContext, type ChatMessage } from '@/lib/nodeMind';
import { cn } from '@/lib/utils';
import type { Task } from '@/types/task';

// Extract actual tasks referenced in the message to make them clickable
const MessageContent = ({ content, tasks, onTaskClick }: { content: string; tasks: Task[]; onTaskClick: (task: Task) => void }) => {
    // 1. Sort tasks by title length descending to avoid partial matches
    const sortedTasks = useMemo(() => {
        return [...tasks].sort((a, b) => b.title.length - a.title.length);
    }, [tasks]);

    // 2. Pre-process the content: replace exact task title matches with custom markdown links
    const processedContent = useMemo(() => {
        let text = content;
        sortedTasks.forEach(task => {
            if (!task.title || task.title.trim().length < 3) return; // ignore very short titles to prevent false positives

            // Escape special regex characters in the title
            const escapedTitle = task.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

            // Create a regex to match the title (case insensitive, bounded by word boundaries or punctuation)
            // Using a simpler approach since JS regex doesn't support lookbehinds fully in all environments.
            // Just matching the title within quotes, bold, or plain text.
            const regex = new RegExp(`(?<!\\[)(${escapedTitle})(?!\\]\\(task:\\/\\/)`, 'gi');

            text = text.replace(regex, (match) => {
                // If it's already inside a link, this negative lookbehind/lookahead tries to avoid double-processing,
                // but for simplicity we convert to a markdown link with a custom protocol.
                return `[${match}](task://${task.id})`;
            });
        });
        return text;
    }, [content, sortedTasks]);

    return (
        <div className="prose prose-sm dark:prose-invert max-w-none font-sans leading-relaxed
                        prose-p:my-1 prose-ul:my-1 prose-li:my-0.5 prose-strong:text-foreground
                        prose-a:text-primary prose-a:no-underline hover:prose-a:underline">
            <ReactMarkdown
                components={{
                    a: ({ node, ...props }) => {
                        const href = props.href || '';
                        if (href.startsWith('task://')) {
                            const taskId = href.replace('task://', '');
                            const task = tasks.find(t => t.id === taskId);
                            return (
                                <a
                                    className="cursor-pointer font-medium text-primary hover:underline group inline-flex items-center gap-1"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        if (task) onTaskClick(task);
                                    }}
                                >
                                    {props.children}
                                </a>
                            );
                        }
                        // Normal links
                        return <a {...props} className="cursor-pointer font-medium" target="_blank" rel="noopener noreferrer" />
                    }
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
    "What can I finish before end of day?",
];

export const AskNodeMind = ({ onClose }: { onClose: () => void }) => {
    const { tasks, goals, lists, workspaces } = useTaskStore();
    const { openDetailPanel, dailyPlanTaskIds } = useUIStore();

    // Instead of depending in morningPlanPersisted, let's just use what tasks have 'isPinned' or similar. 
    // Not strictly necessary to pass pinnedIds if they don't explicitly exist in store right now. Let's send []
    const pinnedTaskIds: string[] = dailyPlanTaskIds || [];

    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Dynamic starters based on context
    const dynamicStarters = useMemo(() => {
        const todayStr = new Date().toISOString().split('T')[0];
        const hasOverdue = tasks.some(t => t.dueDate && t.dueDate < todayStr && !t.isCompleted);
        const hour = new Date().getHours();
        const isAfternoon = hour >= 13 && hour <= 17;

        const starters = ["What should I focus on right now?"];
        if (hasOverdue) starters.push("What's most overdue right now?");
        starters.push("Which goal needs attention?");
        if (isAfternoon) starters.push("What can I finish before end of day?");

        return starters.slice(0, 4);
    }, [tasks]);

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

        // Cap history to 8 exchanges (16 messages) 
        // Note: newMessages includes the message just added. 
        // So we keep up to the last 15 + new user message = 16 messages
        const historyToKeep = newMessages.length > 16 ? newMessages.slice(newMessages.length - 16) : newMessages;

        setMessages(historyToKeep);

        const context = buildNodeContext(tasks, goals, lists, workspaces, pinnedTaskIds);

        const response = await askNodeMindChat(historyToKeep, context);

        if (response.content) {
            setMessages(prev => [...prev, { role: 'assistant', content: response.content }]);
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

    return (
        <div className="flex flex-col h-[450px]">
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
                {messages.length === 0 ? (
                    <div className="h-full flex flex-col justify-end pb-4">
                        <div className="flex flex-wrap gap-2 justify-end">
                            {dynamicStarters.map(starter => (
                                <button
                                    key={starter}
                                    onClick={() => handleSend(starter)}
                                    className="bg-surface-2 border border-border text-xs text-muted-foreground hover:text-foreground hover:border-primary/30 px-3 py-1.5 rounded-full transition-colors text-left"
                                >
                                    {starter}
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    <>
                        {messages.map((msg, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={cn(
                                    "flex gap-3 max-w-[90%]",
                                    msg.role === 'user' ? "ml-auto flex-row-reverse" : ""
                                )}
                            >
                                {msg.role === 'assistant' && (
                                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-500/20 to-purple-500/20 border border-border flex items-center justify-center flex-shrink-0 mt-0.5">
                                        <span className="text-[10px] text-amber-500 leading-none">✦</span>
                                    </div>
                                )}

                                <div className={cn(
                                    "rounded-2xl px-4 py-2.5",
                                    msg.role === 'user'
                                        ? "bg-primary text-primary-foreground"
                                        : "bg-surface-2 border border-border text-foreground"
                                )}>
                                    {msg.role === 'user' ? (
                                        <p className="text-sm">{msg.content}</p>
                                    ) : (
                                        <MessageContent content={msg.content} tasks={tasks} onTaskClick={handleTaskClick} />
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </>
                )}

                {loading && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3 max-w-[85%]">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-500/20 to-purple-500/20 border border-border flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span className="text-[10px] text-amber-500 leading-none mb-[1px]">✦</span>
                        </div>
                        <div className="bg-surface-2 border border-border rounded-2xl px-4 py-3 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                            <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
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
            <div className="p-4 bg-background border-t border-border">
                <div className="relative flex items-end">
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask anything"
                        className="w-full bg-surface-2 border border-border rounded-xl pl-4 pr-12 py-3 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary/50 min-h-[44px] max-h-[120px]"
                        rows={1}
                    />
                    <button
                        onClick={() => handleSend()}
                        disabled={!input.trim() || loading}
                        className="absolute right-2 bottom-2 p-1.5 rounded-lg text-primary disabled:opacity-30 disabled:hover:bg-transparent hover:bg-primary/10 transition-colors"
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};
