import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { quoteSchema } from '@/lib/validators';
import { notify } from '@/lib/notify';

export async function POST(req: NextRequest) {
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'invalid json' }, { status: 400 }); }

  const parsed = quoteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'validation', issues: parsed.error.issues }, { status: 422 });
  }
  if (parsed.data.honeypot) return NextResponse.json({ ok: true }, { status: 200 });  // silent for bots

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null;
  const ua = req.headers.get('user-agent') || null;

  const sb = createAdminClient();
  const { error } = await sb.from('quote_requests').insert({
    name: parsed.data.name,
    phone: parsed.data.phone,
    email: parsed.data.email || null,
    company: parsed.data.company || null,
    message: parsed.data.message || null,
    items: parsed.data.items || [],
    source_page: parsed.data.source_page || null,
    ip_address: ip,
    user_agent: ua,
  });
  if (error) {
    console.error('quote insert:', error);
    return NextResponse.json({ error: 'db' }, { status: 500 });
  }

  // Fire-and-forget notify (don't block response)
  notify({
    kind: 'quote',
    name: parsed.data.name,
    phone: parsed.data.phone,
    email: parsed.data.email || null,
    company: parsed.data.company || null,
    message: parsed.data.message || null,
    items: parsed.data.items,
    source_page: parsed.data.source_page || null,
  }).catch(e => console.error('notify:', e));

  return NextResponse.json({ ok: true });
}
