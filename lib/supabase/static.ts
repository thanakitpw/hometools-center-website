import { createClient as createSupabase } from '@supabase/supabase-js';

/**
 * Static / build-time client — no cookies, no session.
 * Use inside generateStaticParams, sitemap, and other contexts where next/headers isn't available.
 */
export function createStaticClient() {
  return createSupabase(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
