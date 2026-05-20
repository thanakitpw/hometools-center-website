'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

export function ContactForm() {
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setSubmitting(true);
    const fd = new FormData(form);
    const payload = {
      name: String(fd.get('name') || ''),
      phone: String(fd.get('phone') || ''),
      email: String(fd.get('email') || ''),
      subject: String(fd.get('subject') || ''),
      message: String(fd.get('message') || ''),
      honeypot: String(fd.get('website') || ''),
      source_page: typeof window !== 'undefined' ? window.location.pathname : '',
    };
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg = data.error === 'validation' ? 'กรอกข้อมูลให้ครบถ้วน' : 'ส่งไม่สำเร็จ';
        toast.error(msg);
        return;
      }
      toast.success('ส่งข้อความเรียบร้อย เราจะติดต่อกลับโดยเร็ว');
      form.reset();
    } catch {
      toast.error('การเชื่อมต่อขัดข้อง');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border border-[var(--color-border)] bg-white p-5">
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="absolute -left-[9999px]" />
      <div>
        <Label htmlFor="c-name">ชื่อ *</Label>
        <Input id="c-name" name="name" required maxLength={120} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label htmlFor="c-phone">เบอร์โทร</Label>
          <Input id="c-phone" name="phone" type="tel" maxLength={30} />
        </div>
        <div>
          <Label htmlFor="c-email">อีเมล</Label>
          <Input id="c-email" name="email" type="email" maxLength={120} />
        </div>
      </div>
      <p className="text-xs text-[var(--color-muted-fg)]">* กรุณาระบุเบอร์โทรหรืออีเมลอย่างน้อย 1 ช่อง</p>
      <div>
        <Label htmlFor="c-subject">หัวข้อ</Label>
        <Input id="c-subject" name="subject" maxLength={200} />
      </div>
      <div>
        <Label htmlFor="c-message">ข้อความ *</Label>
        <Textarea id="c-message" name="message" required rows={5} maxLength={2000} />
      </div>
      <Button type="submit" disabled={submitting} className="w-full">
        {submitting ? 'กำลังส่ง...' : 'ส่งข้อความ'}
      </Button>
    </form>
  );
}
