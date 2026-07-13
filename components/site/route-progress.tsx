'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

type Phase = 'idle' | 'loading' | 'done';

/**
 * Thin bar across the top while a navigation is in flight. Server-rendered pages
 * can take a moment to stream in; without this the UI looks frozen after a click.
 *
 * Starts on a click of any same-origin link and ends when the pathname actually
 * changes, so it never lies about a navigation that didn't happen.
 */
export function RouteProgress() {
  const pathname = usePathname();
  const [phase, setPhase] = useState<Phase>('idle');

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const anchor = (event.target as HTMLElement | null)?.closest?.('a');
      if (!anchor || anchor.target === '_blank' || anchor.hasAttribute('download')) return;

      const href = anchor.getAttribute('href');
      if (!href || href.startsWith('#')) return;

      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      // Same page (or a hash on it) never triggers a navigation.
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;

      setPhase('loading');
    }

    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, []);

  useEffect(() => {
    setPhase((current) => (current === 'loading' ? 'done' : current));
  }, [pathname]);

  useEffect(() => {
    if (phase !== 'done') return;
    const timer = setTimeout(() => setPhase('idle'), 300);
    return () => clearTimeout(timer);
  }, [phase]);

  if (phase === 'idle') return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-[3px]" aria-hidden="true">
      <div
        className={cn(
          'route-progress__bar h-full origin-left bg-[var(--color-accent-500)]',
          phase === 'loading'
            ? 'animate-[progress-grow_5s_cubic-bezier(0.1,0.9,0.2,1)_forwards]'
            : 'scale-x-100 opacity-0 transition-all duration-300'
        )}
      />
    </div>
  );
}
