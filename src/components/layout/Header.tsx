import { useUIStore } from '@/store/uiStore';
import { useTaskStore } from '@/store/taskStore';
import { PanelLeftClose, PanelLeft, Search, List, Columns3, Calendar, Grid3X3, Sparkles } from 'lucide-react';
import type { ViewType } from '@/types/task';
import { cn } from '@/lib/utils';
import { UserMenu } from './UserMenu';
import { ThemeToggle } from '@/components/ThemeToggle';
import { QuickAdd } from './QuickAdd';

const views: { id: ViewType; icon: typeof List; label: string }[] = [
  { id: 'list', icon: List, label: 'List' },
  { id: 'kanban', icon: Columns3, label: 'Board' },
  { id: 'calendar', icon: Calendar, label: 'Calendar' },
  { id: 'matrix', icon: Grid3X3, label: 'Matrix' },
];

export const Header = () => {
  const { sidebarCollapsed, toggleSidebar, activeView, setActiveView, toggleCommandPalette, selectedListId, reopenDailyPlan } = useUIStore();
  const { lists } = useTaskStore();

  const isDashboard = selectedListId === 'dashboard';
  const isToday = selectedListId === 'today';
  const isCoreView = ['upcoming', 'completed', 'insights'].includes(selectedListId);

  const currentList = lists.find(l => l.id === selectedListId);
  const currentGoal = useTaskStore(s => s.goals.find(g => g.id === selectedListId));
  const isGoal = !!currentGoal;

  const pageTitle = isDashboard ? 'Dashboard'
    : currentList?.name
    || currentGoal?.title
    || (selectedListId === 'today' ? 'Today' : selectedListId === 'upcoming' ? 'Upcoming'
      : selectedListId === 'completed' ? 'Completed' : selectedListId === 'insights' ? 'Insights' : selectedListId);

  return (
    <header className="flex flex-col border-b border-border flex-shrink-0 bg-background">
      {/* Top Main Bar */}
      <div className="h-14 flex items-center justify-between px-4">
        <div className="flex items-center gap-3 overflow-hidden">
          <button onClick={toggleSidebar} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:surface-3 transition-colors flex-shrink-0">
            {sidebarCollapsed ? <PanelLeft className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>
          <h1 className="font-mono font-semibold text-foreground truncate min-w-0">{pageTitle}</h1>
          {currentList?.isAcademic && (
            <span className="hidden sm:flex items-center text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full font-mono flex-shrink-0">
              <span>Classroom</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
          <button
            onClick={toggleCommandPalette}
            className="flex items-center gap-2 px-3 h-8 rounded-md text-sm text-muted-foreground hover:text-foreground hover:surface-3 transition-colors border border-border"
          >
            <Search className="w-3.5 h-3.5" />
            <span className="text-xs font-mono hidden sm:inline">⌘K</span>
          </button>

          {!isDashboard && !isGoal && !isToday && !isCoreView && <QuickAdd variant="header" />}

          {/* AI Plan button — only on core pages */}
          {(isDashboard || isToday || isCoreView) && (
            <button
              onClick={reopenDailyPlan}
              className="flex items-center gap-1.5 px-3 h-8 rounded-md text-sm font-medium border border-amber-400/30 bg-amber-400/10 text-amber-500 hover:bg-amber-400/20 hover:border-amber-400/50 transition-all"
              title="AI Daily Plan"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-xs font-mono">Plan</span>
            </button>
          )}

          {/* View switcher on large screens */}
          {!isDashboard && !isGoal && !isToday && !isCoreView && (
            <div className="hidden sm:flex items-center border border-border rounded-lg p-0.5">
              {views.map(v => (
                <button
                  key={v.id}
                  onClick={() => setActiveView(v.id)}
                  className={cn(
                    "p-1.5 rounded-md transition-all flex-shrink-0",
                    activeView === v.id
                      ? "bg-primary text-primary-foreground shadow-glow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  title={v.label}
                >
                  <v.icon className="w-4 h-4" />
                </button>
              ))}
            </div>
          )}

          <ThemeToggle />
          <UserMenu />
        </div>
      </div>

      {/* Sub-bar for view switcher on mobile */}
      {!isDashboard && !isGoal && !isToday && !isCoreView && (
        <div className="h-12 border-t border-border flex items-center px-4 sm:hidden bg-background overflow-x-auto hide-scrollbar">
          <div className="flex items-center border border-border rounded-lg p-0.5 mx-auto w-full max-w-sm justify-between">
            {views.map(v => (
              <button
                key={v.id}
                onClick={() => setActiveView(v.id)}
                className={cn(
                  "p-2 flex-1 flex justify-center items-center rounded-md transition-all",
                  activeView === v.id
                    ? "bg-primary text-primary-foreground shadow-glow-sm"
                    : "text-muted-foreground"
                )}
                title={v.label}
              >
                <v.icon className="w-4 h-4" />
              </button>
            ))}
          </div>
        </div>
      )}
    </header>
  );
};
