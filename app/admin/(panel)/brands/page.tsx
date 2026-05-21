import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export const dynamic = 'force-dynamic';

export default async function BrandsPage() {
  const s = await createClient();
  const { data: brands } = await s.from('brands').select('id, slug, name, sort_order').order('sort_order').order('name');
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">แบรนด์ ({brands?.length ?? 0})</h1>
        <Button asChild><Link href="/admin/brands/new"><Plus className="w-4 h-4 mr-1" /> เพิ่มแบรนด์</Link></Button>
      </div>
      <div className="bg-white border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow><TableHead>ชื่อ</TableHead><TableHead>Slug</TableHead><TableHead>ลำดับ</TableHead></TableRow>
          </TableHeader>
          <TableBody>
            {(brands ?? []).map((b) => (
              <TableRow key={b.id} className="hover:bg-slate-50">
                <TableCell><Link href={`/admin/brands/${b.id}`} className="font-medium hover:underline">{b.name}</Link></TableCell>
                <TableCell className="text-slate-500 font-mono text-xs">{b.slug}</TableCell>
                <TableCell className="text-slate-500">{b.sort_order}</TableCell>
              </TableRow>
            ))}
            {(brands ?? []).length === 0 && (
              <TableRow><TableCell colSpan={3} className="text-center py-12 text-slate-500">ยังไม่มีแบรนด์</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
