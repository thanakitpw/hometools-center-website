/**
 * PDPA cookie consent, expressed as Google Consent Mode v2 signals.
 *
 * We deliberately do NOT withhold the container until someone clicks accept. Consent Mode
 * lets the tags load with every storage category denied, so nothing is written and no
 * identifier is set, while still letting Google model conversions for the visitors who
 * decline — which is what keeps Ads reporting usable. Blocking the container outright
 * throws that away and reports zero for the whole declining population.
 */

export const CONSENT_COOKIE = 'htc_consent';
export const CONSENT_VERSION = 1;

/** Fired on the window when the banner should re-open (e.g. a footer "manage cookies" link). */
export const OPEN_CONSENT_EVENT = 'htc:open-consent';

export type ConsentChoice = {
  version: number;
  /** GA4, Clarity — anything that measures behaviour. */
  analytics: boolean;
  /** Google Ads, remarketing, any advertising identifier. */
  marketing: boolean;
  /** ISO timestamp of the decision, so an expiring re-prompt is possible later. */
  decidedAt: string;
};

export type ConsentState = ConsentChoice | null;

/** Google's consent signal names, in the shape gtag('consent', ...) expects. */
export function toGoogleSignals(c: { analytics: boolean; marketing: boolean }) {
  return {
    ad_storage: c.marketing ? 'granted' : 'denied',
    ad_user_data: c.marketing ? 'granted' : 'denied',
    ad_personalization: c.marketing ? 'granted' : 'denied',
    analytics_storage: c.analytics ? 'granted' : 'denied',
    // Not tied to a category: these cover session integrity and the consent record itself.
    functionality_storage: 'granted',
    security_storage: 'granted',
  } as const;
}

export function readConsent(): ConsentState {
  if (typeof document === 'undefined') return null;
  const raw = document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${CONSENT_COOKIE}=`))
    ?.slice(CONSENT_COOKIE.length + 1);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(raw)) as ConsentChoice;
    // A bumped version means the categories changed — ask again rather than assume.
    if (parsed?.version !== CONSENT_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeConsent(choice: { analytics: boolean; marketing: boolean }): ConsentChoice {
  const value: ConsentChoice = {
    version: CONSENT_VERSION,
    analytics: choice.analytics,
    marketing: choice.marketing,
    decidedAt: new Date().toISOString(),
  };
  // A cookie rather than localStorage: it is readable by the server if we ever need to
  // decide rendering on it, and it expires on its own.
  const oneYear = 60 * 60 * 24 * 365;
  document.cookie =
    `${CONSENT_COOKIE}=${encodeURIComponent(JSON.stringify(value))}; ` +
    `path=/; max-age=${oneYear}; SameSite=Lax` +
    (location.protocol === 'https:' ? '; Secure' : '');

  applyConsent(value);
  return value;
}

/** Push the decision to Google. Safe to call before any tag has loaded — gtag queues it. */
export function applyConsent(choice: { analytics: boolean; marketing: boolean }) {
  if (typeof window === 'undefined') return;
  const w = window as unknown as { dataLayer?: unknown[]; gtag?: (...a: unknown[]) => void };
  w.dataLayer = w.dataLayer || [];
  const gtag = w.gtag || ((...args: unknown[]) => w.dataLayer!.push(args));
  gtag('consent', 'update', toGoogleSignals(choice));
  w.dataLayer.push({ event: 'consent_update', analytics_consent: choice.analytics, marketing_consent: choice.marketing });
}

/**
 * Inline script that runs before any tag loads. It sets every category to denied, then
 * immediately re-grants whatever a returning visitor already agreed to, so their first
 * page view is not lost to a race with React hydration.
 */
export function consentBootstrapScript() {
  return `
(function(){
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  window.gtag = window.gtag || gtag;
  gtag('consent', 'default', {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: 'denied',
    functionality_storage: 'granted',
    security_storage: 'granted',
    wait_for_update: 500
  });
  try {
    var m = document.cookie.match(/(?:^|; )${CONSENT_COOKIE}=([^;]*)/);
    if (m) {
      var c = JSON.parse(decodeURIComponent(m[1]));
      if (c && c.version === ${CONSENT_VERSION}) {
        gtag('consent', 'update', {
          ad_storage: c.marketing ? 'granted' : 'denied',
          ad_user_data: c.marketing ? 'granted' : 'denied',
          ad_personalization: c.marketing ? 'granted' : 'denied',
          analytics_storage: c.analytics ? 'granted' : 'denied',
          functionality_storage: 'granted',
          security_storage: 'granted'
        });
      }
    }
  } catch (e) {}
})();`.trim();
}
