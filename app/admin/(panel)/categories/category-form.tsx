'use client';

import { useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { saveCategory, deleteCategory } from './actions';

type Cat = {
  id: string | null;
  slug: string;
  name_th: string;
  name_en: string | null;
  parent_id: string | null;
  description: string | null;
  banner_image_url: string | null;
  seo_title: string | null;
  seo_description: string | null;
  sort_order: number;
  is_published: boolean;
};

export default function CategoryForm({
  value,
  parents,
}: {
  value: Cat;
  parents: { id: string; name_th: string }[];
}) {
  const [pending, start] = useTransition();
  return (
    <form
      action={(fd) => start(async () => {
        const r = await saveCategory(value.id, fd);
        if (r?.error) toast.error(r.error);
      })}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{value.id ? 'แก้ไขหมวดหมู่' : 'เพิ่มหมวดหมู่'}</h1>
        <div className="flex gap-2">
          {value.id && (
            <Button type="button" variant="outline" onClick={() => {
              if (confirm('ลบหมวดหมู่นี้?')) start(async () => {
                const r = await deleteCategory(value.id!);
                if (r?.error) toast.error(r.error);
              });
            }}>ลบ</Button>
          )}
          <Button type="submit" disabled={pending}>{pending ? 'กำลังบันทึก…' : 'บันทึก'}</Button>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4 bg-white p-5 border rounded-xl">
          <Field label="ชื่อ (ไทย) *"><Input name="name_th" defaultValue={value.name_th} required /></Field>
          <Field label="ชื่อ (อังกฤษ)"><Input name="name_en" defaultValue={value.name_en ?? ''} /></Field>
          <Field label="Slug *"><Input name="slug" defaultValue={value.slug} required /></Field>
          <Field label="คำอธิบาย"><Textarea name="description" defaultValue={value.description ?? ''} rows={3} /></Field>
          <Field label="Banner URL"><Input name="banner_image_url" defaultValue={value.banner_image_url ?? ''} /></Field>
          <Field label="SEO Title"><Input name="seo_title" defaultValue={value.seo_title ?? ''} /></Field>
          <Field label="SEO Description"><Textarea name="seo_description" defaultValue={value.seo_description ?? ''} rows={2} /></Field>
        </div>
        <div className="space-y-4 bg-white p-5 border rounded-xl h-fit">
          <Field label="หมวดหมู่แม่">
            <select name="parent_id" defaultValue={value.parent_id ?? ''} className="w-full border rounded-md px-3 py-1.5 text-sm bg-white">
              <option value="">— ไม่มี (เป็นหมวดหลัก) —</option>
              {parents.filter(p => p.id !== value.id).map(p => <option key={p.id} value={p.id}>{p.name_th}</option>)}
            </select>
          </Field>
          <Field label="ลำดับ"><Input name="sort_order" type="number" defaultValue={value.sort_order} /></Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="is_published" defaultChecked={value.is_published} />
            เผยแพร่
          </label>
        </div>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>;
}
