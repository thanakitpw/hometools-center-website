# CLAUDE.md — Project context for Claude Code

> **ภาษา:** ตอบกลับผู้ใช้เป็น **ภาษาไทย** ทุกครั้ง (โค้ด, ชื่อไฟล์, คำสั่ง shell,
> commit message และ identifier ต่าง ๆ ยังคงเป็นภาษาอังกฤษตามเดิม)

> **Companion file:** [`TASKS.md`](./TASKS.md) — single source of truth for what's
> done vs. pending. **Always check it first** when resuming a session, and tick
> off boxes as you finish work.
>
> **Update rules — every meaningful session:**
> 1. Tick boxes in [`TASKS.md`](./TASKS.md) as you complete them.
> 2. Append to the "Session log" at the bottom of this file.
> 3. Bump "Last updated" on both files.

**Last updated:** 2026-08-20 — 🟢 site LIVE; 26-article SEO batch published with WebP covers

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

### 2026-07-13 (session 3 — nested category URLs + soft-404 fix)
- **Bug 1 — every nested category URL 404'd.** `categories.slug` stores only the leaf segment
  (`decorative-coatings`), but `/product-category/[...slug]` joined all segments and matched
  `.eq('slug', 'construction-materials-and-equipment/toa-color/decorative-coatings')`. Only the
  3 root categories resolved; **39 of 42 were dead**, including the category cards on the home page.
  The old WooCommerce site's canonical (verified against the live site and the SQL dump) is the
  full ancestor chain, so these are exactly the URLs Google has indexed
- Fix: `attachPaths()` in `lib/queries/categories.ts` rebuilds the chain from `parent_id`
  (pure, so `app/sitemap.ts` reuses it with its cookie-free client). Category page now resolves by
  full path; a bare leaf slug or stale ancestor chain **308s to the canonical path** rather than 404ing
  (matches the 6 leaf→full 301s the client's own Rank Math already had). Sidebar, breadcrumb (now shows
  ancestors), product-page category link, canonical, and sitemap all emit full paths
- **Bug 2 (pre-existing, from `26d5fbb`) — `notFound()` returned HTTP 200 site-wide.** The `loading.tsx`
  files added with the skeleton work put every affected route behind a Suspense boundary, so Next flushed
  a 200 before the page could call `notFound()`/`permanentRedirect()` → **soft 404s on product, blog, and
  category pages**, and redirects silently degraded. `loading.tsx` also applies to *child* segments, so
  `blog/loading.tsx` broke `/blog/[slug]` too
- Fix: dropped `loading.tsx` from the routes that can 404 (`product/[slug]`, `product-category/[...slug]`,
  `blog/[slug]`, `blog`). `/blog`'s skeleton moved into an in-page `<Suspense>` boundary instead, which
  doesn't leak into `/blog/[slug]`. `/shop`'s `loading.tsx` stays (no child routes, never 404s)
