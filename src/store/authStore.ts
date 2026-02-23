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

    initialize: async () => {
        try {
            // Get current session
            const { data: { session } } = await supabase.auth.getSession();
            let user = session?.user ?? null;

            if (user) {
                // Fetch fresh user data from server to get the latest metadata
                const { data: { user: freshUser } } = await supabase.auth.getUser();
                if (freshUser) {
                    user = freshUser;
                }
            }

            set({
                user,
                session,
                isLoading: false,
                isInitialized: true,
            });

            // Listen for auth changes
            supabase.auth.onAuthStateChange((_event, session) => {
                set({
                    user: session?.user ?? null,
                    session,
                    isLoading: false,
                });
            });
        } catch (error) {
            console.error('Auth initialization failed:', error);
            set({ isLoading: false, isInitialized: true });
        }
    },

    signInWithGoogle: async () => {
        set({ isLoading: true });
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                scopes: [
                    'https://www.googleapis.com/auth/classroom.courses.readonly',
                    'https://www.googleapis.com/auth/classroom.coursework.me.readonly',
                    'https://www.googleapis.com/auth/classroom.student-submissions.me.readonly',
                ].join(' '),
                redirectTo: window.location.origin,
                queryParams: {
                    access_type: 'offline',
                    prompt: 'consent',
                },
            },
        });
        if (error) {
            set({ isLoading: false });
            throw error;
        }
    },

    signOut: async () => {
        set({ isLoading: true });
        const { error } = await supabase.auth.signOut();
        if (error) {
            set({ isLoading: false });
            throw error;
        }
        set({ user: null, session: null, isLoading: false });
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
