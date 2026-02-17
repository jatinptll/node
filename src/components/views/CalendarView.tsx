import { useTaskStore } from '@/store/taskStore';
import { useUIStore } from '@/store/uiStore';
import { cn } from '@/lib/utils';
import type { Task } from '@/types/task';
import { useMemo } from 'react';

const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const priorityDotColors: Record<string, string> = {
  p1: 'bg-destructive',
  p2: 'bg-warning',
  p3: 'bg-info',
  p4: 'bg-muted-foreground/40',
};

export const CalendarView = () => {
  const { tasks } = useTaskStore();
  const { openDetailPanel } = useUIStore();

  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayDate = today.getDate();

  const tasksByDate = useMemo(() => {
    const map: Record<string, Task[]> = {};
    tasks.forEach(t => {
      if (t.dueDate) {
        const d = new Date(t.dueDate);
        if (d.getMonth() === month && d.getFullYear() === year) {
          const key = d.getDate().toString();
          if (!map[key]) map[key] = [];
          map[key].push(t);
        }
      }
    });
    return map;
  }, [tasks, month, year]);

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="p-4 animate-fade-in">
      <div className="text-center mb-4">
        <h2 className="font-mono text-lg text-foreground">
          {today.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </h2>
      </div>

      <div className="grid grid-cols-7 gap-px bg-border rounded-xl overflow-hidden border border-border">
        {daysOfWeek.map(d => (
          <div key={d} className="bg-card px-2 py-2 text-center text-xs font-mono text-muted-foreground uppercase">{d}</div>
        ))}
        {cells.map((day, i) => {
          const dayTasks = day ? tasksByDate[day.toString()] || [] : [];
          const isToday = day === todayDate;
          return (
            <div
              key={i}
              className={cn(
                "bg-card min-h-[100px] p-2 transition-colors",
                day ? "hover:surface-3 cursor-default" : "",
                isToday && "ring-1 ring-inset ring-primary/40"
              )}
            >
              {day && (
                <>
                  <span className={cn(
                    "text-xs font-mono",
                    isToday ? "text-primary font-bold" : "text-muted-foreground"
                  )}>
                    {day}
                  </span>
                  <div className="mt-1 space-y-1">
                    {dayTasks.slice(0, 3).map(t => (
                      <button
                        key={t.id}
                        onClick={() => openDetailPanel(t.id)}
                        className="w-full text-left text-[10px] px-1.5 py-0.5 rounded surface-2 text-foreground truncate flex items-center gap-1 hover:surface-3"
                      >
                        <div className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", priorityDotColors[t.priority])} />
                        <span className="truncate">{t.title}</span>
                      </button>
                    ))}
                    {dayTasks.length > 3 && (
                      <span className="text-[10px] text-muted-foreground font-mono px-1.5">+{dayTasks.length - 3} more</span>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