- ⚠️ **Rule going forward: never add `loading.tsx` to a segment whose page (or a child's page) calls
  `notFound()` or `redirect()`** — put the skeleton in an in-page `<Suspense>` instead
- **Bug 3 — 37 of 42 categories listed zero products.** `listProductsByCategory()` filtered on
  `products.primary_category_id`, ignoring the `product_categories` join table where membership actually
  lives (decorative-coatings: 0 via primary, 61 via join). Fixed with a PostgREST inner-join filter
  (`product_categories!inner(category_id)`). **No descendant walk is needed** — WooCommerce tags every
  product with its category *and all ancestors*, confirmed against the dump (direct count == count
  including children, for every category). Verified: all 42 categories now report the exact product count
  WordPress does (decorative-coatings 61 = the old site's 6 paginated pages)
- **Bug 4 — giant square image at the top of category pages.** `categories.banner_image_url` is the WP term
  *thumbnail*: a 1000×1000 square icon (blue tile, white line art), which the page rendered as a full-width
  hero. The old site never shows it that way — it uses it as `og:image`, and (only on the TOA branch) inside
  a hand-placed Elementor strip of 7 category tiles at 300×300. Dropped the hero `<img>`; the icon now feeds
  `openGraph.images` instead, matching WP
- Known parity gap (not built): the TOA-branch strip of 7 category tiles. It is an Elementor widget on
  `toa-color` and its children only — no other branch has one
- Verified: 42/42 category paths → 200; 42/42 product counts match the WP dump; missing product/blog/category
  → 404; leaf-only + wrong-ancestor → 308 to canonical; sitemap emits 39 nested + 3 root paths;
  `npm run build` green

### 2026-07-20 (session 4 — Thai-slug 404s, sidebar parity, product body content)
- **Percent-encoded slugs — 38 product pages 404'd, 87 of 109 redirects were dead.** WordPress
  persists `post_name` percent-encoded when the title is non-ASCII, so `ท่อ-pb` was stored as
  `%e0%b8%97%e0%b9%88%e0%b8%ad-pb` and the exact-match lookup never hit. Compounding it,
  **Next.js 16 decodes route params inconsistently**: for the same request `generateMetadata`
  receives the decoded slug while the page component receives the raw encoded one (verified with
  a temporary debug log), so fixing the data alone was not enough
- Fix: `scripts/db/extract.js` decodes at the source; `scripts/db/fix-encoded-slugs.js` repaired
  the 47 rows already imported (38 product slugs + 9 `redirects.to_path`), with a collision guard;
  `lib/queries/slug.ts` matches both forms at every slug lookup (products/posts/categories);
  `lib/queries/redirects.ts` decodes the pathname before lookup; `app/sitemap.ts` percent-encodes
  `<loc>` (it was emitting raw Thai, which violates the sitemap spec)
- Result: 38/38 Thai product pages → 200, 107/109 redirects land on a 200. The 2 left are dead WP
  plugin junk (`/dflip_category/*` has no equivalent route; an `astra-addon` `.css` the middleware
  matcher excludes by design)
- ⚠️ Old URLs with a trailing slash now chain 308 → 301 (Next normalises the slash before
  middleware runs). Google follows it; removing the hop means `trailingSlash` site-wide — not worth it
- **Sidebar chevrons all pointed up.** Every nesting level shared `group/sidebar`, and
  `group-open/sidebar:` matches any *ancestor* that is open — top-level groups are open by default,
  so children inherited the rotation. Now `open:[&>summary>svg]:rotate-180` on the `<details>`
  itself, scoped to its own direct summary. (`[details[open]>summary>&]` does *not* compile in
  Tailwind v4 — nested brackets; always check the built CSS)
- **Sidebar order now matches the old site** (40/40 entries, order + nesting). The old sidebar was a
  hand-curated Elementor menu, NOT the category tree — WooCommerce term order does not match it.
  `scripts/db/set-category-order.js` replays that menu into `categories.sort_order` (spaced by 10,
  errors if any category is unaccounted for). `pvc-pipes-and-fittings-thaipipe` is a ROOT category
  the menu displayed *inside* งานระบบ — regrouped in the component only, since re-parenting would
  change its indexed URL
- **Product bodies were never rendered.** `products.description_md` (raw WP `post_content`, despite
  the name) holds the full page body for 317 products; the page was rendering only
  `short_description`. Now wired through `lib/product-description.ts`, which also strips dFlip
  `[dflip id=…]` shortcodes (41 products) that would otherwise print as literal text
- `scripts/db/fix-product-catalog-pdfs.js` backfilled `catalog_pdf_url` for the 7 products whose
  shortcode was the *only* pointer to their catalog, resolving `_dflip_data.pdf_source` out of the
  dump and through the media url-map. **334/343 products now show a detail section**; the other 9
  are empty in WordPress too (verified against the dump)
- ⚠️ Gate on media as well as text when deciding whether to render HTML — several products describe
  themselves entirely with a linked catalog banner and no prose at all
- Known issue (pre-existing, not a regression): 4 product bodies hotlink images from
  `toagroup.com` that now 404 on TOA's own server
- Card/layout tweaks: listing containers 1320/1280 → 1560px, product-card image full-bleed
  `aspect-[4/5]` + `object-cover object-top`, title 16 → 13px, submenu slide-down animation via
  `::details-content` (CSS-only on purpose — a JS accordion unmounts collapsed panels and would
  drop ~40 internal category links out of the server-rendered HTML)

### 2026-07-25 (session 5 — launch prep, domain attached, redirect chains flattened)
- 🔴 **The old WP site is down.** `hometools-center.com` returns `503` on every path (nginx,
  confirmed straight from origin `27.254.134.234` via `--resolve`, so it is not Cloudflare).
  Cutover is therefore a *recovery*, not a scheduled migration: the content freeze and the
  "final re-crawl" in Phase 7 are moot while WP is unreachable. Cause unknown — with the host/client
- **Launch readiness verified against the live Vercel deployment**, not just locally. A parity
  smoke over **535 URLs** (every published product/category/post + statics + all 109 redirect
  `from_path`s) returned: 11/11 static, 343/343 product, 42/42 category, 30/30 blog → `200`;
  107/109 redirects → `200`, all terminating in **301** (no 302/307 leaked). The 2 failures are
  dead WP-plugin junk already documented in session 4
- **Domain attached to Vercel** — `hometools-center.com` + `www.hometools-center.com` on
  `prj_ejDxifbeD93ZOSA2Isb9oBirChpr`. `www` is set to **301 → apex** at the edge via
  `PATCH /v9/projects/{id}/domains/{domain}`; apex is canonical (1840/1840 URL references in the
  WP export carry no `www`). Attaching does **not** affect the live site — DNS still decides
- **75 redirects were costing 3–4 hops.** Three causes: a trailing slash on `to_path` (Next 308s
  it away *before* middleware), `to_path` pointing at an intermediate slug that redirects again,
  and `to_path` pointing at a bare leaf category (which 308s to the full ancestor chain).
  `scripts/db/flatten-redirect-chains.js` walks each rule against a live deployment and rewrites
  `to_path` to the terminal path; re-running converges to `to flatten: 0`
- ⚠️ The residual 2-hop cases are **not** fixable in data: they are rules whose `from_path` itself
  ends in `/`, and Next normalises the inbound URL with a 308 before middleware ever runs.
  Removing that hop would mean `trailingSlash: true` site-wide — not worth it (see session 4)
- **Verified the pre-launch `noindex` guard self-clears.** `X-Robots-Tag: noindex, nofollow` is
  present on the `.vercel.app` host on both cached (`x-vercel-cache: HIT`) and dynamic responses,
  and keys off the `host` header — so it lifts the moment DNS points the real domain here, with
  no code change or redeploy. (Watch out: `curl -sI | awk 'NR<=N'` truncates before reaching it)
- **Content has zero dependency on the dead WP host** — scanned every `description_md`,
  `content_md`, image and PDF column: 0 references to `hometools-center.com`. Remaining external
  hosts are `static.xx.fbcdn.net` (179, emoji in post bodies), `facebook.com`/`lin.ee`/`m.me`
  (links, harmless) and `toagroup.com` (23 — the known-broken hotlinks from session 4)
- 🔴 **DNS: mail lives on the old server.** `MX → mail.hometools-center.com → 27.254.134.234`,
  plus `A mail`/`A webmail`. **Only the apex and `www` records may be touched at cutover.**
  `scripts/launch/cloudflare-cutover.js` enforces this (dry-run by default, `--apply`,
  `--rollback`, and it refuses to consider anything but apex/`www`). Also present and not to be
  deleted: the `google-site-verification` TXT (GSC ownership is already proven) and the SPF TXT.
  After cutover SPF's `+a` will authorize Vercel's IPs rather than the mail host — delivery still
  passes via `+mx`, but it should be tightened to `+a:mail.hometools-center.com`
- Vercel DNS target for both records: `CNAME → f719314d174704b9.vercel-dns-017.com`,
  **DNS-only / grey cloud** (proxying breaks SSL issuance). Apex fallback: `A → 76.76.21.21`.
  Zone TTL is 300s, so rollback lands within ~5 minutes
- Production env has only 4 of 8 vars — `RESEND_API_KEY`, `QUOTE_NOTIFY_EMAIL`,
  `LINE_CHANNEL_ACCESS_TOKEN`, `LINE_NOTIFY_USER_ID` are unset. Per user decision, launching
  without them: `lib/notify.ts` returns `{skipped}` rather than throwing, so quote/contact
  submissions still persist and show in `/admin` — they just raise no alert. Backfill after launch

### 2026-07-25 (session 6 — 🟢 CUTOVER, site is live)

- 🔴 **Correction to session 5: our Cloudflare zone was never authoritative.** It sat at
  `status=pending` with assigned NS `brad`/`nancy`, while the registrar delegated the domain to
  `thomas`/`kallie` — a **different Cloudflare account** (the old host's) whose zone still pointed
  apex at the dead `27.254.134.234`. So every DNS edit made from `cloudflare-cutover.js` was
  **inert**, and the session-5 note "DNS still decides" understated it: our zone was not in the
  path at all. Symptom to recognise next time: the CF API lists the records you expect, but
  `dig @<the-live-NS> …` disagrees → compare `name_servers` vs `original_name_servers` and check
  `status`
- **Cutover was therefore an NS change at the registrar** (PDR Ltd. / PublicDomainRegistry),
  not a record edit — `thomas`+`kallie` → `brad`+`nancy`. The whole zone goes live at once, so
  parity had to be proven *first*: `scripts/launch/compare-zone.js` reported **0 records missing**
  vs. the live zone, the only delta being the intentional `www` (live `CNAME → apex`; ours
  `CNAME → Vercel`, which serves the 301 at the edge). Mail carried over intact — `MX`,
  `A mail`, `A webmail`, SPF, DKIM, DMARC, both `SRV`
- Parent `.com` delegation updated within minutes (not the 24h the registrar warns about);
  Cloudflare flipped the zone to **`active` at 2026-07-25T16:40:50Z**
- **Post-cutover verification on the real domain** (pin the anycast IP with `curl --resolve` /
  Node `servername` — the local resolver caches the old `A` for a while and will keep showing
  `503 nginx` long after the site is up; don't mistake that for a failed cutover):
  535 URLs → 11/11 static, 343/343 products, 42/42 categories, 30/30 blog `200`;
  107/109 redirects terminate `200` through a `301`; `www` → `301` apex; identical to the
  pre-cutover run against `.vercel.app`. The 2 failures are the known dead WP-plugin junk
- **The `noindex` guard self-cleared as designed** — `X-Robots-Tag` is absent on the real host;
  it keyed off the `.vercel.app` hostname, so no redeploy was needed
- ⚠️ `products.status` / `posts.status` use **`published`**, not `publish` — a filter on the
  wrong value silently returns 0 rows and a smoke test then reports a vacuous `0/0 → 200`
- ⚠️ zsh does **not** word-split unquoted parameters, so `R="--resolve a:b:c"; curl $R …` passes
  the whole string as one argv and fails. Use `${=R}`, an array, or inline the flags
- Follow-ups: submit sitemap to GSC + request recrawl; tighten SPF (`+a` now authorizes Vercel's
  IPs since apex moved — delivery still passes via `+mx`, change to `+a:mail.hometools-center.com`);
  Phase 5.5 analytics is mid-build (`lib/analytics/{config,consent,events}.ts` written and
  uncommitted, `components/site/analytics.tsx` not yet created)

### 2026-07-27 (session 7 — Google Ads recovery: tracking IDs recovered, GTM restored)

- **Context:** the client's Google Ads was paused after cutover because the new site carried
  **no measurement tags at all** — from 2026-07-25 to 2026-07-27 every conversion action and
  remarketing audience fed by the website collected nothing
- **The old site's tag stack was recovered from the WP export, not from the client.** The live
  WP site is down, so the IDs came out of `backup-oldwebsite/adminhometools_wp_orpro.sql` and
  the 281 files in `research/crawl/`:

  | System | ID | Evidence |
  |---|---|---|
  | Google Ads | `AW-11306253882` | 282 crawled pages |
  | GTM container | `GTM-5LCNL8C9` | 843 pages |
  | GA4 (primary) | `G-X9W48F0BWC` | 845 pages |
  | GA4 (stale) | `G-XM0OEX8YWG`, `G-NPN1733YLJ` | 15 / 2 pages |
  | GSC meta | `I0rNG9jQNGOaa-0NdOA8N-l2Kr8M4aLXmhZUWd0FIMs` | — (TXT already proves ownership) |

  Loaded by the **GTM4WP** plugin: one container hosting both GA4 and the Ads tag
- ⚠️ **Conversion *labels* are not recoverable from the dump** — they live inside the container,
  never in page source. This is exactly why we reuse `GTM-5LCNL8C9` instead of building a new
  container: every conversion/remarketing/linker tag comes back at once and the labels never
  need to be known. Getting Publish access to that container matters more than Ads access
- **`dataLayer_content` on the old site was only `{pagePostType, pagePostType2, pagePostAuthor}`**
  — GTM4WP's WooCommerce e-commerce dataLayer was off. So there is **no dynamic-remarketing
  item feed to reproduce**, which removes a large chunk of assumed work
- **`gclid` survives the migration**: `middleware.ts` does `dest.search = search` before
  redirecting, so query strings ride through all 109 `301`s. Had that been missing, every ad
  click would have lost attribution
- 🔴 **`lib/site-config.ts` shipped placeholder social links to production** —
  `https://www.facebook.com/` and `https://line.me/`, live in the sitewide floating button since
  cutover. A *business* bug before a tracking one. Real values, taken from the export:
  `facebook.com/HTCpipeandtools`, `m.me/103142917882034`,
  `line.me/R/ti/p/%40hometoolscenter`. Use the last form, **not** `lin.ee/BbS0txt` — the
  short link appears only inside two blog bodies, while the sitewide Chatway button (the thing
  a GTM click trigger would have been built against) used the `line.me/R/ti/p/` form.
  `profileUrls()` in `lib/seo/schema.ts` had been silently dropping the placeholders from
  `sameAs`, so the JSON-LD was empty rather than wrong — it now populates
- `tel:024262745` already matched the old site exactly (`floating-contact.tsx` strips the
  dashes off `siteConfig.contact.phone`), so any tel-based click trigger works untouched
- **New: `components/site/analytics.tsx`** (+ `analytics-route-tracker.tsx`). Mounted from
  **`app/(site)/layout.tsx`, deliberately not the root layout**, so `/admin` page views stay
  out of GA4 and out of the remarketing audiences
- ⚠️ **GTM's All Pages trigger fires once per document load.** On WordPress that meant once per
  page; here navigation is client-side, so without help every tag on that trigger would fire
  only for the entry page. `AnalyticsRouteTracker` pushes a `page_view` custom event on route
  change (skipping the first render to avoid double-counting `gtm.js`), deferred one
  `requestAnimationFrame` because Next writes the new `<title>` in a later commit.
  **This is inert until someone adds a Custom Event trigger `page_view` inside the container.**
- ⚠️ **Consent Mode is behind `NEXT_PUBLIC_CONSENT_MODE=1` and left OFF.** `consent.ts` defaults
  every category to *denied*; shipping that without a banner to grant it would keep Ads
  conversions and remarketing dark **permanently** — strictly worse than no consent mode. The WP
  site ran none, so off = parity. Turn it on in the same change that adds the banner
- Wired `generate_lead` / `form_error` into `QuoteDialog` + `ContactForm`, and `begin_quote` on
  dialog open. **Still unwired** (helpers exist, nothing calls them): `view_item`,
  `view_item_list`, `search`, `file_download`
- Vercel production env: added `NEXT_PUBLIC_GTM_ID`, `NEXT_PUBLIC_GA4_ID` (6 of 10 vars now set).
  `useDirectGa4` is false whenever a container exists, so the GA4 ID is reference-only and does
  not double-count
- **From the client's Ads account** (8 campaigns): goals are การเข้าชมร้านค้า
  (🔴 misconfigured), รายชื่อติดต่อ (8/8 campaigns, 4 actions, ⚠️ needs action), ขอการเสนอราคา
  (1/8, ⚠️ needs action), ดูเส้นทาง / การมีส่วนร่วม / การดูหน้าเว็บ (✅ active). Over
  27 Jun – 26 Jul: รายชื่อติดต่อ 135, ดูเส้นทาง 67, การดูหน้าเว็บ 5, **ขอการเสนอราคา 0**.
  That window is almost entirely *pre*-cutover, so **the quote conversion was already broken on
  WordPress** — not caused by the migration. Needs the Source column to separate
  website-tag conversions (broken by the migration) from call/Google-Business-Profile ones
  (unaffected)
- ⬜ Next: deploy, verify in GTM Preview + Tag Assistant that a real quote submission fires the
  Ads conversion, **then** let the client resume Ads. Also outstanding: audit the ads' Final
  URLs against the live site, and check whether any conversion action is imported from GA4
  (container alone would not restore those)

### 2026-08-19 (session 8 — first SEO article published + article typography)
- Published `seo/blogs/บทความ-สี-1-ถัง-ทาได้กี่ตารางเมตร.md` to **`/blog/paint-coverage-per-bucket`**
  (สี 1 ถัง ทาได้กี่ตารางเมตร — primary KW ~1,000 searches/mo)
- ⚠️ **`prose` was dead CSS.** `blog/[slug]/page.tsx` and `page-renderer.tsx` carry
  `prose prose-base`, but the project is Tailwind v4 **without `@tailwindcss/typography`** —
  those classes resolved to nothing, so every migrated post rendered with unbulleted lists,
  borderless tables and no paragraph rhythm. Added a real `.article-body` block in
  `app/globals.css`, written against the site's own tokens (headings, lists, `.table-wrap`
  horizontal scroll, callouts, TOC, formula/example boxes, FAQ, CTA buttons) and swapped the
  blog page onto it. `page-renderer.tsx` (static pages) is untouched — still on the dead class
- `posts.content_md` stores **raw HTML**, not markdown (name is a leftover from the WP import;
  the page uses `dangerouslySetInnerHTML`). Articles are therefore authored as HTML
- New pipeline, reusable for the 2–4 articles/month rhythm:
  - `seo/published/<slug>.html` + `<slug>.json` — body and metadata, committed
  - `scripts/seo/publish-post.js` — idempotent upsert on `slug` (keeps the original
    `published_at` on re-runs so the age signal and listing order survive). Gates before writing:
    no `<h1>` in the body, no nested `<div>` inside `.faq-item`, every `#anchor` has a matching
    `id`, and **every internal `/product/` `/product-category/` `/blog/` link is resolved against
    the DB** (category links are checked against the full ancestor chain, not the leaf slug)
  - `scripts/seo/make-cover.js` — composes a 1200×630 cover in Chromium from the site's own
    Sukhumvit Set faces + logo + a product pack shot, uploads to Storage `blog/<slug>-cover.png`.
    There is no editorial photo library; every `media` asset is a product shot
  - ⚠️ No `npx playwright install` browsers on this machine — both scripts fall back to
    `channel: 'chrome'` (system Google Chrome)
- SEO wiring: `faqSchema()` in `lib/seo/schema.ts` + `lib/seo/faq.ts`, which extracts Q/A pairs
  out of the stored HTML (regex, not cheerio — cheerio is a devDependency for the migration
  scripts only) so the JSON-LD can never drift from the visible copy. `articleSchema()` now also
  emits `description` / `keywords` / a real `dateModified` (`Post` type gained `updated_at`).
  Blog metadata gained `keywords`, `authors`, `twitter`, `og:url` and `modifiedTime`
- Verified: `/blog/paint-coverage-per-bucket` → 200, exactly one `<h1>`, clean H2/H3 outline with
  in-page anchors, 5 JSON-LD blocks (Organization, WebSite, Article, FAQPage ×5 Q, BreadcrumbList),
  canonical + OG image, present in `/sitemap.xml` and on `/blog`. `npm run build` + `tsc` green
- Known, pre-existing, NOT from this session: the 30 migrated WP posts each carry a duplicate
  `<h1>` inside `content_md` (now demoted visually by `.article-body h1`, but still two H1s in the
  markup), and `components/site/footer.tsx` logs a duplicate-React-key error (`footerNav.about`
  has two entries pointing at `/how-to-place-an-order`, keyed by `href`)
- **Follow-up in the same session — layout pass + cover placeholder.** User reported the article
  looked unstyled on the deployed site: the **production deployment is 24 days old**, so the DB
  content appeared instantly via ISR while the CSS bundle was still the pre-`.article-body` build.
  Nothing to fix there — but the typography got a real second pass anyway:
  - Body 16 → **17px / line-height 1.9** (Thai stacks vowels above and tone marks below, so it
    needs a taller line box than the same layout in Latin). `word-break: normal` +
    `overflow-wrap: break-word` — **not `anywhere`**, which overrides the browser's Thai word
    segmentation and breaks mid-syllable
  - H2 recoloured to `--color-brand-500` (the global `--color-brand-light` is only ~3.1:1 on
    white) and given a hairline rule + orange tick, so sections are scannable
  - TOC goes 2-column ≥640px; table header brand-50/brand-700 with tabular numerals; callouts,
    formula, example and FAQ items are now proper cards; full mobile breakpoint at 640px
  - `.table-wrap` has a CSS-only scroll shadow (the `background-attachment: local, scroll` trick)
    that shows only while there is more table to scroll to
  - `.table-compact` opt-in class keeps short numeric cells on one line. **Not the default** —
    migrated WordPress tables put whole sentences in cells and would scroll forever
  - Cover set to `null` per user request; the post page and the `/blog` card both render a dashed
    "ภาพหน้าปกบทความ" placeholder. ⚠️ `og:image` is therefore absent — social shares have no preview
    image until a real cover lands. The generated one is still at
    `media/blog/paint-coverage-per-bucket-cover.png` if they want it back
  - ⚠️ Turbopack served a stale CSS chunk after the globals.css edit; `rm -rf .next/dev` + restart
    was needed. Verify a CSS change by curling the linked chunk, not by trusting the screenshot
- 🚨 **`main` was 5 commits behind what production actually ran.** Sessions 5–7 (launch, cutover,
  Google Ads recovery) landed on `feat/launch-and-analytics` and were deployed to production from
  there, but were never merged back. The Vercel project is **GitHub-connected with
  `productionBranch: main`**, so pushing `main` as it stood would have built a production
  deployment *without* GTM/Google Ads, `.vercelignore`, the DNS tooling or the contact-link
  fixes — on a live client site. Caught by diffing `origin/main..origin/feat/launch-and-analytics`
  and confirming the live site serves GTM. Merged that branch into `main` before pushing
- ⚠️ **Rule going forward: `main` is the production branch — every deploy must go through it.**
  Before any push to `main`, run `git log --oneline origin/main..origin/<other-branch>` for any
  live branch, and sanity-check the deployed site for features the incoming tree might lack
- Deployed and verified on the live site: GTM intact on `/` and the post, home/shop/contact all
  200, `.article-body` in the shipped CSS bundle, 1 H1, all 5 JSON-LD blocks, canonical + sitemap
- Article then set back to **`status: draft`** at the user's request until real cover art arrives —
  `/blog/paint-coverage-per-bucket` now 404s and is off `/blog`, exactly as a draft should be.
  Cover spec handed over: **1200×630**; the `/blog` card crops to 16:10 so ~96px is trimmed from
  each side — keep logos/text ≥110px in from the edges. ⚠️ A null cover means **no `og:image`**
- **New skill `.claude/skills/hometools-blog-publish/`** captures this whole pipeline (HTML-not-
  markdown, the `.article-body` class vocabulary, the no-`<h1>` and FAQ-structure rules, the
  `seo_title` brand-suffix trap, internal-link paths, cover spec, and the production-branch
  hazard) so the next article does not have to rediscover any of it

### 2026-08-20 (session 9 — cover art for the 26-article batch, WebP)
- Client delivered 26 cover images in `seo/blogs/รูปปกบทความ/` — all exactly 1200×630 PNG,
  ~1.5 MB each (39.5 MB total). One per draft article, so the batch's `og:image` gap closes
- ⚠️ **The filenames could not be trusted to map artwork → slug.** They carry their own
  per-batch numbering (two `01-`, two `02-`, …) that does not line up with the draft numbering,
  and the real identity of each cover is the Thai headline *burned into the image*. Built a
  contact sheet (sharp `composite`, 380px thumbs, 3 across) and read all 26 headlines before
  writing anything. All 26 mapped 1:1 to `seo/published/*.json`; the mapping is committed as
  `seo/blogs/รูปปกบทความ/mapping.tsv` and echoed per-article in `_notes.cover_source`
- **`set-cover.js` rewritten: JPEG/`sips` → WebP/`sharp`, and it now takes N `<slug> <art>`
  pairs plus `--dry`.** Result **39.5 MB → 2.5 MB (−94%)**, ~100 KB per cover vs. the ~250 KB
  the JPEG path produced. `sharp` is already in the tree (Next pulls it in), so no new dep,
  and it resamples better than `sips`
- Covers render through a **plain `<img>`, not `next/image`** (`blog/page.tsx`,
  `blog/[slug]/page.tsx`) — nothing downstream shrinks them, so the encode is the only
  chance to control LCP weight on a page Google measures
- Checked q80 against the source at **1:1 on a crop of the headline**, not on a downscaled
  screenshot: no ringing on the heavy white-stroked Thai display type, and indistinguishable
  from q88 at +40% file size. ⚠️ A shrunk screenshot will hide exactly the artifact you are
  looking for
- Departed from the skill's earlier "JPEG — the format every social scraper handles without
  question" note. WebP is supported by Facebook, LINE, X and Google today, and the ~10× size
  win on a plain `<img>` is worth more than a compatibility margin that no longer exists.
  Both `cover_image_url` and `og_image_url` point at the same `.webp`
- All 26 verified end to end: Storage objects return `200 image/webp`; 26/26 post pages 200
  with exactly one `<h1>`, the cover in `og:image`, `twitter:image`, the Article schema
  `image` and the in-page `<img>`; `/blog` pages 1–3 show 26 covers and **zero** placeholders.
  `npm run build` + `tsc --noEmit` green. Screenshots at 1440px confirm no cropping — card and
  post both use `aspect-[1200/630]`, matching the artwork exactly
- Repo hygiene: `/seo/blogs/รูปปกบทความ/*.png` gitignored (40 MB of source art); the shipped
  `seo/published/<slug>-cover.webp` copies (2.6 MB total) stay tracked as the rebuild path.
  Removed the two superseded tracked copies (`paint-coverage-per-bucket-cover.png`,
  `water-tank-above-vs-underground-cover.jpg`)
- ⚠️ Their Storage counterparts `blog/paint-coverage-per-bucket-cover.png` and
  `blog/water-tank-above-vs-underground-cover.jpg` are now **orphaned but not deleted** —
  confirmed zero references in `posts` (incl. `content_md`) and `products`. Delete only if
  someone wants the bucket tidy; note that this falsifies the session-8 line about the
  generated cover still being available at that PNG key
- ⚠️ `npm run dev` silently moved to **port 3001** because something was already holding 3000,
  and the squatter answered `404` for `/blog` — which reads exactly like a broken page. Always
  confirm the port from the dev server's own output before believing a curl
- **Then published, same session, on the user's call.** All 26 flipped to `published`;
  56 posts live (30 migrated + 26 new), 1 draft left (`blog-post-1190`, already draft in WP)
- ⚠️ **A status flip is not enough on its own — this batch needed a deploy.** `/blog/[slug]`
  builds its `generateStaticParams` from *published* slugs, so the 26 were never prerendered,
  and production was serving a **cached 404** for each with `revalidate = 3600`. Waiting on ISR
  would have left them dead for up to an hour and out of the prerendered sitemap. Pushing to
  `main` rebuilt and they went live at once. (The skill's note that content needs no deploy
  holds for *editing* a live post — not for one crossing draft → published)
- 🚨 **`origin/main` was 6 commits behind local**, i.e. session 8's work was committed but never
  pushed. Same class of hazard as session 8's, one step earlier in the chain. Ran the
  `references/deploy.md` checks before pushing: nothing missing vs. `feat/launch-and-analytics`
  (0 ahead), GTM wiring present in the tree, live site serving GTM. Push was safe
- Post-publish verification on the real domain: sitemap **422 → 448 URLs (+26)**; 26/26 articles
  200 with exactly one `<h1>`, the WebP cover in `og:image` + `twitter:image` + Article schema
  + the in-page `<img>`, canonical correct, FAQPage and BreadcrumbList present; `/blog` pages
  1–3 show 26 covers, **0** DRAFT badges, **0** placeholders; home/shop/contact/about 200 and
  GTM intact. Draft gating held right up to the flip — before it, 26/26 returned 404 on
  production while rendering fine on preview
- **Visible publish dates removed from the blog; a 2-line excerpt takes their place.**
  Evergreen how-to content reads as stale with a date on it, and 26 cards stamped with one
  identical date reads as a dump. ⚠️ **`published_at` itself is untouched and still truthful** —
  it keeps feeding Article JSON-LD `datePublished`, `og:article:published_time` and sitemap
  `lastmod`. Only the rendered `<time>` and the card's date line are gone. (Asked earlier to
  backdate the 26 to spread over 22 months; declined — that is a falsified record aimed at the
  client, and it also feeds Google false structured data for no ranking gain, since Google
  already knows when it first crawled each URL. Offered forward-staggered publishing instead)
- The post byline is now conditional: **30 of the migrated WP posts have no `author`**, so with
  the date gone the old markup would have rendered an empty bordered line
- **Home page `บทความที่น่าสนใจ` was three hardcoded 2023 posts** (`blogCards` in
  `app/(site)/page.tsx`) that could never update. Now reads the 3 latest via
  `listLatestPosts()`. ⚠️ It uses the **cookie-free** client (same pattern as
  `getAllPostSlugs`) on purpose — going through `createClient()` would read `cookies()` and
  drop the most-hit route on the site out of static rendering. Verified `/` is still `○` with
  `revalidate = 3600` in the build output. Cover box `aspect-square` → `aspect-[1200/630]`
- ⚠️ The missing excerpts are now *visible*: on `/blog` pages 3+ the migrated posts render as
  title-only cards. Backfilling `excerpt` moved from cosmetic to worth doing
- Found while screenshotting: `swing-vs-spring-check-valve` has a raw HTML entity in its title
  (`สวิงเช็ควาล์ว &amp; สปริงเช็ควาล์ว`) — 1 post, migrated data, not a regression
- Measured, correcting earlier notes: of the 30 published migrated WP posts, **26 have no
  `excerpt`, 27 no `seo_description`**, and **9 (not 30) carry a duplicate in-content `<h1>`**.
  Also **0** links from any `/product/*`, `/product-category/*` or `/shop` page into `/blog/*` —
  the articles link out to category pages but nothing links back in, so the only crawl paths
  to them are `/blog` and the sitemap
