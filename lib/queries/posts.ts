import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { createStaticClient } from '@/lib/supabase/static';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Post } from './types';
import { slugCandidates } from './slug';
import { SHOW_DRAFTS, VISIBLE_STATUSES } from '@/lib/preview';

/**
 * Drafts are hidden by RLS ("public read published posts" allows status = 'published'
 * only), not merely by the query filter — so widening VISIBLE_STATUSES is not enough on
 * its own and a preview build has to read through the service role.
 *
 * Production never takes this branch: SHOW_DRAFTS is false there, so public pages keep
 * going through the anon client and RLS stays the backstop it was designed to be.
 */
async function readClient() {
  return SHOW_DRAFTS ? createAdminClient() : await createClient();
}

export async function getPostBySlug(slug: string) {
  const sb = await readClient();
  const { data, error } = await sb
    .from('posts')
    .select('*')
    .in('slug', slugCandidates(slug))
    .in('status', VISIBLE_STATUSES)
    .maybeSingle();
  if (error) throw error;
  return data as Post | null;
}

export async function listPosts({ page = 1, perPage = 12 }: { page?: number; perPage?: number } = {}) {
  const sb = await readClient();
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;
  const { data, count, error } = await sb
    .from('posts')
    .select('id, slug, title, cover_image_url, published_at, tags, excerpt, status', { count: 'exact' })
    .in('status', VISIBLE_STATUSES)
    .order('published_at', { ascending: false, nullsFirst: false })
    .range(from, to);
  if (error) throw error;
  return { items: data || [], total: count || 0 };
}

export async function getAllPostSlugs() {
  const sb = SHOW_DRAFTS ? createAdminClient() : createStaticClient();
  const { data } = await sb.from('posts').select('slug').in('status', VISIBLE_STATUSES);
  return (data || []).map(d => d.slug);
}

export async function getRelatedPosts(currentSlug: string, limit = 3) {
  const sb = await readClient();
  const { data } = await sb
    .from('posts')
    .select('id, slug, title, cover_image_url, published_at')
    .in('status', VISIBLE_STATUSES)
    .neq('slug', currentSlug)
    .order('published_at', { ascending: false })
    .limit(limit);
  return data || [];
}
