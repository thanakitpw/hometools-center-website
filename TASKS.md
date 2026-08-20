# TASKS — Home Tool Center Migration

> Source of truth for what's done / pending. Update this file as work progresses.
>
> **Last updated:** 2026-08-20 (🟢 live; 26-article batch published with WebP covers)

Legend: ✅ done · 🔄 in progress · ⬜ todo · ⏸ blocked (waiting on user/external)

---

## Phase 0 — Discovery ✅

- [x] Crawl 282 WP URLs with Playwright (`scripts/crawl.js`)
- [x] Extract structured data → `research/data/*.json` (200 products / 42 categories / 30 posts / 8 pages)
- [x] Extract design tokens → `research/design-tokens.json`
- [x] Build redirect map (32 rules) → `research/redirect-map.json`
- [x] Identify Thai-slug top-level blog URLs → English slug strategy

## Phase 1 — Foundation ✅

- [x] Next.js 16 + TypeScript + Tailwind v4
- [x] shadcn/ui init + 13 core components
- [x] Apply migration `0001_init.sql` (13 tables + RLS)
- [x] Seed `site_settings` (contact + seo placeholders)
- [x] Import to Supabase (200 products / 42 categories / 7 brands / 30 posts / 32 redirects) — *superseded 2026-07-12, see Phase 4.5*
- [x] Supabase clients: `server.ts`, `client.ts`, `admin.ts`, `static.ts`
- [x] Query helpers in `lib/queries/`
- [x] Vercel env decisions locked (Resend, Line Messaging API, Cloudflare DNS-only)

## Phase 2 — Public site ✅

- [x] Route group `(site)` + layout (header / footer / floating-contact)
- [x] Home `/` — 9 sections (hero, intro, category icons, promo, about, blog teaser, CTA, partners, map)
- [x] `/shop` with search + pagination
- [x] `/product/[slug]` with image gallery, related products, Product JSON-LD
- [x] `/product-category/[...slug]` (nested) with sidebar tree + pagination
- [x] `/blog` + `/blog/[slug]` with Article JSON-LD
- [x] 6 static pages: about-us, contact-us, promotion, how-to-place-an-order, privacy-policy, cookie-policy
- [x] `middleware.ts` — 301 redirects from DB
- [x] `app/sitemap.ts` (dynamic) + `app/robots.ts`
- [x] 87 prerendered pages + ISR `revalidate: 3600` on dynamic

## Phase 3 — Forms ✅

- [x] `QuoteDialog` on product pages
- [x] `ContactForm` on `/contact-us`
- [x] API routes `/api/quote` + `/api/contact` with Zod + honeypot
- [x] `lib/notify.ts` — Resend + Line Messaging API adapters (env-gated)
- [x] Sonner toast feedback

## Phase 4 — Image migration ✅

- [x] Create Supabase Storage `media` bucket (public)
- [x] Upload 256 files (255 batch + logo)
- [x] Rewrite DB URLs (products / posts / og images)
- [x] Fix Thai-filename collisions with `u-<md5>.<ext>` naming
- [x] Update home page hardcoded URLs to Supabase
- [x] Update header/footer logo to Supabase
- [x] Lock `next.config.ts` `remotePatterns` to Supabase host

## Phase 4.5 — DB re-migration (2026-07-12) ✅

> The Phase 0 crawl was lossy vs. the live WooCommerce DB (200/348 products,
> 30/31 posts, 32/~78 redirects, 256/382+ media). Client supplied the
> authoritative MySQL dump + uploads archive; re-migrated products,
> categories, posts, redirects, and referenced media directly from it.

- [x] Product/media/redirect gap closed — **347 products / 42 categories / 31 posts / 109 redirects** re-migrated from the authoritative WP DB dump (`scripts/db/extract.js`, `scripts/db/media.js`, `scripts/db/import.js`; artifacts in `research/db-2026-07/`)
- [x] 382 referenced media files (incl. 37/37 catalog PDFs) uploaded to Supabase Storage, URL map preserved at `research/db-2026-07/url-map.json`
- [x] `product_categories` m2m rebuilt (1036 rows); `quote_requests`, `contact_messages`, `admin_users`, `site_settings`, `menus`, `brands`, `media` preserved untouched
- [x] Parity verify script `scripts/db/verify.js` — counts, no dangling primary category, no dead (non-Storage) media URLs, sample image reachability — all pass; report at `research/db-2026-07/verify-report.json`
- [x] Production build (`npm run build`) passes end-to-end against re-migrated data

