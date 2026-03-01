import { useState, useMemo } from 'react';
import { useTaskStore } from '@/store/taskStore';
import { useUIStore } from '@/store/uiStore';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/lib/utils';
import type { Task } from '@/types/task';
import { useIsMobile } from '@/hooks/use-mobile';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Modern pill styling for task blocks
const priorityColors: Record<string, string> = {
  p1: 'bg-destructive/20 text-destructive border border-destructive/30',
  p2: 'bg-warning/20 text-warning-foreground border border-warning/30',
  p3: 'bg-info/20 text-info-foreground border border-info/30',
  p4: 'bg-muted-foreground/20 text-muted-foreground border border-muted-foreground/30',
};

export const CalendarView = () => {
  const { tasks } = useTaskStore();
  const { openDetailPanel } = useUIStore();
  const { user } = useAuthStore();
  const isMobile = useIsMobile();

  const today = new Date();
  const joinDate = user?.created_at ? new Date(user.created_at) : today;

  // Safe bounds strictly prevent scrolling before their join date
  const minYear = joinDate.getFullYear();
  const minMonth = joinDate.getMonth();

  const [currentDate, setCurrentDate] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayDate = today.getDate();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

  const handlePrev = () => {
    if (year > minYear || (year === minYear && month > minMonth)) {
      setCurrentDate(new Date(year, month - 1, 1));
    }
  };

  const handleNext = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const canGoPrev = year > minYear || (year === minYear && month > minMonth);

  const tasksByDate = useMemo(() => {
    const map: Record<string, Task[]> = {};
    tasks.forEach(t => {
      if (t.dueDate) {
        // Parse YYYY-MM-DD directly to avoid UTC timezone shift
        const parts = t.dueDate.split('-');
        const dueYear = parseInt(parts[0], 10);
        const dueMonth = parseInt(parts[1], 10) - 1; // 0-indexed
        const dueDay = parseInt(parts[2], 10);
        if (dueMonth === month && dueYear === year) {
          const key = dueDay.toString();
          if (!map[key]) map[key] = [];
          map[key].push(t);
        }
      }
    });
    return map;
  }, [tasks, month, year]);

  const cells = [];
  // previous month padding
  for (let i = 0; i < firstDay; i++) cells.push(null);
  // current month days
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  // pad out exactly to a multiple of 7 for clean grid framing
  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  return (
    <div className="flex flex-col h-full animate-fade-in p-2 sm:p-4 overflow-hidden bg-background">
      <div className="flex items-center justify-between mb-2 sm:mb-4 px-2">
        <button
          onClick={handlePrev}
          disabled={!canGoPrev}
          className="p-1.5 sm:p-2 rounded-lg text-muted-foreground hover:bg-surface-3 transition-colors disabled:opacity-20 disabled:pointer-events-none"
        >
          <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>
        <h2 className="font-mono text-sm sm:text-lg text-foreground font-bold tracking-wide">
          {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </h2>
        <button
          onClick={handleNext}
          className="p-1.5 sm:p-2 rounded-lg text-muted-foreground hover:bg-surface-3 transition-colors"
        >
          <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>
      </div>

      <div className="flex-1 min-h-0 flex flex-col bg-border rounded-xl border border-border shadow-elevation-1 overflow-hidden">
        {/* Header Row */}
        <div className="grid grid-cols-7 gap-px flex-shrink-0 bg-border border-b border-border">
          {daysOfWeek.map(d => (
            <div key={d} className="bg-sidebar px-1 py-1.5 sm:py-2 text-center text-[10px] sm:text-xs font-mono font-medium text-muted-foreground truncate">
              {isMobile ? d.slice(0, 3) : d}
            </div>
          ))}
        </div>

        {/* Dynamic Flexible Grid Array */}
        <div className="flex-1 grid grid-cols-7 gap-px bg-border auto-rows-[1fr] overflow-y-auto">
          {cells.map((day, i) => {
            const dayTasks = day ? tasksByDate[day.toString()] || [] : [];
            const isToday = day === todayDate && isCurrentMonth;

            return (
              <div
                key={i}
                className={cn(
                  "bg-sidebar flex flex-col min-h-[50px] p-0.5 sm:p-1.5 overflow-hidden transition-colors",
                  day ? "hover:surface-2 cursor-pointer" : "opacity-30 pointer-events-none",
                  isToday && "relative z-10 before:absolute before:inset-0 before:border-2 before:border-primary/50 before:pointer-events-none"
                )}
                onClick={() => {
                  // Optional: If they click an empty day we could fire a quick create hook in the future
                }}
              >
                {day && (
                  <div className="flex-1 overflow-hidden flex flex-col">
                    <span className={cn(
                      "text-[10px] sm:text-xs font-mono font-bold w-4 h-4 sm:w-6 sm:h-6 flex items-center justify-center rounded-full mx-auto sm:mx-0 mb-0.5 sm:mb-1",
                      isToday ? "bg-primary text-primary-foreground" : "text-foreground"
                    )}>
                      {day}
                    </span>

                    <div className="flex-1 overflow-y-auto hide-scrollbar flex flex-col gap-0.5">
                      {dayTasks.map(t => (
                        <button
                          key={t.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            openDetailPanel(t.id);
                          }}
                          className={cn(
                            "w-full text-left text-[8px] sm:text-[10px] px-1 py-0.5 rounded-md truncate font-medium flex items-center gap-1 flex-shrink-0",
                            priorityColors[t.priority] || "bg-primary/20 text-primary border border-primary/30"
                          )}
                        >
                          <span className="truncate leading-tight w-full pointer-events-none text-center sm:text-left">{t.title}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
