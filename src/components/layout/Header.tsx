import { useUIStore } from '@/store/uiStore';
import { useTaskStore } from '@/store/taskStore';
import { PanelLeftClose, PanelLeft, Search, List, Columns3, Calendar, Grid3X3, GanttChart } from 'lucide-react';
import type { ViewType } from '@/types/task';
import { cn } from '@/lib/utils';
import { UserMenu } from './UserMenu';

const views: { id: ViewType; icon: typeof List; label: string }[] = [
  { id: 'list', icon: List, label: 'List' },
  { id: 'kanban', icon: Columns3, label: 'Board' },
  { id: 'calendar', icon: Calendar, label: 'Calendar' },
  { id: 'matrix', icon: Grid3X3, label: 'Matrix' },
  { id: 'timeline', icon: GanttChart, label: 'Timeline' },
];

export const Header = () => {
  const { sidebarCollapsed, toggleSidebar, activeView, setActiveView, toggleCommandPalette, selectedListId } = useUIStore();
  const { lists } = useTaskStore();

  const isDashboard = selectedListId === 'dashboard';

  const currentList = lists.find(l => l.id === selectedListId);
  const pageTitle = isDashboard ? 'Dashboard'
    : currentList?.name
    || (selectedListId === 'today' ? 'Today' : selectedListId === 'upcoming' ? 'Upcoming'
      : selectedListId === 'completed' ? 'Completed' : selectedListId);

  return (
    <header className="h-14 border-b border-border flex items-center justify-between px-4 flex-shrink-0 bg-background">
      <div className="flex items-center gap-3">
        <button onClick={toggleSidebar} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:surface-3 transition-colors">
          {sidebarCollapsed ? <PanelLeft className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
        </button>
        <h1 className="font-mono font-semibold text-foreground">{pageTitle}</h1>
        {currentList?.isAcademic && (
          <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full font-mono">Classroom</span>
        )}
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={toggleCommandPalette}
          className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:surface-3 transition-colors border border-border"
        >
          <Search className="w-3.5 h-3.5" />
          <span className="text-xs font-mono hidden sm:inline">⌘K</span>
        </button>

        {/* Hide view switcher on dashboard */}
        {!isDashboard && (
          <div className="flex items-center ml-3 border border-border rounded-lg p-0.5">
            {views.map(v => (
              <button
                key={v.id}
                onClick={() => setActiveView(v.id)}
                className={cn(
                  "p-1.5 rounded-md transition-all",
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

        <UserMenu />
      </div>
    </header>
  );
};
