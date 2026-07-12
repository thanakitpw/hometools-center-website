# CLAUDE.md — Project context for Claude Code

> **Companion file:** [`TASKS.md`](./TASKS.md) — single source of truth for what's
> done vs. pending. **Always check it first** when resuming a session, and tick
> off boxes as you finish work.
>
> **Update rules — every meaningful session:**
> 1. Tick boxes in [`TASKS.md`](./TASKS.md) as you complete them.
> 2. Append to the "Session log" at the bottom of this file.
> 3. Bump "Last updated" on both files.

**Last updated:** 2026-07-12

---

## What this project is

Migrate **hometools-center.com** (B2B construction materials distributor,
WooCommerce/WordPress) to **Next.js 16 + Supabase** custom code.

Client: Home Tool Center (HTC). 30+ years in business. Sells pipes, fittings,
TOA paint, SCG products, valves, pumps. Customers request a **quote** (not
direct e-commerce checkout).

**Constraints:**
- Pixel-close to original look (client expects parity).
- SEO MUST NOT regress — `301` every changed URL, keep meta/JSON-LD, sitemap.
- Client has a small team → needs an in-app admin (`/admin`).
- Client manages WP himself — schedule 7-day content-freeze before cutover.

## Owner

- User: `thanakitpw` (agency.bestsolutions@gmail.com)
- Repo: https://github.com/thanakitpw/hometools-center-website
- Working dir: `/Users/thanakitchaithong/Developer/bestsolutions/client/hometools-website-redesign`

---

## Locked decisions (do NOT re-litigate)

| Topic | Decision |
|---|---|
| Framework | Next.js 16 (App Router) + TypeScript |
| Styling | Tailwind v4 + shadcn/ui ("new-york", slate) |
| Thai font | `Sukhumvit Set` self-hosted via `next/font/local` (`app/fonts/SukhumvitSet-*.ttf`) — matches source site exactly. ⚠️ Apple-proprietary; confirm license before launch. (Was `IBM Plex Sans Thai`; overridden 2026-06-03 per client request for pixel-parity.) |
| DB | Supabase Postgres + RLS |
| Storage | Supabase Storage (bucket `media`, public) |
| Auth | Supabase Auth, 2 roles: `admin` / `editor` |
| Email | Resend (key pending from user) |
| Notify | Line **Messaging API** via OA (NOT Line Notify — deprecated 2025-04) |
| Hosting | Vercel (edge) |
| DNS | Cloudflare **DNS-only** (gray cloud) — no proxy |
| Admin pattern | Custom in-app `/admin/*` (NOT 3rd-party CMS) |
| URL strategy | Preserve WP URL patterns (`/product/`, `/product-category/`). Blog moves from top-level Thai slugs → `/blog/<english>` with 301 |
| Content audit | Migrate ALL — no pruning |
| Brand assets | Pulled from WP (pixel-perfect intent) |
| Skills | Do NOT use `bsc-*` skills (user is developing them) |

## Supabase project

- Ref: `jwyvdngiccmjhcwlmyql`
- URL: `https://jwyvdngiccmjhcwlmyql.supabase.co`
- MCP server is configured at `.mcp.json` — call `mcp__supabase__*` tools directly
- Service-role key + anon key live in `.env.local` (gitignored)
- Storage public URL prefix: `https://jwyvdngiccmjhcwlmyql.supabase.co/storage/v1/object/public/media/`

---

## Current state (Phases 0–4 + DB re-migration complete)

> **For the live checklist see [`TASKS.md`](./TASKS.md).** Summary below.

### ✅ Done

1. **Phase 0 — Discovery**
   - Crawled 282 WP URLs (200 products / 42 categories / 30 posts / 8 pages / 1 home) — *counts superseded 2026-07-12, see item 6*
   - Extracted to `research/data/{products,categories,posts,brands,pages,static-pages,images}.json`
   - Design tokens at `research/design-tokens.json` (brand: blue `#1e73be`, accent: orange `#f7931e`)
   - Redirect map: `research/redirect-map.{json,csv}` — 32 rules (30 Thai blog slugs + 2 article→blog)

