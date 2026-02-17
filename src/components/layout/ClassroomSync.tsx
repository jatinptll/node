import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useClassroomStore } from '@/store/classroomStore';
import {
    BookOpen,
    RefreshCw,
    Loader2,
    CheckCircle2,
    AlertCircle,
    ChevronDown,
    ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export const ClassroomSync = ({ collapsed }: { collapsed: boolean }) => {
    const {
        isConnected,
        isSyncing,
        lastSyncAt,
        syncError,
        syncedCourses,
        syncNow,
    } = useClassroomStore();

    const [showCourses, setShowCourses] = useState(false);

    const handleSync = async () => {
        try {
            const result = await syncNow();
            if (result.newTasks > 0 || result.updatedCourses > 0) {
                toast.success(`Sync complete!`, {
                    description: `${result.newTasks} new task${result.newTasks !== 1 ? 's' : ''} imported${result.updatedCourses > 0
                            ? `, ${result.updatedCourses} new course${result.updatedCourses !== 1 ? 's' : ''} added`
                            : ''
                        }.`,
                });
            } else {
                toast.info('Everything is up to date', {
                    description: 'No new assignments found.',
                });
            }
        } catch (err) {
            toast.error('Sync failed', {
                description: err instanceof Error ? err.message : 'Please try again.',
            });
        }
    };

    const formatLastSync = () => {
        if (!lastSyncAt) return null;
        const date = new Date(lastSyncAt);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMin = Math.floor(diffMs / 60000);

        if (diffMin < 1) return 'Just now';
        if (diffMin < 60) return `${diffMin}m ago`;
        const diffHr = Math.floor(diffMin / 60);
        if (diffHr < 24) return `${diffHr}h ago`;
        return date.toLocaleDateString();
    };

    // Collapsed view - just an icon
    if (collapsed) {
        return (
            <div className="px-2 py-1">
                <button
                    onClick={handleSync}
                    disabled={isSyncing}
                    className={cn(
                        'w-full flex items-center justify-center p-2 rounded-md transition-colors',
                        isConnected
                            ? 'text-emerald-400 hover:surface-3'
                            : 'text-muted-foreground hover:surface-3 hover:text-foreground'
                    )}
                    title="Sync Google Classroom"
                >
                    {isSyncing ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <BookOpen className="w-4 h-4" />
                    )}
                </button>
            </div>
        );
    }

    return (
        <div className="px-2 py-2 border-t border-border">
            <div className="space-y-1.5">
                {/* Status header */}
                {syncedCourses.length > 0 && (
                    <div className="flex items-center gap-2 px-2">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                        <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider flex-1">
                            Classroom Synced
                        </span>
                    </div>
                )}

                {/* Sync button */}
                <button
                    onClick={handleSync}
                    disabled={isSyncing}
                    className={cn(
                        'w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                        syncedCourses.length === 0
                            ? 'bg-gradient-to-r from-purple-600/20 to-blue-600/20 hover:from-purple-600/30 hover:to-blue-600/30 border border-purple-500/20 hover:border-purple-500/40 text-foreground'
                            : 'text-muted-foreground hover:surface-3 hover:text-foreground'
                    )}
                >
                    {isSyncing ? (
                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    ) : (
                        <RefreshCw className="w-4 h-4" />
                    )}
                    <span className="flex-1 text-left text-xs font-mono uppercase tracking-wider">
                        {isSyncing ? 'Syncing...' : syncedCourses.length === 0 ? 'Sync Classroom' : 'Sync Now'}
                    </span>
                    {lastSyncAt && !isSyncing && (
                        <span className="text-[10px] text-muted-foreground">{formatLastSync()}</span>
                    )}
                </button>

                {/* Synced courses toggle */}
                {syncedCourses.length > 0 && (
                    <button
                        onClick={() => setShowCourses(!showCourses)}
                        className="w-full flex items-center gap-2 px-3 py-1 text-[10px] font-mono text-muted-foreground hover:text-foreground transition-colors"
                    >
                        {showCourses ? (
                            <ChevronDown className="w-3 h-3" />
                        ) : (
                            <ChevronRight className="w-3 h-3" />
                        )}
                        <span>
                            {syncedCourses.length} course{syncedCourses.length !== 1 ? 's' : ''} synced
                        </span>
                    </button>
                )}

                {/* Course list */}
                <AnimatePresence>
                    {showCourses && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="pl-5 pr-2 space-y-0.5">
                                {syncedCourses.map((course) => (
                                    <div
                                        key={course.id}
                                        className="text-[11px] text-muted-foreground py-1 px-2 rounded truncate"
                                    >
                                        {course.name}
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Error display */}
                {syncError && (
                    <div className="flex items-start gap-2 px-3 py-1.5 text-[10px] text-red-400">
                        <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                        <span>{syncError}</span>
                    </div>
                )}
            </div>
        </div>
    );
};
