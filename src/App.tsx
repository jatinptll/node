import { useEffect } from "react";
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
          <div className="w-[80px] h-[2px] bg-border rounded-sm overflow-hidden relative shadow-[inset_0_1px_2px_rgba(0,0,0,0.5)]">
            <motion.div
              className="absolute top-0 bottom-0 bg-primary rounded-sm shadow-[0_0_8px_hsl(var(--primary))]"
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
  const { loadUserData } = useTaskStore();
  const { loadSyncState } = useClassroomStore();
  const navigate = useNavigate();
  const location = useLocation();

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

      // Always fetch fresh user metadata from server for hidden lists
      // (the user object may come from cached session with stale metadata)
      const restoreHiddenLists = async () => {
        try {
          const { data: { user: freshUser } } = await supabase.auth.getUser();
          const cloudHidden = freshUser?.user_metadata?.hidden_lists;
          if (Array.isArray(cloudHidden)) {
            useUIStore.getState().setHiddenListIds(cloudHidden);
          }
        } catch (err) {
          // Fallback: try from the user object we already have
          const cloudHidden = user.user_metadata?.hidden_lists;
          if (Array.isArray(cloudHidden)) {
            useUIStore.getState().setHiddenListIds(cloudHidden);
          }
        }
      };
      restoreHiddenLists();
    }
  }, [user, isInitialized, loadUserData, loadSyncState]);

  // Re-fetch data when a tab regains visibility (cross-tab sync) and handle bfcache (back button)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && user && isInitialized) {
        initialize(); // Re-verify auth just to be absolutely sure
        loadUserData(user.id);
      }
    };

    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        // We're returning from bfcache (back button)
        // Force an immediate re-check of the session
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

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Index />
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
          <AppContent />
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
