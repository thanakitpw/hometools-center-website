'use server';

import { z } from 'zod';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';

const schema = z.object({
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/, 'slug ต้องเป็นตัวพิมพ์เล็ก/ตัวเลข/ขีดกลาง'),
  sku: z.string().optional().nullable(),
  name_th: z.string().min(1, 'ชื่อสินค้าจำเป็น'),
  name_en: z.string().optional().nullable(),
  short_description: z.string().optional().nullable(),
  description_md: z.string().optional().nullable(),
  brand_id: z.string().uuid().optional().nullable(),
  primary_category_id: z.string().uuid().optional().nullable(),
  package_size: z.string().optional().nullable(),
  catalog_pdf_url: z.string().url().optional().or(z.literal('')).nullable(),
  seo_title: z.string().optional().nullable(),
  seo_description: z.string().optional().nullable(),
  og_image_url: z.string().url().optional().or(z.literal('')).nullable(),
  status: z.enum(['draft', 'published', 'archived']),
  sort_order: z.coerce.number().int().default(0),
  images: z.string().optional(), // newline-separated URLs
});

function parseForm(fd: FormData) {
  const raw = Object.fromEntries(fd.entries());
  const data: Record<string, unknown> = { ...raw };
  ['brand_id', 'primary_category_id'].forEach((k) => {
    if (data[k] === '') data[k] = null;
  });
  return schema.parse(data);
}

export async function saveProduct(id: string | null, fd: FormData) {
  await requireAdmin();
  const parsed = parseForm(fd);
  const images = (parsed.images ?? '')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);

  const { images: _ignore, ...rest } = parsed;
  const payload = {
    ...rest,
    images,
    updated_at: new Date().toISOString(),
  };

  const s = await createClient();
  if (id) {
    const { error } = await s.from('products').update(payload).eq('id', id);
    if (error) return { error: error.message };
  } else {
    const { data, error } = await s.from('products').insert(payload).select('id').single();
    if (error) return { error: error.message };
    id = data!.id;
  }

  revalidatePath('/shop');
  revalidatePath(`/product/${payload.slug}`);
  revalidatePath('/admin/products');
  redirect(`/admin/products/${id}`);
}

export async function deleteProduct(id: string, slug: string) {
  await requireAdmin();
  const s = await createClient();
  const { error } = await s.from('products').delete().eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/shop');
  revalidatePath(`/product/${slug}`);
  revalidatePath('/admin/products');
  redirect('/admin/products');
}
