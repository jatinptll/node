import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, Loader2, Paperclip, Check } from 'lucide-react';
import { useUIStore } from '@/store/uiStore';
import { useAuthStore } from '@/store/authStore';
import { submitFeedback, uploadFeedbackAttachment } from '@/lib/feedbackDb';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type FeedbackType = 'bug' | 'feature' | 'feedback';
type Severity = 'low' | 'medium' | 'high';

const AREA_TAGS = [
    'Tasks', 'Goals', 'Insights', 'Node Mind', 'Focus Mode', 'Calendar',
    'Kanban', 'Settings', 'Integrations', 'Daily Planning', 'Performance',
    'Design / UI', 'Mobile', 'Other',
];

const RATE_LIMIT_KEY = 'node_feedback_timestamps';
const DRAFT_KEY = 'node_feedback_draft';
const MAX_PER_HOUR = 5;

const TITLES: Record<FeedbackType, string> = {
    bug: 'Report a Bug',
    feature: 'Suggest a Feature',
    feedback: 'Share Feedback',
};

const TITLE_PLACEHOLDERS: Record<FeedbackType, string> = {
    bug: 'What went wrong? Describe in one line.',
    feature: 'What would you like Node to do?',
    feedback: 'Summarise your thought in one line.',
};

const DESC_PLACEHOLDERS: Record<FeedbackType, string> = {
    bug: 'Steps to reproduce: what were you doing, what did you expect, what actually happened?',
    feature: 'Describe the problem this would solve. How would you use it? What does success look like?',
    feedback: 'Tell us anything. We read every single one of these.',
};

const SUCCESS_MESSAGES: Record<FeedbackType, string> = {
    bug: "We'll investigate and fix it.",
    feature: "We'll consider this for a future release.",
    feedback: 'Every message gets read — genuinely.',
};

const BUG_IMPACT = [
    { value: 'frustrating', emoji: '😤', label: "It's frustrating" },
    { value: 'okay', emoji: '😐', label: "It's okay" },
    { value: 'minor', emoji: '😊', label: 'Minor thing' },
];

const FEATURE_IMPACT = [
    { value: 'need', emoji: '🙏', label: 'Really need this' },
    { value: 'love', emoji: '👍', label: 'Would love it' },
    { value: 'idea', emoji: '💭', label: 'Just an idea' },
];

function isRateLimited(): boolean {
    try {
        const stored = localStorage.getItem(RATE_LIMIT_KEY);
        const timestamps: number[] = stored ? JSON.parse(stored) : [];
        const oneHourAgo = Date.now() - 3600000;
        const recent = timestamps.filter(t => t > oneHourAgo);
        return recent.length >= MAX_PER_HOUR;
    } catch { return false; }
}

function recordSubmission() {
    try {
        const stored = localStorage.getItem(RATE_LIMIT_KEY);
        const timestamps: number[] = stored ? JSON.parse(stored) : [];
        const oneHourAgo = Date.now() - 3600000;
        const recent = timestamps.filter(t => t > oneHourAgo);
        recent.push(Date.now());
        localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(recent));
    } catch { /* no-op */ }
}

interface DraftState {
    type: FeedbackType | null;
    title: string;
    description: string;
    severity: Severity;
    areas: string[];
    impactRating: string;
    includeIdentity: boolean;
    includeSystemInfo: boolean;
}

function saveDraft(draft: DraftState) {
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(draft)); } catch { /* no-op */ }
}

function loadDraft(): DraftState | null {
    try {
        const stored = localStorage.getItem(DRAFT_KEY);
        return stored ? JSON.parse(stored) : null;
    } catch { return null; }
}

function clearDraft() {
    try { localStorage.removeItem(DRAFT_KEY); } catch { /* no-op */ }
}

