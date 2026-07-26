import { Suspense } from 'react';
import Script from 'next/script';
import {
  GTM_ID,
  GA4_ID,
  CLARITY_ID,
  CONSENT_MODE_ENABLED,
  useDirectGa4,
  hasAnyTag,
} from '@/lib/analytics/config';
import { consentBootstrapScript } from '@/lib/analytics/consent';
import { AnalyticsRouteTracker } from './analytics-route-tracker';

/**
 * Restores the measurement stack the WordPress site ran through the GTM4WP plugin: one GTM
 * container (`GTM-5LCNL8C9`) hosting GA4 `G-X9W48F0BWC` and Google Ads `AW-11306253882`.
 *
 * Reusing the *same* container is the point — every conversion, remarketing and linker tag
 * already lives inside it, so they come back together and we never need to know the individual
 * conversion labels. A fresh container would mean rebuilding all of them by hand.
 *
 * Mounted from the `(site)` layout, not the root, so `/admin` traffic stays out of GA4 and out
 * of the remarketing audiences.
 */
export function Analytics() {
  if (!hasAnyTag) return null;

  return (
    <>
      {/*
        A raw inline <script>, not next/script `beforeInteractive` — the latter is root-layout
        only, and this component deliberately lives in the (site) layout. Rendered inline it
        executes during parse, which is ahead of the afterInteractive tags below.
      */}
      {CONSENT_MODE_ENABLED ? (
        <script dangerouslySetInnerHTML={{ __html: consentBootstrapScript() }} />
      ) : null}

      {GTM_ID ? (
        <Script
          id="gtm-loader"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${GTM_ID}');`,
          }}
        />
      ) : null}

      {/* Only when there is no container to host it — otherwise GA4 double-counts. */}
      {useDirectGa4 ? (
        <>
          <Script
            id="ga4-loader"
            strategy="afterInteractive"
            src={`https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`}
          />
          <Script
            id="ga4-config"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=window.gtag||gtag;gtag('js',new Date());gtag('config','${GA4_ID}');`,
            }}
          />
        </>
      ) : null}

      {CLARITY_ID ? (
        <Script
          id="clarity"
          strategy="lazyOnload"
          dangerouslySetInnerHTML={{
            __html: `(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","${CLARITY_ID}");`,
          }}
        />
      ) : null}

      {/* useSearchParams needs a boundary or the whole tree opts out of static rendering. */}
      <Suspense fallback={null}>
        <AnalyticsRouteTracker />
      </Suspense>
    </>
  );
}

/** GTM's `<noscript>` fallback. Belongs as early in the body as possible. */
export function AnalyticsNoScript() {
  if (!GTM_ID) return null;
  return (
    <noscript>
      <iframe
        src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
        height="0"
        width="0"
        style={{ display: 'none', visibility: 'hidden' }}
        title="Google Tag Manager"
      />
    </noscript>
  );
}
