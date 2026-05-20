# Hometools Center — WordPress → Custom Code Migration Plan

> **Goal:** ย้าย https://hometools-center.com/ จาก WooCommerce/WordPress → Next.js 16 + Supabase โดย (1) หน้าตาเหมือนเดิมเป๊ะ (2) ห้าม SEO rank ตก (3) มี admin panel ให้ลูกค้าจัดการเอง

## เป้าหมายและขอบเขต

### In-scope (Phase 1 launch)
- Static-equivalent pages: home, shop, product categories, product detail, about, contact
- Product catalog แบบอ่านอย่างเดียว (ลูกค้าขอใบเสนอราคา ไม่ใช่ checkout)
- Quote request form + Contact form → DB + email/Line notify
- Blog (เปิดใหม่ — ตอนนี้ 404) + post detail
- Admin panel `/admin` — CRUD: products / categories / brands / posts / quotes / media / settings
- SEO: metadata, OG, JSON-LD schema, dynamic sitemap, robots.txt, 301 redirects
- Image migration → Supabase Storage

### Out-of-scope (รอเฟส 2)
- E-commerce checkout / payment
- Multi-language (TH only)
- User accounts (ลูกค้าทั่วไปไม่ login)
- Bulk import แบบ CSV (อาจเพิ่มถ้าจำเป็น)
- Analytics dashboard ใน admin (ใช้ Google Analytics ภายนอก)

### Success criteria
- หน้าตา = ต้นฉบับ ±5% (visual diff)
- Lighthouse: Performance ≥ 90, SEO 100, Accessibility ≥ 90 (mobile + desktop)
- ทุก URL เก่ามี 301 → URL ใหม่ (zero 404 จาก WP)
- Core Web Vitals ผ่านทั้ง 3 (LCP < 2.5s, INP < 200ms, CLS < 0.1)
- GSC ไม่มี indexing errors หลัง 4 สัปดาห์
- Admin สามารถเพิ่ม/แก้สินค้า/บทความได้โดยไม่ต้องแตะโค้ด

---

## Tech Stack

| Layer | Choice | เหตุผล |
|---|---|---|
| Framework | Next.js 16 (App Router) | SSG/ISR + Server Components + best SEO |
| Lang | TypeScript | type safety |
| Styling | Tailwind CSS v4 + shadcn/ui | rapid UI + ตรงกับ design system ได้ |
| DB | Supabase Postgres | managed, มี RLS, Studio UI |
| Auth | Supabase Auth | admin login |
| Storage | Supabase Storage | รูปภาพสินค้า/บทความ |
| Forms | React Hook Form + Zod | validation |
| Email | Resend | quote notification |
| Notify | Line Messaging API (OA) | Line Notify deprecated 2025-04-01 |
| Hosting | Vercel | Next.js native, edge cache, preview deploys |
| DNS | Cloudflare (DNS only, gray cloud) | ไม่ proxy เพื่อให้ Vercel edge ทำงานเต็มที่ |
| Analytics | GA4 + GSC | (ภายนอก) |
| CMS pattern | Custom admin in `/admin` | ลูกค้าเข้าตรง ไม่ต้อง 3rd-party |
| Admin roles | `admin` / `editor` | ลูกค้ามีทีม — 2 levels เพียงพอ |

---

## Database Schema (Supabase)

> 📄 SQL migration เต็มจะอยู่ที่ `supabase/migrations/0001_init.sql` — ด้านล่างคือสรุป

### `categories`
```
id uuid pk
slug text unique not null         -- "system-work", "pvc-pipes-and-fittings"
name_th text not null
name_en text
parent_id uuid fk categories      -- hierarchical
description text
banner_image_url text
seo_title text
seo_description text
sort_order int default 0
is_published bool default true
created_at, updated_at
```

### `brands`
```
id, slug, name, logo_url, banner_url, description, sort_order, created_at, updated_at
```

### `products`
```
id uuid pk
slug text unique not null
sku text
name_th text not null
name_en text
short_description text             -- ใช้ใน listing
description_md text                -- markdown สำหรับ detail
brand_id uuid fk
primary_category_id uuid fk
images jsonb                       -- [{url, alt, sort}]
package_size text                  -- "1 กก./ถุง"
variants jsonb                     -- สี/รุ่น
catalog_pdf_url text
specs jsonb                        -- {spec_key: value}
seo_title text
seo_description text
og_image_url text
status text default 'published'    -- 'draft' | 'published' | 'archived'
sort_order int
published_at timestamptz
created_at, updated_at
```

