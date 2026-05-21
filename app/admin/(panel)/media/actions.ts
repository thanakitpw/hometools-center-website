'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth';

export async function updateAlt(id: string, alt_text: string) {
  await requireAdmin();
  const s = await createClient();
  const { error } = await s.from('media').update({ alt_text }).eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/admin/media');
}

export async function deleteMedia(id: string, path: string) {
  await requireAdmin();
  const admin = createAdminClient();
  await admin.storage.from('media').remove([path]);
  const s = await createClient();
  const { error } = await s.from('media').delete().eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/admin/media');
}
