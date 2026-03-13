/**
 * Settings Panel — full settings with sidebar navigation.
 * Design language matches the app's existing system:
 *   - bg-card / surface-2 / surface-3 for layering
 *   - border-border throughout (accent purple only for active states)
 *   - font-mono for labels, font-geist for body
 *   - rounded-xl cards, rounded-lg inputs, pills rounded-full
 *   - glassmorphism gradient backgrounds matching FeedbackModal / CheckInPanel
 *
 * Responsive: phone bottom-sheet → tablet centered modal → desktop sidebar
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { useClassroomStore } from '@/store/classroomStore';
import { useTheme } from 'next-themes';
import * as db from '@/lib/database';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
    Settings,
    User,
    Plug,
    Palette,
    Bell,
    X,
    Lock,
    RefreshCw,
    Loader2,
    Check,
    Clock,
    ChevronDown,
    ChevronRight,
    Sun,
    Moon,
    Monitor,
    HelpCircle,
    Unplug,
    ArrowLeft,
} from 'lucide-react';

type SettingsSection = 'general' | 'profile' | 'integrations' | 'appearance' | 'notifications';

const NAV_ITEMS: { id: SettingsSection; label: string; icon: typeof Settings }[] = [
    { id: 'general', label: 'General', icon: Settings },
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'integrations', label: 'Integrations', icon: Plug },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'notifications', label: 'Notifications', icon: Bell },
];

const getReduceAnimations = () => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches || window.innerWidth < 768;
};

export const SettingsPanel = () => {
    const { user } = useAuthStore();
    const { settingsOpen, closeSettings, openFeedbackModal } = useUIStore();
    const reduceAnimations = getReduceAnimations();

    const [activeSection, setActiveSection] = useState<SettingsSection>('general');
    const [mobileShowContent, setMobileShowContent] = useState(false);

    // Reset on open
    useEffect(() => {
        if (settingsOpen) {
            setMobileShowContent(false);
            setActiveSection('general');
        }
    }, [settingsOpen]);

    // Keyboard: Cmd+, / Escape
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === ',') {
                e.preventDefault();
                settingsOpen ? closeSettings() : useUIStore.getState().openSettings();
            }
            if (e.key === 'Escape' && settingsOpen) {
                e.preventDefault();
                if (mobileShowContent && window.innerWidth < 640) {
                    setMobileShowContent(false);
                } else {
                    closeSettings();
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [settingsOpen, closeSettings, mobileShowContent]);

    const handleSelectSection = (section: SettingsSection) => {
        setActiveSection(section);
        setMobileShowContent(true);
    };

    if (!user) return null;

    return (
        <AnimatePresence>
            {settingsOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: reduceAnimations ? 0 : 0.15 }}
                    className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm sm:p-4"
                    onClick={closeSettings}
                >
                    <motion.div
                        initial={reduceAnimations ? {} : { opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={reduceAnimations ? {} : { opacity: 0, scale: 0.95, y: 10 }}
                        transition={{ duration: reduceAnimations ? 0 : 0.2, ease: 'easeOut' }}
                        onClick={(e) => e.stopPropagation()}
                        className={cn(
                            "relative overflow-hidden",
                            // ── Glassmorphism background matching FeedbackModal/CheckInPanel ──
                            "dark:bg-[radial-gradient(ellipse_at_top,rgba(30,20,50,0.97),rgba(10,5,20,0.98))] dark:border-[rgba(139,92,246,0.2)]",
                            "bg-[radial-gradient(ellipse_70%_50%_at_50%_30%,rgba(167,139,250,0.08),transparent_70%),linear-gradient(145deg,#faf5ff,#f3e8ff_40%,#ede9fe)] border-[rgba(124,58,237,0.18)]",
                            "dark:shadow-[0_0_40px_rgba(124,58,237,0.12)]",
                            "shadow-[0_8px_40px_rgba(109,40,217,0.1),0_2px_8px_rgba(109,40,217,0.06),inset_0_1px_0_rgba(255,255,255,0.8)]",
                            "border",
                            // ── Phone: bottom sheet ──
                            "w-full h-[92vh] rounded-t-2xl",
                            // ── Tablet: centered modal ──
                            "sm:w-[95%] sm:max-w-[700px] sm:h-[80vh] sm:max-h-[600px] sm:rounded-2xl",
                            // ── Desktop: two-column ──
                            "lg:max-w-[880px] lg:h-[580px] lg:max-h-[90vh]",
                            "flex flex-col lg:flex-row"
                        )}
                    >
                        {/* Close button — matches platform pattern (w-8 h-8 rounded-lg) */}
                        <button
                            onClick={closeSettings}
                            className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-2 transition-colors text-muted-foreground hover:text-foreground"
                        >
                            <X className="w-4 h-4" />
                        </button>

                        {/* ═══ DESKTOP SIDEBAR (lg+) ═══ */}
                        <div className="hidden lg:flex flex-col w-[220px] flex-shrink-0 border-r dark:border-[rgba(139,92,246,0.12)] border-[rgba(124,58,237,0.12)] py-4">
                            <h2 className="px-5 pb-3 text-xs font-mono text-muted-foreground uppercase tracking-widest">Settings</h2>
                            <nav className="flex-1 px-2 space-y-0.5">
                                {NAV_ITEMS.map((item) => (
                                    <button
                                        key={item.id}
                                        onClick={() => handleSelectSection(item.id)}
                                        className={cn(
                                            "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-all",
                                            activeSection === item.id
                                                ? "text-primary font-medium"
                                                : "text-muted-foreground hover:bg-surface-2 hover:text-foreground"
                                        )}
                                    >
                                        <item.icon className="w-4 h-4 flex-shrink-0" />
                                        <span className="font-mono text-xs uppercase tracking-wider">{item.label}</span>
                                    </button>
                                ))}
                            </nav>
                            <div className="px-4 mt-auto pt-4 space-y-2 border-t dark:border-[rgba(139,92,246,0.08)] border-[rgba(124,58,237,0.08)]">
                                <button
                                    onClick={() => { closeSettings(); setTimeout(() => openFeedbackModal(), 150); }}
                                    className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors w-full px-1"
                                >
                                    <HelpCircle className="w-3.5 h-3.5" />
                                    <span>Help & Feedback</span>
                                </button>
                                <p className="text-[10px] text-muted-foreground/40 px-1 font-mono">v1.0.0</p>
                            </div>
                        </div>

                        {/* ═══ TABLET TAB BAR (sm–lg) ═══ */}
                        <div className="hidden sm:flex lg:hidden items-center gap-1 px-4 pt-4 pb-3 overflow-x-auto no-scrollbar border-b dark:border-[rgba(139,92,246,0.12)] border-[rgba(124,58,237,0.12)]">
                            <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest mr-3 flex-shrink-0">Settings</p>
                            {NAV_ITEMS.map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => handleSelectSection(item.id)}
                                    className={cn(
                                        "flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-mono whitespace-nowrap transition-all flex-shrink-0",
                                        activeSection === item.id
                                            ? "bg-primary/15 text-primary font-medium border border-primary/25"
                                            : "text-muted-foreground hover:bg-surface-2 hover:text-foreground border border-transparent"
                                    )}
                                >
                                    <item.icon className="w-3.5 h-3.5" />
                                    <span>{item.label}</span>
                                </button>
                            ))}
                        </div>

                        {/* ═══ PHONE: NAV LIST ↔ CONTENT (< sm) ═══ */}
                        <div className="sm:hidden flex-1 flex flex-col overflow-hidden">
                            {!mobileShowContent ? (
                                <div className="flex-1 flex flex-col">
                                    <div className="px-5 pt-5 pb-3">
                                        <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest">Settings</p>
                                    </div>
                                    <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
                                        {NAV_ITEMS.map((item) => (
                                            <button
                                                key={item.id}
                                                onClick={() => handleSelectSection(item.id)}
                                                className={cn(
                                                    "w-full flex items-center gap-4 px-4 py-3.5 rounded-xl text-sm transition-all",
                                                    "text-muted-foreground active:bg-surface-2"
                                                )}
                                            >
                                                <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 bg-surface-2">
                                                    <item.icon className="w-4 h-4 text-muted-foreground" />
                                                </div>
                                                <span className="flex-1 text-left text-foreground">{item.label}</span>
                                                <ChevronRight className="w-4 h-4 text-muted-foreground/40" />
                                            </button>
                                        ))}
                                    </nav>
                                    <div className="px-5 py-4 border-t dark:border-[rgba(139,92,246,0.08)] border-[rgba(124,58,237,0.08)] space-y-3">
                                        <button
                                            onClick={() => { closeSettings(); setTimeout(() => openFeedbackModal(), 150); }}
                                            className="flex items-center gap-3 text-sm text-muted-foreground active:text-foreground transition-colors w-full"
                                        >
                                            <HelpCircle className="w-4 h-4" />
                                            <span>Help & Feedback</span>
                                        </button>
                                        <p className="text-[10px] text-muted-foreground/40 font-mono">v1.0.0</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex-1 flex flex-col overflow-hidden">
                                    <div className="flex items-center gap-2 px-3 pt-3 pb-2 border-b dark:border-[rgba(139,92,246,0.08)] border-[rgba(124,58,237,0.08)]">
                                        <button
                                            onClick={() => setMobileShowContent(false)}
                                            className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground active:bg-surface-2 transition-colors"
                                        >
                                            <ArrowLeft className="w-5 h-5" />
                                        </button>
                                        <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
                                            {NAV_ITEMS.find(i => i.id === activeSection)?.label}
                                        </p>
                                    </div>
                                    <div className="flex-1 overflow-y-auto px-4 py-5">
                                        <SettingsContent section={activeSection} />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* ═══ CONTENT AREA (tablet + desktop) ═══ */}
                        <div className="hidden sm:flex flex-1 overflow-y-auto px-5 sm:px-6 lg:px-8 py-5 sm:py-6">
                            <div className="w-full max-w-[560px]">
                                <SettingsContent section={activeSection} />
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

// ─── Route to section ───
const SettingsContent = ({ section }: { section: SettingsSection }) => {
    switch (section) {
        case 'general': return <GeneralSection />;
        case 'profile': return <ProfileSection />;
        case 'integrations': return <IntegrationsSection />;
        case 'appearance': return <AppearanceSection />;
        case 'notifications': return <NotificationsSection />;
        default: return null;
    }
};

// ╔══════════════════════════════════╗
// ║  GENERAL                        ║
// ╚══════════════════════════════════╝
const GeneralSection = () => {
    const { user, updateProfile: updateAuthProfile } = useAuthStore();
    const [displayName, setDisplayName] = useState('');
    const [originalName, setOriginalName] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (user) {
            const name = user.user_metadata?.custom_name || user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || '';
            setDisplayName(name);
            setOriginalName(name);
        }
    }, [user]);

    const handleSaveName = async () => {
        if (!displayName.trim() || displayName === originalName) return;
        setIsSaving(true);
        try {
            await updateAuthProfile(displayName.trim());
            setOriginalName(displayName.trim());
            toast.success('✓ Saved', { description: 'Display name updated' });
        } catch {
            toast.error('Failed to update name');
        } finally {
            setIsSaving(false);
        }
    };

    const joinDate = user?.created_at ? new Date(user.created_at) : null;
    const memberSince = joinDate
        ? `Member since ${joinDate.toLocaleString('default', { month: 'long', year: 'numeric' })}`
        : '';

    return (
        <div className="space-y-5">
            {/* Display Name */}
            <div className="space-y-1.5">
                <label className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider">Display Name</label>
                <div className="flex flex-col sm:flex-row gap-2">
                    <input
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="Enter your name"
                        className="flex-1 px-3 py-2.5 rounded-lg border border-border bg-background text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
                    />
                    {displayName !== originalName && displayName.trim() && (
                        <button
                            onClick={handleSaveName}
                            disabled={isSaving}
                            className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg border border-border hover:bg-surface-2 text-sm font-mono font-medium transition-colors disabled:opacity-50"
                        >
                            {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5 text-primary" />}
                            Save
                        </button>
                    )}
                </div>
            </div>

            {/* Email */}
            <div className="space-y-1.5">
                <label className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    Email
                    <Lock className="w-3 h-3" />
                </label>
                <div className="px-3 py-2.5 rounded-lg border border-border bg-surface-2 text-sm text-muted-foreground font-mono overflow-hidden">
                    <span className="truncate block">{user?.email || '—'}</span>
                </div>
                <p className="text-[10px] text-muted-foreground/60">Managed by your sign-in provider</p>
            </div>

            {/* Member since */}
            {memberSince && (
                <p className="text-xs text-muted-foreground">{memberSince}</p>
            )}

            {/* Danger zone */}
            <div className="pt-4 border-t dark:border-[rgba(139,92,246,0.08)] border-[rgba(124,58,237,0.08)]">
                <p className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider mb-3">Danger Zone</p>
                <DangerDeleteAccount />
            </div>
        </div>
    );
};

