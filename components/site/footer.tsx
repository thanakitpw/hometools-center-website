import Link from 'next/link';
import Image from 'next/image';
import { Mail, Phone, Clock } from 'lucide-react';
import { SiFacebook, SiLine, SiMessenger } from '@icons-pack/react-simple-icons';
import { siteConfig } from '@/lib/site-config';

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-[var(--color-border)] bg-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-12 md:grid-cols-12">
        {/* Brand */}
        <div className="md:col-span-5">
          <Link href="/" className="inline-block">
            <Image
              src="https://jwyvdngiccmjhcwlmyql.supabase.co/storage/v1/object/public/media/2024/05/revise_logo_2022_27D_10.png"
              alt="Home Tool Center"
              width={180}
              height={84}
              style={{ width: 'auto', height: 'auto', maxHeight: 64 }}
            />
          </Link>
          <p className="mt-4 text-sm leading-relaxed text-[var(--color-body)]">
            โฮมทูล เซ็นเตอร์<br />
            บริษัท จำหน่ายวัสดุอุปกรณ์ก่อสร้าง ทุกงานระบบครบวงจร<br />
            {siteConfig.contact.address}
          </p>
          <div className="mt-4 flex gap-3">
            <a
              href={siteConfig.social.facebook}
              aria-label="Facebook"
              target="_blank"
              rel="noopener"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1877f2] text-white transition-opacity hover:opacity-90"
            >
              <SiFacebook className="h-4 w-4" color="#ffffff" />
            </a>
            <a
              href={siteConfig.social.messenger}
              aria-label="Messenger"
              target="_blank"
              rel="noopener"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0084ff] text-white transition-opacity hover:opacity-90"
            >
              <SiMessenger className="h-4 w-4" color="#ffffff" />
            </a>
            <a
              href={siteConfig.social.line}
              aria-label="LINE"
              target="_blank"
              rel="noopener"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-[#06c755] text-white transition-opacity hover:opacity-90"
            >
              <SiLine className="h-4 w-4" color="#ffffff" />
            </a>
          </div>
        </div>

        {/* Contact */}
        <div className="md:col-span-3">
          <h3 className="mb-3 text-base font-semibold text-[var(--color-fg)]">ติดต่อ</h3>
          <ul className="space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <Mail className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-brand-500)]" />
              <a href={`mailto:${siteConfig.contact.email}`} className="break-all">
                {siteConfig.contact.email}
              </a>
            </li>
            <li className="flex items-start gap-2">
              <Phone className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-brand-500)]" />
              <a href={`tel:${siteConfig.contact.phone}`}>{siteConfig.contact.phone}</a>
            </li>
            <li className="flex items-start gap-2">
              <Clock className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-brand-500)]" />
              <span>{siteConfig.contact.hours}</span>
            </li>
          </ul>
        </div>

        {/* Products */}
        <div className="md:col-span-2">
          <h3 className="mb-3 text-base font-semibold text-[var(--color-fg)]">{siteConfig.footerNav.products.title}</h3>
          <ul className="space-y-2 text-sm">
            {siteConfig.footerNav.products.items.map((it) => (
              <li key={it.href}>
                <Link href={it.href as any} className="hover:text-[var(--color-brand-500)]">
                  {it.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* About */}
        <div className="md:col-span-2">
          <h3 className="mb-3 text-base font-semibold text-[var(--color-fg)]">{siteConfig.footerNav.about.title}</h3>
          <ul className="space-y-2 text-sm">
            {siteConfig.footerNav.about.items.map((it) => (
              <li key={it.href}>
                <Link href={it.href as any} className="hover:text-[var(--color-brand-500)]">
                  {it.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-[var(--color-border)] bg-[var(--color-muted)]">
        <div className="mx-auto max-w-7xl px-6 py-4 text-center text-xs text-[var(--color-muted-fg)]">
          COPYRIGHT © {new Date().getFullYear()} Home Tool Center. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
