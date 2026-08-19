/**
 * Tag configuration, driven entirely by env so IDs can be swapped without a code change.
 *
 * The client's existing setup may be either a GTM container or a bare GA4 property (the
 * WordPress site used a plugin), so both are supported: if a GTM ID is present everything
 * routes through the container and GA4/Ads tags are configured there; otherwise gtag.js is
 * loaded directly with the GA4 measurement ID. Setting both is allowed but double-counts
 * page views if GA4 is *also* configured inside the container, so we deliberately prefer
 * GTM alone when it is available.
 */

const clean = (v: string | undefined) => {
  const t = (v ?? '').trim();
  return t.length ? t : null;
};

export const GTM_ID = clean(process.env.NEXT_PUBLIC_GTM_ID);
export const GA4_ID = clean(process.env.NEXT_PUBLIC_GA4_ID);
export const CLARITY_ID = clean(process.env.NEXT_PUBLIC_CLARITY_ID);
export const GSC_VERIFICATION = clean(process.env.NEXT_PUBLIC_GSC_VERIFICATION);

/**
 * Consent Mode defaults every storage category to *denied* until someone accepts. That is only
 * correct once a banner exists to grant it — ship it without one and consent can never be
 * granted, so Ads conversions and remarketing stay dark forever. The WordPress site ran no
 * consent mode at all, so leaving this off restores its exact behaviour; turn it on in the
 * same change that adds the banner.
 */
export const CONSENT_MODE_ENABLED = clean(process.env.NEXT_PUBLIC_CONSENT_MODE) === '1';

/** GA4 goes direct only when there is no container to host it. */
export const useDirectGa4 = !GTM_ID && !!GA4_ID;
export const hasAnyTag = !!(GTM_ID || GA4_ID || CLARITY_ID);
