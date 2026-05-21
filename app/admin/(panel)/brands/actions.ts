'use server';

import { z } from 'zod';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';

const schema = z.object({
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  name: z.string().min(1),
  logo_url: z.string().url().optional().or(z.literal('')).nullable(),
  banner_url: z.string().url().optional().or(z.literal('')).nullable(),
  description: z.string().optional().nullable(),
  sort_order: z.coerce.number().int().default(0),
});

export async function saveBrand(id: string | null, fd: FormData) {
  await requireAdmin();
  const parsed = schema.parse(Object.fromEntries(fd.entries()));
  const payload = { ...parsed, updated_at: new Date().toISOString() };
  const s = await createClient();
  if (id) {
    const { error } = await s.from('brands').update(payload).eq('id', id);
    if (error) return { error: error.message };
  } else {
    const { data, error } = await s.from('brands').insert(payload).select('id').single();
    if (error) return { error: error.message };
    id = data!.id;
  }
  revalidatePath('/admin/brands');
  redirect(`/admin/brands/${id}`);
}

export async function deleteBrand(id: string) {
  await requireAdmin();
  const s = await createClient();
  const { error } = await s.from('brands').delete().eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/admin/brands');
  redirect('/admin/brands');
}
