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

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  { id: 'today', label: 'Today', icon: CalendarDays },
  { id: 'upcoming', label: 'Upcoming', icon: CalendarRange },
  { id: 'completed', label: 'Completed', icon: CheckCircle2 },
];

export const Sidebar = () => {
  const { sidebarCollapsed, selectedListId, setSelectedListId } = useUIStore();
  const { workspaces, lists, tasks } = useTaskStore();
  const [hiddenListIds, setHiddenListIds] = useState<Set<string>>(() => {
    const stored = localStorage.getItem('node-hidden-lists');
    return stored ? new Set(JSON.parse(stored)) : new Set();
  });
  const [showAcademicMenu, setShowAcademicMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const personalLists = lists.filter(l => l.workspaceId === 'personal');
  const academicLists = lists.filter(l => l.workspaceId === 'academic');
  const visibleAcademicLists = academicLists.filter(l => !hiddenListIds.has(l.id));

  // Persist hidden lists
  useEffect(() => {
    localStorage.setItem('node-hidden-lists', JSON.stringify(Array.from(hiddenListIds)));
  }, [hiddenListIds]);

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

  const toggleListVisibility = (listId: string) => {
    setHiddenListIds(prev => {
      const next = new Set(prev);
      if (next.has(listId)) {
        next.delete(listId);
      } else {
        next.add(listId);
      }
      return next;
    });
  };

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
      <div className="flex items-center gap-3 px-4 h-14 border-b border-border flex-shrink-0">
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
              <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest flex-1">Academics</p>
              <GraduationCap className="w-3.5 h-3.5 text-primary" />

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
            <div className="px-2 space-y-0.5">
              {visibleAcademicLists.map(list => {
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
              {academicLists.length > 0 && hiddenListIds.size > 0 && (
                <p className="text-[10px] text-muted-foreground pl-3 py-1 font-mono">
                  {hiddenListIds.size} subject{hiddenListIds.size !== 1 ? 's' : ''} hidden
                </p>
              )}
            </div>
          </>
        )}
      </div>

      {/* Google Classroom Sync */}
      <ClassroomSync collapsed={sidebarCollapsed} />
    </motion.aside>
  );
};
