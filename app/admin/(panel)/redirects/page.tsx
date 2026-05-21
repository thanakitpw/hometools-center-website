import { createClient } from '@/lib/supabase/server';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import DeleteButton from './delete-button';

export const dynamic = 'force-dynamic';

export default async function RedirectsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = '' } = await searchParams;
  const s = await createClient();
  let query = s.from('redirects').select('id, from_path, to_path, status_code, hit_count, last_hit_at, note').order('hit_count', { ascending: false });
  if (q) query = query.or(`from_path.ilike.%${q}%,to_path.ilike.%${q}%`);
  const { data } = await query;
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Redirects ({data?.length ?? 0})</h1>
        <Button asChild><Link href="/admin/redirects/new"><Plus className="w-4 h-4 mr-1" /> เพิ่ม Redirect</Link></Button>
      </div>
      <form className="flex gap-2 items-center bg-white border rounded-lg p-3">
        <input name="q" defaultValue={q} placeholder="ค้นหา path" className="flex-1 px-3 py-1.5 border rounded-md text-sm" />
        <Button type="submit" variant="outline" size="sm">ค้นหา</Button>
      </form>
      <div className="bg-white border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>From</TableHead><TableHead>To</TableHead><TableHead>Code</TableHead>
              <TableHead>Hits</TableHead><TableHead>Note</TableHead><TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(data ?? []).map(r => (
              <TableRow key={r.id} className="hover:bg-slate-50">
                <TableCell className="font-mono text-xs"><Link href={`/admin/redirects/${r.id}`} className="hover:underline">{r.from_path}</Link></TableCell>
                <TableCell className="font-mono text-xs text-slate-500">{r.to_path}</TableCell>
                <TableCell><Badge variant="secondary">{r.status_code}</Badge></TableCell>
                <TableCell>{r.hit_count ?? 0}</TableCell>
                <TableCell className="text-slate-500 text-xs">{r.note || '—'}</TableCell>
                <TableCell><DeleteButton id={r.id} /></TableCell>
              </TableRow>
            ))}
            {(data ?? []).length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-12 text-slate-500">ไม่พบ redirect</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
