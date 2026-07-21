import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { createStaticClient } from '@/lib/supabase/static';
import type { Category } from './types';
import { slugCandidates } from './slug';

export type CategoryWithPath = Category & { path: string };

/**
 * Category URLs on the old WooCommerce site are the full ancestor chain
 * (/product-category/construction-materials-and-equipment/toa-color/decorative-coatings),
 * but `categories.slug` only stores the last segment. Rebuild the chain here so those
 * URLs keep resolving — they're the ones Google has indexed.
 *
 * Pure so `app/sitemap.ts` can reuse it with its own (cookie-free) Supabase client.
 */
export function attachPaths<T extends { id: string; slug: string; parent_id: string | null }>(
  rows: T[]
): (T & { path: string })[] {
  const byId = new Map(rows.map(r => [r.id, r]));
  const cache = new Map<string, string>();

  function pathOf(row: T, seen: Set<string>): string {
    const cached = cache.get(row.id);
    if (cached) return cached;
    const parent = row.parent_id ? byId.get(row.parent_id) : undefined;
    // seen guards against a parent cycle turning this into infinite recursion
    const path = parent && !seen.has(parent.id)
      ? `${pathOf(parent, new Set(seen).add(row.id))}/${row.slug}`
      : row.slug;
    cache.set(row.id, path);
    return path;
  }

  return rows.map(r => ({ ...r, path: pathOf(r, new Set([r.id])) }));
}

export async function listAllCategories() {
  const sb = await createClient();
  const { data, error } = await sb
    .from('categories')
    .select('*')
    .eq('is_published', true)
    .order('sort_order', { ascending: true })
    .order('name_th', { ascending: true });
  if (error) throw error;
  return attachPaths((data || []) as Category[]);
}

export async function getCategoryByPath(path: string) {
  const all = await listAllCategories();
  const candidates = slugCandidates(path);
  return all.find(c => candidates.includes(c.path)) ?? null;
}

/** Used to 301 a bare leaf slug (or a wrong ancestor chain) onto the canonical full path. */
export async function getCategoryBySlug(slug: string) {
  const all = await listAllCategories();
  const candidates = slugCandidates(slug);
  return all.find(c => candidates.includes(c.slug)) ?? null;
}

export async function getCategoryById(id: string | null) {
  if (!id) return null;
  const all = await listAllCategories();
  return all.find(c => c.id === id) ?? null;
}

/** Root → … → parent, for breadcrumbs. Excludes the category itself. */
export async function getCategoryAncestors(cat: CategoryWithPath) {
  const all = await listAllCategories();
  const byId = new Map(all.map(c => [c.id, c]));
  const chain: CategoryWithPath[] = [];
  let cur = cat.parent_id ? byId.get(cat.parent_id) : undefined;
  while (cur && !chain.some(c => c.id === cur!.id)) {
    chain.unshift(cur);
    cur = cur.parent_id ? byId.get(cur.parent_id) : undefined;
  }
  return chain;
}

export async function getChildCategories(parentId: string) {
  const all = await listAllCategories();
  return all
    .filter(c => c.parent_id === parentId)
    .sort((a, b) => a.sort_order - b.sort_order);
}

export async function getAllCategoryPaths() {
  const sb = createStaticClient();
  const { data } = await sb
    .from('categories')
    .select('id, slug, parent_id')
    .eq('is_published', true);
  return attachPaths(data || []).map(c => c.path);
}

// Build a hierarchical tree from flat list
export type CategoryNode = CategoryWithPath & { children: CategoryNode[] };
export function buildTree(flat: CategoryWithPath[]): CategoryNode[] {
  const map = new Map<string, CategoryNode>();
  flat.forEach(c => map.set(c.id, { ...c, children: [] }));
  const roots: CategoryNode[] = [];
  for (const node of map.values()) {
    if (node.parent_id && map.has(node.parent_id)) {
      map.get(node.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}
