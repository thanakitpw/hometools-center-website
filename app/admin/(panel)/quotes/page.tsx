import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

export const dynamic = 'force-dynamic';

const STATUS_LABELS: Record<string, string> = {
  new: 'ใหม่',
  contacted: 'ติดต่อแล้ว',
  quoted: 'ส่งใบเสนอราคาแล้ว',
  won: 'ได้งาน',
  lost: 'ปิดงาน',
};

export default async function QuotesPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const s = await createClient();
  let q = s.from('quote_requests').select('id, name, phone, email, company, status, created_at, message').order('created_at', { ascending: false });
  if (status) q = q.eq('status', status);
  const { data } = await q;
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">ใบเสนอราคา ({data?.length ?? 0})</h1>
        <Button asChild variant="outline" size="sm">
          <a href="/admin/quotes/export.csv"><Download className="w-4 h-4 mr-1" /> Export CSV</a>
        </Button>
      </div>
      <form className="flex gap-2 items-center bg-white border rounded-lg p-3">
        <select name="status" defaultValue={status ?? ''} className="px-3 py-1.5 border rounded-md text-sm bg-white">
          <option value="">ทุกสถานะ</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <Button type="submit" variant="outline" size="sm">กรอง</Button>
      </form>
      <div className="bg-white border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow><TableHead>ชื่อ</TableHead><TableHead>โทร</TableHead><TableHead>บริษัท</TableHead><TableHead>สถานะ</TableHead><TableHead>วันที่</TableHead></TableRow>
          </TableHeader>
          <TableBody>
            {(data ?? []).map(r => (
              <TableRow key={r.id} className="hover:bg-slate-50">
                <TableCell><Link href={`/admin/quotes/${r.id}`} className="font-medium hover:underline">{r.name}</Link></TableCell>
                <TableCell>{r.phone}</TableCell>
                <TableCell className="text-slate-500">{r.company || '—'}</TableCell>
                <TableCell><Badge variant={r.status === 'new' ? 'default' : 'secondary'}>{STATUS_LABELS[r.status] ?? r.status}</Badge></TableCell>
                <TableCell className="text-slate-500 text-sm">{new Date(r.created_at).toLocaleDateString('th-TH')}</TableCell>
              </TableRow>
            ))}
            {(data ?? []).length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-12 text-slate-500">ไม่มีใบเสนอราคา</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
