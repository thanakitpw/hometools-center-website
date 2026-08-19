import 'server-only';

/**
 * Draft articles are invisible on the live site — that is the whole point of the status.
 * But they still have to be reviewable before they go live, and a reviewer needs the real
 * rendered page, not a CMS form.
 *
 * Vercel sets VERCEL_ENV to 'production' only for production deployments, so preview
 * deployments and local dev light up automatically with no flag to remember and no shared
 * secret to leak. Production is the one place drafts stay hidden.
 *
 * Preview deployments are also served `X-Robots-Tag: noindex, nofollow` by middleware.ts
 * (any host that isn't the canonical domain), so drafts surfaced here cannot be indexed.
 */
export const SHOW_DRAFTS = process.env.VERCEL_ENV !== 'production';

/** Statuses a listing or lookup should accept in the current environment. */
export const VISIBLE_STATUSES = SHOW_DRAFTS ? ['published', 'draft'] : ['published'];
