import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import {
    ChevronLeft, ChevronRight, X, ExternalLink,
    Paperclip, LogOut, Menu, Filter
} from 'lucide-react';
import { cn } from '@/lib/utils';

type FeedbackStatus = 'new' | 'reviewing' | 'planned' | 'in_progress' | 'done' | 'wont_fix' | 'duplicate';
type FeedbackPriority = 'low' | 'medium' | 'high' | 'critical';
type FeedbackType = 'bug' | 'feature' | 'feedback';

interface FeedbackItem {
    id: string;
    created_at: string;
    user_id: string;
    type: FeedbackType;
    title: string;
    description: string;
    severity: string | null;
    areas: string[] | null;
    impact_rating: string | null;
    attachment_url: string | null;
    system_info: Record<string, any> | null;
    submitter_name: string | null;
    submitter_email: string | null;
    is_anonymous: boolean;
    status: FeedbackStatus;
    admin_notes: string | null;
    priority: FeedbackPriority | null;
    reviewed_at: string | null;
    resolved_at: string | null;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
    new: { label: 'New', color: '#3b82f6', bg: 'rgba(59,130,246,0.15)' },
    reviewing: { label: 'Reviewing', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
    planned: { label: 'Planned', color: '#7c3aed', bg: 'rgba(124,58,237,0.15)' },
    in_progress: { label: 'In Progress', color: '#6366f1', bg: 'rgba(99,102,241,0.15)' },
    done: { label: 'Done', color: '#22c55e', bg: 'rgba(34,197,94,0.15)' },
    wont_fix: { label: "Won't Fix", color: '#6b7280', bg: 'rgba(107,114,128,0.15)' },
    duplicate: { label: 'Duplicate', color: '#6b7280', bg: 'rgba(107,114,128,0.15)' },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
    low: { label: 'Low', color: '#22c55e' },
    medium: { label: 'Medium', color: '#f59e0b' },
    high: { label: 'High', color: '#ef4444' },
    critical: { label: 'Critical', color: '#dc2626' },
};

const SEVERITY_CONFIG: Record<string, { label: string; color: string }> = {
    low: { label: 'Low', color: '#22c55e' },
    medium: { label: 'Medium', color: '#f59e0b' },
    high: { label: 'High', color: '#ef4444' },
};

const TYPE_ICONS: Record<string, string> = { bug: '🐛', feature: '💡', feedback: '💬' };

const SORT_OPTIONS = [
    { value: 'newest', label: 'Newest first' },
    { value: 'oldest', label: 'Oldest first' },
    { value: 'severity', label: 'High severity first' },
    { value: 'updated', label: 'Most recent update' },
];

const AREA_TAGS = [
    'Tasks', 'Goals', 'Insights', 'Node Mind', 'Focus Mode', 'Calendar',
    'Kanban', 'Settings', 'Integrations', 'Daily Planning', 'Performance',
    'Design / UI', 'Mobile', 'Other',
];

function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

const ADMIN_USERNAME = import.meta.env.VITE_ADMIN_USERNAME;
const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD;
const SESSION_KEY = 'node_admin_authenticated';

const AdminLoginGate = ({ children }: { children: React.ReactNode }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [authenticated, setAuthenticated] = useState(() => {
        return sessionStorage.getItem(SESSION_KEY) === 'true';
    });

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
            sessionStorage.setItem(SESSION_KEY, 'true');
            setAuthenticated(true);
            setError('');
        } else {
            setError('Invalid username or password');
            setPassword('');
        }
    };

    if (authenticated) {
        return <>{children}</>;
    }

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            {/* Subtle background glow */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-primary/5 blur-[120px]" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                className={cn(
                    "relative w-full max-w-[380px] rounded-2xl border p-8 shadow-2xl",
                    "dark:bg-[radial-gradient(ellipse_at_top,rgba(30,20,50,0.97),rgba(10,5,20,0.98))] dark:border-[rgba(139,92,246,0.2)]",
                    "bg-[radial-gradient(ellipse_70%_50%_at_50%_30%,rgba(167,139,250,0.08),transparent_70%),linear-gradient(145deg,#faf5ff,#f3e8ff_40%,#ede9fe)] border-[rgba(124,58,237,0.18)]",
                    "dark:shadow-[0_0_40px_rgba(124,58,237,0.12)]",
                    "shadow-[0_8px_40px_rgba(109,40,217,0.1),0_2px_8px_rgba(109,40,217,0.06)]"
                )}
            >
                <div className="text-center mb-8">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#7c3aed] to-[#6d28d9] flex items-center justify-center mx-auto mb-4 shadow-lg">
                        <span className="text-white text-lg font-bold">N</span>
                    </div>
                    <h1 className="text-xl font-semibold text-foreground">Admin Access</h1>
                    <p className="text-sm text-muted-foreground mt-1">Node Feedback Dashboard</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider">Username</label>
                        <input
                            type="password"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            autoFocus
                            autoComplete="off"
                            className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all font-mono"
                            placeholder="Enter username"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            autoComplete="current-password"
                            className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all font-mono"
                            placeholder="Enter password"
                        />
                    </div>

                    {error && (
                        <motion.p
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-xs text-red-500 font-mono text-center"
                        >
                            {error}
                        </motion.p>
                    )}

                    <button
                        type="submit"
                        disabled={!username.trim() || !password.trim()}
                        className={cn(
                            "w-full py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2",
                            username.trim() && password.trim()
                                ? "bg-gradient-to-r from-[#7c3aed] to-[#6d28d9] text-white hover:shadow-[0_6px_24px_rgba(124,58,237,0.4)] hover:brightness-110 active:scale-[0.98]"
                                : "bg-muted text-muted-foreground cursor-not-allowed"
                        )}
                    >
                        Sign In
                    </button>
                </form>
            </motion.div>
        </div>
    );
};