## Phase 5 — Admin panel ✅

- [x] 5.1 Supabase Auth setup + `/admin/login` page
- [x] 5.2 Middleware guard for `/admin/*` routes
- [x] 5.3 Admin shell (sidebar nav + topbar + dashboard with counts)
- [x] 5.4 First admin user — seeded (thanakit.dev@gmail.com)
- [x] 5.5 Products CRUD (search + filter + pagination, edit form w/ main+SEO tabs)
- [x] 5.6 Categories CRUD (tree view, parent picker)
- [x] 5.7 Brands CRUD
- [x] 5.8 Posts CRUD (markdown editor, tags, status, SEO)
- [x] 5.9 Quote requests inbox (status update + admin note + CSV export)
- [x] 5.10 Contact messages inbox (auto-mark-read, status update)
- [x] 5.11 Media library (multi-upload, grid, alt-text edit, copy URL)
- [x] 5.12 Redirects manager (CRUD)
- [x] 5.13 Site settings + menus editor (contact / SEO / header+footer JSON)
- [x] 5.14 Server actions for revalidation (`revalidatePath`) on save

## Phase 5.5 — Marketing & SEO tools ⬜

> Detailed plan in [`docs/marketing-plan.md`](docs/marketing-plan.md). Execute **after Phase 5 (admin) is done**.

### Tier 1 — pre-launch essentials
- [x] Collect IDs — **not from the client in the end, recovered from the WP export** (the old
      site is down): Ads `AW-11306253882`, GTM `GTM-5LCNL8C9`, GA4 `G-X9W48F0BWC`, GSC meta
      `I0rNG9jQNGOaa-0NdOA8N-l2Kr8M4aLXmhZUWd0FIMs`. Still outstanding: Clarity, FB Pixel,
      LINE token, Google Business, Resend domain
- [x] GTM container + noscript fallback — in **`app/(site)/layout.tsx`, not `app/layout.tsx`**,
      so `/admin` traffic stays out of GA4 and the remarketing audiences
      (`components/site/analytics.tsx`)
- [~] GA4 wired via GTM + custom events — `generate_lead`, `form_error` (both forms),
      `begin_quote`, and a client-side-navigation `page_view` are pushing.
      **Still unwired:** `view_item`, `view_item_list`, `search`, `file_download` — the helpers
      exist in `lib/analytics/events.ts`, nothing calls them yet
- [ ] GSC verification meta tag
- [ ] JSON-LD: `Organization` (site-wide)
- [ ] JSON-LD: `LocalBusiness` (home + contact)
- [ ] JSON-LD: `BreadcrumbList` (all pages with breadcrumbs)
- [ ] JSON-LD: `WebSite` + SearchAction (sitelinks search box)
- [ ] Cookie consent banner (PDPA, blocks GTM until accepted)
- [ ] Microsoft Clarity snippet (lazy-loaded)
- [ ] Dynamic OG image generation per template (`ImageResponse`)

### Tier 2 — post-launch
- [ ] Submit sitemap to GSC + request indexing
- [ ] Vercel Analytics + Speed Insights enable
- [ ] 404 logging → admin can convert to redirect
- [ ] Site search analytics (log `/shop?q=`)
- [ ] Resend domain verification (SPF/DKIM in Cloudflare)
- [ ] Google Business Profile setup/claim

### Tier 3 — paid marketing (when budget approved)
- [ ] Facebook Pixel + Conversions API
- [~] Google Ads conversion tags — not a new build: the client already runs `AW-11306253882`
      inside `GTM-5LCNL8C9`, so restoring the container restores every conversion/remarketing
      tag without needing the individual labels. **Remaining work is inside GTM, not in code:**
      add a Custom Event trigger `generate_lead` to the quote/contact conversion tags, and a
      Custom Event trigger `page_view` to anything currently on All Pages (client-side
      navigation never fires `gtm.js` a second time)