### `product_categories` (m2m extra categories)
```
product_id, category_id  (composite pk)
```

### `related_products`
```
product_id, related_product_id, sort_order
```

### `posts` (blog)
```
id, slug, title, excerpt, content_md, cover_image_url,
author, tags text[], category_id,
seo_title, seo_description, og_image_url,
status, published_at, created_at, updated_at
```

### `quote_requests`
```
id, name, phone, email, company, message,
items jsonb,                       -- [{product_id, qty, note}]
source_page text,
status text default 'new',         -- new | contacted | quoted | won | lost
admin_note text,
created_at
```

### `contact_messages`
```
id, name, phone, email, subject, message, source_page, status, created_at
```

### `media`
```
id, storage_path, public_url, alt_text, mime_type, size_bytes, width, height,
uploaded_by uuid fk auth.users, created_at
```

### `redirects` (สำคัญ! 301 migration)
```
id, from_path text unique, to_path text, status_code int default 301,
created_at, hit_count int default 0, last_hit_at
```

### `site_settings` (key-value)
```
key text pk, value jsonb, updated_at
-- keys: contact_phone, contact_email, line_id, facebook_url,
-- address, business_hours, social_links, default_og_image, ga_id, gtm_id
```

### `menus` (nav structure)
```
id, location text,                 -- 'header' | 'footer'
items jsonb,                       -- nested {label, url, children}
updated_at
```

### `admin_users` (extends Supabase auth)
```
user_id uuid pk fk auth.users, role text, display_name, created_at
```

### Indexes & RLS
- Index: `products(slug)`, `products(primary_category_id, status)`, `posts(slug)`, `redirects(from_path)`
- RLS: public read บน `is_published / status='published'`; admin role อ่าน/เขียนทุกอย่าง

---

## URL Structure (preserve WP)

| Page | URL | หมายเหตุ |
|---|---|---|
| Home | `/` | |
| Shop | `/shop` | |
| Category | `/product-category/[...slug]` | nested เช่น `system-work/pvc-pipes-and-fittings` |
| Product | `/product/[slug]` | |
| Blog list | `/blog` | **เปลี่ยนจาก /article/ → /blog/ (301)** |
| Blog detail | `/blog/[slug-en]` | **เปลี่ยนจาก top-level Thai slug → /blog/<english> (301 ทุกตัว)** |
| About | `/about-us` | |
| Contact | `/contact-us` | |
| How to order | `/how-to-place-an-order` | |
| Promotion | `/promotion` | |
| Privacy / Cookie | `/privacy-policy`, `/cookie-policy` | |
| Admin | `/admin/*` | |

**Route ordering (สำคัญ):** Next.js catch-all `/[slug]` ต้องเป็น dynamic route ที่จับ blog post — ใน `page.tsx` ต้อง query DB หา post แล้ว 404 ถ้าไม่เจอ. ต้องระวังไม่ให้ชนกับ static routes — Next.js จะ prioritize static path ก่อน dynamic อยู่แล้ว แต่ต้องเทสให้ครบ

**Note:** ใช้ URL แพทเทิร์นเดิมทุกที่ — 301 redirects เฉพาะกรณี URL pattern ลูกค้าอยากเปลี่ยน (เช่น เปลี่ยน slug Thai → English ภายหลัง)

---

## Project Structure

