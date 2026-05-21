'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { saveProduct, deleteProduct } from './actions';

type Brand = { id: string; name: string };
type Category = { id: string; name_th: string };

type ProductFormValue = {
  id: string | null;
  slug: string;
  sku: string | null;
  name_th: string;
  name_en: string | null;
  short_description: string | null;
  description_md: string | null;
  brand_id: string | null;
  primary_category_id: string | null;
  package_size: string | null;
  catalog_pdf_url: string | null;
  seo_title: string | null;
  seo_description: string | null;
  og_image_url: string | null;
  status: 'draft' | 'published' | 'archived';
  sort_order: number;
  images: string[];
};

export default function ProductForm({
  value,
  brands,
  categories,
}: {
  value: ProductFormValue;
  brands: Brand[];
  categories: Category[];
}) {
  const [tab, setTab] = useState<'main' | 'seo'>('main');
  const [pending, start] = useTransition();

  return (
    <form
      action={(fd) => {
        start(async () => {
          const res = await saveProduct(value.id, fd);
          if (res?.error) toast.error(res.error);
        });
      }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">
          {value.id ? 'แก้ไขสินค้า' : 'เพิ่มสินค้าใหม่'}
        </h1>
        <div className="flex gap-2">
          {value.id && (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (confirm('ลบสินค้านี้?')) {
                  start(async () => {
                    const res = await deleteProduct(value.id!, value.slug);
                    if (res?.error) toast.error(res.error);
                  });
                }
              }}
            >
              ลบ
            </Button>
          )}
          <Button type="submit" disabled={pending}>
            {pending ? 'กำลังบันทึก…' : 'บันทึก'}
          </Button>
        </div>
      </div>

      <div className="flex gap-2 border-b">
        <button
          type="button"
          onClick={() => setTab('main')}
          className={`px-4 py-2 text-sm border-b-2 ${tab === 'main' ? 'border-slate-900 font-medium' : 'border-transparent text-slate-500'}`}
        >
          ข้อมูลหลัก
        </button>
        <button
          type="button"
          onClick={() => setTab('seo')}
          className={`px-4 py-2 text-sm border-b-2 ${tab === 'seo' ? 'border-slate-900 font-medium' : 'border-transparent text-slate-500'}`}
        >
          SEO
        </button>
      </div>

      {tab === 'main' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4 bg-white p-5 border rounded-xl">
            <Field label="ชื่อสินค้า (ไทย) *">
              <Input name="name_th" defaultValue={value.name_th} required />
            </Field>
            <Field label="ชื่อสินค้า (อังกฤษ)">
              <Input name="name_en" defaultValue={value.name_en ?? ''} />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Slug *">
                <Input name="slug" defaultValue={value.slug} required />
              </Field>
              <Field label="SKU">
                <Input name="sku" defaultValue={value.sku ?? ''} />
              </Field>
            </div>
            <Field label="คำโปรย (สั้น)">
              <Input name="short_description" defaultValue={value.short_description ?? ''} />
            </Field>
            <Field label="คำอธิบาย (Markdown)">
              <Textarea
                name="description_md"
                defaultValue={value.description_md ?? ''}
                rows={10}
                className="font-mono text-sm"
              />
            </Field>
            <Field label="ขนาดบรรจุ">
              <Input name="package_size" defaultValue={value.package_size ?? ''} />
            </Field>
            <Field label="Catalog PDF URL">
              <Input name="catalog_pdf_url" defaultValue={value.catalog_pdf_url ?? ''} />
            </Field>
            <Field label="รูปภาพ (URL ทีละบรรทัด)">
              <Textarea
                name="images"
                defaultValue={value.images.join('\n')}
                rows={4}
                className="font-mono text-xs"
              />
            </Field>
          </div>

          <div className="space-y-4 bg-white p-5 border rounded-xl h-fit">
            <Field label="สถานะ">
              <select
                name="status"
                defaultValue={value.status}
                className="w-full border rounded-md px-3 py-1.5 text-sm bg-white"
              >
                <option value="published">เผยแพร่</option>
                <option value="draft">ฉบับร่าง</option>
                <option value="archived">เก็บถาวร</option>
              </select>
            </Field>
            <Field label="แบรนด์">
              <select
                name="brand_id"
                defaultValue={value.brand_id ?? ''}
                className="w-full border rounded-md px-3 py-1.5 text-sm bg-white"
              >
                <option value="">— ไม่ระบุ —</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </Field>
            <Field label="หมวดหมู่หลัก">
              <select
                name="primary_category_id"
                defaultValue={value.primary_category_id ?? ''}
                className="w-full border rounded-md px-3 py-1.5 text-sm bg-white"
              >
                <option value="">— ไม่ระบุ —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name_th}</option>
                ))}
              </select>
            </Field>
            <Field label="ลำดับการแสดงผล">
              <Input name="sort_order" type="number" defaultValue={value.sort_order} />
            </Field>
          </div>
        </div>
      )}

      {tab === 'seo' && (
        <div className="space-y-4 bg-white p-5 border rounded-xl max-w-2xl">
          <Field label="SEO Title">
            <Input name="seo_title" defaultValue={value.seo_title ?? ''} maxLength={70} />
          </Field>
          <Field label="SEO Description">
            <Textarea name="seo_description" defaultValue={value.seo_description ?? ''} rows={3} maxLength={160} />
          </Field>
          <Field label="OG Image URL">
            <Input name="og_image_url" defaultValue={value.og_image_url ?? ''} />
          </Field>
        </div>
      )}
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
