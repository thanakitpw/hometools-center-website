import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { createStaticClient } from '@/lib/supabase/static';
import type { Category } from './types';

export async function getCategoryBySlug(slug: string) {
  const sb = await createClient();
  const { data, error } = await sb
    .from('categories')
    .select('*')
    .eq('slug', slug)
    .eq('is_published', true)
    .maybeSingle();
  if (error) throw error;
  return data as Category | null;
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
  return (data || []) as Category[];
}

export async function getChildCategories(parentId: string) {
  const sb = await createClient();
  const { data, error } = await sb
    .from('categories')
    .select('*')
    .eq('parent_id', parentId)
    .eq('is_published', true)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data || []) as Category[];
}

export async function getAllCategorySlugs() {
  const sb = createStaticClient();
  const { data } = await sb.from('categories').select('slug').eq('is_published', true);
  return (data || []).map(d => d.slug);
}

// Build a hierarchical tree from flat list
export type CategoryNode = Category & { children: CategoryNode[] };
export function buildTree(flat: Category[]): CategoryNode[] {
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
