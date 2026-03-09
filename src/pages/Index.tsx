import { lazy, Suspense } from 'react';
import { useUIStore } from '@/store/uiStore';
import { AppLayout } from '@/components/layout/AppLayout';
import { ListView } from '@/components/views/ListView';
import { DashboardView } from '@/components/views/DashboardView';
import { GoalView } from '@/components/views/GoalView';
import { TodayView } from '@/components/views/TodayView';
import { useTaskStore } from '@/store/taskStore';
import { motion } from 'framer-motion';

// Lazy load heavy views — only loaded when navigated to
const KanbanView = lazy(() => import('@/components/views/KanbanView').then(m => ({ default: m.KanbanView })));
const CalendarView = lazy(() => import('@/components/views/CalendarView').then(m => ({ default: m.CalendarView })));
const InsightsView = lazy(() => import('@/components/views/InsightsView').then(m => ({ default: m.InsightsView })));
const MatrixView = lazy(() => import('@/components/views/MatrixView').then(m => ({ default: m.MatrixView })));

// Loading fallback — minimal purple progress bar
const ViewLoader = () => (
  <div className="w-full pt-1">
    <div className="h-[3px] w-full bg-border rounded-full overflow-hidden">
      <motion.div
        className="h-full bg-primary rounded-full"
        animate={{ left: ['-30%', '100%'] }}
        transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
        style={{ position: 'relative', width: '30%' }}
      />
    </div>
  </div>
);

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
        <Suspense fallback={<ViewLoader />}>
          <InsightsView />
        </Suspense>
      ) : (
        <>
          {activeView === 'list' && <ListView />}
          {activeView === 'kanban' && (
            <Suspense fallback={<ViewLoader />}>
              <KanbanView />
            </Suspense>
          )}
          {activeView === 'calendar' && (
            <Suspense fallback={<ViewLoader />}>
              <CalendarView />
            </Suspense>
          )}
          {activeView === 'matrix' && (
            <Suspense fallback={<ViewLoader />}>
              <MatrixView />
            </Suspense>
          )}
        </>
      )}
    </AppLayout>
  );
};

export default Index;
