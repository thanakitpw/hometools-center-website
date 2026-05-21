'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';

const STATUSES = ['new', 'contacted', 'quoted', 'won', 'lost'] as const;
type Status = typeof STATUSES[number];

export async function updateQuote(id: string, fd: FormData) {
  await requireAdmin();
  const status = String(fd.get('status') ?? '') as Status;
  const admin_note = String(fd.get('admin_note') ?? '');
  if (!STATUSES.includes(status)) return { error: 'invalid status' };
  const s = await createClient();
  const { error } = await s.from('quote_requests').update({ status, admin_note }).eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/admin/quotes');
  revalidatePath(`/admin/quotes/${id}`);
}

export async function deleteQuote(id: string) {
  await requireAdmin();
  const s = await createClient();
  const { error } = await s.from('quote_requests').delete().eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/admin/quotes');
}
