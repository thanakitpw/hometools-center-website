import { Mail, Phone, Facebook } from 'lucide-react';
import { siteConfig } from '@/lib/site-config';

export function TopBar() {
  return (
    <div className="hidden border-b border-[var(--color-border)] bg-[var(--color-muted)] md:block">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-2 text-xs text-[var(--color-muted-fg)]">
        <div className="flex items-center gap-5">
          <a href={`mailto:${siteConfig.contact.email}`} className="flex items-center gap-1.5 hover:text-[var(--color-brand-500)]">
            <Mail className="h-3.5 w-3.5" />
            <span>{siteConfig.contact.email}</span>
          </a>
          <a href={`tel:${siteConfig.contact.phone}`} className="flex items-center gap-1.5 hover:text-[var(--color-brand-500)]">
            <Phone className="h-3.5 w-3.5" />
            <span>{siteConfig.contact.phone}</span>
          </a>
        </div>
        <div className="flex items-center gap-3">
          <a href={siteConfig.social.facebook} aria-label="Facebook" target="_blank" rel="noopener" className="text-[var(--color-brand-500)] hover:text-[var(--color-brand-600)]">
            <Facebook className="h-4 w-4" />
          </a>
          <a href={siteConfig.social.line} aria-label="Line" target="_blank" rel="noopener" className="font-bold text-[#06c755] hover:opacity-80">
            LINE
          </a>
        </div>
      </div>
    </div>
  );
}