const DangerDeleteAccount = () => {
    const [showConfirm, setShowConfirm] = useState(false);

    if (!showConfirm) {
        return (
            <button
                onClick={() => setShowConfirm(true)}
                className="text-sm text-destructive/80 hover:text-destructive transition-colors"
            >
                Delete my account
            </button>
        );
    }

    return (
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 space-y-3">
            <p className="text-sm text-foreground leading-relaxed">
                Account deletion requires contacting support. Email{' '}
                <span className="font-mono text-primary break-all">support@trynode.in</span>{' '}
                with the subject "Account Deletion Request".
            </p>
            <button
                onClick={() => setShowConfirm(false)}
                className="px-3 py-1.5 text-[11px] font-mono rounded-lg border border-border hover:bg-surface-2 transition-colors"
            >
                Cancel
            </button>
        </div>
    );
};

// ╔══════════════════════════════════╗
// ║  PROFILE                        ║
// ╚══════════════════════════════════╝
const ProfileSection = () => {
    const { user, updateProfile: updateAuthProfile } = useAuthStore();
    const [displayName, setDisplayName] = useState('');
    const [originalName, setOriginalName] = useState('');
    const [bio, setBio] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (user) {
            const name = user.user_metadata?.custom_name || user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || '';
            setDisplayName(name);
            setOriginalName(name);
            db.fetchProfile(user.id).then((data) => {
                if (data) setBio(data.bio || '');
            }).catch(console.error);
        }
    }, [user]);

    const handleSaveName = async () => {
        if (!displayName.trim() || displayName === originalName) return;
        setIsSaving(true);
        try {
            await updateAuthProfile(displayName.trim());
            setOriginalName(displayName.trim());
            toast.success('✓ Saved', { description: 'Display name updated' });
        } catch {
            toast.error('Failed to update name');
        } finally {
            setIsSaving(false);
        }
    };

    const handleBioBlur = async () => {
        if (!user) return;
        try {
            await db.updateProfile(user.id, { bio: bio || null });
        } catch {
            toast.error('Failed to save bio');
        }
    };

    const handleAvatarClick = () => {
        toast.info('Coming soon', { description: 'Avatar upload will be available in a future update.' });
    };

    const avatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture;

    return (
        <div className="space-y-5">
            {/* Avatar — centered on phone, row on tablet/desktop */}
            <div className="flex flex-col items-center sm:flex-row sm:items-center gap-4">
                <div className="relative group cursor-pointer" onClick={handleAvatarClick}>
                    {avatarUrl ? (
                        <img
                            src={avatarUrl}
                            alt="Avatar"
                            className="w-20 h-20 rounded-full border-2 border-border object-cover"
                            referrerPolicy="no-referrer"
                        />
                    ) : (
                        <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center border-2 border-border">
                            <User className="w-8 h-8 text-primary" />
                        </div>
                    )}
                    <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 active:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="text-white text-xs font-medium">Edit</span>
                    </div>
                </div>
                <div className="text-center sm:text-left">
                    <p className="text-sm font-medium text-foreground">{displayName}</p>
                    <p className="text-xs text-muted-foreground truncate max-w-[200px]">{user?.email}</p>
                </div>
            </div>

            {/* Display Name */}
            <div className="space-y-1.5">
                <label className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider">Display Name</label>
                <div className="flex flex-col sm:flex-row gap-2">
                    <input
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="Enter your name"
                        className="flex-1 px-3 py-2.5 rounded-lg border border-border bg-background text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
                    />
                    {displayName !== originalName && displayName.trim() && (
                        <button
                            onClick={handleSaveName}
                            disabled={isSaving}
                            className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg border border-border hover:bg-surface-2 text-sm font-mono font-medium transition-colors disabled:opacity-50"
                        >
                            {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5 text-primary" />}
                            Save
                        </button>
                    )}
                </div>
            </div>

            {/* Bio */}
            <div className="space-y-1.5">
                <label className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider">
                    Bio <span className="opacity-50">(optional)</span>
                </label>
                <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value.slice(0, 160))}
                    onBlur={handleBioBlur}
                    rows={3}
                    maxLength={160}
                    placeholder="One line about what you're working toward"
                    className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm text-foreground placeholder-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
                />
                <p className="text-[10px] text-muted-foreground/50 text-right font-mono">{bio.length}/160</p>
            </div>
        </div>
    );
};

