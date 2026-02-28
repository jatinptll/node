/**
 * Auth Store - Manages Supabase authentication state
 * Supports Google OAuth sign-in via Supabase Auth
 */
import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

interface AuthState {
    user: User | null;
    session: Session | null;
    isLoading: boolean;
    isInitialized: boolean;
    isInitializing: boolean;

    initialize: () => Promise<void>;
    signInWithGoogle: () => Promise<void>;
    signOut: () => Promise<void>;
    updateProfile: (newName: string) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
    user: null,
    session: null,
    isLoading: true,
    isInitialized: false,
    isInitializing: false,

    initialize: async () => {
        try {
            // Prevent duplicate listeners if already initialized or checking
            if (get().isInitialized || get().isInitializing) {
                if (get().isInitialized) {
                    // We're already initialized. We just refresh the local session state silently
                    const { data: { session }, error } = await supabase.auth.getSession();
                    // DO NOT log out the user silently if getSession fails momentarily (e.g., network glitch)
                    if (!error && session) {
                        set({ user: session.user, session });
                    }
                }
                return;
            }

            set({ isInitializing: true });

            // Get current session
            const { data: { session } } = await supabase.auth.getSession();
            const user = session?.user ?? null;

            // Clean up the URL by removing the OAuth tokens from the hash fragment
            if (window.location.hash && window.location.hash.includes('access_token=')) {
                window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
            }

            set({
                user,
                session,
                isLoading: false,
                isInitialized: true,
                isInitializing: false,
            });

            // Listen for auth changes (skip INITIAL_SESSION — we handle init above)
            supabase.auth.onAuthStateChange(async (_event, newSession) => {
                if (_event === 'SIGNED_IN' && window.location.hash.includes('access_token=')) {
                    window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
                }

                if (_event === 'INITIAL_SESSION') return;

                set({
                    user: newSession?.user ?? null,
                    session: newSession,
                    isLoading: false,
                });
            });
        } catch (error) {
            console.error('Auth initialization failed:', error);
            set({ isLoading: false, isInitialized: true, isInitializing: false });
        }
    },

    signInWithGoogle: async () => {
        set({ isLoading: true });
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin,
            },
        });
        if (error) {
            set({ isLoading: false });
            throw error;
        }
    },

    signOut: async () => {
        set({ isLoading: true });

        // Tell Supabase to clear the session globally! 
        // Removing { scope: 'local' } ensures the backend revokes the refresh token.
        try {
            await supabase.auth.signOut();
        } catch (error) {
            console.error('Supabase global signOut error:', error);
        }

        // Clear local state
        set({ user: null, session: null, isLoading: false, isInitialized: true });

        // Forcefully clear session storage and local storage fallbacks
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith('sb-')) localStorage.removeItem(key);
        });

        // 1. Dumps all JS memory/React state instantly.
        // 2. Uses replace() so the current history entry is overwritten, preventing back navigation.
        window.location.replace('/login');
    },

    updateProfile: async (newName: string) => {
        set({ isLoading: true });
        const { data, error } = await supabase.auth.updateUser({
            data: { custom_name: newName }
        });
        if (error) {
            set({ isLoading: false });
            throw error;
        }
        set({ user: data.user, isLoading: false });
    },
}));
