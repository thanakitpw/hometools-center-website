import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function csvEscape(v: unknown): string {
  if (v == null) return '';
  const s = typeof v === 'string' ? v : JSON.stringify(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET() {
  await requireAdmin();
  const s = await createClient();
  const { data } = await s.from('quote_requests').select('*').order('created_at', { ascending: false });
  const cols = ['created_at', 'status', 'name', 'phone', 'email', 'company', 'message', 'items', 'source_page', 'admin_note'];
  const header = cols.join(',');
  const rows = (data ?? []).map(r => cols.map(c => csvEscape((r as Record<string, unknown>)[c])).join(','));
  const csv = '﻿' + [header, ...rows].join('\n');
  const filename = `quotes-${new Date().toISOString().slice(0, 10)}.csv`;
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
