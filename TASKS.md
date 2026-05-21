# TASKS — Home Tool Center Migration

> Source of truth for what's done / pending. Update this file as work progresses.
>
> **Last updated:** 2026-05-21

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
- [x] Import to Supabase (200 products / 42 categories / 7 brands / 30 posts / 32 redirects)
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

## Phase 5 — Admin panel ⬜

- [ ] 5.1 Supabase Auth setup + `/admin/login` page
- [ ] 5.2 Middleware guard for `/admin/*` routes
- [ ] 5.3 Admin shell (sidebar nav + topbar + breadcrumb + toaster)
- [ ] 5.4 First admin user — manual SQL insert into `admin_users` after signup
- [ ] 5.5 Products CRUD (list table with search/filter, edit form, image upload, markdown editor, SEO tab, status toggle)
- [ ] 5.6 Categories CRUD (tree editor, parent picker)
- [ ] 5.7 Brands CRUD
- [ ] 5.8 Posts CRUD (markdown editor with image insert, preview, status, tags)
- [ ] 5.9 Quote requests inbox (filter by status, detail view, status update, CSV export)
- [ ] 5.10 Contact messages inbox (same pattern)
- [ ] 5.11 Media library (grid view, upload, alt-text edit, used-by indicator)
- [ ] 5.12 Redirects manager (CRUD + CSV import, hit counter)
- [ ] 5.13 Site settings + menus editor
- [ ] 5.14 Server actions for revalidation (`revalidatePath`) on save

## Phase 6 — Pre-launch polish ⬜

### Data fixes
- [ ] Map products → brands (`products.brand_id` is all null because Thai names like "ทีโอเอ" don't match English brand seeds like "TOA")
- [ ] Verify each category has correct parent_id chain
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

## Phase 7 — Launch ⬜

- [ ] Backup WP DB + files
- [ ] Coordinate 7-day content freeze with client
- [ ] Re-crawl WP one final time + re-import any new content
- [ ] Vercel project setup + custom domain
- [ ] Production env vars on Vercel
- [ ] GA4 + GTM + GSC verification
- [ ] DNS cutover (Cloudflare DNS-only → Vercel A/CNAME)
- [ ] Submit sitemap to GSC, request recrawl
- [ ] Spot-test 20 redirect URLs from old sitemap

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
- [ ] Client confirms cutover date + content freeze window

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
