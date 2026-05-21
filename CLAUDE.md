# CLAUDE.md — Project context for Claude Code

> **Update rule:** Every meaningful session, append to the "Session log" at the bottom
> and bump the "Last updated" date at the top. Keep "Current state" + "What's next"
> always reflecting reality.

**Last updated:** 2026-05-21

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
| Thai font | `IBM Plex Sans Thai` via `next/font/google` |
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

## Current state (Phases 0–4 complete)

### ✅ Done

1. **Phase 0 — Discovery**
   - Crawled 282 WP URLs (200 products / 42 categories / 30 posts / 8 pages / 1 home)
   - Extracted to `research/data/{products,categories,posts,brands,pages,static-pages,images}.json`
   - Design tokens at `research/design-tokens.json` (brand: blue `#1e73be`, accent: orange `#f7931e`)
   - Redirect map: `research/redirect-map.{json,csv}` — 32 rules (30 Thai blog slugs + 2 article→blog)

2. **Phase 1 — Foundation**
   - DB schema migration `0001_init.sql` applied — 13 tables + RLS + 2 seed rows in `site_settings`
   - Imported: 200 products / 42 categories / 7 brand seeds / 30 posts / 32 redirects / 1 header menu
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
2. `git status` + `git log --oneline -5` to see recent commits.
3. Check `TaskList` if any tasks are still `in_progress`.
4. Re-read `docs/plan.md` ONLY if working on launch-critical workflow.

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

## What's next (in priority order)

1. **Admin panel** (`/admin/*`) — biggest remaining piece. Sub-phases:
   - 5.1 Supabase Auth + `/admin/login` + middleware guard
   - 5.2 Shell (sidebar + topbar + toast)
   - 5.3 Products CRUD (table, edit form, image upload, markdown editor, SEO tab)
   - 5.4 Categories + Brands CRUD
   - 5.5 Posts CRUD
   - 5.6 Quotes / Contact inbox (read-only + status + CSV export)
   - 5.7 Media library
   - 5.8 Redirects manager
   - 5.9 Site settings + menus editor
   - 5.10 Add first admin user (manual SQL after auth signup)

2. **Brand mapping fix** — assign correct `brand_id` to 200 products (currently all null). Can do via a SQL update once brand seeds match Thai variants, or via admin bulk-edit.

3. **Resend setup** — verify a sending domain, update `from:` in `lib/notify.ts`.

4. **Line OA** — get channel access token + target user/group ID, set env, test notify.

5. **Polish home + sections** — match WP visual spec section-by-section.

6. **Pre-launch**
   - Lighthouse audit each page-type
   - JSON-LD schema validator
   - 301 sample tests against `redirects` table
   - Vercel deploy + custom domain + SSL
   - GSC + GA4 setup
   - Submit sitemap
   - 7-day WP content-freeze coordination with client
   - Cutover DNS

---

## Session log

### 2026-05-20 → 2026-05-21 (session 1)
- Bootstrapped project from empty dir
- Completed Phases 0–4 end-to-end
- Initial commit `47073c9`, pushed to `origin/main`
- Image migration had a Thai-filename collision bug — fixed with hash naming on retry
- 30 blog posts had Thai top-level slugs in WP — decided new pattern `/blog/<english-slug>` + 301 each old URL
- User installed Supabase MCP server (HTTP transport + OAuth) — DB access from this assistant works directly without service-role keys
