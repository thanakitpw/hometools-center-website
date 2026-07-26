'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

/**
 * GTM's container fires its "All Pages" trigger once, off the `gtm.js` event, which on the
 * WordPress site meant once per page because every navigation was a full document load. Here
 * navigation is client-side, so without this every tag on that trigger — GA4 page_view, the
 * Google Ads remarketing tag — would only ever fire for the entry page.
 *
 * ⚠️ This only helps once GTM knows about it: add a **Custom Event** trigger named `page_view`
 * to the GA4 configuration/event tag and the Ads remarketing tag inside GTM-5LCNL8C9.
 */
export function AnalyticsRouteTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isFirstRender = useRef(true);

  useEffect(() => {
    // The container's own gtm.js pageview already covers the entry page; pushing here too
    // would double-count it.
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    const qs = searchParams.toString();
    const path = qs ? `${pathname}?${qs}` : pathname;

    // Next writes the new <title> in a later commit, so reading it synchronously here would
    // report the *previous* page's title. One frame is enough for it to land.
    const frame = requestAnimationFrame(() => {
      const w = window as unknown as { dataLayer?: unknown[] };
      w.dataLayer = w.dataLayer || [];
      w.dataLayer.push({
        event: 'page_view',
        page_path: path,
        page_location: window.location.href,
        page_title: document.title,
      });
    });

    return () => cancelAnimationFrame(frame);
  }, [pathname, searchParams]);

  return null;
}