```
hometools-website-redesign/
├── app/
│   ├── (site)/
│   │   ├── layout.tsx                 # public layout (header/footer/floating-contacts)
│   │   ├── page.tsx                   # home
│   │   ├── shop/page.tsx
│   │   ├── product-category/[...slug]/page.tsx
│   │   ├── product/[slug]/page.tsx
│   │   ├── blog/page.tsx
│   │   ├── blog/[slug]/page.tsx
│   │   ├── about-us/page.tsx
│   │   └── contact-us/page.tsx
│   ├── admin/
│   │   ├── layout.tsx                 # admin shell (sidebar/topbar/auth-guard)
│   │   ├── login/page.tsx
│   │   ├── page.tsx                   # dashboard
│   │   ├── products/(list|new|[id])/page.tsx
│   │   ├── categories/...
│   │   ├── brands/...
│   │   ├── posts/...
│   │   ├── quotes/...
│   │   ├── media/page.tsx
│   │   ├── redirects/page.tsx
│   │   └── settings/page.tsx
│   ├── api/
│   │   ├── quote/route.ts             # POST quote request
│   │   ├── contact/route.ts
│   │   └── revalidate/route.ts
│   ├── sitemap.ts                     # dynamic
│   ├── robots.ts
│   └── not-found.tsx
├── components/
│   ├── site/ (Header, Footer, FloatingContact, ProductCard, CategoryGrid, ...)
│   ├── admin/
│   └── ui/ (shadcn)
├── lib/
│   ├── supabase/ (server.ts, client.ts, admin.ts)
│   ├── seo.ts (generateMetadata helpers + JSON-LD builders)
│   ├── analytics.ts
│   └── email.ts
├── middleware.ts                       # redirect lookup + admin auth gate
├── supabase/
│   ├── migrations/
│   └── seed/
├── scripts/
│   ├── crawl-wp.ts                    # Phase 0: Playwright crawler
│   ├── extract-products.ts            # parse WP HTML → products.json
│   ├── download-images.ts             # WP → Supabase Storage
│   ├── build-redirects.ts             # old URL map → redirects table
│   └── import-to-supabase.ts
├── research/                          # (มีอยู่แล้ว) screenshots + meta
├── docs/
│   └── plan.md (this file)
├── public/
├── .env.local
├── next.config.ts
└── package.json
```

---

## Phase-by-Phase Tasks

### Phase 0 — Discovery & Data Extraction (≈ 1-2 วัน)

**0.1 — Crawl เต็มเว็บด้วย Playwright**
- เริ่มจาก sitemap หลัก → ไล่ทุก URL (post, page, product, product-cat)
- เก็บต่อ URL: HTML, title, meta description, canonical, og tags, JSON-LD, h1-h6, body text, image list
- Output: `research/crawl/<slug>.json` + `research/url-list.json` (~120 URLs คาดการณ์)

**0.2 — Visual reference**
- Screenshot ทุก URL ทั้ง desktop (1440) + mobile (390) → `research/screenshots/`
- (มี 7 หน้าหลักแล้ว — เติมส่วนที่เหลือ)

**0.3 — Extract structured data**
- `extract-products.ts`: parse product HTML → `{slug, name, sku, images, description, package_size, related, category}`
- `extract-categories.ts`: tree ของ categories จาก sitemap + breadcrumb
- `extract-brands.ts`: รวบรวมจาก product info + category banners
- `extract-posts.ts`: blog posts จาก post-sitemap (ถ้ามี content)
- Output: `research/data/{products,categories,brands,posts}.json`

**0.4 — Design tokens extraction**
- ดึง CSS: font-family, colors (primary/accent), spacing, radius
- เทียบกับ TOA/SCG palette ที่เห็น (น้ำเงิน + ส้ม)
- Output: `research/design-tokens.json`

**0.5 — Build redirect map**
- เทียบ URL เก่า ↔ URL ใหม่ที่วางแผน → `research/redirect-map.csv`

**Deliverable:** `research/` มีข้อมูลครบจน implement ได้โดยไม่ต้องเข้าเว็บอีก

---

### Phase 1 — Foundation (≈ 1 วัน)

**1.1** — `npx create-next-app@latest .` (TS, Tailwind, App Router, src/ no, alias `@/*`)
**1.2** — Install: `@supabase/supabase-js @supabase/ssr react-hook-form zod resend lucide-react`
**1.3** — `pnpm dlx shadcn@latest init` + add: button, input, form, table, dialog, sheet, dropdown, toast, card
**1.4** — สร้าง Supabase project ใหม่ → grab URL/anon/service keys → `.env.local`
**1.5** — เขียน migration `0001_init.sql` ตาม schema ด้านบน + RLS policies → `supabase db push`
**1.6** — `lib/supabase/{server,client,admin}.ts`
**1.7** — Vercel link (`vercel link`) + push env vars
**1.8** — Setup `next.config.ts`: images allowlist, experimental ถ้าต้องการ
**1.9** — Tailwind config: design tokens จาก Phase 0.4

**Deliverable:** `pnpm dev` ขึ้นหน้าเปล่า + เชื่อม Supabase ได้

---

### Phase 2 — Public Site (Read-only) (≈ 3-5 วัน)

**2.1 — Layout components**
- `Header` (logo + nav + search bar + social icons)
- `Footer` (company info + 2 nav columns + copyright)
- `FloatingContact` (Line, FB, Phone — fixed bottom-right)
- `CookieBanner`