2. **Phase 1 — Foundation**
   - DB schema migration `0001_init.sql` applied — 13 tables + RLS + 2 seed rows in `site_settings`
   - Imported: 200 products / 42 categories / 7 brand seeds / 30 posts / 32 redirects / 1 header menu — *counts superseded 2026-07-12, see item 6*
   - `lib/supabase/{server,client,admin,static}.ts` — 4 client variants
   - `lib/queries/{products,categories,posts,redirects,types}.ts` — typed query helpers

3. **Phase 2 — Public site**
   - Routes: `/`, `/shop`, `/product/[slug]`, `/product-category/[...slug]`,
     `/blog`, `/blog/[slug]`, `/about-us`, `/contact-us`, `/promotion`,
     `/how-to-place-an-order`, `/privacy-policy`, `/cookie-policy`
   - `middleware.ts` — 301 redirects from `redirects` table
   - `app/sitemap.ts` — dynamic from DB
   - `app/robots.ts`
   - Site shell: `components/site/{header,top-bar,footer,floating-contact}.tsx`
   - Reusables: `ProductCard`, `Breadcrumb`, `Pagination`, `CategorySidebar`, `PageRenderer`
   - JSON-LD: Product (on product pages), Article (on blog posts)
   - 87 static pages prerendered; ISR `revalidate: 3600` on dynamic routes

4. **Phase 3 — Forms**
   - `QuoteDialog` on product pages → `/api/quote` → `quote_requests` table
   - `ContactForm` on `/contact-us` → `/api/contact` → `contact_messages` table
   - Zod validation (`lib/validators.ts`), honeypot field, Sonner toasts
   - `lib/notify.ts` — Resend + Line Messaging API adapters, feature-flagged on env

5. **Phase 4 — Image migration**
   - 256 files uploaded to Supabase Storage `media` bucket
   - DB updated: `products.images`, `products.og_image_url`, `posts.cover_image_url`, `posts.og_image_url`, `posts.content_md` (URL rewrite)
   - Thai filenames use `u-<md5-12char>.<ext>` (Storage rejects non-ASCII keys)
   - Mapping preserved at `research/image-url-map.json`
   - WP server can now be shut down without breaking the new site

6. **Phase 4.5 — DB re-migration (2026-07-12)**
   - The Phase 0 crawl was lossy vs. the live WooCommerce DB (200/348 products, 30/31 posts,
     32/~78 redirects, 256/382+ media). Client supplied the authoritative MySQL dump
     (`adminhometools_wp_orpro.sql`) + full `wp-content/uploads` archive
   - `scripts/db/{extract,media,import,verify}.js` — extract from dump → upload referenced
     media only → truncate+insert the 5 target tables (FK-safe order) → parity verify
   - **Now: 347 products / 42 categories / 31 posts / 109 redirects**, `product_categories`
     rebuilt (1036 rows), 382 media files (incl. 37/37 catalog PDFs) uploaded to Storage
   - Preserved untouched: `quote_requests`, `contact_messages`, `admin_users`,
     `site_settings`, `menus`, `brands`, `media`
   - Artifacts: `research/db-2026-07/*.json`, `verify-report.json`

### ⬜ Not yet built

- **Admin panel** (`/admin/*`) — login, sidebar shell, CRUD for products/categories/brands/posts/quotes/contact_messages/media/redirects/settings
- **Brand mapping** — `products.brand_id` is currently all `null` because product names are Thai ("ทีโอเอ") and brand seeds are English ("TOA"). Fix in admin (or via SQL once)
- **Polish/pixel-perfect home** — sections in place, but spacing/colors not 1:1 with WP yet
- **Resend domain verification** — uses `onboarding@resend.dev` placeholder; switch to verified domain before launch
- **Line channel token** — pending from user
- **Pre-launch checks** — Lighthouse audit, schema validator, GSC submit, DNS cutover

---

## File map (essentials)

