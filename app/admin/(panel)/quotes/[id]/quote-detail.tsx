'use client';

import { useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { updateQuote, deleteQuote } from '../actions';
import { useRouter } from 'next/navigation';

const STATUSES = [
  { v: 'new', label: 'ใหม่' },
  { v: 'contacted', label: 'ติดต่อแล้ว' },
  { v: 'quoted', label: 'ส่งใบเสนอราคาแล้ว' },
  { v: 'won', label: 'ได้งาน' },
  { v: 'lost', label: 'ปิดงาน' },
];

type Q = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  company: string | null;
  message: string | null;
  items: unknown;
  source_page: string | null;
  status: string;
  admin_note: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
};

export default function QuoteDetail({ value }: { value: Q }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const items = Array.isArray(value.items) ? value.items : [];

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">ใบเสนอราคา #{value.id.slice(0, 8)}</h1>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => {
            if (confirm('ลบรายการนี้?')) start(async () => {
              const r = await deleteQuote(value.id);
              if (r?.error) toast.error(r.error);
              else router.push('/admin/quotes');
            });
          }}>ลบ</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white p-5 border rounded-xl space-y-3">
            <h2 className="font-semibold">ข้อมูลผู้ติดต่อ</h2>
            <Row label="ชื่อ" value={value.name} />
            <Row label="โทร" value={<a href={`tel:${value.phone}`} className="text-blue-600">{value.phone}</a>} />
            <Row label="อีเมล" value={value.email ? <a href={`mailto:${value.email}`} className="text-blue-600">{value.email}</a> : '—'} />
            <Row label="บริษัท" value={value.company ?? '—'} />
            <Row label="หน้าที่ส่ง" value={value.source_page ?? '—'} />
            <Row label="ส่งเมื่อ" value={new Date(value.created_at).toLocaleString('th-TH')} />
          </div>

          {value.message && (
            <div className="bg-white p-5 border rounded-xl">
              <h2 className="font-semibold mb-2">ข้อความ</h2>
              <p className="whitespace-pre-wrap text-sm">{value.message}</p>
            </div>
          )}

          {items.length > 0 && (
            <div className="bg-white p-5 border rounded-xl">
              <h2 className="font-semibold mb-2">รายการสินค้า</h2>
              <ul className="space-y-1 text-sm">
                {items.map((it, i) => <li key={i} className="font-mono text-xs">{JSON.stringify(it)}</li>)}
              </ul>
            </div>
          )}
        </div>

        <form
          action={(fd) => start(async () => {
            const r = await updateQuote(value.id, fd);
            if (r?.error) toast.error(r.error);
            else toast.success('บันทึกแล้ว');
          })}
          className="space-y-4 bg-white p-5 border rounded-xl h-fit"
        >
          <h2 className="font-semibold">จัดการ</h2>
          <div className="space-y-1.5">
            <Label>สถานะ</Label>
            <select name="status" defaultValue={value.status} className="w-full border rounded-md px-3 py-1.5 text-sm bg-white">
              {STATUSES.map(s => <option key={s.v} value={s.v}>{s.label}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>โน้ตภายใน</Label>
            <Textarea name="admin_note" defaultValue={value.admin_note ?? ''} rows={5} />
          </div>
          <Button type="submit" disabled={pending} className="w-full">{pending ? 'กำลังบันทึก…' : 'บันทึก'}</Button>
        </form>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 text-sm border-b last:border-0 pb-2 last:pb-0">
      <span className="text-slate-500">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}
