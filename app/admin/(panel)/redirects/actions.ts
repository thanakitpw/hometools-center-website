'use server';

import { z } from 'zod';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';

const schema = z.object({
  from_path: z.string().min(1).startsWith('/'),
  to_path: z.string().min(1).startsWith('/'),
  status_code: z.coerce.number().refine(v => [301, 302, 307, 308].includes(v)),
  note: z.string().optional().nullable(),
});

export async function saveRedirect(id: string | null, fd: FormData) {
  await requireAdmin();
  const parsed = schema.parse(Object.fromEntries(fd.entries()));
  const s = await createClient();
  if (id) {
    const { error } = await s.from('redirects').update(parsed).eq('id', id);
    if (error) return { error: error.message };
  } else {
    const { error } = await s.from('redirects').insert(parsed);
    if (error) return { error: error.message };
  }
  revalidatePath('/admin/redirects');
  redirect('/admin/redirects');
}

export async function deleteRedirect(id: string) {
  await requireAdmin();
  const s = await createClient();
  const { error } = await s.from('redirects').delete().eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/admin/redirects');
}
