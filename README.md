# Home Tool Center — Website Redesign

Migration of [hometools-center.com](https://hometools-center.com) from WordPress/WooCommerce → Next.js 16 + Supabase.

## Stack

- **Framework:** Next.js 16 (App Router) + TypeScript
- **Styling:** Tailwind CSS v4 + shadcn/ui
- **DB:** Supabase Postgres (RLS on)
- **Storage:** Supabase Storage
- **Auth:** Supabase Auth (admin only)
- **Email:** Resend
- **Hosting:** Vercel (edge), Cloudflare DNS-only

## Setup

```bash
cp .env.example .env.local
# Fill in Supabase + Resend + Line keys
npm install
npm run dev
```

## Scripts

```bash
npm run dev               # local dev
npm run build             # production build
npm run typecheck         # tsc --noEmit

# Migration pipeline
npm run crawl             # crawl WP site (Playwright)
npm run extract           # parse HTML → JSON
npm run redirects         # build 301 map
npm run design-tokens     # extract design tokens from WP
```

## Structure

```
app/
├── (site)/               # public layout group
│   ├── page.tsx          # home
│   ├── shop/             # product listing
│   ├── product/[slug]/   # product detail (Product JSON-LD)
│   ├── product-category/[...slug]/  # nested categories
│   ├── blog/[slug]/      # blog (Article JSON-LD)
│   ├── about-us/, contact-us/, promotion/, ...
├── admin/                # admin panel (TBD)
├── api/
│   ├── quote/route.ts
│   └── contact/route.ts
├── sitemap.ts            # dynamic from DB
└── robots.ts

components/
├── site/                 # public site components
├── ui/                   # shadcn primitives

lib/
├── queries/              # DB query helpers
├── supabase/             # server/client/admin/static
├── notify.ts             # Resend + Line adapters
├── validators.ts         # Zod schemas

middleware.ts             # 301 redirects from `redirects` table

supabase/
└── migrations/0001_init.sql   # 13 tables + RLS

scripts/
├── crawl.js              # Playwright crawler
├── extract-data.js       # WP HTML → JSON
├── import-to-supabase.js # JSON → DB (idempotent)
├── migrate-images.js     # WP → Supabase Storage
└── ...
```

## SEO

- URL pattern preserved (`/product/`, `/product-category/`)
- 301 redirects: WP Thai slugs → English `/blog/<slug>`
- Dynamic sitemap.xml from DB
- JSON-LD: Product, Article, BreadcrumbList (TBD)
- Open Graph + Twitter cards

## Status

- ✅ Phase 0 — Discovery + crawl (282 URLs)
- ✅ Phase 1 — Foundation + DB schema
- ✅ Phase 2 — Public site (home, shop, category, product, blog)
- ✅ Phase 3 — Static pages + Quote/Contact forms
- ✅ Phase 4 — Image migration (256 files → Supabase Storage)
- ⬜ Phase 5 — Admin panel
- ⬜ Phase 6 — Polish + launch

## See also

- `docs/plan.md` — detailed implementation plan
- `research/data/*.json` — extracted product/category/post data
- `research/image-url-map.json` — WP → Supabase URL mapping
