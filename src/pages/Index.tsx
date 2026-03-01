import { useUIStore } from '@/store/uiStore';
import { AppLayout } from '@/components/layout/AppLayout';
import { ListView } from '@/components/views/ListView';
import { KanbanView } from '@/components/views/KanbanView';
import { CalendarView } from '@/components/views/CalendarView';
import { MatrixView } from '@/components/views/MatrixView';
import { DashboardView } from '@/components/views/DashboardView';
import { GoalView } from '@/components/views/GoalView';
import { TodayView } from '@/components/views/TodayView';
import { InsightsView } from '@/components/views/InsightsView';
import { useTaskStore } from '@/store/taskStore';

const Index = () => {
  const { activeView, selectedListId } = useUIStore();
  const { goals } = useTaskStore();

  // Dashboard is shown when the "Dashboard" nav item is selected
  const showDashboard = selectedListId === 'dashboard';
  const isGoal = goals.some(g => g.id === selectedListId);
  const isToday = selectedListId === 'today';
  const isInsights = selectedListId === 'insights';

  return (
    <AppLayout>
      {showDashboard ? (
        <DashboardView />
      ) : isGoal ? (
        <GoalView goalId={selectedListId} />
      ) : isToday ? (
        <TodayView />
      ) : isInsights ? (
        <InsightsView />
      ) : (
        <>
          {activeView === 'list' && <ListView />}
          {activeView === 'kanban' && <KanbanView />}
          {activeView === 'calendar' && <CalendarView />}
          {activeView === 'matrix' && <MatrixView />}
        </>
      )}
    </AppLayout>
  );
};

export default Index;
