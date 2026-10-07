import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// Admin client that bypasses Row Level Security.
// ONLY use in server code (route handlers, server actions) — never import into client components.
export function createClient() {
    if (typeof window !== 'undefined') {
        throw new Error("The service role client must not be used in the browser.");
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceRoleKey) {
        throw new Error("Supabase URL or Service Role Key is not defined in environment variables.");
    }

    return createSupabaseClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: {
            // No user session: every request runs with the service role
            autoRefreshToken: false,
            persistSession: false,
            detectSessionInUrl: false,
        },
    });
}
