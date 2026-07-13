'use client';

import type Lenis from 'lenis';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

/**
 * Inertia scrolling on pointer devices. Lenis is loaded lazily so it stays out of
 * the critical path — nothing here can delay first paint.
 *
 * Deliberately inert in three cases:
 *  - prefers-reduced-motion: the whole point of the setting.
 *  - coarse pointers: touch already has native momentum; layering Lenis on top
 *    makes a 347-product catalog feel laggy when you flick to scan it.
 *  - while a Radix dialog holds the body scroll lock: otherwise the page keeps
 *    scrolling under the overlay and the dialog's own scroll dies.
 */
export function SmoothScroll() {
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
    if (reducedMotion || coarsePointer) return;

    let frame = 0;
    let cancelled = false;
    let observer: MutationObserver | undefined;

    import('lenis').then(({ default: LenisCtor }) => {
      if (cancelled) return;

      const lenis = new LenisCtor({ lerp: 0.12, smoothWheel: true, syncTouch: false });
      lenisRef.current = lenis;

      const loop = (time: number) => {
        lenis.raf(time);
        frame = requestAnimationFrame(loop);
      };
      frame = requestAnimationFrame(loop);

      const syncWithScrollLock = () => {
        const locked =
          document.body.hasAttribute('data-scroll-locked') ||
          window.getComputedStyle(document.body).overflow === 'hidden';
        if (locked) lenis.stop();
        else lenis.start();
      };

      observer = new MutationObserver(syncWithScrollLock);
      observer.observe(document.body, {
        attributes: true,
        attributeFilter: ['style', 'data-scroll-locked'],
      });
      syncWithScrollLock();
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      observer?.disconnect();
      lenisRef.current?.destroy();
      lenisRef.current = null;
    };
  }, []);

  // Next resets the window scroll on navigation; Lenis keeps its own position and
  // would otherwise animate back down from the old one.
  const pathname = usePathname();
  useEffect(() => {
    lenisRef.current?.scrollTo(0, { immediate: true });
  }, [pathname]);

  return null;
}
