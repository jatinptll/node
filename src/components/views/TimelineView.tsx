import { useTaskStore } from '@/store/taskStore';
import { useUIStore } from '@/store/uiStore';
import { cn } from '@/lib/utils';
import { useMemo } from 'react';

const priorityBarColors: Record<string, string> = {
  p1: 'bg-destructive',
  p2: 'bg-warning',
  p3: 'bg-info',
  p4: 'bg-muted-foreground/30',
};

export const TimelineView = () => {
  const { tasks } = useTaskStore();
  const { openDetailPanel } = useUIStore();

  const today = new Date();
  const startOfRange = new Date(today);
  startOfRange.setDate(startOfRange.getDate() - 3);
  const daysToShow = 21;

  const days = useMemo(() => {
    return Array.from({ length: daysToShow }, (_, i) => {
      const d = new Date(startOfRange);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, []);

  const tasksWithDates = tasks.filter(t => t.dueDate && !t.isCompleted);

  const getTaskPosition = (dueDate: string) => {
    const due = new Date(dueDate);
    const diffDays = Math.round((due.getTime() - startOfRange.getTime()) / 86400000);
    return diffDays;
  };

  const todayIndex = Math.round((today.getTime() - startOfRange.getTime()) / 86400000);

  return (
    <div className="p-4 h-full overflow-auto animate-fade-in">
      <div className="min-w-[800px]">
        {/* Day headers */}
        <div className="flex border-b border-border mb-2 sticky top-0 bg-background z-10">
          <div className="w-48 flex-shrink-0" />
          <div className="flex-1 flex">
            {days.map((d, i) => {
              const isToday = i === todayIndex;
              return (
                <div
                  key={i}
                  className={cn(
                    "flex-1 min-w-[40px] text-center py-2 text-[10px] font-mono border-l border-border",
                    isToday ? "text-primary font-bold" : "text-muted-foreground"
                  )}
                >
                  <div>{d.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                  <div>{d.getDate()}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Task rows */}
        <div className="space-y-1 relative">
          {/* Today line */}
          <div
            className="absolute top-0 bottom-0 w-px bg-primary/40 z-10"
            style={{ left: `calc(192px + ${(todayIndex / daysToShow) * 100}% * (1 - 192px / 100%))` }}
          />

          {tasksWithDates.map(task => {
            const pos = getTaskPosition(task.dueDate!);
            const leftPercent = (pos / daysToShow) * 100;

            return (
              <div key={task.id} className="flex items-center h-8 group">
                <button
                  onClick={() => openDetailPanel(task.id)}
                  className="w-48 flex-shrink-0 text-sm text-foreground truncate px-2 text-left hover:text-primary transition-colors"
                >
                  {task.title}
                </button>
                <div className="flex-1 relative h-full">
                  <div
                    className={cn("absolute h-5 top-1.5 rounded-md min-w-[30px] cursor-pointer hover:opacity-80 transition-opacity", priorityBarColors[task.priority])}
                    style={{ left: `${Math.max(0, Math.min(95, leftPercent))}%`, width: '3%' }}
                    onClick={() => openDetailPanel(task.id)}
                    title={task.title}
                  />
                </div>
              </div>
            );
          })}

          {tasksWithDates.length === 0 && (
            <div className="text-center py-16 text-muted-foreground/40 text-sm font-mono">
              No tasks with due dates
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