```
app/
├── (site)/                       # public layout group
│   ├── layout.tsx
│   ├── page.tsx                  # home (sections w/ hardcoded WP image URLs → already migrated)
│   ├── shop/page.tsx
│   ├── product/[slug]/page.tsx
│   ├── product-category/[...slug]/page.tsx
│   ├── blog/page.tsx
│   ├── blog/[slug]/page.tsx
│   ├── about-us/page.tsx
│   ├── contact-us/page.tsx       # has ContactForm
│   ├── promotion/page.tsx
│   ├── how-to-place-an-order/page.tsx
│   ├── privacy-policy/page.tsx
│   └── cookie-policy/page.tsx
├── api/
│   ├── quote/route.ts
│   └── contact/route.ts
├── layout.tsx                    # root (font + metadata)
├── globals.css                   # design tokens
├── sitemap.ts
└── robots.ts

components/
├── site/                         # public components
│   ├── header.tsx, top-bar.tsx, footer.tsx, floating-contact.tsx
│   ├── product-card.tsx, breadcrumb.tsx, pagination.tsx, category-sidebar.tsx
│   ├── quote-dialog.tsx, contact-form.tsx, page-renderer.tsx
└── ui/                           # shadcn primitives (13)

lib/
├── supabase/{server,client,admin,static}.ts
├── queries/{products,categories,posts,redirects,types}.ts
├── notify.ts, validators.ts, utils.ts, site-config.ts, static-pages.ts

middleware.ts                     # 301 redirects

supabase/migrations/0001_init.sql

scripts/                          # one-shot migration tools (committed for reproducibility)
├── crawl.js                      # Playwright crawler
├── collect-urls.js, analyze-home.js, extract-data.js, extract-design-tokens.js
├── extract-static-pages.js, build-redirects.js
├── import-to-supabase.js         # idempotent — JSON → DB
├── migrate-images.js, fix-collided-images.js
├── rewrite-db-urls.js, fix-db-from-orphans.js
├── upload-logo.js
├── preview-shot.js, preview-pages.js
└── test-supabase.js

research/                         # large artifacts (most gitignored)
├── data/*.json                   # committed — products, categories, posts, brands, pages, static-pages, images
├── image-url-map.json            # committed — old WP URL → Supabase Storage URL
├── design-tokens.json            # committed
├── home-sections.json            # committed
├── url-list.json                 # committed
├── redirect-map.{json,csv}       # committed
├── crawl/*.html                  # gitignored (~92MB)
├── crawl-meta.json               # gitignored
├── screenshots-full/, screenshots/  # gitignored
└── preview-*.png                 # gitignored

docs/plan.md                      # original detailed plan
```

## Environment

