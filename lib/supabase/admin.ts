import { createClient as createSupabase } from '@supabase/supabase-js';

/**
 * Service-role client — bypasses RLS. Use only in trusted server contexts:
 *  - migration scripts
 *  - admin background jobs
 *  - import pipelines
 *
 * NEVER expose this client to the browser.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase admin env vars');
  return createSupabase(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