**2.2 — Home page**
- Hero banner slider
- Category grid (2 main + sub)
- About section
- Recent products / featured brands
- Blog teasers (เมื่อมี)

**2.3 — Shop + Category pages**
- Sidebar: category tree (recursive) + brand filter
- Product grid (4 cols desktop, 2 mobile)
- Pagination (12-16 ต่อหน้า)
- Category banner image
- ISR `revalidate: 3600`

**2.4 — Product detail**
- Image gallery + zoom
- ชื่อ + breadcrumb + brand + ขนาดบรรจุ
- "ขอใบเสนอราคา" button → open dialog form
- Description (markdown render)
- Related products carousel
- JSON-LD: Product schema

**2.5 — About / Contact**
- Static content จาก Supabase `pages` table หรือ MDX
- Contact: map + form + ช่องทาง

**2.6 — Blog list + detail**
- List: card + cover + excerpt + date + tags
- Detail: cover hero + content (markdown) + author + related posts + JSON-LD Article

**2.7 — SEO infrastructure**
- `generateMetadata` ทุก dynamic route → ดึง seo_title/desc จาก DB
- `app/sitemap.ts` → query Supabase รวม posts/products/categories/static
- `app/robots.ts`
- JSON-LD: Organization (site-wide), Product, BreadcrumbList, Article, LocalBusiness (ถ้ามี physical store)
- Open Graph + Twitter cards

**2.8 — 301 redirects**
- `middleware.ts` → query `redirects` table by `pathname` → return 301
- Cache redirect lookup (in-memory LRU 1 minute)
- Skip middleware สำหรับ `/admin`, `/api`, static files

**Deliverable:** เว็บ public ครบทุกหน้า, visual diff vs ต้นฉบับ ≤ 5%, Lighthouse ≥ 90

---

### Phase 3 — Forms (≈ 1-2 วัน)

**3.1 — Quote request**
- Dialog ที่ product detail + standalone page `/quote`
- Fields: name, phone, email, message, items (auto-fill ถ้ามาจาก product)
- Validation: Zod
- API: `POST /api/quote` → insert Supabase + send email via Resend + (optional) Line Notify webhook

**3.2 — Contact**
- Same pattern, simpler payload

**3.3 — Spam protection**
- Cloudflare Turnstile หรือ honeypot field
- Rate limit per IP (Upstash Redis ฟรี tier)

---

### Phase 4 — Admin Panel (≈ 4-6 วัน)

**4.1 — Auth & shell**
- Supabase Auth: email/password
- `/admin/login` + middleware guard
- Admin shell: sidebar nav + topbar + breadcrumb
- Toast notifications

**4.2 — Products CRUD**
- List: table with search, filter (category/brand/status), sort, pagination
- New/Edit: form with image upload, markdown editor, category picker, related picker, SEO tab
- Bulk actions: publish/archive

**4.3 — Categories / Brands**
- Tree editor สำหรับ categories (drag-drop optional)
- CRUD ง่ายๆ สำหรับ brands

**4.4 — Posts (blog)**
- Same pattern as products + markdown editor with image insert
- Preview ก่อน publish

**4.5 — Quotes inbox**
- List + filter status + detail view + เปลี่ยน status + บันทึก note + export CSV

**4.6 — Media library**
- Grid view ของ Supabase Storage
- Upload (drag-drop) + edit alt text
- Used-by indicator

**4.7 — Redirects manager**
- Table CRUD ของ redirect rules + bulk import CSV
- Hit count display

**4.8 — Settings**
- Site info, social links, default OG image, GA/GTM IDs

**4.9 — Revalidation**
- เมื่อ admin save → trigger `revalidatePath` ผ่าน Server Action

---

### Phase 5 — Migration Execution (≈ 1-2 วัน)

**5.1** — รัน `import-to-supabase.ts` → seed categories → brands → products → redirects
**5.2** — Download รูปทั้งหมดจาก WP → upload Supabase Storage → update URLs ใน records
**5.3** — Spot check: เปิดสินค้า 10 ตัวสุ่ม เทียบกับ WP
**5.4** — Build sitemap → submit GSC (preview)
**5.5** — Schema validator: validator.schema.org ทุก template
**5.6** — Lighthouse CI ทุกหน้าหลัก

---

### Phase 6 — Launch (≈ 1 วัน + monitoring)

