'use client';

import { useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { saveBrand, deleteBrand } from './actions';

type Brand = {
  id: string | null;
  slug: string;
  name: string;
  logo_url: string | null;
  banner_url: string | null;
  description: string | null;
  sort_order: number;
};

export default function BrandForm({ value }: { value: Brand }) {
  const [pending, start] = useTransition();
  return (
    <form
      action={(fd) => start(async () => {
        const r = await saveBrand(value.id, fd);
        if (r?.error) toast.error(r.error);
      })}
      className="space-y-6 max-w-2xl"
    >
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{value.id ? 'แก้ไขแบรนด์' : 'เพิ่มแบรนด์'}</h1>
        <div className="flex gap-2">
          {value.id && (
            <Button type="button" variant="outline" onClick={() => {
              if (confirm('ลบแบรนด์นี้?')) start(async () => {
                const r = await deleteBrand(value.id!);
                if (r?.error) toast.error(r.error);
              });
            }}>ลบ</Button>
          )}
          <Button type="submit" disabled={pending}>{pending ? 'กำลังบันทึก…' : 'บันทึก'}</Button>
        </div>
      </div>
      <div className="space-y-4 bg-white p-5 border rounded-xl">
        <Field label="ชื่อแบรนด์ *"><Input name="name" defaultValue={value.name} required /></Field>
        <Field label="Slug *"><Input name="slug" defaultValue={value.slug} required /></Field>
        <Field label="Logo URL"><Input name="logo_url" defaultValue={value.logo_url ?? ''} /></Field>
        <Field label="Banner URL"><Input name="banner_url" defaultValue={value.banner_url ?? ''} /></Field>
        <Field label="คำอธิบาย"><Textarea name="description" defaultValue={value.description ?? ''} rows={4} /></Field>
        <Field label="ลำดับการแสดงผล"><Input name="sort_order" type="number" defaultValue={value.sort_order} /></Field>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>;
}
