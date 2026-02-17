import { useUIStore } from '@/store/uiStore';
import { AppLayout } from '@/components/layout/AppLayout';
import { ListView } from '@/components/views/ListView';
import { KanbanView } from '@/components/views/KanbanView';
import { CalendarView } from '@/components/views/CalendarView';
import { MatrixView } from '@/components/views/MatrixView';
import { TimelineView } from '@/components/views/TimelineView';

const Index = () => {
  const { activeView } = useUIStore();

  return (
    <AppLayout>
      {activeView === 'list' && <ListView />}
      {activeView === 'kanban' && <KanbanView />}
      {activeView === 'calendar' && <CalendarView />}
      {activeView === 'matrix' && <MatrixView />}
      {activeView === 'timeline' && <TimelineView />}
    </AppLayout>
  );
};

export default Index;