**6.1 — Pre-launch checklist**
- [ ] DNS plan (ใช้ Vercel หรือ Cloudflare proxy?)
- [ ] SSL cert ready
- [ ] Backup WP DB + files
- [ ] Test 301 redirects ทุก URL จาก sitemap เก่า
- [ ] GA4 + GTM + GSC verify ตัวใหม่
- [ ] Set canonical URLs ถูกต้อง
- [ ] favicon + apple-touch-icon
- [ ] OG image debugger ผ่านทุก template

**6.2 — Cutover**
- ทดสอบ staging URL ขั้นสุดท้าย
- เปลี่ยน DNS → Vercel
- Submit sitemap ใหม่ใน GSC + ขอ recrawl
- Monitor Vercel logs + Supabase logs

**6.3 — Post-launch (2-4 สัปดาห์)**
- ดู GSC: coverage errors, 404s, redirects ถูกต้องไหม
- ดู GA4: traffic drop หรือไม่
- เก็บ 404 จาก middleware logs → เพิ่ม redirect rule

---

## SEO Strategy ละเอียด

### กันไม่ให้ rank ตก
1. **URL preservation** — ใช้ URL pattern เดิมทุกที่ที่ทำได้
2. **301 redirects** — ทุก URL ที่เปลี่ยนต้องมี 301 (ไม่ใช่ 302)
3. **Metadata parity** — title/desc/H1 ใช้ของเดิม (ปรับเฉพาะที่เห็นว่าด้อย)
4. **Schema upgrade** — เพิ่ม JSON-LD ที่ WP plugin ทำไม่ดี (Product, LocalBusiness, BreadcrumbList ที่ถูกต้อง)
5. **Speed** — ต้องเร็วกว่า WP เดิมเสมอ (Next.js + Vercel + ISR + next/image)
6. **Internal linking** — รักษา anchor text เดิมเท่าที่ทำได้
7. **Sitemap & robots** — submit ทันที, รักษาให้ครอบคลุม

### เพิ่มเติม (ใช้โอกาสนี้)
- Blog ใหม่ — ลงบทความ SEO (เคยเป็น 404 ใน WP)
- Schema: FAQ ในหน้า product/category ที่เหมาะ
- breadcrumb visible + JSON-LD
- alt text ทุกรูป (admin บังคับใส่ก่อน publish)
- Local SEO: NAP consistency + Google Business Profile sync

---

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Rank ตกหลัง launch | Staging test ทุก URL + 301 ครบ + GSC recrawl + monitor |
| ภาพหายเพราะ WP ปิดก่อนย้าย | Download ทั้งหมดก่อน cutover + เก็บ original |
| Quote spam | Turnstile + rate limit + email notify ตรง |
| Admin ใช้ไม่เป็น | Onboarding doc + video walkthrough ตอน handover |
| Content drift (WP ยัง edit ตอนพัฒนา) | Freeze WP content ช่วง 1 สัปดาห์ก่อน launch หรือมี delta-import script |

---

## Timeline (estimate)

| Phase | Days | Cumulative |
|---|---|---|
| 0 — Discovery | 1.5 | 1.5 |
| 1 — Foundation | 1 | 2.5 |
| 2 — Public site | 4 | 6.5 |
| 3 — Forms | 1.5 | 8 |
| 4 — Admin | 5 | 13 |
| 5 — Migration | 1.5 | 14.5 |
| 6 — Launch | 1 | 15.5 |
| Buffer | 2 | **~17.5 วันทำงาน** |

---

## Decisions (Confirmed 2026-05-20)

1. **Domain** — โดเมนเดิม, Cloudflare เป็น registrar/DNS only (gray cloud), Vercel จัดการ edge
2. **Email** — Resend
3. **Line** — Line Messaging API ผ่าน OA (ลูกค้าจะจัด channel token ให้)
4. **WP freeze** — ไม่มี staging → แจ้งลูกค้า freeze content 7 วันก่อน launch + re-crawl script พร้อมใช้
5. **Content audit** — ไม่ลบอะไร — migrate ทั้งหมด
6. **Brand assets** — ดึงจาก WP ทั้งหมด (pixel-perfect)
7. **Admin** — ทีม → 2 roles: `admin` (full) / `editor` (content only)

---

## Next Action

ถ้า approve plan นี้ → เริ่ม **Phase 0.1 (full crawl)** ทันที — ใช้เวลาประมาณ 30-60 นาที crawl 120 URL แล้ว generate JSON ทั้งหมด → ส่งให้ review ก่อนแตะ Phase 1
