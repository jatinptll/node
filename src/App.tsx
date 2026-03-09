import { useEffect, useState, useRef, lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { useTaskStore } from "@/store/taskStore";
import { useClassroomStore } from "@/store/classroomStore";
import { useUIStore } from "@/store/uiStore";
import { supabase } from "@/integrations/supabase/client";
import Index from "./pages/Index";
import LoginPage from "./pages/Login";
import NotFound from "./pages/NotFound";
import { Loader2, Diamond } from "lucide-react";
import { ThemeProvider } from "@/components/ThemeProvider";
import { motion } from "framer-motion";
import { FocusOverlay } from "@/components/focus/FocusOverlay";
import { MorningPlanModal } from "@/components/planning/MorningPlanModal";
import { CheckInPanel } from "@/components/planning/CheckInPanel";

const AdminFeedbackPage = lazy(() => import("./pages/AdminFeedback"));

const queryClient = new QueryClient();

// Auth-aware route wrapper
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center overflow-hidden">
        <div
          className="relative flex flex-col items-center justify-center w-full h-full"
        >
          {/* Logo container with breathe animation */}
          <motion.div
            className="relative w-[140px] flex justify-center mb-8 z-10"
            animate={{
              opacity: [0.85, 1, 0.85],
              scale: [0.98, 1.02, 0.98],
              filter: [
                "drop-shadow(0 0 8px hsla(263, 70%, 58%, 0.15))",
                "drop-shadow(0 0 16px hsla(263, 70%, 58%, 0.4))",
                "drop-shadow(0 0 8px hsla(263, 70%, 58%, 0.15))"
              ]
            }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          >
            <img src="/node-logo.svg" alt="Node Logo" className="w-full h-auto" />
          </motion.div>

          {/* Sleek indeterminate progress bar */}
          <div className="w-[140px] h-[6px] bg-border rounded-full overflow-hidden relative shadow-[inset_0_1px_2px_rgba(0,0,0,0.5)]">
            <motion.div
              className="absolute top-0 bottom-0 bg-primary rounded-full shadow-[0_0_8px_hsl(var(--primary))]"
              animate={{
                left: ["-50%", "20%", "110%"],
                width: ["30%", "60%", "30%"]
              }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", times: [0, 0.5, 1] }}
            />
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// The auth token cleaning logic is now safely integrated inside AppContent

const AppContent = () => {
  const { initialize, user, isInitialized } = useAuthStore();
  const { loadUserData, isLoaded } = useTaskStore();
  const { loadSyncState } = useClassroomStore();
  const { isDailyPlanNeeded, dailyPlanDismissed, dailyPlanConfirmed, checkInOpen, closeCheckIn } = useUIStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [showMorningPlan, setShowMorningPlan] = useState(false);
  const morningPlanChecked = useRef(false);

  // Initialize auth on mount
  useEffect(() => {
    initialize();
  }, [initialize]);

  // Clean the URL hash safely ONLY after Supabase has been cleanly initialized
  // to avoid exposing the access_token in the browser address bar.
  useEffect(() => {
    if (isInitialized && location.hash.includes("access_token=")) {
      // Clear the hash from react-router's state
      navigate({
        pathname: location.pathname,
        search: location.search,
        hash: ''
      }, { replace: true });
    }
  }, [isInitialized, location, navigate]);

  // Load user data when user changes
  useEffect(() => {
    if (user && isInitialized) {
      loadUserData(user.id);
      loadSyncState(user.id);

      // Restore hidden lists from the user's metadata which is automatically synced locally
      const cloudHidden = user.user_metadata?.hidden_lists;
      if (Array.isArray(cloudHidden)) {
        useUIStore.getState().setHiddenListIds(cloudHidden);
      }
    }
  }, [user, isInitialized, loadUserData, loadSyncState]);

  // Re-fetch data when a tab regains visibility (cross-tab sync) and handle bfcache (back button)
  useEffect(() => {
    let lastLoadTime = Date.now();
    const RELOAD_DEBOUNCE_MS = 30_000; // Only reload if 30+ seconds have passed

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && user && isInitialized) {
        const elapsed = Date.now() - lastLoadTime;
        if (elapsed >= RELOAD_DEBOUNCE_MS) {
          initialize(); // Re-verify auth
          loadUserData(user.id);
          lastLoadTime = Date.now();
        }

        // Re-check if morning plan is needed (handles dismiss-count < 3 re-shows)
        if (morningPlanChecked.current && !useUIStore.getState().dailyPlanConfirmed) {
          const needed = useUIStore.getState().isDailyPlanNeeded();
          if (needed) {
            setShowMorningPlan(true);
          }
        }
      }
    };

    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        // We're returning from bfcache (back button)
        initialize();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pageshow', handlePageShow);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, [user, isInitialized, loadUserData, initialize]);

  // Show morning plan modal on first daily open
  useEffect(() => {
    if (user && isLoaded && !morningPlanChecked.current) {
      morningPlanChecked.current = true;
      if (isDailyPlanNeeded()) {
        setTimeout(() => setShowMorningPlan(true), 800);
      }
    }
  }, [user, isLoaded, isDailyPlanNeeded]);

  // When the modal is dismissed, hide it. The 3-dismiss logic in uiStore handles whether
  // it should come back on next visibility change.
  useEffect(() => {
    if (dailyPlanDismissed || dailyPlanConfirmed) {
      setShowMorningPlan(false);
    }
  }, [dailyPlanDismissed, dailyPlanConfirmed]);

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Index />
            {showMorningPlan && !dailyPlanDismissed && !dailyPlanConfirmed && (
              <MorningPlanModal />
            )}
            {checkInOpen && <CheckInPanel onClose={closeCheckIn} />}
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/feedback"
        element={
          <ProtectedRoute>
            <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><p className="text-muted-foreground">Loading...</p></div>}>
              <AdminFeedbackPage />
            </Suspense>
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <ThemeProvider defaultTheme="system" enableSystem attribute="class">
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrowserRouter>
          <Toaster />
          <Sonner />
          <FocusOverlay />
          <AppContent />
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
