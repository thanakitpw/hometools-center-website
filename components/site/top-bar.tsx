import { Mail, Phone, Truck } from 'lucide-react';
import { siteConfig } from '@/lib/site-config';

export function TopBar() {
  return (
    <div className="hidden border-b border-[var(--color-border)] bg-[#f4f8ff] md:block">
      <div className="mx-auto flex max-w-7xl items-center justify-center divide-x divide-[var(--color-border)] px-6 py-2.5 text-sm text-[var(--color-body)]">
        <a
          href={`mailto:${siteConfig.contact.email}`}
          className="flex items-center gap-2 px-6 hover:text-[var(--color-brand-500)]"
        >
          <Mail className="h-4 w-4 text-[var(--color-brand-500)]" />
          <span>{siteConfig.contact.email}</span>
        </a>
        <a
          href={`tel:${siteConfig.contact.phone}`}
          className="flex items-center gap-2 px-6 hover:text-[var(--color-brand-500)]"
        >
          <Phone className="h-4 w-4 text-[var(--color-brand-500)]" />
          <span>{siteConfig.contact.phone}</span>
        </a>
        <a
          href="/how-to-place-an-order"
          className="flex items-center gap-2 px-6 hover:text-[var(--color-brand-500)]"
        >
          <Truck className="h-4 w-4 text-[var(--color-brand-500)]" />
          <span>การขนส่ง</span>
        </a>
      </div>
    </div>
  );
}
