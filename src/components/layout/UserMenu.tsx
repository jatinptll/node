import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useTaskStore } from '@/store/taskStore';
import { useClassroomStore } from '@/store/classroomStore';
import { useUIStore } from '@/store/uiStore';
import { LogOut, User, Settings, Check, Bug, Lightbulb, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { ClassroomSync } from './ClassroomSync';
import { fetchUserFeedback, type FeedbackRecord } from '@/lib/feedbackDb';
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const STATUS_BADGES: Record<string, { label: string; color: string }> = {
    new: { label: 'New', color: '#3b82f6' },
    reviewing: { label: 'Reviewing', color: '#f59e0b' },
    planned: { label: 'Planned', color: '#7c3aed' },
    in_progress: { label: 'In Progress', color: '#6366f1' },
    done: { label: 'Done', color: '#22c55e' },
    wont_fix: { label: "Won't Fix", color: '#6b7280' },
    duplicate: { label: 'Duplicate', color: '#6b7280' },
};

const TYPE_ICONS: Record<string, string> = { bug: '🐛', feature: '💡', feedback: '💬' };

export const UserMenu = () => {
    const { user, signOut, updateProfile } = useAuthStore();
    const clearUserData = useTaskStore((s) => s.clearUserData);
    const clearClassroomState = useClassroomStore((s) => s.clearState);
    const { openFeedbackModal } = useUIStore();

    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [newName, setNewName] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);
    const [pastSubmissions, setPastSubmissions] = useState<FeedbackRecord[]>([]);

    if (!user) return null;

    const displayName = user.user_metadata?.custom_name || user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0];
    const avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture;

    const handleSignOut = async () => {
        try {
            clearUserData();
            clearClassroomState();
            useUIStore.getState().setHiddenListIds([]);
            await signOut();
            toast.success('Signed out successfully');
        } catch (err) {
            toast.error('Failed to sign out');
        }
    };

    const handleOpenSettings = () => {
        setNewName(displayName);
        setIsSettingsOpen(true);
        // Load past submissions
        if (user) {
            fetchUserFeedback(user.id).then(data => setPastSubmissions(data.slice(0, 3))).catch(() => { });
        }
    };

    const handleUpdateName = async () => {
        if (!newName.trim()) return;
        setIsUpdating(true);
        try {
            await updateProfile(newName.trim());
            toast.success('Name updated successfully');
            setIsSettingsOpen(false);
        } catch (err) {
            toast.error('Failed to update name');
        } finally {
            setIsUpdating(false);
        }
    };

    const handleFeedbackClick = (type: 'bug' | 'feature' | 'feedback') => {
        setIsSettingsOpen(false);
        // Small delay so the settings dialog closes first
        setTimeout(() => openFeedbackModal(type), 150);
    };

    const timeAgo = (dateStr: string) => {
        const diff = Date.now() - new Date(dateStr).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 60) return `${mins}m ago`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        return `${days}d ago`;
    };

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <button className="flex items-center sm:gap-2 sm:px-2 sm:py-1 rounded-full sm:rounded-lg sm:surface-2 hover:surface-3 transition-colors outline-none cursor-pointer">
                        {avatarUrl ? (
                            <img
                                src={avatarUrl}
                                alt={displayName}
                                className="w-8 h-8 sm:w-6 sm:h-6 rounded-full border border-border"
                                referrerPolicy="no-referrer"
                            />
                        ) : (
                            <div className="w-8 h-8 sm:w-6 sm:h-6 rounded-full bg-primary/20 flex items-center justify-center">
                                <User className="w-4 h-4 sm:w-3 sm:h-3 text-primary" />
                            </div>
                        )}
                        <span className="text-xs text-foreground font-medium hidden sm:block max-w-[120px] truncate">
                            {displayName}
                        </span>
                    </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={handleOpenSettings} className="cursor-pointer gap-2">
                        <Settings className="w-4 h-4" />
                        Settings
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:bg-destructive/10 cursor-pointer gap-2">
                        <LogOut className="w-4 h-4" />
                        Log out
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
                <DialogContent
                    className="sm:max-w-[425px]"
                    onOpenAutoFocus={(e) => {
                        if (window.innerWidth <= 768) {
                            e.preventDefault();
                        }
                    }}
                >
                    <DialogHeader>
                        <DialogTitle>Profile Settings</DialogTitle>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">
                                Display Name
                            </label>
                            <Input
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                placeholder="Enter your name"
                                className="font-mono"
                            />
                        </div>

                        <div className="border-t border-border pt-4">
                            <label className="text-sm font-medium text-foreground block mb-2">
                                Integrations
                            </label>
                            <ClassroomSync collapsed={false} />
                        </div>

                        {/* Help & Feedback Section */}
                        <div className="border-t border-border pt-4">
                            <label className="text-sm font-medium text-foreground block mb-3">
                                Help & Feedback
                            </label>
                            <div className="grid grid-cols-3 gap-2">
                                <button
                                    onClick={() => handleFeedbackClick('bug')}
                                    className="flex flex-col items-center gap-1.5 p-3 rounded-lg border border-border hover:border-primary/40 hover:bg-primary/5 transition-all"
                                >
                                    <Bug className="w-4 h-4 text-red-500" />
                                    <span className="text-[10px] font-mono text-muted-foreground">Report a bug</span>
                                </button>
                                <button
                                    onClick={() => handleFeedbackClick('feature')}
                                    className="flex flex-col items-center gap-1.5 p-3 rounded-lg border border-border hover:border-primary/40 hover:bg-primary/5 transition-all"
                                >
                                    <Lightbulb className="w-4 h-4 text-amber-500" />
                                    <span className="text-[10px] font-mono text-muted-foreground">Request feature</span>
                                </button>
                                <button
                                    onClick={() => handleFeedbackClick('feedback')}
                                    className="flex flex-col items-center gap-1.5 p-3 rounded-lg border border-border hover:border-primary/40 hover:bg-primary/5 transition-all"
                                >
                                    <MessageSquare className="w-4 h-4 text-blue-500" />
                                    <span className="text-[10px] font-mono text-muted-foreground">Send feedback</span>
                                </button>
                            </div>

                            {/* Past Submissions */}
                            {pastSubmissions.length > 0 && (
                                <div className="mt-3 space-y-1">
                                    <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-1.5">Your past submissions</p>
                                    {pastSubmissions.map((fb) => {
                                        const badge = STATUS_BADGES[fb.status || 'new'] || STATUS_BADGES.new;
                                        return (
                                            <div key={fb.id} className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-surface-2">
                                                <span className="text-xs">{TYPE_ICONS[fb.type]}</span>
                                                <span className="text-xs text-foreground truncate flex-1">{fb.title}</span>
                                                <span
                                                    className="text-[9px] font-mono font-medium px-1.5 py-0.5 rounded-full"
                                                    style={{ backgroundColor: `${badge.color}20`, color: badge.color }}
                                                >
                                                    {badge.label}
                                                </span>
                                                <span className="text-[9px] text-muted-foreground/60">{fb.created_at ? timeAgo(fb.created_at) : ''}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                    <DialogFooter className="gap-2 sm:gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setIsSettingsOpen(false)}
                            disabled={isUpdating}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleUpdateName}
                            disabled={isUpdating || !newName.trim() || newName === displayName}
                            variant="default"
                            className="gap-2"
                        >
                            {isUpdating ? 'Saving...' : (
                                <>
                                    <Check className="w-4 h-4" />
                                    Save Changes
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
};