export const FeedbackModal = () => {
    const { feedbackModalOpen, feedbackModalType, closeFeedbackModal } = useUIStore();
    const { user } = useAuthStore();

    const [type, setType] = useState<FeedbackType | null>(feedbackModalType);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [severity, setSeverity] = useState<Severity>('medium');
    const [areas, setAreas] = useState<string[]>([]);
    const [impactRating, setImpactRating] = useState('');
    const [includeIdentity, setIncludeIdentity] = useState(true);
    const [includeSystemInfo, setIncludeSystemInfo] = useState(true);
    const [file, setFile] = useState<File | null>(null);
    const [filePreview, setFilePreview] = useState<string | null>(null);

    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
    const [draftRestoreOffer, setDraftRestoreOffer] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const autoCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Reset state when modal opens
    useEffect(() => {
        if (feedbackModalOpen) {
            setSubmitted(false);
            setSubmitError(null);
            setShowDiscardConfirm(false);

            // Check for draft
            const draft = loadDraft();
            if (draft && (draft.title || draft.description)) {
                setDraftRestoreOffer(true);
            } else {
                setDraftRestoreOffer(false);
            }

            // Set type from prop
            if (feedbackModalType) {
                setType(feedbackModalType);
            } else {
                setType(null);
            }
        }
        return () => {
            if (autoCloseTimer.current) clearTimeout(autoCloseTimer.current);
        };
    }, [feedbackModalOpen, feedbackModalType]);

    // Auto-save draft as user types
    useEffect(() => {
        if (feedbackModalOpen && !submitted && (title || description)) {
            const timer = setTimeout(() => {
                saveDraft({ type, title, description, severity, areas, impactRating, includeIdentity, includeSystemInfo });
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [type, title, description, severity, areas, impactRating, includeIdentity, includeSystemInfo, feedbackModalOpen, submitted]);

    const restoreDraft = useCallback(() => {
        const draft = loadDraft();
        if (draft) {
            setType(draft.type || feedbackModalType || null);
            setTitle(draft.title);
            setDescription(draft.description);
            setSeverity(draft.severity || 'medium');
            setAreas(draft.areas || []);
            setImpactRating(draft.impactRating || '');
            setIncludeIdentity(draft.includeIdentity !== false);
            setIncludeSystemInfo(draft.includeSystemInfo !== false);
        }
        setDraftRestoreOffer(false);
    }, [feedbackModalType]);

    const dismissDraft = useCallback(() => {
        clearDraft();
        setDraftRestoreOffer(false);
        resetForm();
    }, []);

    const resetForm = () => {
        setType(feedbackModalType || null);
        setTitle('');
        setDescription('');
        setSeverity('medium');
        setAreas([]);
        setImpactRating('');
        setIncludeIdentity(true);
        setIncludeSystemInfo(true);
        setFile(null);
        setFilePreview(null);
        setSubmitError(null);
    };

    const hasUnsavedContent = title.trim().length > 0 || description.trim().length > 0;

    const handleClose = () => {
        if (hasUnsavedContent && !submitted) {
            setShowDiscardConfirm(true);
            return;
        }
        closeFeedbackModal();
        resetForm();
    };

    const handleDiscard = () => {
        clearDraft();
        setShowDiscardConfirm(false);
        closeFeedbackModal();
        resetForm();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (!f) return;
        if (f.size > 5 * 1024 * 1024) {
            toast.error('File too large — max 5MB');
            return;
        }
        if (!['image/png', 'image/jpeg', 'image/gif', 'image/webp'].includes(f.type)) {
            toast.error('Only PNG, JPG, GIF, WebP allowed');
            return;
        }
        setFile(f);
        const reader = new FileReader();
        reader.onload = () => setFilePreview(reader.result as string);
        reader.readAsDataURL(f);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const f = e.dataTransfer.files?.[0];
        if (!f) return;
        if (f.size > 5 * 1024 * 1024) { toast.error('File too large — max 5MB'); return; }
        if (!['image/png', 'image/jpeg', 'image/gif', 'image/webp'].includes(f.type)) { toast.error('Only PNG, JPG, GIF, WebP'); return; }
        setFile(f);
        const reader = new FileReader();
        reader.onload = () => setFilePreview(reader.result as string);
        reader.readAsDataURL(f);
    };

    const toggleArea = (area: string) => {
        setAreas(prev => {
            if (prev.includes(area)) return prev.filter(a => a !== area);
            if (prev.length >= 3) return prev;
            return [...prev, area];
        });
    };

    const canSubmit = type && title.trim().length > 0 && description.trim().length >= 20 && !submitting;

    const handleSubmit = async () => {
        if (!canSubmit || !user) return;

        if (isRateLimited()) {
            setSubmitError("You've sent quite a bit of feedback — we appreciate it! Please wait a bit before sending more.");
            return;
        }

        setSubmitting(true);
        setSubmitError(null);

        try {
            const displayName = user.user_metadata?.custom_name || user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0];
            const email = user.email;

            let attachmentUrl: string | null = null;
            // Generate a temp ID for the attachment path
            const tempFeedbackId = `${Date.now()}`;

            if (file) {
                attachmentUrl = await uploadFeedbackAttachment(user.id, tempFeedbackId, file);
            }

            let systemInfo: Record<string, any> | null = null;
            if (includeSystemInfo) {
                systemInfo = {
                    userAgent: navigator.userAgent,
                    route: window.location.pathname,
                    version: import.meta.env.VITE_APP_VERSION || 'unknown',
                    timestamp: new Date().toISOString(),
                    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                };
            }

            await submitFeedback({
                user_id: user.id,
                type: type!,
                title: title.trim(),
                description: description.trim(),
                severity: type === 'bug' ? severity : null,
                areas: areas.length > 0 ? areas : undefined,
                impact_rating: impactRating || null,
                attachment_url: attachmentUrl,
                system_info: systemInfo,
                submitter_name: !includeIdentity || false ? null : (displayName || null),
                submitter_email: !includeIdentity || false ? null : (email || null),
                is_anonymous: !includeIdentity,
            });

            recordSubmission();
            clearDraft();
            setSubmitted(true);

            // Auto-close after 4 seconds
            autoCloseTimer.current = setTimeout(() => {
                closeFeedbackModal();
                resetForm();
            }, 4000);

        } catch (err: any) {
            console.error('Feedback submission failed:', err);
            setSubmitError("Something went wrong — please try again. Your text is saved.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleSubmitAnother = () => {
        if (autoCloseTimer.current) clearTimeout(autoCloseTimer.current);
        setSubmitted(false);
        resetForm();
    };

    const handleSuccessClose = () => {
        if (autoCloseTimer.current) clearTimeout(autoCloseTimer.current);
        closeFeedbackModal();
        resetForm();
    };

    if (!feedbackModalOpen) return null;

    const impactOptions = type === 'feature' ? FEATURE_IMPACT : BUG_IMPACT;

    return (
        <AnimatePresence>
            {feedbackModalOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={handleClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                        className="fixed inset-0 z-[101] flex items-center justify-center p-4"
                    >
                        <div
                            className={cn(
                                "relative w-full max-w-[560px] max-h-[90vh] overflow-y-auto rounded-2xl border shadow-2xl",
                                "dark:bg-[radial-gradient(ellipse_at_top,rgba(30,20,50,0.97),rgba(10,5,20,0.98))] dark:border-[rgba(139,92,246,0.2)]",
                                "bg-[radial-gradient(ellipse_70%_50%_at_50%_30%,rgba(167,139,250,0.08),transparent_70%),linear-gradient(145deg,#faf5ff,#f3e8ff_40%,#ede9fe)] border-[rgba(124,58,237,0.18)]",
                                "dark:shadow-[0_0_40px_rgba(124,58,237,0.12)]",
                                "shadow-[0_8px_40px_rgba(109,40,217,0.1),0_2px_8px_rgba(109,40,217,0.06),inset_0_1px_0_rgba(255,255,255,0.8)]"
                            )}
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Discard Confirmation Overlay */}
                            <AnimatePresence>
                                {showDiscardConfirm && (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 rounded-2xl backdrop-blur-sm"
                                    >
                                        <div className="bg-popover border border-border rounded-xl p-6 max-w-xs text-center space-y-4 shadow-elevation-2">
                                            <p className="text-sm text-foreground font-medium">You have unsaved feedback — discard it?</p>
                                            <div className="flex gap-3 justify-center">
                                                <button
                                                    onClick={() => setShowDiscardConfirm(false)}
                                                    className="px-4 py-2 text-xs font-mono rounded-lg border border-border hover:bg-surface-2 transition-colors"
                                                >
                                                    Keep editing
                                                </button>
                                                <button
                                                    onClick={handleDiscard}
                                                    className="px-4 py-2 text-xs font-mono rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
                                                >
                                                    Discard
                                                </button>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Draft Restore Banner */}
                            <AnimatePresence>
                                {draftRestoreOffer && !submitted && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="px-6 py-3 bg-primary/10 border-b border-primary/20 flex items-center justify-between gap-3">
                                            <span className="text-xs text-foreground">You have an unsaved draft — restore it?</span>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={dismissDraft}
                                                    className="px-3 py-1 text-[11px] font-mono rounded-md border border-border hover:bg-surface-2 transition-colors"
                                                >
                                                    Dismiss
                                                </button>
                                                <button
                                                    onClick={restoreDraft}
                                                    className="px-3 py-1 text-[11px] font-mono rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                                                >
                                                    Restore
                                                </button>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Header */}
                            <div className="flex items-center justify-between px-6 py-4 border-b dark:border-[rgba(139,92,246,0.12)] border-[rgba(124,58,237,0.12)]">
                                <h2 className="text-lg font-semibold text-foreground">
                                    {submitted ? 'Thank you' : (type ? TITLES[type] : 'Send Feedback')}
                                </h2>
                                <button
                                    onClick={handleClose}
                                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-2 transition-colors text-muted-foreground hover:text-foreground"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Content */}
                            <AnimatePresence mode="wait">
                                {submitted ? (
                                    <motion.div
                                        key="success"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0 }}
                                        className="px-6 py-12 flex flex-col items-center text-center space-y-4"
                                    >
                                        {/* Animated checkmark */}
                                        <motion.div
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
                                        >
                                            <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                                                <motion.circle
                                                    cx="32" cy="32" r="28"
                                                    stroke="#22c55e"
                                                    strokeWidth="3"
                                                    fill="none"
                                                    initial={{ pathLength: 0 }}
                                                    animate={{ pathLength: 1 }}
                                                    transition={{ duration: 0.5, delay: 0.2 }}
                                                />
                                                <motion.path
                                                    d="M20 33 L28 41 L44 25"
                                                    stroke="#22c55e"
                                                    strokeWidth="3"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    fill="none"
                                                    initial={{ pathLength: 0 }}
                                                    animate={{ pathLength: 1 }}
                                                    transition={{ duration: 0.4, delay: 0.5 }}
                                                />
                                            </svg>
                                        </motion.div>

                                        <motion.div
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ delay: 0.7 }}
                                            className="space-y-2"
                                        >
                                            <p className="text-lg font-semibold text-foreground">Received. Thank you.</p>
                                            <p className="text-sm text-muted-foreground">{type ? SUCCESS_MESSAGES[type] : ''}</p>
                                        </motion.div>

                                        <motion.div
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ delay: 0.9 }}
                                            className="flex gap-3 pt-4"
                                        >
                                            <button
                                                onClick={handleSubmitAnother}
                                                className="px-4 py-2 text-xs font-mono rounded-lg border border-border hover:bg-surface-2 transition-colors"
                                            >
                                                Submit another
                                            </button>
                                            <button
                                                onClick={handleSuccessClose}
                                                className="px-4 py-2 text-xs font-mono rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                                            >
                                                Close
                                            </button>
                                        </motion.div>
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="form"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="px-6 py-5 space-y-5"
                                    >
                                        {/* Field 1: Type Selector */}
                                        <div className="grid grid-cols-3 gap-3">
                                            {([
                                                { value: 'bug' as FeedbackType, emoji: '🐛', label: 'Bug Report' },
                                                { value: 'feature' as FeedbackType, emoji: '💡', label: 'Feature Request' },
                                                { value: 'feedback' as FeedbackType, emoji: '💬', label: 'General Feedback' },
                                            ]).map(opt => (
                                                <button
                                                    key={opt.value}
                                                    onClick={() => setType(opt.value)}
                                                    className={cn(
                                                        "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-center",
                                                        type === opt.value
                                                            ? "border-primary bg-primary/10 shadow-sm"
                                                            : "border-transparent dark:bg-white/[0.03] bg-black/[0.02] hover:border-primary/30"
                                                    )}
                                                >
                                                    <span className="text-2xl">{opt.emoji}</span>
                                                    <span className="text-xs font-medium text-foreground">{opt.label}</span>
                                                </button>
                                            ))}
                                        </div>

                                        {/* Field 2: Title */}
                                        <div className="space-y-1.5">
                                            <label className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider">Title *</label>
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    value={title}
                                                    onChange={(e) => setTitle(e.target.value.slice(0, 120))}
                                                    placeholder={type ? TITLE_PLACEHOLDERS[type] : 'Select a type above first...'}
                                                    className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
                                                    disabled={!type}
                                                />
                                                <span className={cn(
                                                    "absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono transition-colors",
                                                    title.length >= 120 ? "text-red-500" : title.length >= 100 ? "text-amber-500" : "text-muted-foreground/50"
                                                )}>
                                                    {title.length} / 120
                                                </span>
                                            </div>
                                        </div>

                                        {/* Field 3: Description */}
                                        <div className="space-y-1.5">
                                            <label className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider">Description *</label>
                                            <textarea
                                                value={description}
                                                onChange={(e) => setDescription(e.target.value)}
                                                placeholder={type ? DESC_PLACEHOLDERS[type] : ''}
                                                rows={5}
                                                className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all resize-y min-h-[120px]"
                                                disabled={!type}
                                            />
                                            {description.length > 0 && description.length < 20 && (
                                                <p className="text-[10px] text-amber-500 font-mono">Minimum 20 characters ({20 - description.length} more needed)</p>
                                            )}
                                        </div>

                                        {/* Field 4: Severity (bugs only) */}
                                        <AnimatePresence>
                                            {type === 'bug' && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    className="overflow-hidden space-y-1.5"
                                                >
                                                    <label className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider">Severity</label>
                                                    <div className="flex gap-2">
                                                        {([
                                                            { value: 'low' as Severity, emoji: '🟢', label: 'Low', hint: 'Cosmetic' },
                                                            { value: 'medium' as Severity, emoji: '🟡', label: 'Medium', hint: 'Annoying' },
                                                            { value: 'high' as Severity, emoji: '🔴', label: 'High', hint: 'Blocking' },
                                                        ]).map(s => (
                                                            <button
                                                                key={s.value}
                                                                onClick={() => setSeverity(s.value)}
                                                                className={cn(
                                                                    "flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-all",
                                                                    severity === s.value
                                                                        ? "border-primary bg-primary/10 text-foreground"
                                                                        : "border-transparent dark:bg-white/[0.03] bg-black/[0.02] text-muted-foreground hover:border-primary/30"
                                                                )}
                                                            >
                                                                <span>{s.emoji}</span>
                                                                <span>{s.label}</span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>

                                        {/* Field 5: Area Tags */}
                                        <div className="space-y-1.5">
                                            <label className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider">
                                                What area of Node is this about? <span className="opacity-50">(optional, max 3)</span>
                                            </label>
                                            <div className="flex flex-wrap gap-1.5">
                                                {AREA_TAGS.map(area => (
                                                    <button
                                                        key={area}
                                                        onClick={() => toggleArea(area)}
                                                        className={cn(
                                                            "px-2.5 py-1 rounded-full text-[11px] font-medium transition-all border",
                                                            areas.includes(area)
                                                                ? "bg-primary text-primary-foreground border-primary"
                                                                : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                                                        )}
                                                    >
                                                        {area}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Field 6: Impact Rating */}
                                        {type && (
                                            <div className="space-y-1.5">
                                                <label className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider">
                                                    How does this affect you? <span className="opacity-50">(optional)</span>
                                                </label>
                                                <div className="flex gap-2">
                                                    {impactOptions.map(opt => (
                                                        <button
                                                            key={opt.value}
                                                            onClick={() => setImpactRating(impactRating === opt.value ? '' : opt.value)}
                                                            className={cn(
                                                                "flex-1 flex flex-col items-center gap-1 px-3 py-2.5 rounded-xl border transition-all",
                                                                impactRating === opt.value
                                                                    ? "border-primary bg-primary/10"
                                                                    : "border-transparent dark:bg-white/[0.03] bg-black/[0.02] hover:border-primary/30"
                                                            )}
                                                        >
                                                            <span className="text-xl">{opt.emoji}</span>
                                                            <span className="text-[10px] text-muted-foreground font-medium">{opt.label}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Field 7: Screenshot */}
                                        <div className="space-y-1.5">
                                            <label className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider">
                                                Screenshot <span className="opacity-50">(optional)</span>
                                            </label>
                                            {file && filePreview ? (
                                                <div className="relative rounded-lg border border-border overflow-hidden bg-surface-2">
                                                    <img src={filePreview} alt="Preview" className="w-full max-h-40 object-cover" />
                                                    <button
                                                        onClick={() => { setFile(null); setFilePreview(null); }}
                                                        className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors"
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                    <div className="px-3 py-1.5 text-[10px] text-muted-foreground font-mono flex items-center gap-1.5">
                                                        <Paperclip className="w-3 h-3" />
                                                        {file.name} · {(file.size / 1024).toFixed(0)}KB
                                                    </div>
                                                </div>
                                            ) : (
                                                <div
                                                    onDragOver={(e) => e.preventDefault()}
                                                    onDrop={handleDrop}
                                                    onClick={() => fileInputRef.current?.click()}
                                                    className="border-2 border-dashed border-primary/30 rounded-lg p-6 flex flex-col items-center gap-2 cursor-pointer hover:border-primary/50 hover:bg-primary/[0.03] transition-all"
                                                >
                                                    <Upload className="w-5 h-5 text-muted-foreground" />
                                                    <span className="text-xs text-muted-foreground">Drag a screenshot here, or click to browse</span>
                                                    <span className="text-[10px] text-muted-foreground/50">PNG, JPG, GIF, WebP · Max 5MB</span>
                                                </div>
                                            )}
                                            <input
                                                ref={fileInputRef}
                                                type="file"
                                                accept="image/png,image/jpeg,image/gif,image/webp"
                                                className="hidden"
                                                onChange={handleFileChange}
                                            />
                                        </div>

                                        {/* Field 8 & 9: Checkboxes */}
                                        <div className="space-y-2">
                                            <label className="flex items-center gap-2.5 cursor-pointer group">
                                                <input
                                                    type="checkbox"
                                                    checked={includeIdentity}
                                                    onChange={() => setIncludeIdentity(!includeIdentity)}
                                                    className="rounded border-border text-primary focus:ring-primary/30 w-4 h-4"
                                                />
                                                <span className="text-xs text-foreground group-hover:text-primary transition-colors">
                                                    Include my display name and email so you can follow up with me
                                                </span>
                                            </label>
                                            <label className="flex items-center gap-2.5 cursor-pointer group">
                                                <input
                                                    type="checkbox"
                                                    checked={includeSystemInfo}
                                                    onChange={() => setIncludeSystemInfo(!includeSystemInfo)}
                                                    className="rounded border-border text-primary focus:ring-primary/30 w-4 h-4"
                                                />
                                                <span className="text-[11px] text-muted-foreground group-hover:text-foreground transition-colors">
                                                    Include app info (browser, version, current page)
                                                </span>
                                            </label>
                                        </div>

                                        {/* Submit Error */}
                                        {submitError && (
                                            <div className="px-3 py-2 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive">
                                                {submitError}
                                            </div>
                                        )}

                                        {/* Submit Button */}
                                        <button
                                            onClick={handleSubmit}
                                            disabled={!canSubmit}
                                            className={cn(
                                                "w-full py-3 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2",
                                                canSubmit
                                                    ? "bg-gradient-to-r from-[#7c3aed] to-[#6d28d9] text-white hover:shadow-[0_6px_24px_rgba(124,58,237,0.4)] hover:brightness-110 active:scale-[0.98]"
                                                    : "bg-muted text-muted-foreground cursor-not-allowed"
                                            )}
                                        >
                                            {submitting ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                    Sending...
                                                </>
                                            ) : (
                                                'Send to Node Team →'
                                            )}
                                        </button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
