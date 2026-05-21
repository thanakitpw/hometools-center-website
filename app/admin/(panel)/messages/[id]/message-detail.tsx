'use client';

import { useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { updateMessage, deleteMessage } from '../actions';

type M = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  subject: string | null;
  message: string;
  source_page: string | null;
  status: string;
  created_at: string;
};

const STATUSES = [
  { v: 'new', label: 'ใหม่' },
  { v: 'read', label: 'อ่านแล้ว' },
  { v: 'replied', label: 'ตอบแล้ว' },
  { v: 'archived', label: 'เก็บถาวร' },
];

export default function MessageDetail({ value }: { value: M }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">ข้อความ #{value.id.slice(0, 8)}</h1>
        <Button variant="outline" onClick={() => {
          if (confirm('ลบข้อความนี้?')) start(async () => {
            const r = await deleteMessage(value.id);
            if (r?.error) toast.error(r.error);
            else router.push('/admin/messages');
          });
        }}>ลบ</Button>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white p-5 border rounded-xl space-y-2 text-sm">
            <Row label="ชื่อ" value={value.name} />
            <Row label="อีเมล" value={value.email ? <a href={`mailto:${value.email}`} className="text-blue-600">{value.email}</a> : '—'} />
            <Row label="โทร" value={value.phone ? <a href={`tel:${value.phone}`} className="text-blue-600">{value.phone}</a> : '—'} />
            <Row label="หัวเรื่อง" value={value.subject ?? '—'} />
            <Row label="หน้าที่ส่ง" value={value.source_page ?? '—'} />
            <Row label="ส่งเมื่อ" value={new Date(value.created_at).toLocaleString('th-TH')} />
          </div>
          <div className="bg-white p-5 border rounded-xl">
            <h2 className="font-semibold mb-2">ข้อความ</h2>
            <p className="whitespace-pre-wrap text-sm">{value.message}</p>
          </div>
        </div>
        <form
          action={(fd) => start(async () => {
            const r = await updateMessage(value.id, fd);
            if (r?.error) toast.error(r.error);
            else toast.success('บันทึกแล้ว');
          })}
          className="space-y-4 bg-white p-5 border rounded-xl h-fit"
        >
          <div className="space-y-1.5">
            <Label>สถานะ</Label>
            <select name="status" defaultValue={value.status} className="w-full border rounded-md px-3 py-1.5 text-sm bg-white">
              {STATUSES.map(s => <option key={s.v} value={s.v}>{s.label}</option>)}
            </select>
          </div>
          <Button type="submit" disabled={pending} className="w-full">{pending ? 'กำลังบันทึก…' : 'บันทึก'}</Button>
        </form>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b last:border-0 pb-2 last:pb-0">
      <span className="text-slate-500">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}
