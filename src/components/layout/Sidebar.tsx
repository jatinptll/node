import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUIStore } from '@/store/uiStore';
import { useTaskStore } from '@/store/taskStore';
import {
  CalendarDays, CalendarRange, BarChart3, CheckCircle2,
  ChevronDown, ChevronRight, GraduationCap, Diamond,
  MoreHorizontal, Eye, EyeOff, Lightbulb
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ClassroomSync } from './ClassroomSync';
import { EditWorkspacesDialog } from './EditWorkspacesDialog';
import { GoalDialog } from '@/components/tasks/GoalDialog';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  { id: 'today', label: 'Today', icon: CalendarDays },
  { id: 'upcoming', label: 'Upcoming', icon: CalendarRange },
  { id: 'completed', label: 'Completed', icon: CheckCircle2 },
  { id: 'insights', label: 'Insights', icon: Lightbulb },
];

export const Sidebar = () => {
  const { sidebarCollapsed, selectedListId, setSelectedListId, hiddenListIds, toggleListVisibility } = useUIStore();
  const { workspaces, lists, tasks, goals } = useTaskStore();
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [openWorkspaces, setOpenWorkspaces] = useState<Record<string, boolean>>({});
  const [editWorkspacesOpen, setEditWorkspacesOpen] = useState(false);
  const [goalDialogOpen, setGoalDialogOpen] = useState(false);



  const getUncompletedCount = (listId: string) => {
    if (listId === 'today') {
      const todayStr = new Date().toISOString().split('T')[0];
      return tasks.filter(t => t.dueDate === todayStr && !t.isCompleted && !hiddenListIds.includes(t.listId)).length;
    }
    if (listId === 'upcoming') {
      const now = new Date();
      const weekLater = new Date(now.getTime() + 7 * 86400000);
      return tasks.filter(t => t.dueDate && new Date(t.dueDate) <= weekLater && !t.isCompleted && !hiddenListIds.includes(t.listId)).length;
    }
    return tasks.filter(t => t.listId === listId && !t.isCompleted).length;
  };

  // Check if we are on a mobile device
  const isMobile = useIsMobile();

  // Hide sidebar on item click for mobile
  const handleItemClick = (id: string) => {
    setSelectedListId(id);
    if (isMobile && !sidebarCollapsed) {
      useUIStore.getState().toggleSidebar();
    }
  };

  return (
    <>
      <AnimatePresence>
        {!sidebarCollapsed && isMobile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => useUIStore.getState().toggleSidebar()}
            className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      <motion.aside
        animate={{
          width: isMobile ? 280 : (sidebarCollapsed ? 64 : 240),
          x: isMobile ? (sidebarCollapsed ? -280 : 0) : 0
        }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
        className={cn(
          "h-screen flex flex-col border-r border-border bg-sidebar overflow-hidden flex-shrink-0",
          isMobile ? "fixed left-0 top-0 bottom-0 z-50 shadow-elevation-2" : "relative"
        )}
      >
        {/* Logo */}
        <div
          onClick={() => setSelectedListId('dashboard')}
          className={cn(
            "flex items-center h-[57px] border-b border-border flex-shrink-0 cursor-pointer hover:bg-surface-2 transition-colors",
            sidebarCollapsed ? "justify-center" : "px-5"
          )}
        >
          {sidebarCollapsed ? (
            <img src="/favicon.svg" alt="Node" className="h-8 w-8 object-contain" />
          ) : (
            <AnimatePresence>
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
              >
                <img src="/node-logo.svg" alt="Node" className="h-10 w-auto object-left object-contain" />
              </motion.div>
            </AnimatePresence>
          )}
        </div>

        {/* Nav */}
        <div className="flex-1 overflow-y-auto py-2 space-y-1 hide-scrollbar">
          {/* Quick nav */}
          <div className="px-2 space-y-0.5">
            {navItems.map(item => {
              const isActive = selectedListId === item.id;
              const count = getUncompletedCount(item.id);
              return (
                <button
                  key={item.id}
                  onClick={() => handleItemClick(item.id)}
                  className={cn(
                    "flex items-center rounded-md text-sm transition-all",
                    sidebarCollapsed ? "justify-center h-10 w-10 mx-auto" : "w-full gap-3 px-3 py-2",
                    isActive
                      ? "text-primary font-medium"
                      : "text-muted-foreground hover:bg-surface-2 hover:text-foreground"
                  )}
                >
                  <item.icon className="w-4 h-4 flex-shrink-0" />
                  {!sidebarCollapsed && (
                    <>
                      <span className="flex-1 text-left font-mono text-xs uppercase tracking-wider">{item.label}</span>
                      {count > 0 && (
                        <span className="min-w-[22px] h-[22px] flex items-center justify-center text-[11px] bg-primary/20 text-primary px-1.5 rounded-full font-mono">
                          {count}
                        </span>
                      )}
                    </>
                  )}
                </button>
              );
            })}
          </div>

          {/* Personal/Academic workspaces */}
          {!sidebarCollapsed && (
            <div className="flex flex-col gap-2 pt-2">
              {workspaces.map(w => {
                const wLists = lists.filter(l => l.workspaceId === w.id || (w.type === 'personal' && l.workspaceId === 'personal') || (w.type === 'academic' && l.workspaceId === 'academic'));
                const visibleLists = wLists.filter(l => !hiddenListIds.includes(l.id));
                const hiddenCount = wLists.length - visibleLists.length;
                const isOpen = openWorkspaces[w.id] !== false; // open by default
                const isMenuOpen = activeMenuId === w.id;

                return (
                  <div key={w.id} className="mt-2">
                    <div className="px-4 flex items-center justify-between group">
                      <p
                        className="text-xs font-mono text-muted-foreground uppercase tracking-widest group-hover:text-foreground transition-colors flex-1 cursor-pointer"
                        onClick={() => setOpenWorkspaces(prev => ({ ...prev, [w.id]: !isOpen }))}
                      >
                        {w.name}
                      </p>

                      <div className="flex items-center gap-2">
                        {wLists.length > 0 && (
                          <div className="relative workspace-menu-container">
                            <Popover open={isMenuOpen} onOpenChange={(open) => setActiveMenuId(open ? w.id : null)}>
                              <PopoverTrigger asChild>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                  }}
                                  className="p-0.5 rounded hover:bg-surface-2 text-muted-foreground hover:text-foreground transition-colors"
                                  title="Edit visible subjects"
                                >
                                  <MoreHorizontal className="w-3.5 h-3.5" />
                                </button>
                              </PopoverTrigger>
                              <PopoverContent
                                className="w-56 p-0"
                                align="end"
                                side={isMobile ? "bottom" : "right"}
                                sideOffset={isMobile ? 8 : 16}
                                collisionPadding={8}
                              >
                                <div className="px-3 py-2 border-b border-border">
                                  <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
                                    Show / Hide Items
                                  </p>
                                </div>
                                <div className="py-1 max-h-60 overflow-y-auto hide-scrollbar">
                                  {wLists.map((list) => {
                                    const isHidden = hiddenListIds.includes(list.id);
                                    return (
                                      <div
                                        key={list.id}
                                        onClick={() => toggleListVisibility(list.id)}
                                        className="w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-surface-2 transition-colors cursor-pointer rounded-sm"
                                      >
                                        <div
                                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                          style={{ backgroundColor: list.color, opacity: isHidden ? 0.3 : 1 }}
                                        />
                                        <span className={cn(
                                          "flex-1 text-left text-xs truncate",
                                          isHidden ? "text-muted-foreground line-through" : "text-foreground"
                                        )}>
                                          {list.name}
                                        </span>
                                        {isHidden ? (
                                          <EyeOff className="w-3.5 h-3.5 text-muted-foreground" />
                                        ) : (
                                          <Eye className="w-3.5 h-3.5 text-primary" />
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </PopoverContent>
                            </Popover>
                          </div>
                        )}

                        <div
                          className="cursor-pointer flex items-center justify-center p-0.5"
                          onClick={() => setOpenWorkspaces(prev => ({ ...prev, [w.id]: !isOpen }))}
                        >
                          {isOpen ? (
                            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-transform" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-transform" />
                          )}
                        </div>
                      </div>
                    </div>

                    <AnimatePresence>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="px-2 space-y-0.5 mt-1">
                            {visibleLists.length > 0 ? (
                              visibleLists.map((list) => {
                                const isActive = selectedListId === list.id;
                                const count = getUncompletedCount(list.id);
                                return (
                                  <button
                                    key={list.id}
                                    onClick={() => handleItemClick(list.id)}
                                    className={cn(
                                      "flex items-center rounded-md text-sm transition-all",
                                      sidebarCollapsed ? "justify-center h-10 w-10 mx-auto" : "w-full gap-3 px-3 py-2",
                                      isActive ? "text-primary font-medium" : "text-muted-foreground hover:bg-surface-2 hover:text-foreground"
                                    )}
                                  >
                                    <div className="w-3 h-3 rounded-md flex-shrink-0" style={{ backgroundColor: list.color }} />
                                    <span className="flex-1 text-left truncate">{list.name}</span>
                                    {count > 0 && (
                                      <span className="min-w-[22px] h-[22px] flex items-center justify-center text-[11px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full font-mono">{count}</span>
                                    )}
                                  </button>
                                );
                              })
                            ) : (
                              <p className="text-[10px] text-muted-foreground pl-3 py-1 font-mono italic">
                                Empty workspace
                              </p>
                            )}
                            {hiddenCount > 0 && (
                              <p className="text-[10px] text-muted-foreground pl-3 py-1 font-mono">
                                {hiddenCount} page{hiddenCount !== 1 ? 's' : ''} hidden
                              </p>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}

              {/* Goals */}
              <div className="mt-2">
                <div className="px-4 flex items-center justify-between group">
                  <p
                    className="text-xs font-mono text-muted-foreground uppercase tracking-widest group-hover:text-foreground transition-colors flex-1 cursor-pointer"
                    onClick={() => setOpenWorkspaces(prev => ({ ...prev, 'goals': prev['goals'] === false ? true : false }))}
                  >
                    Goals
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); setGoalDialogOpen(true); }}
                      className="p-0.5 rounded hover:bg-surface-2 text-muted-foreground hover:text-foreground transition-colors"
                      title="Add Goal"
                    >
                      <Diamond className="w-3.5 h-3.5" />
                    </button>
                    <div
                      className="cursor-pointer flex items-center justify-center p-0.5"
                      onClick={() => setOpenWorkspaces(prev => ({ ...prev, 'goals': prev['goals'] === false ? true : false }))}
                    >
                      {openWorkspaces['goals'] !== false ? (
                        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-transform" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-transform" />
                      )}
                    </div>
                  </div>
                </div>

                <AnimatePresence>
                  {openWorkspaces['goals'] !== false && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-2 space-y-0.5 mt-1">
                        {goals.length > 0 ? (
                          goals.map((goal) => {
                            const isActive = selectedListId === goal.id;
                            const goalTasks = tasks.filter(t => t.goalId === goal.id && !t.isCompleted);
                            const count = goalTasks.length;
                            return (
                              <button
                                key={goal.id}
                                onClick={() => handleItemClick(goal.id)}
                                className={cn(
                                  "flex items-center rounded-md text-sm transition-all",
                                  sidebarCollapsed ? "justify-center h-10 w-10 mx-auto" : "w-full gap-3 px-3 py-2",
                                  isActive ? "text-primary font-medium" : "text-muted-foreground hover:bg-surface-2 hover:text-foreground"
                                )}
                              >
                                <Diamond className="w-3.5 h-3.5 flex-shrink-0" />
                                <span className="flex-1 text-left truncate">{goal.title}</span>
                                {count > 0 && (
                                  <span className="min-w-[22px] h-[22px] flex items-center justify-center text-[11px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full font-mono">{count}</span>
                                )}
                              </button>
                            );
                          })
                        ) : (
                          <p className="text-[10px] text-muted-foreground pl-3 py-1 font-mono italic">
                            No goals yet
                          </p>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

            </div>
          )}
        </div>

        {/* Edit Workspaces Instead of Sync */}
        <div className="p-4 border-t border-border bg-sidebar mt-auto">
          {!sidebarCollapsed && (
            <button
              onClick={() => setEditWorkspacesOpen(true)}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm bg-surface-2 text-foreground hover:bg-surface-3 transition-colors"
            >
              <span className="font-mono font-medium">Edit Workspaces</span>
            </button>
          )}
        </div>
      </motion.aside >
      <EditWorkspacesDialog open={editWorkspacesOpen} onOpenChange={setEditWorkspacesOpen} />
      <GoalDialog open={goalDialogOpen} onOpenChange={setGoalDialogOpen} />
    </>
  );
};
