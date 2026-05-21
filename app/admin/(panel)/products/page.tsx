import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 30;

export default async function ProductsListPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; status?: string }>;
}) {
  const { q = '', page = '1', status } = await searchParams;
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const from = (pageNum - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const s = await createClient();
  let query = s
    .from('products')
    .select('id, slug, name_th, sku, status, sort_order, updated_at', { count: 'exact' })
    .order('updated_at', { ascending: false })
    .range(from, to);

  if (q) query = query.or(`name_th.ilike.%${q}%,slug.ilike.%${q}%,sku.ilike.%${q}%`);
  if (status) query = query.eq('status', status);

  const { data: products = [], count = 0 } = await query;
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">สินค้า ({count?.toLocaleString()})</h1>
        <Button asChild>
          <Link href="/admin/products/new">
            <Plus className="w-4 h-4 mr-1" /> เพิ่มสินค้า
          </Link>
        </Button>
      </div>

      <form className="flex gap-2 items-center bg-white border rounded-lg p-3">
        <input
          name="q"
          defaultValue={q}
          placeholder="ค้นหา ชื่อ / slug / SKU"
          className="flex-1 px-3 py-1.5 border rounded-md text-sm"
        />
        <select
          name="status"
          defaultValue={status ?? ''}
          className="px-3 py-1.5 border rounded-md text-sm bg-white"
        >
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
            <TableRow>
              <TableHead>ชื่อ</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>สถานะ</TableHead>
              <TableHead>อัปเดต</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(products ?? []).map((p) => (
              <TableRow key={p.id} className="hover:bg-slate-50">
                <TableCell>
                  <Link href={`/admin/products/${p.id}`} className="font-medium hover:underline">
                    {p.name_th}
                  </Link>
                </TableCell>
                <TableCell className="text-slate-500">{p.sku || '—'}</TableCell>
                <TableCell className="text-slate-500 font-mono text-xs">{p.slug}</TableCell>
                <TableCell>
                  <Badge variant={p.status === 'published' ? 'default' : 'secondary'}>
                    {p.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-slate-500 text-sm">
                  {new Date(p.updated_at).toLocaleDateString('th-TH')}
                </TableCell>
              </TableRow>
            ))}
            {(products ?? []).length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-slate-500">
                  ไม่พบสินค้า
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          {pageNum > 1 && (
            <Button asChild variant="outline" size="sm">
              <Link href={`/admin/products?q=${encodeURIComponent(q)}&page=${pageNum - 1}`}>← ก่อนหน้า</Link>
            </Button>
          )}
          <span className="text-sm text-slate-500">หน้า {pageNum} / {totalPages}</span>
          {pageNum < totalPages && (
            <Button asChild variant="outline" size="sm">
              <Link href={`/admin/products?q=${encodeURIComponent(q)}&page=${pageNum + 1}`}>ถัดไป →</Link>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
