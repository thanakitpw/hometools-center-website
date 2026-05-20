import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// Anon client — runs in middleware (Edge or Node) where next/headers can't be used.
function anon() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

export async function findRedirect(fromPath: string) {
  const sb = anon();
  // try exact + with trailing slash
  const candidates = Array.from(new Set([fromPath, fromPath.replace(/\/?$/, '/'), fromPath.replace(/\/$/, '')]));
  const { data } = await sb
    .from('redirects')
    .select('from_path, to_path, status_code')
    .in('from_path', candidates)
    .limit(1);
  return data?.[0] || null;
}
