import { useTaskStore } from '@/store/taskStore';
import { useUIStore } from '@/store/uiStore';
import { cn } from '@/lib/utils';
import { AlertTriangle, Target, Clock, Coffee } from 'lucide-react';

const quadrants = [
  { id: 'q1', label: 'Urgent & Important', icon: AlertTriangle, accent: 'border-destructive/40', bg: 'bg-destructive/5', filter: (t: any) => t.isUrgent && t.isImportant },
  { id: 'q2', label: 'Important', icon: Target, accent: 'border-primary/40', bg: 'bg-primary/5', filter: (t: any) => !t.isUrgent && t.isImportant },
  { id: 'q3', label: 'Urgent', icon: Clock, accent: 'border-warning/40', bg: 'bg-warning/5', filter: (t: any) => t.isUrgent && !t.isImportant },
  { id: 'q4', label: 'Neither', icon: Coffee, accent: 'border-muted-foreground/20', bg: 'bg-muted/30', filter: (t: any) => !t.isUrgent && !t.isImportant },
];

export const MatrixView = () => {
  const { tasks } = useTaskStore();
  const { openDetailPanel } = useUIStore();
  const activeTasks = tasks.filter(t => !t.isCompleted);

  // Auto-classify based on priority and due date
  const classifiedTasks = activeTasks.map(t => {
    const dueDate = t.dueDate ? new Date(t.dueDate) : null;
    const daysUntilDue = dueDate ? Math.ceil((dueDate.getTime() - Date.now()) / 86400000) : 999;
    return {
      ...t,
      isUrgent: t.isUrgent || daysUntilDue <= 2 || t.priority === 'p1',
      isImportant: t.isImportant || t.priority === 'p1' || t.priority === 'p2',
    };
  });

  return (
    <div className="p-4 h-full animate-fade-in">
      <div className="grid grid-cols-2 grid-rows-2 gap-3 h-[calc(100vh-120px)]">
        {quadrants.map(q => {
          const qTasks = classifiedTasks.filter(q.filter);
          return (
            <div key={q.id} className={cn("rounded-xl border p-3 flex flex-col overflow-hidden", q.accent, q.bg)}>
              <div className="flex items-center gap-2 mb-3 flex-shrink-0">
                <q.icon className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs font-mono font-semibold text-foreground uppercase tracking-wider">{q.label}</span>
                <span className="text-xs text-muted-foreground font-mono">{qTasks.length}</span>
              </div>
              <div className="flex-1 overflow-y-auto space-y-1">
                {qTasks.map(t => (
                  <button
                    key={t.id}
                    onClick={() => openDetailPanel(t.id)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-foreground hover:surface-3 transition-colors text-left"
                  >
                    <div className={cn(
                      "w-4 h-4 rounded-full border-2 flex-shrink-0",
                      t.isCompleted ? "bg-primary border-primary" : "border-muted-foreground/40"
                    )} />
                    <span className="truncate">{t.title}</span>
                  </button>
                ))}
                {qTasks.length === 0 && (
                  <p className="text-xs text-muted-foreground/40 font-mono text-center py-4">No tasks</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
