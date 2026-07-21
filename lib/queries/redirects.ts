import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// Anon client — runs in middleware (Edge or Node) where next/headers can't be used.
function anon() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

function safeDecode(p: string) {
  try {
    return decodeURIComponent(p);
  } catch {
    return p; // malformed escape (e.g. a literal '%' in the path) — match on it verbatim
  }
}

export async function findRedirect(fromPath: string) {
  const sb = anon();
  // `from_path` holds the decoded form ('/product/ท่อ-pb/') but the wire always carries
  // it percent-encoded, so match on both. Each form is tried with and without the
  // trailing slash, since WordPress emitted the slash and inbound links vary.
  const forms = Array.from(new Set([fromPath, safeDecode(fromPath)]));
  const candidates = Array.from(
    new Set(forms.flatMap(f => [f, f.replace(/\/?$/, '/'), f.replace(/\/$/, '')]))
  );
  const { data } = await sb
    .from('redirects')
    .select('from_path, to_path, status_code')
    .in('from_path', candidates)
    .limit(1);
  return data?.[0] || null;
}
