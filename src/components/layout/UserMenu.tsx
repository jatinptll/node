import { useAuthStore } from '@/store/authStore';
import { useTaskStore } from '@/store/taskStore';
import { useClassroomStore } from '@/store/classroomStore';
import { LogOut, User } from 'lucide-react';
import { toast } from 'sonner';

export const UserMenu = () => {
    const { user, signOut } = useAuthStore();
    const clearUserData = useTaskStore((s) => s.clearUserData);
    const clearClassroomState = useClassroomStore((s) => s.clearState);

    if (!user) return null;

    const displayName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0];
    const avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture;
    const email = user.email;

    const handleSignOut = async () => {
        try {
            clearUserData();
            clearClassroomState();
            await signOut();
            toast.success('Signed out successfully');
        } catch (err) {
            toast.error('Failed to sign out');
        }
    };

    return (
        <div className="flex items-center gap-2">
            {/* User info */}
            <div className="flex items-center gap-2 px-2 py-1 rounded-lg surface-2">
                {avatarUrl ? (
                    <img
                        src={avatarUrl}
                        alt={displayName}
                        className="w-6 h-6 rounded-full border border-border"
                        referrerPolicy="no-referrer"
                    />
                ) : (
                    <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                        <User className="w-3 h-3 text-primary" />
                    </div>
                )}
                <span className="text-xs text-foreground font-medium hidden sm:block max-w-[120px] truncate">
                    {displayName}
                </span>
            </div>

            {/* Sign out button */}
            <button
                onClick={handleSignOut}
                className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:surface-3 transition-colors"
                title="Sign out"
            >
                <LogOut className="w-4 h-4" />
            </button>
        </div>
    );
};
