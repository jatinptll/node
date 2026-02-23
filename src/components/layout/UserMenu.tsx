import { useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useTaskStore } from '@/store/taskStore';
import { useClassroomStore } from '@/store/classroomStore';
import { LogOut, User, Settings, Check } from 'lucide-react';
import { toast } from 'sonner';
import { ClassroomSync } from './ClassroomSync';
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

export const UserMenu = () => {
    const { user, signOut, updateProfile } = useAuthStore();
    const clearUserData = useTaskStore((s) => s.clearUserData);
    const clearClassroomState = useClassroomStore((s) => s.clearState);

    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [newName, setNewName] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);

    if (!user) return null;

    const displayName = user.user_metadata?.custom_name || user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0];
    const avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture;

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

    const handleOpenSettings = () => {
        setNewName(displayName);
        setIsSettingsOpen(true);
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
                <DialogContent className="sm:max-w-[425px]">
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
                    </div>
                    <DialogFooter>
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
