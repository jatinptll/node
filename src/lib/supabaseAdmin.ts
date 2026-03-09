/**
 * Admin Supabase client — uses the service role key to bypass RLS.
 * ONLY import this in admin-gated components. Never expose to regular users.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

let _adminClient: SupabaseClient | null = null;

function getAdminClient(): SupabaseClient | null {
    if (_adminClient) return _adminClient;
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
        console.warn('supabaseAdmin: Missing VITE_SUPABASE_URL or VITE_SUPABASE_SERVICE_ROLE_KEY. Admin client unavailable.');
        return null;
    }
    _adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
    });
    return _adminClient;
}

export const supabaseAdmin = new Proxy({} as SupabaseClient, {
    get(_target, prop) {
        const client = getAdminClient();
        if (!client) {
            // Return a no-op that resolves with an error for .from() chains
            if (prop === 'from') {
                return () => ({
                    select: () => Promise.resolve({ data: null, error: { message: 'Admin client not configured' } }),
                    insert: () => Promise.resolve({ data: null, error: { message: 'Admin client not configured' } }),
                    update: () => ({
                        eq: () => Promise.resolve({ data: null, error: { message: 'Admin client not configured' } }),
                    }),
                });
            }
            return undefined;
        }
        return (client as any)[prop];
    },
});
