import { useAuthStore } from '@/store/authStore';
import { useTaskStore } from '@/store/taskStore';
import { useClassroomStore } from '@/store/classroomStore';
import { useUIStore } from '@/store/uiStore';
import { LogOut, User, Settings } from 'lucide-react';
import { toast } from 'sonner';
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

export const UserMenu = () => {
    const { user, signOut } = useAuthStore();
    const clearUserData = useTaskStore((s) => s.clearUserData);
    const clearClassroomState = useClassroomStore((s) => s.clearState);
    const { openSettings } = useUIStore();

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

    return (
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
                <DropdownMenuItem onClick={openSettings} className="cursor-pointer gap-2">
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
    );
};
