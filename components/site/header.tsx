'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { Search, Menu, X } from 'lucide-react';
import { siteConfig } from '@/lib/site-config';
import { cn } from '@/lib/utils';
import { TopBar } from './top-bar';

export function SiteHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [query, setQuery] = useState('');

  return (
    <header className="sticky top-0 z-40 bg-white shadow-sm">
      <TopBar />
      <div className="border-b border-[var(--color-border)]">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 md:px-6">
          {/* Logo */}
          <Link href="/" className="flex shrink-0 items-center gap-2">
            <div className="relative h-12 w-32 md:h-14 md:w-40">
              <Image
                src="https://jwyvdngiccmjhcwlmyql.supabase.co/storage/v1/object/public/media/2024/05/revise_logo_2022_27D_10.png"
                alt="Home Tool Center"
                fill
                priority
                sizes="160px"
                style={{ objectFit: 'contain', objectPosition: 'left' }}
              />
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden flex-1 items-center justify-center gap-1 lg:flex">
            {siteConfig.nav.map((item) => (
              <Link
                key={item.href}
                href={item.href as any}
                className="px-3 py-2 text-sm font-medium text-[var(--color-fg)] transition-colors hover:text-[var(--color-brand-500)]"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Search (desktop) */}
          <form
            action="/shop"
            className="hidden items-center gap-2 lg:flex"
            onSubmit={(e) => {
              if (!query.trim()) e.preventDefault();
            }}
          >
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-muted-fg)]" />
              <input
                name="q"
                type="search"
                placeholder="ค้นหา..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-9 w-48 rounded-md border border-[var(--color-border)] bg-white pl-8 pr-3 text-sm outline-none focus:border-[var(--color-brand-500)]"
              />
            </div>
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
                href={item.href as any}
                onClick={() => setMobileOpen(false)}
                className="block py-2.5 text-sm font-medium text-[var(--color-fg)] hover:text-[var(--color-brand-500)]"
              >
                {item.label}
              </Link>
            ))}
            <form action="/shop" className="mt-2 mb-3">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-muted-fg)]" />
                <input
                  name="q"
                  type="search"
                  placeholder="ค้นหา..."
                  className="h-9 w-full rounded-md border border-[var(--color-border)] bg-white pl-8 pr-3 text-sm outline-none focus:border-[var(--color-brand-500)]"
                />
              </div>
            </form>
          </nav>
        </div>
      </div>
    </header>
  );
}
