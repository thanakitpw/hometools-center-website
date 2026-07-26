'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { trackQuoteStart, trackGenerateLead, trackFormError, type TrackedItem } from '@/lib/analytics/events';

type Props = {
  triggerLabel?: string;
  productSlug?: string;
  productName?: string;
  className?: string;
};

export function QuoteDialog({ triggerLabel = 'ขอใบเสนอราคา', productSlug, productName, className }: Props) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // The dialog is also used bare (no product attached) on the contact/how-to-order pages.
  const trackedItem: TrackedItem | undefined =
    productSlug && productName ? { slug: productSlug, name: productName } : undefined;

  function handleOpenChange(next: boolean) {
    if (next) trackQuoteStart(trackedItem);
    setOpen(next);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);
    const payload = {
      name: String(fd.get('name') || ''),
      phone: String(fd.get('phone') || ''),
      email: String(fd.get('email') || ''),
      company: String(fd.get('company') || ''),
      message: String(fd.get('message') || ''),
      honeypot: String(fd.get('website') || ''),
      items: productSlug ? [{ slug: productSlug, name: productName, qty: Number(fd.get('qty') || 1) }] : [],
      source_page: typeof window !== 'undefined' ? window.location.pathname : '',
    };
    try {
      const res = await fetch('/api/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        trackFormError('quote', data.error === 'validation' ? 'validation' : `http_${res.status}`);
        toast.error(data.error === 'validation' ? 'กรอกข้อมูลให้ครบถ้วน' : 'ส่งไม่สำเร็จ กรุณาลองอีกครั้ง');
        return;
      }
      // The conversion. Point the Google Ads "ขอการเสนอราคา" action at `generate_lead`.
      trackGenerateLead(
        'quote',
        trackedItem ? [{ ...trackedItem, quantity: Number(fd.get('qty') || 1) }] : undefined
      );
      toast.success('ส่งคำขอใบเสนอราคาเรียบร้อย เราจะติดต่อกลับโดยเร็ว');
      setOpen(false);
    } catch {
      trackFormError('quote', 'network');
      toast.error('การเชื่อมต่อขัดข้อง');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className={className}>{triggerLabel}</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>ขอใบเสนอราคา</DialogTitle>
        </DialogHeader>
        {productName && (
          <p className="text-sm text-[var(--color-muted-fg)]">
            สินค้า: <span className="font-medium text-[var(--color-fg)]">{productName}</span>
          </p>
        )}
        <form onSubmit={handleSubmit} className="space-y-3">
          {/* honeypot */}
          <input type="text" name="website" tabIndex={-1} autoComplete="off" className="absolute -left-[9999px]" />
          <div>
            <Label htmlFor="name">ชื่อ *</Label>
            <Input id="name" name="name" required maxLength={120} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="phone">เบอร์โทร *</Label>
              <Input id="phone" name="phone" required type="tel" maxLength={30} />
            </div>
            <div>
              <Label htmlFor="email">อีเมล</Label>
              <Input id="email" name="email" type="email" maxLength={120} />
            </div>
          </div>
          <div>
            <Label htmlFor="company">บริษัท</Label>
            <Input id="company" name="company" maxLength={120} />
          </div>
          {productSlug && (
            <div>
              <Label htmlFor="qty">จำนวน</Label>
              <Input id="qty" name="qty" type="number" min={1} defaultValue={1} />
            </div>
          )}
          <div>
            <Label htmlFor="message">ข้อความ</Label>
            <Textarea id="message" name="message" rows={3} maxLength={2000} placeholder="ระบุรายละเอียดเพิ่มเติม (ถ้ามี)" />
          </div>
          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? 'กำลังส่ง...' : 'ส่งคำขอ'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