`.env.local` (gitignored) contains real keys:
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
RESEND_API_KEY            # pending
QUOTE_NOTIFY_EMAIL        # pending
LINE_CHANNEL_ACCESS_TOKEN # pending
LINE_NOTIFY_USER_ID       # pending (Line OA user/group ID to push to)
NEXT_PUBLIC_SITE_URL      # https://hometools-center.com
```

`.env.example` is the empty template, committed.

---

## How to work on this project

### Resuming a session
1. Read this file top-to-bottom.
2. Open [`TASKS.md`](./TASKS.md) — find next unchecked item or the in-progress phase.
3. `git status` + `git log --oneline -5` to see recent commits.
4. Check `TaskList` if any session-level tasks are still `in_progress`.
5. Re-read `docs/plan.md` ONLY if working on launch-critical workflow.

### Common commands
```bash
npm run dev          # http://localhost:3000
npm run build        # production check
node scripts/import-to-supabase.js     # re-seed DB (idempotent upsert by slug)
node scripts/migrate-images.js          # re-run image migration (resumable)
```

### Local quirks (remember!)
- **`head` on this Mac is libwww-perl, NOT GNU coreutils** — DON'T pipe to `head -n`. Use `awk 'NR<=N'` or redirect to file.
- JSDOM is too heavy for batch HTML parsing on this machine — use **cheerio**.
- Supabase Storage rejects non-ASCII keys → use `u-<md5>.<ext>` for Thai filenames.
- `typedRoutes: true` is currently OFF because not all routes exist; turn back on before launch.

### DB access
- **Reading from app code:** `lib/supabase/server.ts` (cookies) or `lib/supabase/static.ts` (build-time, no cookies).
- **From scripts:** service role via `@supabase/supabase-js` directly with `.env.local`.
- **From this assistant:** Supabase MCP tools (`mcp__supabase__execute_sql`, `mcp__supabase__apply_migration`, etc) — already authenticated.

### Style conventions
- Server Components by default; `'use client'` only when needed (forms, dialogs).
- Page metadata via `export async function generateMetadata` — pulls SEO fields from DB.
- Image URLs: never hard-code WP URLs; always Supabase Storage URLs.
- Brand colors via CSS vars in `app/globals.css` (`--color-brand-500`, `--color-accent-500`, etc).
- Forms: Zod schema in `lib/validators.ts`, RHF on the client, service-role insert on the server.

---

## What's next

See [`TASKS.md`](./TASKS.md) for the full live checklist. Priority order:

1. **Phase 5 — Admin panel** (`/admin/*`) — biggest remaining piece.
2. **Phase 5.5 — Marketing & SEO tools** — GTM/GA4/GSC/Clarity/schemas/cookie banner. Detailed plan in [`docs/marketing-plan.md`](docs/marketing-plan.md). Implementation **after Phase 5**.
3. **Phase 6 — Pre-launch polish** — brand mapping, visual polish, notify hardening.
4. **Phase 7 — Launch** — DNS cutover, GSC submit, monitoring.

Blocked items (waiting on user) are listed in `TASKS.md` under "Blocked / waiting on user".

---

## Session log

### 2026-05-20 → 2026-05-21 (session 1)
- Bootstrapped project from empty dir
- Completed Phases 0–4 end-to-end
- Initial commit `47073c9`, pushed to `origin/main`
- Image migration had a Thai-filename collision bug — fixed with hash naming on retry
- 30 blog posts had Thai top-level slugs in WP — decided new pattern `/blog/<english-slug>` + 301 each old URL
- User installed Supabase MCP server (HTTP transport + OAuth) — DB access from this assistant works directly without service-role keys

### 2026-05-21 (session 1 continued)
- Added `CLAUDE.md` and `TASKS.md`
- `TASKS.md` is now the single source of truth for completion tracking; this file references it
- Added `docs/marketing-plan.md` — full marketing/SEO plan covering Tier 1 (pre-launch essentials: GTM/GA4/GSC/Clarity/schemas/cookie banner), Tier 2 (post-launch), Tier 3 (paid ads), and ongoing SEO workflow
- New phase 5.5 in TASKS.md tracks marketing/SEO setup. Execution happens after Phase 5 admin is built

### 2026-07-12 (session 2 — DB re-migration, branch `feat/db-remigration`)
- Client supplied the authoritative WooCommerce MySQL dump (`backup-oldwebsite/adminhometools_wp_orpro.sql`, phpMyAdmin export, prefix `jQH0o_`) plus the full `wp-content/uploads` archive (`wpuploads.zip`). The Phase 0 HTML crawl turned out lossy against this source of truth: 200/348 products, 30/31 posts, 32/~78 redirects, 256/382+ media
- Built `scripts/db/{extract,media,import,verify}.js`, in 3 stages:
  1. **Extract** — spin up a temp local MySQL, load the dump, pull products/categories/posts/redirects + the attachment index into `research/db-2026-07/*.json` (RankMath SEO fields, primary-category term, blog-slug reconciliation against the existing redirect map)
  2. **Media** — upload only *referenced* media (382 files, incl. 37/37 catalog PDFs) to Supabase Storage, reusing existing files by content hash; build `url-map.json` and rewrite all internal URLs in migrated HTML/markdown
  3. **Import** — truncate + re-insert the 5 target tables in FK-safe order (`product_categories` → `products` → `posts` → `redirects` → `categories`), preserving `quote_requests`, `contact_messages`, `admin_users`, `site_settings`, `menus`, `brands`, `media` untouched (verified via before/after row counts)
- `scripts/db/verify.js` gate: table counts, no dangling `primary_category_id`, no dead (non-Storage) media URL, sample image HTTP-200 — all pass. `npm run build` completes cleanly against the re-migrated data
- **Result: 347 products / 42 categories / 31 posts / 109 redirects**, `product_categories` 1036 rows
- Still pending / carried forward:
  - `brand_id` mapping — confirmed the live WooCommerce DB has **no** brand taxonomy at all (not just a Thai/English name mismatch as previously assumed); brand assignment stays a manual/admin task
  - Blog-category migration — **not** done; `posts.category_id` stays `null` (WP's `category` taxonomy was intentionally not ported into the product `categories` table, to avoid polluting product nav)
  - `[dflip id]` inline flipbook shortcodes in a handful of product/post descriptions render as literal text (not resolved to an embed); the catalog-download flow is unaffected since it's served via `catalog_pdf_url`
