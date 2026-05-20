import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { createStaticClient } from '@/lib/supabase/static';
import type { Product, Category, Brand } from './types';

export async function getProductBySlug(slug: string) {
  const sb = await createClient();
  const { data, error } = await sb
    .from('products')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle();
  if (error) throw error;
  return data as Product | null;
}

export async function getRelatedProducts(productId: string, limit = 4) {
  const sb = await createClient();
  const { data: rel } = await sb
    .from('related_products')
    .select('related_product_id')
    .eq('product_id', productId)
    .order('sort_order', { ascending: true })
    .limit(limit);
  if (!rel?.length) {
    // fallback: same category
    const { data: src } = await sb.from('products').select('primary_category_id').eq('id', productId).single();
    if (src?.primary_category_id) {
      const { data: same } = await sb
        .from('products')
        .select('id, slug, name_th, images, sku')
        .eq('primary_category_id', src.primary_category_id)
        .eq('status', 'published')
        .neq('id', productId)
        .limit(limit);
      return (same || []) as Pick<Product, 'id' | 'slug' | 'name_th' | 'images' | 'sku'>[];
    }
    return [];
  }
  const ids = rel.map(r => r.related_product_id);
  const { data } = await sb
    .from('products')
    .select('id, slug, name_th, images, sku')
    .in('id', ids);
  return (data || []) as Pick<Product, 'id' | 'slug' | 'name_th' | 'images' | 'sku'>[];
}

export async function listProductsByCategory(
  categoryId: string,
  { page = 1, perPage = 12 }: { page?: number; perPage?: number } = {}
) {
  const sb = await createClient();
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;
  const { data, count, error } = await sb
    .from('products')
    .select('id, slug, name_th, images, sku, short_description', { count: 'exact' })
    .eq('primary_category_id', categoryId)
    .eq('status', 'published')
    .order('sort_order', { ascending: true })
    .order('name_th', { ascending: true })
    .range(from, to);
  if (error) throw error;
  return { items: data || [], total: count || 0 };
}

export async function listAllProducts(
  { page = 1, perPage = 16, query = '' }: { page?: number; perPage?: number; query?: string } = {}
) {
  const sb = await createClient();
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;
  let q = sb
    .from('products')
    .select('id, slug, name_th, images, sku, short_description', { count: 'exact' })
    .eq('status', 'published');
  if (query.trim()) q = q.ilike('name_th', `%${query.trim()}%`);
  const { data, count, error } = await q
    .order('name_th', { ascending: true })
    .range(from, to);
  if (error) throw error;
  return { items: data || [], total: count || 0 };
}

export async function getAllProductSlugs() {
  const sb = createStaticClient();
  const { data } = await sb
    .from('products')
    .select('slug')
    .eq('status', 'published');
  return (data || []).map(d => d.slug);
}
