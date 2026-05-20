import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { contactSchema } from '@/lib/validators';
import { notify } from '@/lib/notify';

export async function POST(req: NextRequest) {
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'invalid json' }, { status: 400 }); }

  const parsed = contactSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'validation', issues: parsed.error.issues }, { status: 422 });
  }
  if (parsed.data.honeypot) return NextResponse.json({ ok: true });

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null;
  const ua = req.headers.get('user-agent') || null;

  const sb = createAdminClient();
  const { error } = await sb.from('contact_messages').insert({
    name: parsed.data.name,
    phone: parsed.data.phone || null,
    email: parsed.data.email || null,
    subject: parsed.data.subject || null,
    message: parsed.data.message,
    source_page: parsed.data.source_page || null,
    ip_address: ip,
    user_agent: ua,
  });
  if (error) {
    console.error('contact insert:', error);
    return NextResponse.json({ error: 'db' }, { status: 500 });
  }

  notify({
    kind: 'contact',
    name: parsed.data.name,
    phone: parsed.data.phone || '',
    email: parsed.data.email || null,
    message: `${parsed.data.subject ? `[${parsed.data.subject}] ` : ''}${parsed.data.message}`,
    source_page: parsed.data.source_page || null,
  }).catch(e => console.error('notify:', e));

  return NextResponse.json({ ok: true });
}
