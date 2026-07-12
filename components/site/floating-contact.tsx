import { Phone } from 'lucide-react';
import { SiFacebook, SiLine } from '@icons-pack/react-simple-icons';
import { siteConfig } from '@/lib/site-config';

const phoneDigits = siteConfig.contact.phone.replace(/[^0-9]/g, '');

const items = [
  { key: 'phone', label: 'โทรเลย', href: `tel:${phoneDigits}`, bg: '#1D377D', Icon: Phone, external: false },
  { key: 'facebook', label: 'Facebook', href: siteConfig.social.facebook, bg: '#1877f2', Icon: SiFacebook, external: true },
  { key: 'line', label: 'LINE', href: siteConfig.social.line, bg: '#06c755', Icon: SiLine, external: true },
];

export function FloatingContact() {
  return (
    <div className="fixed bottom-5 right-4 z-40 flex flex-col items-end gap-3">
      {items.map(({ key, label, href, bg, Icon, external }) => (
        <a
          key={key}
          href={href}
          aria-label={label}
          {...(external ? { target: '_blank', rel: 'noopener' } : {})}
          className="group relative flex h-[52px] w-[52px] items-center justify-center rounded-full text-white shadow-[0_4px_14px_rgba(0,0,0,0.18)] ring-1 ring-black/5 transition-transform duration-200 hover:scale-110"
          style={{ backgroundColor: bg }}
        >
          <Icon className="h-[22px] w-[22px]" color="#ffffff" />
          {/* tooltip label (desktop hover) */}
          <span className="pointer-events-none absolute right-full mr-3 hidden whitespace-nowrap rounded-lg bg-slate-900/90 px-3 py-1.5 text-sm font-medium text-white opacity-0 shadow-md transition-opacity duration-200 group-hover:opacity-100 md:block">
            {label}
            <span className="absolute left-full top-1/2 -translate-y-1/2 border-4 border-transparent border-l-slate-900/90" />
          </span>
        </a>
      ))}
    </div>
  );
}
