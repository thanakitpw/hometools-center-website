import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export const dynamic = 'force-dynamic';

type Row = { id: string; slug: string; name_th: string; parent_id: string | null; sort_order: number; is_published: boolean };

function buildTree(rows: Row[]) {
  const map = new Map<string, Row & { children: Row[] }>();
  rows.forEach(r => map.set(r.id, { ...r, children: [] }));
  const roots: (Row & { children: Row[] })[] = [];
  map.forEach(node => {
    if (node.parent_id && map.has(node.parent_id)) {
      map.get(node.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  });
  return roots;
}

function renderNode(node: Row & { children: Row[] }, depth = 0): React.ReactNode {
  return (
    <div key={node.id}>
      <Link href={`/admin/categories/${node.id}`} className="flex items-center justify-between py-2 px-3 hover:bg-slate-50 rounded">
        <span className="flex items-center gap-2" style={{ paddingLeft: depth * 20 }}>
          {depth > 0 && <span className="text-slate-300">└</span>}
          <span className="font-medium">{node.name_th}</span>
          <span className="text-xs text-slate-400 font-mono">{node.slug}</span>
          {!node.is_published && <span className="text-xs text-slate-400">(ซ่อน)</span>}
        </span>
        <span className="text-xs text-slate-400">#{node.sort_order}</span>
      </Link>
      {node.children.map(c => renderNode(c as Row & { children: Row[] }, depth + 1))}
    </div>
  );
}

export default async function CategoriesPage() {
  const s = await createClient();
  const { data } = await s.from('categories').select('id, slug, name_th, parent_id, sort_order, is_published').order('sort_order').order('name_th');
  const tree = buildTree(data ?? []);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">หมวดหมู่ ({data?.length ?? 0})</h1>
        <Button asChild><Link href="/admin/categories/new"><Plus className="w-4 h-4 mr-1" /> เพิ่มหมวดหมู่</Link></Button>
      </div>
      <div className="bg-white border rounded-lg p-2">
        {tree.length === 0 ? <p className="text-center py-12 text-slate-500">ยังไม่มีหมวดหมู่</p> : tree.map(n => renderNode(n))}
      </div>
    </div>
  );
}
