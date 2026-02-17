import { motion, AnimatePresence } from 'framer-motion';
import { useUIStore } from '@/store/uiStore';
import { useTaskStore } from '@/store/taskStore';
import {
  CalendarDays, CalendarRange, Inbox, CheckCircle2, Tag,
  ChevronDown, ChevronRight, Plus, GraduationCap, Diamond
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { id: 'today', label: 'Today', icon: CalendarDays },
  { id: 'upcoming', label: 'Upcoming', icon: CalendarRange },
  { id: 'inbox', label: 'Inbox', icon: Inbox },
  { id: 'completed', label: 'Completed', icon: CheckCircle2 },
];

export const Sidebar = () => {
  const { sidebarCollapsed, selectedListId, setSelectedListId } = useUIStore();
  const { workspaces, lists, tasks } = useTaskStore();

  const personalLists = lists.filter(l => l.workspaceId === 'personal');
  const academicLists = lists.filter(l => l.workspaceId === 'academic');

  const getUncompletedCount = (listId: string) => {
    if (listId === 'today') {
      const todayStr = new Date().toISOString().split('T')[0];
      return tasks.filter(t => t.dueDate === todayStr && !t.isCompleted).length;
    }
    if (listId === 'upcoming') {
      const now = new Date();
      const weekLater = new Date(now.getTime() + 7 * 86400000);
      return tasks.filter(t => t.dueDate && new Date(t.dueDate) <= weekLater && !t.isCompleted).length;
    }
    return tasks.filter(t => t.listId === listId && !t.isCompleted).length;
  };

  return (
    <motion.aside
      animate={{ width: sidebarCollapsed ? 64 : 240 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className="h-screen flex flex-col border-r border-border bg-sidebar overflow-hidden flex-shrink-0"
    >
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 h-14 border-b border-border flex-shrink-0">
        <Diamond className="w-6 h-6 text-primary flex-shrink-0" />
        <AnimatePresence>
          {!sidebarCollapsed && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="font-mono font-bold text-sm text-foreground whitespace-nowrap"
            >
              ObsidianTask
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Nav */}
      <div className="flex-1 overflow-y-auto py-2 space-y-1">
        {/* Quick nav */}
        <div className="px-2 space-y-0.5">
          {navItems.map(item => {
            const isActive = selectedListId === item.id;
            const count = getUncompletedCount(item.id);
            return (
              <button
                key={item.id}
                onClick={() => setSelectedListId(item.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                  isActive
                    ? "surface-2 text-foreground border-l-2 border-primary glow-sm"
                    : "text-muted-foreground hover:surface-3 hover:text-foreground"
                )}
              >
                <item.icon className="w-4 h-4 flex-shrink-0" />
                {!sidebarCollapsed && (
                  <>
                    <span className="flex-1 text-left font-mono text-xs uppercase tracking-wider">{item.label}</span>
                    {count > 0 && (
                      <span className="text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded-full font-mono">
                        {count}
                      </span>
                    )}
                  </>
                )}
              </button>
            );
          })}
        </div>

        {/* Personal workspace */}
        {!sidebarCollapsed && (
          <>
            <div className="px-4 pt-4">
              <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest">Personal</p>
            </div>
            <div className="px-2 space-y-0.5">
              {personalLists.map(list => {
                const isActive = selectedListId === list.id;
                const count = getUncompletedCount(list.id);
                return (
                  <button
                    key={list.id}
                    onClick={() => setSelectedListId(list.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                      isActive ? "surface-2 text-foreground" : "text-muted-foreground hover:surface-3 hover:text-foreground"
                    )}
                  >
                    <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: list.color }} />
                    <span className="flex-1 text-left truncate">{list.name}</span>
                    {count > 0 && <span className="text-xs text-muted-foreground">{count}</span>}
                  </button>
                );
              })}
            </div>

            {/* Academic workspace */}
            <div className="px-4 pt-4 flex items-center gap-2">
              <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest">Academics</p>
              <GraduationCap className="w-3.5 h-3.5 text-primary" />
            </div>
            <div className="px-2 space-y-0.5">
              {academicLists.map(list => {
                const isActive = selectedListId === list.id;
                const count = getUncompletedCount(list.id);
                return (
                  <button
                    key={list.id}
                    onClick={() => setSelectedListId(list.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                      isActive ? "surface-2 text-foreground" : "text-muted-foreground hover:surface-3 hover:text-foreground"
                    )}
                  >
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: list.color }} />
                    <span className="flex-1 text-left truncate">{list.name}</span>
                    {count > 0 && (
                      <span className="text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded-full font-mono">{count}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    </motion.aside>
  );
};
