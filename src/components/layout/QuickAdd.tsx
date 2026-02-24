import { useState, useEffect } from 'react';
import { useTaskStore } from '@/store/taskStore';
import { useUIStore } from '@/store/uiStore';
import { Plus, ChevronDown, Zap } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { Priority } from '@/types/task';

const priorities: { id: Priority; label: string; color: string }[] = [
    { id: 'p1', label: 'Urgent', color: '#EF4444' },
    { id: 'p2', label: 'High', color: '#F59E0B' },
    { id: 'p3', label: 'Medium', color: '#3B82F6' },
    { id: 'p4', label: 'Low', color: '#94A3B8' },
];

export const QuickAdd = ({ variant = 'header' }: { variant?: 'header' | 'dashboard' }) => {
    const [open, setOpen] = useState(false);
    const [title, setTitle] = useState('');
    const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);
    const [selectedListId, setSelectedListId] = useState<string | null>(null);
    const [priority, setPriority] = useState<Priority>('p4');
    const [dueDate, setDueDate] = useState('');
    const [showDomainPicker, setShowDomainPicker] = useState(false);
    const [showPagePicker, setShowPagePicker] = useState(false);

    const { addTask, lists, workspaces } = useTaskStore();
    const { hiddenListIds } = useUIStore();

    const visibleLists = lists.filter(l => !hiddenListIds.includes(l.id));

    // Get lists for selected workspace
    const getWorkspaceLists = (wsId: string) => {
        const ws = workspaces.find(w => w.id === wsId);
        if (!ws) return [];
        return visibleLists.filter(l =>
            l.workspaceId === ws.id ||
            (ws.type === 'personal' && l.workspaceId === 'personal') ||
            (ws.type === 'academic' && l.workspaceId === 'academic')
        );
    };

    // Auto-select first workspace and first page when dialog opens
    useEffect(() => {
        if (open && workspaces.length > 0 && !selectedWorkspaceId) {
            const firstWs = workspaces[0];
            setSelectedWorkspaceId(firstWs.id);
            const wsLists = getWorkspaceLists(firstWs.id);
            if (wsLists.length > 0) setSelectedListId(wsLists[0].id);
        }
    }, [open, workspaces]);

    // When workspace changes, auto-select first page in that workspace
    useEffect(() => {
        if (selectedWorkspaceId) {
            const wsLists = getWorkspaceLists(selectedWorkspaceId);
            if (wsLists.length > 0 && !wsLists.find(l => l.id === selectedListId)) {
                setSelectedListId(wsLists[0].id);
            }
        }
    }, [selectedWorkspaceId]);

    const currentWorkspaceLists = selectedWorkspaceId ? getWorkspaceLists(selectedWorkspaceId) : [];
    const selectedWorkspace = workspaces.find(w => w.id === selectedWorkspaceId);
    const selectedList = lists.find(l => l.id === selectedListId);

    const handleSubmit = () => {
        if (!title.trim()) return;
        if (!selectedListId) {
            toast.error('Please select a page first.');
            return;
        }

        addTask({
            title: title.trim(),
            listId: selectedListId,
            priority,
            status: 'todo',
            dueDate: dueDate || undefined,
        });

        const listName = lists.find(l => l.id === selectedListId)?.name || 'Page';
        toast.success(`Task added to ${listName}`);
        setTitle('');
        setPriority('p4');
        setDueDate('');
        setSelectedWorkspaceId(null);
        setSelectedListId(null);
        setOpen(false);
    };

    return (
        <>
            {variant === 'header' ? (
                <button
                    onClick={() => setOpen(true)}
                    className="flex items-center gap-1.5 px-3 h-8 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                    title="Quick Add"
                >
                    <Zap className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline text-xs font-mono">Quick Add</span>
                </button>
            ) : (
                <button
                    onClick={() => setOpen(true)}
                    className="flex items-center gap-1.5 px-3 h-8 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all text-xs font-medium font-mono"
                >
                    <Zap className="w-3.5 h-3.5" />
                    Quick Add
                </button>
            )}

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-[460px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Zap className="w-4 h-4 text-primary" />
                            Quick Add Task
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 pt-2">
                        {/* Task title */}
                        <Input
                            placeholder="What needs to be done?"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                            autoFocus
                            className="h-11 text-sm font-mono"
                        />

                        {/* Domain & Page selectors row */}
                        <div className="flex gap-3">
                            {/* Domain Selector */}
                            <div className="flex-1 space-y-1.5">
                                <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Domain</label>
                                <div className="relative">
                                    <button
                                        onClick={() => { setShowDomainPicker(!showDomainPicker); setShowPagePicker(false); }}
                                        className="w-full flex items-center justify-between px-3 py-2 rounded-md border border-border surface-2 text-sm hover:border-primary/50 transition-colors"
                                    >
                                        <span className="text-xs font-mono truncate">{selectedWorkspace?.name || 'Select...'}</span>
                                        <ChevronDown className={cn("w-3.5 h-3.5 text-muted-foreground transition-transform flex-shrink-0 ml-1", showDomainPicker && "rotate-180")} />
                                    </button>

                                    {showDomainPicker && (
                                        <div className="absolute z-20 mt-1 w-full rounded-md border border-border bg-popover shadow-elevation-2 py-1 max-h-40 overflow-y-auto hide-scrollbar">
                                            {workspaces.map(ws => (
                                                <button
                                                    key={ws.id}
                                                    onClick={() => {
                                                        setSelectedWorkspaceId(ws.id);
                                                        setShowDomainPicker(false);
                                                    }}
                                                    className={cn(
                                                        "w-full flex items-center gap-2 px-3 py-2 text-xs font-mono hover:bg-surface-2 transition-colors text-left",
                                                        selectedWorkspaceId === ws.id && "text-primary"
                                                    )}
                                                >
                                                    {ws.name}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Page Selector */}
                            <div className="flex-1 space-y-1.5">
                                <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Page</label>
                                <div className="relative">
                                    <button
                                        onClick={() => { setShowPagePicker(!showPagePicker); setShowDomainPicker(false); }}
                                        className="w-full flex items-center justify-between px-3 py-2 rounded-md border border-border surface-2 text-sm hover:border-primary/50 transition-colors"
                                    >
                                        <div className="flex items-center gap-2 min-w-0">
                                            {selectedList && (
                                                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: selectedList.color }} />
                                            )}
                                            <span className="text-xs font-mono truncate">{selectedList?.name || 'Select...'}</span>
                                        </div>
                                        <ChevronDown className={cn("w-3.5 h-3.5 text-muted-foreground transition-transform flex-shrink-0 ml-1", showPagePicker && "rotate-180")} />
                                    </button>

                                    {showPagePicker && (
                                        <div className="absolute z-20 mt-1 w-full rounded-md border border-border bg-popover shadow-elevation-2 py-1 max-h-40 overflow-y-auto hide-scrollbar">
                                            {currentWorkspaceLists.length === 0 ? (
                                                <div className="px-3 py-2 text-xs text-muted-foreground font-mono">No pages in this domain</div>
                                            ) : (
                                                currentWorkspaceLists.map(list => (
                                                    <button
                                                        key={list.id}
                                                        onClick={() => {
                                                            setSelectedListId(list.id);
                                                            setShowPagePicker(false);
                                                        }}
                                                        className={cn(
                                                            "w-full flex items-center gap-2 px-3 py-2 text-xs font-mono hover:bg-surface-2 transition-colors text-left",
                                                            selectedListId === list.id && "text-primary"
                                                        )}
                                                    >
                                                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: list.color }} />
                                                        {list.name}
                                                    </button>
                                                ))
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Priority & Due Date Row */}
                        <div className="flex gap-3">
                            <div className="flex-1 space-y-1.5">
                                <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Priority</label>
                                <div className="flex gap-1">
                                    {priorities.map(p => (
                                        <button
                                            key={p.id}
                                            onClick={() => setPriority(p.id)}
                                            className={cn(
                                                "flex-1 py-1.5 rounded-md text-[10px] font-mono font-medium transition-all border",
                                                priority === p.id
                                                    ? "border-current shadow-sm"
                                                    : "border-transparent opacity-50 hover:opacity-80"
                                            )}
                                            style={{ color: p.color, backgroundColor: priority === p.id ? `${p.color}20` : 'transparent' }}
                                        >
                                            {p.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="w-[140px] space-y-1.5">
                                <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Due date</label>
                                <Input
                                    type="date"
                                    value={dueDate}
                                    onChange={e => setDueDate(e.target.value)}
                                    className="h-8 text-xs font-mono"
                                />
                            </div>
                        </div>

                        {/* Submit */}
                        <Button
                            onClick={handleSubmit}
                            disabled={!title.trim() || !selectedListId}
                            className="w-full gap-2 h-10"
                        >
                            <Plus className="w-4 h-4" />
                            Add Task
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
};
