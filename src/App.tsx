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
        {/* Animated background glow */}
        <motion.div
          className="absolute inset-0 z-0 opacity-30 pointer-events-none flex items-center justify-center"
          animate={{
            background: [
              "radial-gradient(circle at center, rgba(124, 58, 237, 0.15) 0%, transparent 40%)",
              "radial-gradient(circle at center, rgba(124, 58, 237, 0.3) 0%, transparent 60%)",
              "radial-gradient(circle at center, rgba(124, 58, 237, 0.15) 0%, transparent 40%)"
            ]
          }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        />

        <div className="relative z-10 flex flex-col items-center gap-8">
          {/* Logo container with float animation */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="relative"
          >
            {/* Outer rotating ring */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
              className="absolute -inset-4 rounded-full border border-purple-500/20 border-t-purple-500/80"
            />

            {/* Inner rotating ring (opposite direction) */}
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
              className="absolute -inset-2 rounded-full border border-purple-400/20 border-b-purple-400/80"
            />

            {/* Core logo block */}
            <motion.div
              animate={{
                y: [-5, 5, -5]
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-800 flex items-center justify-center shadow-[0_0_30px_rgba(124,58,237,0.4)] backdrop-blur-xl border border-white/10 relative overflow-hidden"
            >
              {/* Shimmer effect across the block */}
              <motion.div
                className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12"
                animate={{ translateX: ["-100%", "200%"] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", repeatDelay: 1 }}
              />
              <Diamond className="w-8 h-8 text-white relative z-10 drop-shadow-md" />
            </motion.div>
          </motion.div>

          {/* Loading text with wave animation */}
          <div className="flex flex-col items-center gap-3">
            <div className="flex space-x-1">
              {['L', 'O', 'A', 'D', 'I', 'N', 'G'].map((letter, i) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.5,
                    delay: i * 0.1,
                    repeat: Infinity,
                    repeatType: "reverse",
                    repeatDelay: 2
                  }}
                  className="text-sm tracking-[0.2em] font-medium text-foreground/80 font-mono"
                >
                  {letter}
                </motion.span>
              ))}
            </div>

            {/* Progress line */}
            <div className="w-48 h-[2px] bg-secondary/50 rounded-full overflow-hidden mt-1 relative">
              <motion.div
                className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-purple-600 to-purple-400 rounded-full"
                initial={{ width: "0%", x: "0%" }}
                animate={{
                  width: ["0%", "40%", "100%", "100%"],
                  x: ["0%", "0%", "0%", "100%"]
                }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              />
            </div>
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
  useEffect(() => {
    if (isInitialized && location.hash.includes("access_token=")) {
      navigate(location.pathname + location.search, { replace: true });
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

  // Re-fetch data when a tab regains visibility (cross-tab sync)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && user && isInitialized) {
        loadUserData(user.id);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [user, isInitialized, loadUserData]);

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
