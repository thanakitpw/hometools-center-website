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

type Rule = { from_path: string; to_path: string; status_code: number };

// middleware ทำงานทุกครั้งที่มีคนเปิดหน้า ถ้า query Supabase ทุกครั้งจะช้าและเปลือง
// จึงโหลดตาราง redirects (~100 แถว) ทั้งก้อนเก็บไว้ใน memory แล้วโหลดใหม่ทุก 5 นาที
// แก้ redirect ในหลังบ้านแล้วจะมีผลภายใน 5 นาที
const TTL_MS = 5 * 60 * 1000;
let rules: Map<string, Rule> | null = null;
let loadedAt = 0;
let inflight: Promise<Map<string, Rule> | null> | null = null;

async function loadRules() {
  const { data, error } = await anon()
    .from('redirects')
    .select('from_path, to_path, status_code')
    .range(0, 9999);
  if (error || !data) return null;
  const map = new Map<string, Rule>();
  for (const r of data as Rule[]) if (!map.has(r.from_path)) map.set(r.from_path, r);
  return map;
}

async function getRules() {
  if (rules && Date.now() - loadedAt < TTL_MS) return rules;
  inflight ??= loadRules().finally(() => {
    inflight = null;
  });
  const fresh = await inflight;
  if (fresh) {
    rules = fresh;
    loadedAt = Date.now();
  }
  // โหลดไม่สำเร็จ → ใช้ชุดเดิมที่มีอยู่ไปก่อน (ถ้ายังไม่เคยโหลดได้เลยก็ถือว่าไม่มี redirect)
  return rules;
}

export async function findRedirect(fromPath: string) {
  // `from_path` holds the decoded form ('/product/ท่อ-pb/') but the wire always carries
  // it percent-encoded, so match on both. Each form is tried with and without the
  // trailing slash, since WordPress emitted the slash and inbound links vary.
  const forms = Array.from(new Set([fromPath, safeDecode(fromPath)]));
  const candidates = Array.from(
    new Set(forms.flatMap(f => [f, f.replace(/\/?$/, '/'), f.replace(/\/$/, '')]))
  );
  const map = await getRules();
  if (!map) return null;
  for (const c of candidates) {
    const hit = map.get(c);
    if (hit) return hit;
  }
  return null;
}
