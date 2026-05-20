import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { createStaticClient } from '@/lib/supabase/static';
import type { Post } from './types';

export async function getPostBySlug(slug: string) {
  const sb = await createClient();
  const { data, error } = await sb
    .from('posts')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle();
  if (error) throw error;
  return data as Post | null;
}

export async function listPosts({ page = 1, perPage = 12 }: { page?: number; perPage?: number } = {}) {
  const sb = await createClient();
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;
  const { data, count, error } = await sb
    .from('posts')
    .select('id, slug, title, cover_image_url, published_at, tags, excerpt', { count: 'exact' })
    .eq('status', 'published')
    .order('published_at', { ascending: false, nullsFirst: false })
    .range(from, to);
  if (error) throw error;
  return { items: data || [], total: count || 0 };
}

export async function getAllPostSlugs() {
  const sb = createStaticClient();
  const { data } = await sb.from('posts').select('slug').eq('status', 'published');
  return (data || []).map(d => d.slug);
}

export async function getRelatedPosts(currentSlug: string, limit = 3) {
  const sb = await createClient();
  const { data } = await sb
    .from('posts')
    .select('id, slug, title, cover_image_url, published_at')
    .eq('status', 'published')
    .neq('slug', currentSlug)
    .order('published_at', { ascending: false })
    .limit(limit);
  return data || [];
}
