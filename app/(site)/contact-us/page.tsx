import type { Metadata } from 'next';
import { Mail, Phone, Clock, MapPin } from 'lucide-react';
import { Breadcrumb } from '@/components/site/breadcrumb';
import { ContactForm } from '@/components/site/contact-form';
import { siteConfig } from '@/lib/site-config';
import { JsonLd } from '@/components/site/json-ld';
import { localBusinessSchema } from '@/lib/seo/schema';

export const metadata: Metadata = {
  title: 'ติดต่อเรา',
  description: 'ติดต่อ Home Tool Center ศูนย์รวมวัสดุก่อสร้างครบวงจร — โทร 02-426-2745',
  alternates: { canonical: '/contact-us' },
};

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-7xl px-6 py-6">
      <JsonLd data={localBusinessSchema()} />
      <Breadcrumb items={[{ label: 'หน้าหลัก', href: '/' }, { label: 'ติดต่อเรา' }]} />
      <h1 className="mt-6 !text-3xl !text-[var(--color-fg)] md:!text-4xl">ติดต่อเรา</h1>
      <p className="mt-2 text-[var(--color-body)]">
        มีคำถามหรือต้องการขอใบเสนอราคา? กรอกแบบฟอร์มหรือติดต่อช่องทางด้านล่างได้เลย
      </p>

      <div className="mt-8 grid gap-8 md:grid-cols-2">
        {/* Info */}
        <div>
          <h2 className="!text-xl !text-[var(--color-brand-light)]">ช่องทางติดต่อ</h2>
          <ul className="mt-4 space-y-4 text-sm">
            <li className="flex items-start gap-3">
              <Phone className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-brand-500)]" />
              <div>
                <p className="text-[var(--color-muted-fg)]">โทรศัพท์</p>
                <a href={`tel:${siteConfig.contact.phone}`} className="text-base font-medium text-[var(--color-fg)]">
                  {siteConfig.contact.phone}
                </a>
                <p className="mt-1 text-xs text-[var(--color-muted-fg)]">มือถือ: {siteConfig.contact.mobile}</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <Mail className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-brand-500)]" />
              <div>
                <p className="text-[var(--color-muted-fg)]">อีเมล</p>
                <a href={`mailto:${siteConfig.contact.email}`} className="text-base font-medium text-[var(--color-fg)] break-all">
                  {siteConfig.contact.email}
                </a>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <Clock className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-brand-500)]" />
              <div>
                <p className="text-[var(--color-muted-fg)]">เวลาทำการ</p>
                <p className="text-base font-medium text-[var(--color-fg)]">{siteConfig.contact.hours}</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-brand-500)]" />
              <div>
                <p className="text-[var(--color-muted-fg)]">ที่อยู่</p>
                <p className="text-base font-medium text-[var(--color-fg)]">{siteConfig.contact.address}</p>
              </div>
            </li>
          </ul>
        </div>

        {/* Form */}
        <div>
          <h2 className="!text-xl !text-[var(--color-brand-light)]">ส่งข้อความถึงเรา</h2>
          <div className="mt-4">
            <ContactForm />
          </div>
        </div>
      </div>
    </div>
  );
}
