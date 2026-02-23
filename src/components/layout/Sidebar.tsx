import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUIStore } from '@/store/uiStore';
import { useTaskStore } from '@/store/taskStore';
import {
  CalendarDays, CalendarRange, BarChart3, CheckCircle2,
  ChevronDown, ChevronRight, GraduationCap, Diamond,
  MoreHorizontal, Eye, EyeOff
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ClassroomSync } from './ClassroomSync';
import { EditWorkspacesDialog } from './EditWorkspacesDialog';
import { useIsMobile } from '@/hooks/use-mobile';

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  { id: 'today', label: 'Today', icon: CalendarDays },
  { id: 'upcoming', label: 'Upcoming', icon: CalendarRange },
  { id: 'completed', label: 'Completed', icon: CheckCircle2 },
];

export const Sidebar = () => {
  const { sidebarCollapsed, selectedListId, setSelectedListId, hiddenListIds, toggleListVisibility } = useUIStore();
  const { workspaces, lists, tasks } = useTaskStore();
  const [showAcademicMenu, setShowAcademicMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const [isPersonalOpen, setIsPersonalOpen] = useState(true);
  const [isAcademicsOpen, setIsAcademicsOpen] = useState(true);
  const [customOpenState, setCustomOpenState] = useState<Record<string, boolean>>({});
  const [editWorkspacesOpen, setEditWorkspacesOpen] = useState(false);

  // Find the exact workspace name from the store
  const personalWorkspace = workspaces.find(w => w.type === 'personal');
  const academicWorkspace = workspaces.find(w => w.type === 'academic');
  const customWorkspaces = workspaces.filter(w => w.type === 'custom');

  const personalLists = lists.filter(l => l.workspaceId === 'personal' || l.workspaceId === personalWorkspace?.id);
  const academicLists = lists.filter(l => l.workspaceId === 'academic' || l.workspaceId === academicWorkspace?.id);
  const visibleAcademicLists = academicLists.filter(l => !hiddenListIds.has(l.id));

  // Close menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowAcademicMenu(false);
      }
    };
    if (showAcademicMenu) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showAcademicMenu]);

  const getUncompletedCount = (listId: string) => {
    if (listId === 'today') {
      const todayStr = new Date().toISOString().split('T')[0];
      return tasks.filter(t => t.dueDate === todayStr && !t.isCompleted && !hiddenListIds.has(t.listId)).length;
    }
    if (listId === 'upcoming') {
      const now = new Date();
      const weekLater = new Date(now.getTime() + 7 * 86400000);
      return tasks.filter(t => t.dueDate && new Date(t.dueDate) <= weekLater && !t.isCompleted && !hiddenListIds.has(t.listId)).length;
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
          className="flex items-center gap-3 px-4 h-14 border-b border-border flex-shrink-0 cursor-pointer hover:bg-surface-2 transition-colors"
        >
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-purple-800 flex-shrink-0 glow-purple">
            <Diamond className="w-4 h-4 text-white" />
          </div>
          <AnimatePresence>
            {!sidebarCollapsed && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="flex flex-col min-w-0 flex-1"
              >
                <span className="font-mono font-bold text-base text-foreground tracking-wide leading-tight">
                  Node
                </span>
                <span className="text-[10px] text-muted-foreground font-mono tracking-wider uppercase leading-tight">
                  Task Manager
                </span>
              </motion.div>
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
                  onClick={() => handleItemClick(item.id)}
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
            <>
              <div
                className="px-4 pt-4 flex items-center justify-between cursor-pointer group"
                onClick={() => setIsPersonalOpen(!isPersonalOpen)}
              >
                <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest group-hover:text-foreground transition-colors">{personalWorkspace?.name || 'Personal'}</p>
                {isPersonalOpen ? (
                  <ChevronDown className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground" />
                )}
              </div>
              <AnimatePresence>
                {isPersonalOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-2 space-y-0.5 mt-1">
                      {personalLists.map(list => {
                        const isActive = selectedListId === list.id;
                        const count = getUncompletedCount(list.id);
                        return (
                          <button
                            key={list.id}
                            onClick={() => handleItemClick(list.id)}
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
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Academic workspace */}
              <div className="px-4 pt-4 flex items-center gap-2">
                <div
                  className="flex items-center gap-1 flex-1 cursor-pointer group"
                  onClick={() => setIsAcademicsOpen(!isAcademicsOpen)}
                >
                  <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest group-hover:text-foreground transition-colors">{academicWorkspace?.name || 'Academics'}</p>
                  {isAcademicsOpen ? (
                    <ChevronDown className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground" />
                  )}
                </div>

                {/* 3-dot menu */}
                {academicLists.length > 0 && (
                  <div className="relative" ref={menuRef}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowAcademicMenu(!showAcademicMenu);
                      }}
                      className="p-0.5 rounded hover:surface-3 text-muted-foreground hover:text-foreground transition-colors"
                      title="Edit visible subjects"
                    >
                      <MoreHorizontal className="w-3.5 h-3.5" />
                    </button>

                    {/* Dropdown menu */}
                    <AnimatePresence>
                      {showAcademicMenu && (
                        <motion.div
                          initial={{ opacity: 0, y: -4, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -4, scale: 0.95 }}
                          transition={{ duration: 0.15 }}
                          className="absolute right-0 top-full mt-1 w-56 rounded-lg border border-border surface-1 shadow-elevation-3 z-50 overflow-hidden"
                        >
                          <div className="px-3 py-2 border-b border-border">
                            <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
                              Show / Hide Subjects
                            </p>
                          </div>
                          <div className="py-1 max-h-60 overflow-y-auto">
                            {academicLists.map((list) => {
                              const isHidden = hiddenListIds.has(list.id);
                              return (
                                <button
                                  key={list.id}
                                  onClick={() => toggleListVisibility(list.id)}
                                  className="w-full flex items-center gap-3 px-3 py-2 text-sm hover:surface-3 transition-colors"
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
                                </button>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </div>

              <AnimatePresence>
                {isAcademicsOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-2 space-y-0.5 mt-1">
                      {visibleAcademicLists.map(list => {
                        const isActive = selectedListId === list.id;
                        const count = getUncompletedCount(list.id);
                        return (
                          <button
                            key={list.id}
                            onClick={() => handleItemClick(list.id)}
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
                      {(() => {
                        const actualHiddenCount = academicLists.filter(l => hiddenListIds.has(l.id)).length;
                        return actualHiddenCount > 0 ? (
                          <p className="text-[10px] text-muted-foreground pl-3 py-1 font-mono">
                            {actualHiddenCount} subject{actualHiddenCount !== 1 ? 's' : ''} hidden
                          </p>
                        ) : null;
                      })()}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Custom Workspaces */}
              {customWorkspaces.map(w => {
                const wLists = lists.filter(l => l.workspaceId === w.id);
                const isOpen = customOpenState[w.id] !== false; // open by default

                return (
                  <div key={w.id} className="mt-4">
                    <div
                      className="px-4 flex items-center justify-between cursor-pointer group"
                      onClick={() => setCustomOpenState(prev => ({ ...prev, [w.id]: !isOpen }))}
                    >
                      <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest group-hover:text-foreground transition-colors">{w.name}</p>
                      {isOpen ? (
                        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground" />
                      )}
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
                            {wLists.length > 0 ? (
                              wLists.map(list => {
                                const isActive = selectedListId === list.id;
                                const count = getUncompletedCount(list.id);
                                return (
                                  <button
                                    key={list.id}
                                    onClick={() => handleItemClick(list.id)}
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
                              })
                            ) : (
                              <p className="text-[10px] text-muted-foreground pl-3 py-1 font-mono italic">
                                Empty workspace
                              </p>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </>
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
      </motion.aside>
      <EditWorkspacesDialog open={editWorkspacesOpen} onOpenChange={setEditWorkspacesOpen} />
    </>
  );
};
