import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { CommandPalette } from './CommandPalette';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useUIStore } from '@/store/uiStore';
import { TaskDetailPanel } from '@/components/tasks/TaskDetailPanel';

export const AppLayout = ({ children }: { children: React.ReactNode }) => {
  useKeyboardShortcuts();
  const { detailPanelTaskId } = useUIStore();

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <Header />
        <div className="flex flex-1 overflow-hidden">
          <main className="flex-1 overflow-y-auto">{children}</main>
          {detailPanelTaskId && <TaskDetailPanel taskId={detailPanelTaskId} />}
        </div>
      </div>
      <CommandPalette />
    </div>
  );
};
