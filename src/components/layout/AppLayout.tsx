import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { CommandPalette } from './CommandPalette';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useUIStore } from '@/store/uiStore';
import { TaskDetailPanel } from '@/components/tasks/TaskDetailPanel';
import { FloatingFeedbackButton } from '@/components/feedback/FloatingFeedbackButton';
import { FeedbackModal } from '@/components/feedback/FeedbackModal';
import { QuickAdd } from './QuickAdd';
import { useIsMobile } from '@/hooks/use-mobile';
import { AnimatePresence, motion } from 'framer-motion';

export const AppLayout = ({ children }: { children: React.ReactNode }) => {
  useKeyboardShortcuts();
  const { detailPanelTaskId, sidebarCollapsed } = useUIStore();
  const isMobile = useIsMobile();
  const showFloatingButtons = !isMobile || sidebarCollapsed;
  const isDetailOpen = !!detailPanelTaskId;

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
      <FeedbackModal />

      {/* Bottom-right button stack with swap animation */}
      <AnimatePresence>
        {showFloatingButtons && (
          <motion.div
            key="floating-stack"
            initial={{ opacity: 0, x: 80 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 80 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="fixed bottom-6 right-6 z-50 flex flex-col items-end justify-end gap-2.5"
          >
            <AnimatePresence mode="popLayout">
              {/* Quick Add — mobile only */}
              {isMobile && (
                <motion.div
                  key="quick-add"
                  layout
                  className="sm:hidden"
                  transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                >
                  <QuickAdd variant="fab" />
                </motion.div>
              )}

              {/* Feedback — hidden when task detail is open */}
              {!isDetailOpen && (
                <motion.div
                  key="feedback"
                  layout
                  initial={{ opacity: 0, scale: 0.6, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.6, y: 10 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                >
                  <FloatingFeedbackButton />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
