import { Phone, Facebook } from 'lucide-react';
import { siteConfig } from '@/lib/site-config';

export function FloatingContact() {
  return (
    <div className="fixed right-3 top-1/2 z-30 flex -translate-y-1/2 flex-col gap-2 md:right-4">
      <a
        href={`tel:${siteConfig.contact.phone}`}
        aria-label="โทร"
        className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--color-accent-500)] text-white shadow-md transition-transform hover:scale-105"
      >
        <Phone className="h-5 w-5" />
      </a>
      <a
        href={siteConfig.social.facebook}
        target="_blank"
        rel="noopener"
        aria-label="Facebook"
        className="flex h-11 w-11 items-center justify-center rounded-full bg-[#1877f2] text-white shadow-md transition-transform hover:scale-105"
      >
        <Facebook className="h-5 w-5" />
      </a>
      <a
        href={siteConfig.social.line}
        target="_blank"
        rel="noopener"
        aria-label="Line"
        className="flex h-11 w-11 items-center justify-center rounded-full bg-[#06c755] text-xs font-bold text-white shadow-md transition-transform hover:scale-105"
      >
        LINE
      </a>
    </div>
  );
}
