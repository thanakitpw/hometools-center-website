'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { savePost, deletePost } from './actions';

type Post = {
  id: string | null;
  slug: string;
  title: string;
  excerpt: string | null;
  content_md: string | null;
  cover_image_url: string | null;
  author: string | null;
  tags: string[];
  category_id: string | null;
  seo_title: string | null;
  seo_description: string | null;
  og_image_url: string | null;
  status: 'draft' | 'published' | 'archived';
};

export default function PostForm({
  value,
  categories,
}: {
  value: Post;
  categories: { id: string; name_th: string }[];
}) {
  const [tab, setTab] = useState<'main' | 'seo'>('main');
  const [pending, start] = useTransition();
  return (
    <form
      action={(fd) => start(async () => {
        const r = await savePost(value.id, fd);
        if (r?.error) toast.error(r.error);
      })}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{value.id ? 'แก้ไขบทความ' : 'เพิ่มบทความ'}</h1>
        <div className="flex gap-2">
          {value.id && (
            <Button type="button" variant="outline" onClick={() => {
              if (confirm('ลบบทความนี้?')) start(async () => {
                const r = await deletePost(value.id!, value.slug);
                if (r?.error) toast.error(r.error);
              });
            }}>ลบ</Button>
          )}
          <Button type="submit" disabled={pending}>{pending ? 'กำลังบันทึก…' : 'บันทึก'}</Button>
        </div>
      </div>

      <div className="flex gap-2 border-b">
        <Tab active={tab === 'main'} onClick={() => setTab('main')}>ข้อมูลหลัก</Tab>
        <Tab active={tab === 'seo'} onClick={() => setTab('seo')}>SEO</Tab>
      </div>

      {tab === 'main' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4 bg-white p-5 border rounded-xl">
            <Field label="หัวเรื่อง *"><Input name="title" defaultValue={value.title} required /></Field>
            <Field label="Slug *"><Input name="slug" defaultValue={value.slug} required /></Field>
            <Field label="คำโปรย (Excerpt)"><Textarea name="excerpt" defaultValue={value.excerpt ?? ''} rows={2} /></Field>
            <Field label="เนื้อหา (Markdown)">
              <Textarea name="content_md" defaultValue={value.content_md ?? ''} rows={20} className="font-mono text-sm" />
            </Field>
            <Field label="Cover Image URL"><Input name="cover_image_url" defaultValue={value.cover_image_url ?? ''} /></Field>
          </div>
          <div className="space-y-4 bg-white p-5 border rounded-xl h-fit">
            <Field label="สถานะ">
              <select name="status" defaultValue={value.status} className="w-full border rounded-md px-3 py-1.5 text-sm bg-white">
                <option value="published">เผยแพร่</option>
                <option value="draft">ฉบับร่าง</option>
                <option value="archived">เก็บถาวร</option>
              </select>
            </Field>
            <Field label="ผู้เขียน"><Input name="author" defaultValue={value.author ?? ''} /></Field>
            <Field label="หมวดหมู่">
              <select name="category_id" defaultValue={value.category_id ?? ''} className="w-full border rounded-md px-3 py-1.5 text-sm bg-white">
                <option value="">— ไม่ระบุ —</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name_th}</option>)}
              </select>
            </Field>
            <Field label="แท็ก (คั่นด้วยจุลภาค)"><Input name="tags" defaultValue={value.tags.join(', ')} /></Field>
          </div>
        </div>
      )}

      {tab === 'seo' && (
        <div className="space-y-4 bg-white p-5 border rounded-xl max-w-2xl">
          <Field label="SEO Title"><Input name="seo_title" defaultValue={value.seo_title ?? ''} maxLength={70} /></Field>
          <Field label="SEO Description"><Textarea name="seo_description" defaultValue={value.seo_description ?? ''} rows={3} maxLength={160} /></Field>
          <Field label="OG Image URL"><Input name="og_image_url" defaultValue={value.og_image_url ?? ''} /></Field>
        </div>
      )}
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>;
}
function Tab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick}
      className={`px-4 py-2 text-sm border-b-2 ${active ? 'border-slate-900 font-medium' : 'border-transparent text-slate-500'}`}>
      {children}
    </button>
  );
}
