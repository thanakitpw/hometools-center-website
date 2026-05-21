'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { saveSetting, saveMenu } from './actions';

export default function SettingsClient({
  contact,
  seo,
  headerMenu,
  footerMenu,
}: {
  contact: Record<string, string>;
  seo: Record<string, string>;
  headerMenu: unknown[];
  footerMenu: unknown[];
}) {
  const [tab, setTab] = useState<'contact' | 'seo' | 'menu'>('contact');
  const [pending, start] = useTransition();
  const [headerJson, setHeaderJson] = useState(JSON.stringify(headerMenu, null, 2));
  const [footerJson, setFooterJson] = useState(JSON.stringify(footerMenu, null, 2));

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-semibold">ตั้งค่า</h1>
      <div className="flex gap-2 border-b">
        <Tab active={tab === 'contact'} onClick={() => setTab('contact')}>ติดต่อ</Tab>
        <Tab active={tab === 'seo'} onClick={() => setTab('seo')}>SEO</Tab>
        <Tab active={tab === 'menu'} onClick={() => setTab('menu')}>เมนู</Tab>
      </div>

      {tab === 'contact' && (
        <form
          action={(fd) => start(async () => {
            const r = await saveSetting('contact', fd);
            if (r?.error) toast.error(r.error); else toast.success('บันทึกแล้ว');
          })}
          className="space-y-4 bg-white p-5 border rounded-xl"
        >
          <Field label="เบอร์โทร"><Input name="phone" defaultValue={contact.phone ?? ''} /></Field>
          <Field label="อีเมล"><Input name="email" type="email" defaultValue={contact.email ?? ''} /></Field>
          <Field label="LINE ID"><Input name="line_id" defaultValue={contact.line_id ?? ''} /></Field>
          <Field label="Facebook URL"><Input name="facebook_url" defaultValue={contact.facebook_url ?? ''} /></Field>
          <Field label="ที่อยู่"><Textarea name="address" defaultValue={contact.address ?? ''} rows={3} /></Field>
          <Field label="เวลาทำการ"><Input name="business_hours" defaultValue={contact.business_hours ?? ''} /></Field>
          <Button type="submit" disabled={pending}>{pending ? 'กำลังบันทึก…' : 'บันทึก'}</Button>
        </form>
      )}

      {tab === 'seo' && (
        <form
          action={(fd) => start(async () => {
            const r = await saveSetting('seo', fd);
            if (r?.error) toast.error(r.error); else toast.success('บันทึกแล้ว');
          })}
          className="space-y-4 bg-white p-5 border rounded-xl"
        >
          <Field label="Default OG Image URL"><Input name="default_og_image" defaultValue={seo.default_og_image ?? ''} /></Field>
          <Field label="Google Analytics ID (G-XXXXXXXXXX)"><Input name="ga_id" defaultValue={seo.ga_id ?? ''} /></Field>
          <Field label="Google Tag Manager ID (GTM-XXXXXXX)"><Input name="gtm_id" defaultValue={seo.gtm_id ?? ''} /></Field>
          <Button type="submit" disabled={pending}>{pending ? 'กำลังบันทึก…' : 'บันทึก'}</Button>
        </form>
      )}

      {tab === 'menu' && (
        <div className="space-y-6">
          <MenuEditor
            title="เมนูบน (Header)"
            value={headerJson}
            setValue={setHeaderJson}
            onSave={() => start(async () => {
              const r = await saveMenu('header', headerJson);
              if (r?.error) toast.error(r.error); else toast.success('บันทึกเมนูบนแล้ว');
            })}
            pending={pending}
          />
          <MenuEditor
            title="เมนูล่าง (Footer)"
            value={footerJson}
            setValue={setFooterJson}
            onSave={() => start(async () => {
              const r = await saveMenu('footer', footerJson);
              if (r?.error) toast.error(r.error); else toast.success('บันทึกเมนูล่างแล้ว');
            })}
            pending={pending}
          />
          <div className="bg-slate-100 border rounded-lg p-4 text-xs">
            <p className="font-medium mb-2">รูปแบบ JSON:</p>
            <pre className="font-mono whitespace-pre-wrap">{`[
  { "label": "หน้าแรก", "href": "/" },
  { "label": "สินค้า", "href": "/shop", "children": [
    { "label": "ท่อ PVC", "href": "/product-category/pvc" }
  ]}
]`}</pre>
          </div>
        </div>
      )}
    </div>
  );
}

function MenuEditor({ title, value, setValue, onSave, pending }: { title: string; value: string; setValue: (v: string) => void; onSave: () => void; pending: boolean }) {
  return (
    <div className="space-y-2 bg-white p-5 border rounded-xl">
      <Label>{title}</Label>
      <Textarea value={value} onChange={(e) => setValue(e.target.value)} rows={10} className="font-mono text-sm" />
      <Button type="button" onClick={onSave} disabled={pending} size="sm">บันทึก {title.includes('Header') ? 'Header' : 'Footer'}</Button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>;
}

function Tab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className={`px-4 py-2 text-sm border-b-2 ${active ? 'border-slate-900 font-medium' : 'border-transparent text-slate-500'}`}>
      {children}
    </button>
  );
}
