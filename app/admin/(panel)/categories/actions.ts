'use server';

import { z } from 'zod';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';

const schema = z.object({
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  name_th: z.string().min(1),
  name_en: z.string().optional().nullable(),
  parent_id: z.string().uuid().optional().nullable(),
  description: z.string().optional().nullable(),
  banner_image_url: z.string().url().optional().or(z.literal('')).nullable(),
  seo_title: z.string().optional().nullable(),
  seo_description: z.string().optional().nullable(),
  sort_order: z.coerce.number().int().default(0),
  is_published: z.coerce.boolean().default(true),
});

export async function saveCategory(id: string | null, fd: FormData) {
  await requireAdmin();
  const raw = Object.fromEntries(fd.entries());
  if (raw.parent_id === '') raw.parent_id = '';
  const parsed = schema.parse({
    ...raw,
    parent_id: raw.parent_id === '' ? null : raw.parent_id,
    is_published: raw.is_published === 'on' || raw.is_published === 'true',
  });
  const payload = { ...parsed, updated_at: new Date().toISOString() };
  const s = await createClient();
  if (id) {
    if (parsed.parent_id === id) return { error: 'หมวดหมู่ไม่สามารถเป็นพ่อของตัวเองได้' };
    const { error } = await s.from('categories').update(payload).eq('id', id);
    if (error) return { error: error.message };
  } else {
    const { data, error } = await s.from('categories').insert(payload).select('id').single();
    if (error) return { error: error.message };
    id = data!.id;
  }
  revalidatePath('/admin/categories');
  revalidatePath('/shop');
  redirect(`/admin/categories/${id}`);
}

export async function deleteCategory(id: string) {
  await requireAdmin();
  const s = await createClient();
  const { error } = await s.from('categories').delete().eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/admin/categories');
  redirect('/admin/categories');
}