- [ ] LINE Ads pixel
- [ ] CRM integration (HubSpot/Pipedrive — TBD)
- [ ] Newsletter signup + Mailchimp/Brevo sync

### Content publishing pipeline ✅
- [x] `.article-body` typography in `app/globals.css` (replaces the `prose` classes, which
      never resolved — `@tailwindcss/typography` isn't installed)
- [x] `lib/seo/faq.ts` + `faqSchema()` — FAQPage JSON-LD derived from the article HTML
- [x] `scripts/seo/publish-post.js` — validated, idempotent upsert of `seo/published/<slug>.{html,json}`
- [x] `scripts/seo/make-cover.js` — renders + uploads a 1200×630 cover/OG image
- [x] `scripts/seo/set-cover.js` — batch: source art → 1200-wide **WebP q80** → Storage
      `blog/<slug>-cover.webp` → both URL fields in the article JSON
- [x] `.claude/skills/hometools-blog-publish/` — the whole pipeline as a repeatable skill
- [x] Article 1 written: `/blog/paint-coverage-per-bucket` (สี 1 ถัง ทาได้กี่ตารางเมตร)
- [x] `scripts/seo/md-to-article.js` — batch converter for the content team's draft template
- [x] Draft preview: `lib/preview.ts` shows drafts on any non-production deployment
- [x] Cover art on all 26 articles — 26 × 1200×630 PNG from the content team, mapped to slugs
      by reading the Thai headline burned into each image, encoded to WebP (39.5 MB → 2.5 MB,
      −94%) and uploaded. `og:image` + Article schema image now populated on every one
- [x] **26-article batch published 2026-08-20** — sitemap 422 → 448 URLs, all 26 verified on
      the live domain (200, one `<h1>`, cover in `og:image` + Article schema, canonical, in
      sitemap). Needed a deploy, not just ISR: the slugs were absent from `generateStaticParams`
      at the previous build, so production held a cached 404 for each
- [ ] Submit `sitemap.xml` in GSC (carried over from session 6) + Request Indexing on the
      5 highest-value new articles
- [x] Merge `feat/launch-and-analytics` into `main` — main was 5 commits behind what production
      was actually running, so pushing it would have stripped GTM/Ads from the live site
- [x] Blog shows a 2-line `excerpt` instead of a publish date; home page's article strip reads
      the 3 latest from the DB instead of three hardcoded 2023 posts
- [x] Fixed the raw HTML entity in `swing-vs-spring-check-valve`'s title (`&amp;` → `&`)
- [x] Backfilled `excerpt` on all 26 migrated posts that lacked one — **0/56 published posts
      are now without an excerpt**. Copy in `seo/post-meta-backfill.json`, applied by
      `scripts/seo/backfill-post-meta.js`. This also fills the meta description, since
      `generateMetadata` falls back to `excerpt`
- [ ] `seo_title` / `seo_description` on the migrated posts are still mostly empty — the
      excerpt fallback covers the description, but a purpose-written one would beat it
- [ ] Strip the duplicate in-content `<h1>` from migrated posts (page template already renders
      one). Measured 2026-08-20: **9 posts**, not all 30 as previously recorded
- [ ] Link into articles from product/category pages — currently **0** links from
      `/product/*`, `/product-category/*` and `/shop` to any `/blog/*`; the only ways in are
      `/blog` and the sitemap

### Ongoing SEO (post-launch, monthly)
- [ ] Monthly GSC + GA4 health check
- [ ] 2–4 articles/month publishing rhythm
- [ ] Existing post re-optimization (GSC top queries)
- [ ] Backlink outreach + local citations
- [ ] Google Business Profile weekly updates

---

## Phase 6 — Pre-launch polish ⬜

### Data fixes
- [ ] Map products → brands (`products.brand_id` is all null because Thai names like "ทีโอเอ" don't match English brand seeds like "TOA")
- [x] Verify each category has correct parent_id chain — all 42 rebuild into the exact nested URLs found in the WP dump; all 42 return 200 (2026-07-13)
- [ ] Spot-check 10 random products vs WP source

### Visual polish (pixel-perfect home)
- [ ] Hero — add slider/carousel (2+ banners)
- [ ] Section spacing + colors to match WP exactly
- [ ] Tighten typography (font sizes, line-heights vs WP)
- [ ] Map embed — set correct location pin
- [ ] Mobile floating-contact position fine-tune

### SEO
- [ ] Run Lighthouse audit on home / shop / category / product / blog
- [ ] Validate JSON-LD schemas at validator.schema.org
- [ ] Add Organization schema site-wide
- [ ] Add BreadcrumbList JSON-LD (currently visible but not in schema)
- [ ] Add LocalBusiness schema (NAP)
- [ ] Verify Open Graph images for each template
- [ ] Submit sitemap to GSC (post-launch)

### Notify hardening
- [ ] Verify Resend sending domain (currently uses `onboarding@resend.dev`)
- [ ] Update `from:` address in `lib/notify.ts`
- [ ] Confirm Line OA channel + push target works end-to-end
- [ ] Add rate limiting on `/api/quote` and `/api/contact` (Upstash Redis or simple in-memory)
- [ ] Add Cloudflare Turnstile or similar (optional)

## Phase 7 — Launch ✅ (cut over 2026-07-25 16:40 UTC)

> 🟢 **LIVE.** `hometools-center.com` now serves the Next.js site from Vercel. Nameservers were
> moved at the registrar (PDR) from `thomas`/`kallie` → `brad`/`nancy`; the Cloudflare zone in
> `agency.bestsolutions@gmail.com` flipped `pending` → **`active` at 2026-07-25T16:40:50Z**.
>
> ⚠️ **The old WP site had been returning `503` on every path** (nginx, straight from origin
> `27.254.134.234` — not a Cloudflare issue), so cutover was a recovery, not a scheduled
> migration. Content freeze and a final re-crawl were moot.

- [x] Backup WP DB + files — authoritative MySQL dump + `wpuploads.zip` already held (Phase 4.5)
- [ ] ~~Coordinate 7-day content freeze~~ — moot, WP is down
- [ ] ~~Re-crawl WP one final time~~ — impossible, WP is down
- [x] Vercel project setup + custom domain — `hometools-center.com` + `www` attached to
      `prj_ejDxifbeD93ZOSA2Isb9oBirChpr`; `www` set to **301 → apex** at the Vercel edge
      (apex is the canonical host: 1840/1840 references in the WP data carry no `www`)
- [ ] Production env vars on Vercel — only 4 of 8 set. Missing `RESEND_API_KEY`,
      `QUOTE_NOTIFY_EMAIL`, `LINE_CHANNEL_ACCESS_TOKEN`, `LINE_NOTIFY_USER_ID`.
      `lib/notify.ts` skips cleanly, so quotes/messages still land in the DB and `/admin` —
      they just send no email/LINE alert. **Decision: launch without, backfill after.**
- [x] GA4 + GTM — **done 2026-07-27**, see Phase 5.5. The site ran with **zero tags from
      cutover (25 Jul) until this change**, so Ads conversions and remarketing collected
      nothing for that window. GSC ownership was already proven via the
      `google-site-verification` TXT record, so no meta tag was needed
- [x] Deploy the tag change to production — **done 2026-07-27**. Verified on the live domain:
      GTM loader + noscript present, `/admin/login` has none, `X-Robots-Tag` still absent,
      real contact hrefs served, and `?gclid=…&utm_source=…` survives a `301` to a `200`
- [ ] Verify in GTM Preview / Tag Assistant that a real quote submission fires the Ads
      conversion **before the client resumes Google Ads**
- ⚠️ `.vercelignore` did not exist, so `vercel --prod` was uploading `backup-oldwebsite/`
      (535 MB, over the 100 MB per-file limit → deploy failed). Added — but note it must **not**
      exclude `research/` wholesale: `lib/static-pages.ts` reads `research/data/static-pages.json`
      at build time, and dropping it breaks the prerender of `/about-us`
- [x] DNS cutover — **done 2026-07-25**. Not a record edit in the end: the zone we controlled
      was `pending` (assigned `brad`/`nancy`) while the domain was delegated to `thomas`/`kallie`
      in a *different* Cloudflare account still pointing at the dead origin. Every edit we made
      was inert. Fix was an **NS change at the registrar**, which cut over the whole zone at once
- [x] Verify zone parity before the NS switch — `scripts/launch/compare-zone.js`: **0 records
      missing** vs. the live zone; only intentional delta was `www` (live `CNAME → apex`,
      ours `CNAME → Vercel` so the edge serves the 301). Mail untouched: `MX`, `A mail`,
      `A webmail`, SPF, DKIM, DMARC, both `SRV` — all carried over
- [x] Confirm the pre-launch `noindex` guard self-cleared — `X-Robots-Tag` is **absent** on the
      real host (it keyed off the `.vercel.app` hostname, so it lifted with no redeploy)
- [ ] Submit sitemap to GSC, request recrawl ← **next action**
- [x] Tighten SPF — **done 2026-07-25**. `+a` had started authorizing Vercel's shared anycast IPs
      once apex moved. Now `v=spf1 +a:mail.hometools-center.com +mx +a:private.shopsdesign.net -all`,
      which restores the authorized set to exactly `{27.254.134.234}` as before cutover (both
      `mail.` and `private.shopsdesign.net` resolve there). MX/DKIM/DMARC verified unchanged
- [x] ⏳→✅ **Stale NS delegation — self-resolved by 2026-07-27.** Delegation is now
      `brad`/`nancy` only, and Cloudflare, Google, Quad9 and OpenDNS all answer apex with
      Vercel's anycast IPs (`64.29.17.x` / `216.198.79.x`). The old origin still returns `503`
      if you force it with `--resolve`, but nothing resolves there any more — which matters for
      paid traffic: ad clicks can no longer land on the dead host. Original note below.
- [x] ~~**Stale NS delegation — old zone still serving the dead origin.**~~ The previous Cloudflare
      account's zone (`thomas`/`kallie`) is *still active* and still answers apex →
      `27.254.134.234`. Resolvers that cached the old delegation keep hitting it: `1.1.1.1` has
      ~23h left on its cached NS (parent NS TTL is 172800s). Google/Quad9/OpenDNS already
      followed the new delegation. **Fix: get the old Cloudflare account to point apex + `www`
      at Vercel (or delete that zone)** — otherwise it self-resolves within ~24–48h
- [x] Spot-test redirect URLs — full parity smoke over **535 URLs**, re-run **against the live
      domain post-cutover**: 11/11 static, 343/343 products, 42/42 categories, 30/30 blog → `200`;
      107/109 redirects terminate `200` via a `301`. The 2 failures are dead WP-plugin junk
      (`/dflip_category/*`, an `astra-addon` `.css`) — identical to the pre-cutover run
- [x] Flatten multi-hop redirect chains — 75 rules were costing 3–4 hops
      (`scripts/db/flatten-redirect-chains.js`)

## Phase 8 — Post-launch monitoring (2–4 weeks) ⬜

- [ ] Monitor GSC coverage + indexing errors
- [ ] Track 404s in middleware logs → add to redirects table
- [ ] Monitor GA4 traffic delta vs WP baseline
- [ ] Address any client feedback / UX issues
- [ ] Handover doc + video walkthrough for admin panel

---

## Blocked / waiting on user ⏸

- [ ] Resend API key + verified sending domain
- [ ] Line Messaging API channel access token + push target ID
- [x] ~~Client confirms cutover date + content freeze window~~ — moot; WP was already down,
      cut over 2026-07-25 as a recovery

---

## Optional / nice-to-have (post-MVP)

- [ ] CSV bulk import for products (admin)
- [ ] WhatsApp/Telegram notification adapter
- [ ] Customer accounts (login + order history) — current B2B flow uses quote requests only
- [ ] Multi-language (TH only for now)
- [ ] Search autocomplete on `/shop`
- [ ] Compare products feature
- [ ] Recently viewed products

---

## How to update this file

After completing a task:
1. Change `- [ ]` to `- [x]` on the relevant line
2. Bump `**Last updated:**` at top
3. If a whole phase is done, change the section header status (e.g., `⬜` → `✅`)
4. Add anything newly discovered as a sub-task under the right phase
