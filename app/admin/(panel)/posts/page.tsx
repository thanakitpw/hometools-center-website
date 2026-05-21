import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

export const dynamic = 'force-dynamic';

export default async function PostsPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  const { q = '', status } = await searchParams;
  const s = await createClient();
  let query = s.from('posts').select('id, slug, title, status, published_at, updated_at, author').order('updated_at', { ascending: false });
  if (q) query = query.or(`title.ilike.%${q}%,slug.ilike.%${q}%`);
  if (status) query = query.eq('status', status);
  const { data: posts } = await query;
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">บทความ ({posts?.length ?? 0})</h1>
        <Button asChild><Link href="/admin/posts/new"><Plus className="w-4 h-4 mr-1" /> เพิ่มบทความ</Link></Button>
      </div>
      <form className="flex gap-2 items-center bg-white border rounded-lg p-3">
        <input name="q" defaultValue={q} placeholder="ค้นหา หัวเรื่อง / slug" className="flex-1 px-3 py-1.5 border rounded-md text-sm" />
        <select name="status" defaultValue={status ?? ''} className="px-3 py-1.5 border rounded-md text-sm bg-white">
          <option value="">ทุกสถานะ</option>
          <option value="published">เผยแพร่</option>
          <option value="draft">ฉบับร่าง</option>
          <option value="archived">เก็บถาวร</option>
        </select>
        <Button type="submit" variant="outline" size="sm">ค้นหา</Button>
      </form>
      <div className="bg-white border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow><TableHead>หัวเรื่อง</TableHead><TableHead>ผู้เขียน</TableHead><TableHead>สถานะ</TableHead><TableHead>เผยแพร่</TableHead></TableRow>
          </TableHeader>
          <TableBody>
            {(posts ?? []).map(p => (
              <TableRow key={p.id} className="hover:bg-slate-50">
                <TableCell>
                  <Link href={`/admin/posts/${p.id}`} className="font-medium hover:underline">{p.title}</Link>
                  <div className="text-xs text-slate-400 font-mono">{p.slug}</div>
                </TableCell>
                <TableCell className="text-slate-500">{p.author || '—'}</TableCell>
                <TableCell><Badge variant={p.status === 'published' ? 'default' : 'secondary'}>{p.status}</Badge></TableCell>
                <TableCell className="text-slate-500 text-sm">{p.published_at ? new Date(p.published_at).toLocaleDateString('th-TH') : '—'}</TableCell>
              </TableRow>
            ))}
            {(posts ?? []).length === 0 && <TableRow><TableCell colSpan={4} className="text-center py-12 text-slate-500">ไม่พบบทความ</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