const AdminFeedbackDashboard = () => {
    const [items, setItems] = useState<FeedbackItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [viewedIds, setViewedIds] = useState<Set<string>>(new Set());

    // Filters
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [typeFilter, setTypeFilter] = useState<Set<string>>(new Set());
    const [severityFilter, setSeverityFilter] = useState<Set<string>>(new Set());
    const [areaFilter, setAreaFilter] = useState<Set<string>>(new Set());
    const [sortBy, setSortBy] = useState('newest');

    // Mobile states
    const [showMobileFilters, setShowMobileFilters] = useState(false);

    // Admin notes auto-save
    const [notesSaved, setNotesSaved] = useState(false);

    const fetchFeedback = useCallback(async () => {
        setLoading(true);
        try {
            const { data, error } = await (supabase as any)
                .from('feedback')
                .select('*')
                .order('created_at', { ascending: false });
            if (error) throw error;
            setItems(data || []);
        } catch (err) {
            console.error('Failed to fetch feedback:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchFeedback(); }, [fetchFeedback]);

    // Mark item as viewed when selected
    useEffect(() => {
        if (selectedId) {
            setViewedIds(prev => new Set(prev).add(selectedId));
        }
    }, [selectedId]);

    // Filtered + sorted items
    const filteredItems = useMemo(() => {
        let result = [...items];

        if (statusFilter !== 'all') {
            result = result.filter(i => i.status === statusFilter);
        }
        if (typeFilter.size > 0) {
            result = result.filter(i => typeFilter.has(i.type));
        }
        if (severityFilter.size > 0) {
            result = result.filter(i => i.severity && severityFilter.has(i.severity));
        }
        if (areaFilter.size > 0) {
            result = result.filter(i => i.areas?.some(a => areaFilter.has(a)));
        }

        switch (sortBy) {
            case 'oldest':
                result.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
                break;
            case 'severity': {
                const severityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
                result.sort((a, b) => (severityOrder[a.severity || 'low'] || 2) - (severityOrder[b.severity || 'low'] || 2));
                break;
            }
            case 'updated':
                result.sort((a, b) => {
                    const aDate = a.reviewed_at || a.created_at;
                    const bDate = b.reviewed_at || b.created_at;
                    return new Date(bDate).getTime() - new Date(aDate).getTime();
                });
                break;
            default: // newest
                result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        }

        return result;
    }, [items, statusFilter, typeFilter, severityFilter, areaFilter, sortBy]);

    const selectedItem = items.find(i => i.id === selectedId) || null;
    const selectedIndex = filteredItems.findIndex(i => i.id === selectedId);

    // Stats
    const stats = useMemo(() => {
        const oneWeekAgo = Date.now() - 7 * 86400000;
        return {
            total: items.length,
            new: items.filter(i => i.status === 'new').length,
            openBugs: items.filter(i => i.type === 'bug' && ['new', 'reviewing', 'in_progress'].includes(i.status)).length,
            featuresPending: items.filter(i => i.type === 'feature' && ['new', 'reviewing', 'planned'].includes(i.status)).length,
            thisWeek: items.filter(i => new Date(i.created_at).getTime() > oneWeekAgo).length,
        };
    }, [items]);

    // Status count per status
    const statusCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        items.forEach(i => { counts[i.status] = (counts[i.status] || 0) + 1; });
        return counts;
    }, [items]);

    const toggleFilter = (set: Set<string>, value: string, setter: (s: Set<string>) => void) => {
        const next = new Set(set);
        if (next.has(value)) next.delete(value);
        else next.add(value);
        setter(next);
    };

    const clearAllFilters = () => {
        setStatusFilter('all');
        setTypeFilter(new Set());
        setSeverityFilter(new Set());
        setAreaFilter(new Set());
        setSortBy('newest');
    };

    const updateItem = async (id: string, updates: Partial<FeedbackItem>) => {
        // Auto-set timestamps
        if (updates.status === 'reviewing' && !selectedItem?.reviewed_at) {
            updates.reviewed_at = new Date().toISOString();
        }
        if ((updates.status === 'done' || updates.status === 'wont_fix') && !selectedItem?.resolved_at) {
            updates.resolved_at = new Date().toISOString();
        }

        try {
            const { error } = await (supabase as any)
                .from('feedback')
                .update(updates)
                .eq('id', id);
            if (error) throw error;
            setItems(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i));
        } catch (err) {
            console.error('Failed to update feedback:', err);
        }
    };

    const handleNotesBlur = async (id: string, notes: string) => {
        await updateItem(id, { admin_notes: notes });
        setNotesSaved(true);
        setTimeout(() => setNotesSaved(false), 2000);
    };

    const navigateItem = (direction: 'prev' | 'next') => {
        if (selectedIndex === -1) return;
        const newIdx = direction === 'prev' ? selectedIndex - 1 : selectedIndex + 1;
        if (newIdx >= 0 && newIdx < filteredItems.length) {
            setSelectedId(filteredItems[newIdx].id);
        }
    };

    const handleLogout = () => {
        sessionStorage.removeItem(SESSION_KEY);
        window.location.reload();
    };

    // Filter sidebar content (shared for desktop sidebar and mobile drawer)
    const filterContent = (
        <>
            {/* Status */}
            <div>
                <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-2">Status</p>
                <div className="space-y-0.5">
                    {[{ value: 'all', label: 'All' }, ...Object.entries(STATUS_CONFIG).map(([k, v]) => ({ value: k, label: v.label }))].map(opt => (
                        <button
                            key={opt.value}
                            onClick={() => setStatusFilter(opt.value)}
                            className={cn(
                                "w-full flex items-center justify-between px-2 py-1.5 rounded-md text-xs font-mono transition-colors",
                                statusFilter === opt.value ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-surface-2 hover:text-foreground"
                            )}
                        >
                            <span>{opt.label}</span>
                            {opt.value !== 'all' && statusCounts[opt.value] ? (
                                <span className="min-w-[20px] h-[18px] flex items-center justify-center text-[10px] bg-primary/15 text-primary rounded-full px-1">
                                    {statusCounts[opt.value]}
                                </span>
                            ) : opt.value === 'all' ? (
                                <span className="min-w-[20px] h-[18px] flex items-center justify-center text-[10px] bg-primary/15 text-primary rounded-full px-1">
                                    {items.length}
                                </span>
                            ) : null}
                        </button>
                    ))}
                </div>
            </div>

            {/* Type */}
            <div>
                <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-2">Type</p>
                <div className="space-y-0.5">
                    {(['bug', 'feature', 'feedback'] as FeedbackType[]).map(t => (
                        <button
                            key={t}
                            onClick={() => toggleFilter(typeFilter, t, setTypeFilter)}
                            className={cn(
                                "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs font-mono transition-colors",
                                typeFilter.has(t) ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-surface-2"
                            )}
                        >
                            <span>{TYPE_ICONS[t]}</span>
                            <span className="capitalize">{t === 'bug' ? 'Bugs' : t === 'feature' ? 'Features' : 'Feedback'}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Severity */}
            <div>
                <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-2">Severity</p>
                <div className="space-y-0.5">
                    {(['high', 'medium', 'low']).map(s => (
                        <button
                            key={s}
                            onClick={() => toggleFilter(severityFilter, s, setSeverityFilter)}
                            className={cn(
                                "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs font-mono transition-colors",
                                severityFilter.has(s) ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-surface-2"
                            )}
                        >
                            <span>{SEVERITY_CONFIG[s]?.label ? (['🔴', '🟡', '🟢'][['high', 'medium', 'low'].indexOf(s)]) : ''}</span>
                            <span className="capitalize">{s}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Area */}
            <div>
                <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-2">Area</p>
                <div className="flex flex-wrap gap-1">
                    {AREA_TAGS.map(a => (
                        <button
                            key={a}
                            onClick={() => toggleFilter(areaFilter, a, setAreaFilter)}
                            className={cn(
                                "px-2 py-0.5 rounded-full text-[10px] font-mono transition-all border",
                                areaFilter.has(a) ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/40"
                            )}
                        >
                            {a}
                        </button>
                    ))}
                </div>
            </div>

            {/* Sort */}
            <div>
                <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-2">Sort</p>
                <div className="space-y-0.5">
                    {SORT_OPTIONS.map(opt => (
                        <button
                            key={opt.value}
                            onClick={() => setSortBy(opt.value)}
                            className={cn(
                                "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs font-mono transition-colors",
                                sortBy === opt.value ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-surface-2"
                            )}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            </div>

            <button
                onClick={clearAllFilters}
                className="text-[10px] font-mono text-primary hover:underline transition-colors"
            >
                Clear all filters
            </button>
        </>
    );

    return (
        <div className="h-screen bg-background flex flex-col overflow-hidden">
            {/* Stats Bar */}
            <div className="flex items-center gap-3 sm:gap-6 px-3 sm:px-6 py-3 border-b border-border bg-surface-1">
                {/* Mobile filter toggle */}
                <button
                    onClick={() => setShowMobileFilters(!showMobileFilters)}
                    className="lg:hidden p-1.5 rounded-lg hover:bg-surface-2 transition-colors text-muted-foreground hover:text-foreground"
                >
                    <Filter className="w-4 h-4" />
                </button>

                <h1 className="text-base sm:text-lg font-semibold text-foreground font-mono whitespace-nowrap">Feedback Admin</h1>

                {/* Stats — hidden on mobile, visible on tablet+ */}
                <div className="hidden md:flex gap-4 ml-auto text-xs font-mono">
                    <div className="flex items-center gap-1.5">
                        <span className="text-muted-foreground">Total:</span>
                        <span className="text-foreground font-semibold">{stats.total}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="text-muted-foreground">New:</span>
                        <span className={cn("font-semibold", stats.new > 0 ? "text-blue-500" : "text-foreground")}>{stats.new}</span>
                    </div>
                    <div className="hidden lg:flex items-center gap-1.5">
                        <span className="text-muted-foreground">Bugs:</span>
                        <span className="text-foreground font-semibold">{stats.openBugs}</span>
                    </div>
                    <div className="hidden lg:flex items-center gap-1.5">
                        <span className="text-muted-foreground">Features:</span>
                        <span className="text-foreground font-semibold">{stats.featuresPending}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="text-muted-foreground">This week:</span>
                        <span className="text-foreground font-semibold">{stats.thisWeek}</span>
                    </div>
                </div>

                {/* Mobile: compact stat badge */}
                <div className="md:hidden ml-auto flex items-center gap-2 text-xs font-mono">
                    <span className="text-muted-foreground">{stats.total} items</span>
                    {stats.new > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full bg-blue-500/15 text-blue-500 text-[10px] font-semibold">
                            {stats.new} new
                        </span>
                    )}
                </div>

                <button
                    onClick={handleLogout}
                    className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg text-xs font-mono text-muted-foreground hover:text-foreground hover:bg-surface-2 transition-colors flex-shrink-0"
                    title="Sign out of admin"
                >
                    <LogOut className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Sign Out</span>
                </button>
            </div>

            <div className="flex flex-1 overflow-hidden relative">
                {/* Mobile Filter Drawer (overlay) */}
                <AnimatePresence>
                    {showMobileFilters && (
                        <>
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setShowMobileFilters(false)}
                                className="lg:hidden fixed inset-0 bg-black/40 z-30"
                            />
                            <motion.aside
                                initial={{ x: -280 }}
                                animate={{ x: 0 }}
                                exit={{ x: -280 }}
                                transition={{ duration: 0.2, ease: 'easeOut' }}
                                className="lg:hidden fixed left-0 top-0 bottom-0 w-[260px] bg-background border-r border-border z-40 overflow-y-auto p-4 space-y-5 pt-16"
                            >
                                <button
                                    onClick={() => setShowMobileFilters(false)}
                                    className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-surface-2 transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                                <p className="text-sm font-semibold text-foreground font-mono">Filters</p>
                                {filterContent}
                            </motion.aside>
                        </>
                    )}
                </AnimatePresence>

                {/* Desktop Sidebar — Filters (hidden on mobile/tablet) */}
                <aside className="hidden lg:block w-[220px] border-r border-border bg-sidebar overflow-y-auto flex-shrink-0 p-4 space-y-5">
                    {filterContent}
                </aside>

                {/* Main Content — List */}
                <div className={cn("flex-1 overflow-y-auto", selectedItem && "hidden md:block")}>
                    {loading ? (
                        <div className="flex items-center justify-center h-full">
                            <div className="text-sm text-muted-foreground font-mono">Loading feedback...</div>
                        </div>
                    ) : filteredItems.length === 0 ? (
                        <div className="flex items-center justify-center h-full p-6 text-center">
                            <div className="text-sm text-muted-foreground font-mono">No feedback items match your filters.</div>
                        </div>
                    ) : (
                        <div className="divide-y divide-border">
                            {filteredItems.map(item => {
                                const isSelected = selectedId === item.id;
                                const isNew = item.status === 'new' && !viewedIds.has(item.id);
                                const statusConf = STATUS_CONFIG[item.status];
                                const severityConf = item.severity ? SEVERITY_CONFIG[item.severity] : null;

                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => setSelectedId(item.id)}
                                        className={cn(
                                            "w-full flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-3 text-left hover:bg-surface-2 transition-colors relative",
                                            isSelected && "bg-primary/5 border-l-2 border-l-primary"
                                        )}
                                    >
                                        {/* New dot */}
                                        {isNew && (
                                            <div className="absolute left-1 sm:left-1.5 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-blue-500" />
                                        )}

                                        {/* Type */}
                                        <span className="text-sm flex-shrink-0">{TYPE_ICONS[item.type]}</span>

                                        {/* Title + areas */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                                                <span className="text-sm font-medium text-foreground truncate max-w-[150px] sm:max-w-[250px]">
                                                    {item.title.length > 60 ? `${item.title.slice(0, 60)}...` : item.title}
                                                </span>
                                                {/* Hide area tags on small screens */}
                                                {item.areas && item.areas.slice(0, 2).map(a => (
                                                    <span key={a} className="hidden sm:inline-flex text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-surface-2 text-muted-foreground flex-shrink-0">
                                                        {a}
                                                    </span>
                                                ))}
                                                {item.areas && item.areas.length > 2 && (
                                                    <span className="hidden sm:inline text-[9px] text-muted-foreground/60">+{item.areas.length - 2}</span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Severity — hidden on mobile */}
                                        {severityConf && (
                                            <span
                                                className="hidden sm:inline-flex text-[9px] font-mono font-medium px-1.5 py-0.5 rounded-full flex-shrink-0"
                                                style={{ backgroundColor: `${severityConf.color}20`, color: severityConf.color }}
                                            >
                                                {severityConf.label}
                                            </span>
                                        )}

                                        {/* Status */}
                                        <span
                                            className="text-[9px] font-mono font-medium px-1.5 py-0.5 rounded-full flex-shrink-0"
                                            style={{ backgroundColor: statusConf.bg, color: statusConf.color }}
                                        >
                                            {statusConf.label}
                                        </span>

                                        {/* Submitter — hidden on mobile */}
                                        <span className="hidden md:inline text-[10px] text-muted-foreground/60 w-[80px] truncate text-right flex-shrink-0">
                                            {item.is_anonymous ? 'Anonymous' : (item.submitter_name || 'User')}
                                        </span>

                                        {/* Time */}
                                        <span className="text-[10px] text-muted-foreground/50 w-[45px] sm:w-[60px] text-right flex-shrink-0">
                                            {timeAgo(item.created_at)}
                                        </span>

                                        {/* Attachment indicator */}
                                        {item.attachment_url && <Paperclip className="w-3 h-3 text-muted-foreground/40 flex-shrink-0 hidden sm:block" />}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Right Detail Panel — full-width overlay on mobile, sidebar on desktop */}
                <AnimatePresence>
                    {selectedItem && (
                        <motion.aside
                            initial={{ x: 380, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: 380, opacity: 0 }}
                            transition={{ duration: 0.2, ease: 'easeOut' }}
                            className="w-full md:w-[380px] absolute md:relative inset-0 md:inset-auto border-l-0 md:border-l border-border bg-background overflow-y-auto flex-shrink-0 z-20"
                        >
                            {/* Navigation */}
                            <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-surface-1">
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => navigateItem('prev')}
                                        disabled={selectedIndex <= 0}
                                        className="p-1 rounded hover:bg-surface-2 disabled:opacity-30 transition-colors"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                    </button>
                                    <span className="text-[10px] font-mono text-muted-foreground">
                                        {selectedIndex + 1} of {filteredItems.length}
                                    </span>
                                    <button
                                        onClick={() => navigateItem('next')}
                                        disabled={selectedIndex >= filteredItems.length - 1}
                                        className="p-1 rounded hover:bg-surface-2 disabled:opacity-30 transition-colors"
                                    >
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                                <button
                                    onClick={() => setSelectedId(null)}
                                    className="p-1 rounded hover:bg-surface-2 transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="p-5 space-y-5">
                                {/* Header */}
                                <div className="space-y-2">
                                    <h3 className="text-lg font-semibold text-foreground leading-tight">{selectedItem.title}</h3>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-surface-2">
                                            {TYPE_ICONS[selectedItem.type]} {selectedItem.type}
                                        </span>
                                        {selectedItem.severity && (
                                            <span
                                                className="text-xs font-mono px-2 py-0.5 rounded-full"
                                                style={{ backgroundColor: `${SEVERITY_CONFIG[selectedItem.severity]?.color}20`, color: SEVERITY_CONFIG[selectedItem.severity]?.color }}
                                            >
                                                {selectedItem.severity}
                                            </span>
                                        )}
                                    </div>

                                    <div className="text-xs text-muted-foreground space-y-0.5">
                                        <p>
                                            <span className="font-medium">Submitted by:</span>{' '}
                                            {selectedItem.is_anonymous ? 'Anonymous user' : `${selectedItem.submitter_name || 'Unknown'}${selectedItem.submitter_email ? ` (${selectedItem.submitter_email})` : ''}`}
                                        </p>
                                        <p>
                                            <span className="font-medium">Submitted:</span>{' '}
                                            {new Date(selectedItem.created_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                            {' · '}{timeAgo(selectedItem.created_at)}
                                        </p>
                                    </div>

                                    {selectedItem.areas && selectedItem.areas.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {selectedItem.areas.map(a => (
                                                <span key={a} className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-primary/10 text-primary">{a}</span>
                                            ))}
                                        </div>
                                    )}

                                    {selectedItem.impact_rating && (
                                        <p className="text-xs text-muted-foreground">
                                            <span className="font-medium">Impact:</span> {selectedItem.impact_rating}
                                        </p>
                                    )}
                                </div>

                                {/* Description */}
                                <div>
                                    <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-1.5">Description</p>
                                    <div className="text-sm text-foreground whitespace-pre-wrap bg-surface-2 rounded-lg p-3 leading-relaxed">
                                        {selectedItem.description}
                                    </div>
                                </div>

                                {/* Attachment */}
                                {selectedItem.attachment_url && (
                                    <div>
                                        <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-1.5">Attachment</p>
                                        <div className="rounded-lg border border-border overflow-hidden">
                                            <img src={selectedItem.attachment_url} alt="Attachment" className="w-full max-h-60 object-cover" />
                                            <a
                                                href={selectedItem.attachment_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-primary hover:underline"
                                            >
                                                <ExternalLink className="w-3 h-3" /> View full size
                                            </a>
                                        </div>
                                    </div>
                                )}

                                {/* System Info */}
                                {selectedItem.system_info && (
                                    <details className="group">
                                        <summary className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground transition-colors">
                                            System Info ▸
                                        </summary>
                                        <pre className="mt-1.5 text-[10px] font-mono text-muted-foreground bg-surface-2 p-3 rounded-lg overflow-x-auto">
                                            {JSON.stringify(selectedItem.system_info, null, 2)}
                                        </pre>
                                    </details>
                                )}

                                {/* Admin Actions */}
                                <div className="border-t border-border pt-4 space-y-4">
                                    <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Admin Actions</p>

                                    {/* Status */}
                                    <div className="space-y-1.5">
                                        <label className="text-xs text-muted-foreground font-mono">Status</label>
                                        <select
                                            value={selectedItem.status}
                                            onChange={(e) => updateItem(selectedItem.id, { status: e.target.value as FeedbackStatus })}
                                            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                                        >
                                            {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                                                <option key={k} value={k}>{v.label}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Priority */}
                                    <div className="space-y-1.5">
                                        <label className="text-xs text-muted-foreground font-mono">Priority</label>
                                        <div className="flex gap-1.5">
                                            {Object.entries(PRIORITY_CONFIG).map(([k, v]) => (
                                                <button
                                                    key={k}
                                                    onClick={() => updateItem(selectedItem.id, { priority: k as FeedbackPriority })}
                                                    className={cn(
                                                        "flex-1 py-1.5 rounded-lg text-[10px] font-mono font-medium transition-all border",
                                                        selectedItem.priority === k
                                                            ? "border-current shadow-sm"
                                                            : "border-transparent opacity-50 hover:opacity-80"
                                                    )}
                                                    style={{ color: v.color, backgroundColor: selectedItem.priority === k ? `${v.color}20` : 'transparent' }}
                                                >
                                                    {v.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Notes */}
                                    <div className="space-y-1.5">
                                        <div className="flex items-center justify-between">
                                            <label className="text-xs text-muted-foreground font-mono">Admin Notes</label>
                                            <AnimatePresence>
                                                {notesSaved && (
                                                    <motion.span
                                                        initial={{ opacity: 0, x: 10 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        exit={{ opacity: 0 }}
                                                        className="text-[10px] text-green-500 font-mono"
                                                    >
                                                        Saved ✓
                                                    </motion.span>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                        <textarea
                                            defaultValue={selectedItem.admin_notes || ''}
                                            onBlur={(e) => handleNotesBlur(selectedItem.id, e.target.value)}
                                            placeholder="Your notes about this item..."
                                            rows={4}
                                            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-y"
                                        />
                                    </div>
                                </div>
                            </div>
                        </motion.aside>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

const AdminFeedbackPage = () => (
    <AdminLoginGate>
        <AdminFeedbackDashboard />
    </AdminLoginGate>
);

export default AdminFeedbackPage;