// ╔══════════════════════════════════╗
// ║  INTEGRATIONS                   ║
// ╚══════════════════════════════════╝
const IntegrationsSection = () => {
    const { user } = useAuthStore();
    const {
        isConnected, isSyncing, lastSyncAt, syncedCourses, syncNow, disconnectClassroom,
    } = useClassroomStore();

    const [showCourses, setShowCourses] = useState(false);
    const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);
    const [connectedEmail, setConnectedEmail] = useState<string | null>(null);

    useEffect(() => {
        const email = localStorage.getItem('node_classroom_email');
        setConnectedEmail(email);
        if (user) {
            db.fetchProfile(user.id).then((profile) => {
                if (profile?.classroom_account_email) setConnectedEmail(profile.classroom_account_email);
            }).catch(console.error);
        }
    }, [user, isConnected]);

    const handleSync = async () => {
        try {
            const result = await syncNow();
            const email = localStorage.getItem('node_classroom_email');
            setConnectedEmail(email);
            if (result.newTasks > 0 || result.updatedCourses > 0 || result.removedCourses > 0) {
                const parts: string[] = [];
                if (result.newTasks > 0) parts.push(`${result.newTasks} new task${result.newTasks !== 1 ? 's' : ''}`);
                if (result.updatedCourses > 0) parts.push(`${result.updatedCourses} course${result.updatedCourses !== 1 ? 's' : ''} added`);
                if (result.removedCourses > 0) parts.push(`${result.removedCourses} course${result.removedCourses !== 1 ? 's' : ''} removed`);
                toast.success('Sync complete!', { description: parts.join(', ') });
            } else {
                toast.info('Everything is up to date');
            }
        } catch (err) {
            toast.error('Sync failed', { description: err instanceof Error ? err.message : 'Please try again.' });
        }
    };

    const handleDisconnect = async () => {
        await disconnectClassroom();
        if (user) db.updateClassroomConnection(user.id, null, null).catch(console.error);
        setConnectedEmail(null);
        setShowDisconnectConfirm(false);
        toast.success('Classroom disconnected', { description: 'Your existing tasks have been kept.' });
    };

    const formatLastSync = () => {
        if (!lastSyncAt) return null;
        const date = new Date(lastSyncAt);
        const isToday = date.toDateString() === new Date().toDateString();
        if (isToday) return `Today at ${date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
        return date.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    };

    return (
        <div className="space-y-5">
            {/* Google Classroom — card using platform styling */}
            <div className="rounded-xl border border-border p-4 space-y-4">
                {/* Header row */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-[#1a73e8]/10 flex items-center justify-center flex-shrink-0">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                <rect width="24" height="24" rx="4" fill="#1a73e8" fillOpacity="0.15" />
                                <path d="M12 12c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3 1.34 3 3 3zm0 1.5c-2 0-6 1-6 3V18h12v-1.5c0-2-4-3-6-3z" fill="#1a73e8" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-foreground">Google Classroom</p>
                            <p className="text-[10px] text-muted-foreground/60 hidden sm:block">Import assignments and coursework</p>
                        </div>
                    </div>
                    {/* Status pill matching sidebar count badges */}
                    <span className={cn(
                        "min-w-[22px] h-[22px] flex items-center justify-center gap-1.5 text-[11px] px-2.5 rounded-full font-mono",
                        isConnected
                            ? "bg-[hsl(var(--success))]/15 text-[hsl(var(--success))]"
                            : "bg-primary/20 text-muted-foreground"
                    )}>
                        <span className={cn("w-1.5 h-1.5 rounded-full", isConnected ? "bg-[hsl(var(--success))]" : "bg-muted-foreground")} />
                        {isConnected ? 'Connected' : 'Not connected'}
                    </span>
                </div>

                {isConnected ? (
                    <div className="space-y-3 sm:pl-[52px]">
                        {connectedEmail && (
                            <p className="text-[10px] text-muted-foreground font-mono">
                                {connectedEmail}
                            </p>
                        )}
                        {lastSyncAt && (
                            <p className="text-[10px] text-muted-foreground">Last synced: {formatLastSync()}</p>
                        )}

                        {/* Courses — collapsible */}
                        {syncedCourses.length > 0 && (
                            <div>
                                <button
                                    onClick={() => setShowCourses(!showCourses)}
                                    className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors py-1"
                                >
                                    {showCourses ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                                    {syncedCourses.length} course{syncedCourses.length !== 1 ? 's' : ''} synced
                                </button>
                                <AnimatePresence>
                                    {showCourses && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="overflow-hidden"
                                        >
                                            <div className="pl-4 mt-1.5 space-y-1.5">
                                                {syncedCourses.map((course) => (
                                                    <p key={course.id} className="text-[11px] text-muted-foreground truncate">{course.name}</p>
                                                ))}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        )}

                        {/* Action buttons — stack on phone */}
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
                            <button
                                onClick={handleSync}
                                disabled={isSyncing}
                                className="flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-mono font-medium hover:bg-primary/20 active:bg-primary/25 transition-colors disabled:opacity-50"
                            >
                                {isSyncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                                {isSyncing ? 'Syncing...' : 'Sync Now'}
                            </button>

                            {!showDisconnectConfirm ? (
                                <button
                                    onClick={() => setShowDisconnectConfirm(true)}
                                    className="flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 rounded-lg text-xs font-mono text-destructive/80 hover:text-destructive hover:bg-destructive/10 active:bg-destructive/15 transition-colors"
                                >
                                    <Unplug className="w-3.5 h-3.5" />
                                    Disconnect
                                </button>
                            ) : (
                                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                                    <span className="text-[11px] text-muted-foreground text-center sm:text-left">Disconnect? Tasks will remain.</span>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={handleDisconnect}
                                            className="flex-1 sm:flex-none px-3 py-2 sm:py-1 text-[11px] font-mono text-destructive bg-destructive/10 hover:bg-destructive/20 rounded-lg transition-colors font-medium"
                                        >
                                            Confirm
                                        </button>
                                        <button
                                            onClick={() => setShowDisconnectConfirm(false)}
                                            className="flex-1 sm:flex-none px-3 py-2 sm:py-1 text-[11px] font-mono text-muted-foreground hover:text-foreground border border-border hover:bg-surface-2 rounded-lg transition-colors"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="sm:pl-[52px] space-y-3">
                        <p className="text-xs text-muted-foreground">
                            Import assignments and coursework directly into Node. Stays in sync automatically.
                        </p>
                        <button
                            onClick={handleSync}
                            disabled={isSyncing}
                            className={cn(
                                "w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 sm:py-2.5 rounded-xl text-sm font-mono font-medium transition-all",
                                "bg-gradient-to-r from-[#7c3aed] to-[#6d28d9] text-white hover:shadow-[0_6px_24px_rgba(124,58,237,0.4)] hover:brightness-110 active:scale-[0.98]",
                                "disabled:opacity-50"
                            )}
                        >
                            {isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                            {isSyncing ? 'Connecting...' : 'Connect Google Classroom →'}
                        </button>
                    </div>
                )}
            </div>

            {/* Future integrations */}
            <div className="rounded-xl border border-border p-4">
                <p className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider mb-3">Coming soon</p>
                <div className="flex flex-wrap items-center gap-2">
                    {['Notion', 'GitHub', 'Linear'].map((name) => (
                        <span key={name} className="px-2.5 py-1 rounded-full text-[11px] font-medium border border-border text-muted-foreground/40">
                            {name}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
};

// ╔══════════════════════════════════╗
// ║  APPEARANCE                     ║
// ╚══════════════════════════════════╝
const AppearanceSection = () => {
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => { setMounted(true); }, []);

    const themes = [
        { id: 'light', label: 'Light', icon: Sun, preview: 'bg-white border-gray-200' },
        { id: 'dark', label: 'Dark', icon: Moon, preview: 'bg-gray-900 border-gray-700' },
        { id: 'system', label: 'System', icon: Monitor, preview: 'bg-gradient-to-br from-white to-gray-900 border-gray-400' },
    ];

    return (
        <div className="space-y-5">
            {/* Theme — selection cards matching FeedbackModal type selector */}
            <div className="space-y-1.5">
                <label className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider">Theme</label>
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                    {themes.map((t) => (
                        <button
                            key={t.id}
                            onClick={() => setTheme(t.id)}
                            className={cn(
                                "flex flex-col items-center gap-2 p-3 sm:p-4 rounded-xl border-2 transition-all active:scale-[0.97]",
                                mounted && theme === t.id
                                    ? "border-primary bg-primary/10 shadow-sm"
                                    : "border-transparent dark:bg-white/[0.03] bg-black/[0.02] hover:border-primary/30"
                            )}
                        >
                            <div className={cn("w-full h-10 sm:h-12 rounded-md border", t.preview)} />
                            <div className="flex items-center gap-1 sm:gap-1.5">
                                <t.icon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                <span className="text-[11px] font-medium text-foreground">{t.label}</span>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Sidebar position — disabled */}
            <div className="space-y-1.5 opacity-40 pointer-events-none">
                <label className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    Sidebar Position
                    <span className="text-[10px] font-mono text-muted-foreground bg-surface-2 px-1.5 py-0.5 rounded">Coming soon</span>
                </label>
                <div className="flex gap-2">
                    {['Left', 'Right'].map((pos) => (
                        <div key={pos} className="flex-1 p-3 text-center rounded-lg border border-border text-sm text-muted-foreground dark:bg-white/[0.03] bg-black/[0.02]">
                            {pos}
                        </div>
                    ))}
                </div>
            </div>

            {/* Compact mode — disabled */}
            <div className="space-y-1.5 opacity-40 pointer-events-none">
                <label className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    Compact Mode
                    <span className="text-[10px] font-mono text-muted-foreground bg-surface-2 px-1.5 py-0.5 rounded">Coming soon</span>
                </label>
                <div className="flex items-center gap-2">
                    <div className="w-10 h-6 rounded-full bg-surface-2" />
                    <span className="text-xs text-muted-foreground">Reduces task row padding</span>
                </div>
            </div>
        </div>
    );
};

// ╔══════════════════════════════════╗
// ║  NOTIFICATIONS                  ║
// ╚══════════════════════════════════╝
const NotificationsSection = () => {
    const { user } = useAuthStore();
    const [dailyReminder, setDailyReminder] = useState(false);
    const [reminderTime, setReminderTime] = useState('09:00');
    const [weeklyDigest, setWeeklyDigest] = useState(false);

    useEffect(() => {
        if (user) {
            db.fetchProfile(user.id).then((profile) => {
                if (profile?.preferences) {
                    const prefs = profile.preferences;
                    if (prefs.daily_reminder !== undefined) setDailyReminder(prefs.daily_reminder);
                    if (prefs.reminder_time) setReminderTime(prefs.reminder_time);
                    if (prefs.weekly_digest !== undefined) setWeeklyDigest(prefs.weekly_digest);
                }
            }).catch(console.error);
        }
    }, [user]);

    const savePreferences = useCallback(async (updates: Record<string, any>) => {
        if (!user) return;
        try {
            const profile = await db.fetchProfile(user.id);
            const currentPrefs = profile?.preferences || {};
            await db.updateProfile(user.id, { preferences: { ...currentPrefs, ...updates } });
        } catch {
            toast.error('Failed to save preferences');
        }
    }, [user]);

    const handleDailyReminderToggle = () => {
        const next = !dailyReminder;
        setDailyReminder(next);
        savePreferences({ daily_reminder: next });
    };

    const handleReminderTimeChange = (time: string) => {
        setReminderTime(time);
        savePreferences({ reminder_time: time });
    };

    const handleWeeklyDigestToggle = () => {
        const next = !weeklyDigest;
        setWeeklyDigest(next);
        savePreferences({ weekly_digest: next });
    };

    return (
        <div className="space-y-5">
            {/* Daily planning reminder */}
            <div className="flex items-start justify-between gap-3 p-4 rounded-xl border border-border">
                <div className="space-y-1.5 min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">Daily planning reminder</p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                        Remind me to plan my day at{' '}
                        <TimePicker
                            value={reminderTime}
                            onChange={handleReminderTimeChange}
                            disabled={!dailyReminder}
                        />
                    </p>
                </div>
                <ToggleSwitch checked={dailyReminder} onChange={handleDailyReminderToggle} />
            </div>

            {/* Weekly insights */}
            <div className="flex items-start justify-between gap-3 p-4 rounded-xl border border-border">
                <div className="space-y-1.5 min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">Weekly insights digest</p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                        Weekly summary of your productivity patterns every Sunday
                    </p>
                </div>
                <ToggleSwitch checked={weeklyDigest} onChange={handleWeeklyDigestToggle} />
            </div>

            <p className="text-[10px] text-muted-foreground/40 italic font-mono">
                Email notification delivery is coming in a future update.
            </p>
        </div>
    );
};

// ─── Time Picker (custom dropdown with scrollable list) ───
const TIME_SLOTS: string[] = [];
for (let h = 5; h < 23; h++) {
    for (let m = 0; m < 60; m += 30) {
        TIME_SLOTS.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
}

const formatTime = (raw: string) =>
    new Date(`2000-01-01T${raw}`).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

const TimePicker = ({ value, onChange, disabled }: { value: string; onChange: (t: string) => void; disabled?: boolean }) => {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    // Close on outside click
    useEffect(() => {
        if (!open) return;
        const handle = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handle);
        return () => document.removeEventListener('mousedown', handle);
    }, [open]);

    // Auto-scroll to selected time on open
    useEffect(() => {
        if (open && listRef.current) {
            const selected = listRef.current.querySelector('[data-selected="true"]');
            if (selected) selected.scrollIntoView({ block: 'center' });
        }
    }, [open]);

    return (
        <div className="relative inline-block" ref={ref}>
            <button
                onClick={() => !disabled && setOpen(!open)}
                disabled={disabled}
                className={cn(
                    "inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-surface-2 border border-border text-foreground text-[11px] font-mono transition-colors",
                    disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer hover:bg-surface-3"
                )}
            >
                <Clock className="w-3 h-3 text-muted-foreground" />
                {formatTime(value)}
                <ChevronDown className={cn("w-3 h-3 text-muted-foreground transition-transform", open && "rotate-180")} />
            </button>

            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.12 }}
                        ref={listRef}
                        className="absolute left-0 top-full mt-1 z-50 w-32 max-h-48 overflow-y-auto rounded-lg border border-border bg-popover shadow-elevation-2 py-1 no-scrollbar"
                    >
                        {TIME_SLOTS.map((t) => (
                            <button
                                key={t}
                                data-selected={t === value}
                                onClick={() => { onChange(t); setOpen(false); }}
                                className={cn(
                                    "w-full px-3 py-1.5 text-left text-[11px] font-mono transition-colors",
                                    t === value
                                        ? "bg-primary/15 text-primary font-medium"
                                        : "text-popover-foreground hover:bg-surface-2"
                                )}
                            >
                                {formatTime(t)}
                            </button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// ─── Toggle ───
const ToggleSwitch = ({ checked, onChange }: { checked: boolean; onChange: () => void }) => (
    <button
        onClick={onChange}
        className={cn(
            "relative w-11 h-6 rounded-full transition-colors flex-shrink-0",
            checked ? "bg-primary" : "bg-surface-3"
        )}
    >
        <div
            className={cn(
                "absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform",
                checked ? "translate-x-[22px]" : "translate-x-0.5"
            )}
        />
    </button>
);

export default SettingsPanel;
