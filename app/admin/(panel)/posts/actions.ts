'use server';

import { z } from 'zod';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';

const schema = z.object({
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  title: z.string().min(1),
  excerpt: z.string().optional().nullable(),
  content_md: z.string().optional().nullable(),
  cover_image_url: z.string().url().optional().or(z.literal('')).nullable(),
  author: z.string().optional().nullable(),
  tags: z.string().optional(),
  category_id: z.string().uuid().optional().nullable(),
  seo_title: z.string().optional().nullable(),
  seo_description: z.string().optional().nullable(),
  og_image_url: z.string().url().optional().or(z.literal('')).nullable(),
  status: z.enum(['draft', 'published', 'archived']),
});

export async function savePost(id: string | null, fd: FormData) {
  await requireAdmin();
  const raw = Object.fromEntries(fd.entries()) as Record<string, string>;
  if (raw.category_id === '') raw.category_id = '';
  const parsed = schema.parse({ ...raw, category_id: raw.category_id === '' ? null : raw.category_id });
  const tags = (parsed.tags ?? '').split(',').map(t => t.trim()).filter(Boolean);
  const { tags: _t, ...rest } = parsed;
  const payload: Record<string, unknown> = {
    ...rest,
    tags,
    updated_at: new Date().toISOString(),
  };
  if (parsed.status === 'published') {
    payload.published_at = payload.published_at ?? new Date().toISOString();
  }
  const s = await createClient();
  if (id) {
    const { error } = await s.from('posts').update(payload).eq('id', id);
    if (error) return { error: error.message };
  } else {
    const { data, error } = await s.from('posts').insert(payload).select('id').single();
    if (error) return { error: error.message };
    id = data!.id;
  }
  revalidatePath('/blog');
  revalidatePath(`/blog/${parsed.slug}`);
  revalidatePath('/admin/posts');
  redirect(`/admin/posts/${id}`);
}

export async function deletePost(id: string, slug: string) {
  await requireAdmin();
  const s = await createClient();
  const { error } = await s.from('posts').delete().eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/blog');
  revalidatePath(`/blog/${slug}`);
  redirect('/admin/posts');
}
