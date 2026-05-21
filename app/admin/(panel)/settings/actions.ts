'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';

export async function saveSetting(key: string, fd: FormData) {
  await requireAdmin();
  const entries = Object.fromEntries(fd.entries());
  // Strip non-value keys (like submit)
  const value = entries;
  const s = await createClient();
  const { error } = await s.from('site_settings').upsert({ key, value, updated_at: new Date().toISOString() });
  if (error) return { error: error.message };
  revalidatePath('/');
  revalidatePath('/admin/settings');
  return { ok: true };
}

export async function saveMenu(location: 'header' | 'footer', itemsJson: string) {
  await requireAdmin();
  let items;
  try {
    items = JSON.parse(itemsJson);
    if (!Array.isArray(items)) throw new Error('not array');
  } catch (e) {
    return { error: 'JSON ไม่ถูกต้อง: ' + (e as Error).message };
  }
  const s = await createClient();
  const { error } = await s.from('menus').upsert({ location, items, updated_at: new Date().toISOString() });
  if (error) return { error: error.message };
  revalidatePath('/');
  return { ok: true };
}
