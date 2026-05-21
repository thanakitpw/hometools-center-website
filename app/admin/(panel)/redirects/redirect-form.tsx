'use client';

import { useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { saveRedirect } from './actions';

export default function RedirectForm({
  value,
}: {
  value: { id: string | null; from_path: string; to_path: string; status_code: number; note: string | null };
}) {
  const [pending, start] = useTransition();
  return (
    <form
      action={(fd) => start(async () => {
        const r = await saveRedirect(value.id, fd);
        if (r?.error) toast.error(r.error);
      })}
      className="space-y-6 max-w-2xl"
    >
      <h1 className="text-2xl font-semibold">{value.id ? 'แก้ไข Redirect' : 'เพิ่ม Redirect'}</h1>
      <div className="space-y-4 bg-white p-5 border rounded-xl">
        <div className="space-y-1.5"><Label>From path *</Label><Input name="from_path" defaultValue={value.from_path} required placeholder="/old-url" /></div>
        <div className="space-y-1.5"><Label>To path *</Label><Input name="to_path" defaultValue={value.to_path} required placeholder="/new-url" /></div>
        <div className="space-y-1.5">
          <Label>HTTP status code</Label>
          <select name="status_code" defaultValue={value.status_code} className="w-full border rounded-md px-3 py-1.5 text-sm bg-white">
            <option value="301">301 (Moved Permanently — recommended)</option>
            <option value="302">302 (Found — temporary)</option>
            <option value="307">307 (Temporary Redirect)</option>
            <option value="308">308 (Permanent Redirect)</option>
          </select>
        </div>
        <div className="space-y-1.5"><Label>โน้ต</Label><Input name="note" defaultValue={value.note ?? ''} /></div>
      </div>
      <div className="flex gap-2"><Button type="submit" disabled={pending}>{pending ? 'กำลังบันทึก…' : 'บันทึก'}</Button></div>
    </form>
  );
}
