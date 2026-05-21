'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';

const STATUSES = ['new', 'read', 'replied', 'archived'] as const;

export async function updateMessage(id: string, fd: FormData) {
  await requireAdmin();
  const status = String(fd.get('status') ?? '');
  if (!(STATUSES as readonly string[]).includes(status)) return { error: 'invalid status' };
  const s = await createClient();
  const { error } = await s.from('contact_messages').update({ status }).eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/admin/messages');
  revalidatePath(`/admin/messages/${id}`);
}

export async function deleteMessage(id: string) {
  await requireAdmin();
  const s = await createClient();
  const { error } = await s.from('contact_messages').delete().eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/admin/messages');
}
