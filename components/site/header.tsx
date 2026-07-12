'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Search, Menu, X } from 'lucide-react';
import { siteConfig } from '@/lib/site-config';
import { cn } from '@/lib/utils';
import { TopBar } from './top-bar';

const LOGO = 'https://jwyvdngiccmjhcwlmyql.supabase.co/storage/v1/object/public/media/2024/05/revise_logo_2022_27D_10.png';

export function SiteHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [query, setQuery] = useState('');
  const pathname = usePathname();

  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));

  return (
    <header className="sticky top-0 z-40 bg-white shadow-sm">
      <TopBar />
      <div className="border-b border-[var(--color-border)]">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 md:px-6">
          {/* Logo */}
          <Link href="/" className="flex shrink-0 items-center">
            <div className="relative h-14 w-36 md:h-[68px] md:w-44">
              <Image
                src={LOGO}
                alt="Home Tool Center"
                fill
                priority
                sizes="180px"
                style={{ objectFit: 'contain', objectPosition: 'left' }}
              />
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden flex-1 items-center justify-center gap-1 lg:flex">
            {siteConfig.nav.map((item) => (
              <Link
                key={item.href}
                href={item.href as never}
                className={cn(
                  'px-3.5 py-2 text-base font-medium transition-colors',
                  isActive(item.href)
                    ? 'text-[var(--color-accent-500)]'
                    : 'text-[var(--color-fg)] hover:text-[var(--color-accent-500)]',
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Search (desktop) */}
          <form
            action="/shop"
            className="relative hidden lg:block"
            onSubmit={(e) => {
              if (!query.trim()) e.preventDefault();
            }}
          >
            <input
              name="q"
              type="search"
              placeholder="ค้นหาสินค้า..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-11 w-64 rounded-full border border-slate-300 bg-white pl-5 pr-14 text-sm outline-none focus:border-[var(--color-brand-500)]"
            />
            <button
              type="submit"
              aria-label="ค้นหา"
              className="absolute right-1.5 top-1/2 flex h-8 w-9 -translate-y-1/2 items-center justify-center rounded-lg bg-[var(--color-muted)] text-[var(--color-fg)] transition-colors hover:bg-slate-200"
            >
              <Search className="h-4 w-4" />
            </button>
          </form>

          {/* Mobile toggle */}
          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="เมนู"
            className="rounded p-2 text-[var(--color-fg)] lg:hidden"
          >
            {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile nav */}
        <div className={cn('lg:hidden', mobileOpen ? 'block' : 'hidden')}>
          <nav className="border-t border-[var(--color-border)] bg-white px-4 py-2">
            {siteConfig.nav.map((item) => (
              <Link
                key={item.href}
                href={item.href as never}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'block py-2.5 text-sm font-medium',
                  isActive(item.href)
                    ? 'text-[var(--color-accent-500)]'
                    : 'text-[var(--color-fg)] hover:text-[var(--color-accent-500)]',
                )}
              >
                {item.label}
              </Link>
            ))}
            <form action="/shop" className="mt-2 mb-3">
              <div className="relative">
                <input
                  name="q"
                  type="search"
                  placeholder="ค้นหาสินค้า..."
                  className="h-10 w-full rounded-full border border-slate-300 bg-white pl-5 pr-12 text-sm outline-none focus:border-[var(--color-brand-500)]"
                />
                <button
                  type="submit"
                  aria-label="ค้นหา"
                  className="absolute right-1.5 top-1/2 flex h-7 w-8 -translate-y-1/2 items-center justify-center rounded-lg bg-[var(--color-muted)] text-[var(--color-fg)]"
                >
                  <Search className="h-4 w-4" />
                </button>
              </div>
            </form>
          </nav>
        </div>
      </div>
    </header>
  );
}
