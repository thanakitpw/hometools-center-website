# SEO Strategy — Home Tool Center (hometools-center.com)

> **ประเภท:** Living strategy doc (แกนกลยุทธ์ SEO เต็มรูปแบบ)
> **สถานะเว็บ:** Pre-cutover — โดเมน production ยังชี้ WordPress/WooCommerce เดิม, เว็บใหม่ (Next.js 16 + Supabase) ยังไม่ขึ้น
> **โครงสร้างแผน:** Approach **A+C** — จัดตาม 6 pillar แล้วส่งมอบเป็น 3 เฟสผูกกับ launch, โดยดึง keyword/competitor research มาเป็น input ตั้งแต่เฟส 0
> **Last updated:** 2026-07-12

---

## 1) ภาพรวม (Scope / Goals / Guardrails)

### North-star
Organic traffic ที่มี intent → **ขอใบเสนอราคา / ติดต่อ (leads)** สำหรับผู้ซื้อ B2B วัสดุก่อสร้าง & งานระบบในไทย
โดย **ห้ามให้ ranking เดิมตกตอน cutover**

### Metrics
- **Primary:** organic sessions → `generate_lead` (quote_submit + contact_submit)
- **Secondary:** indexed pages, non-brand keyword rankings (หมวด + product terms), GBP calls / direction requests, organic → lead conversion rate

### Guardrails (จาก `CLAUDE.md` — locked, ห้าม re-litigate)
- **301 ทุก URL ที่เปลี่ยน**, รักษา meta / JSON-LD / sitemap, **ห้าม SEO regress**
- คง URL pattern เดิม (`/product/…`, `/product-category/…`) → **parity มาก่อน architecture**
- ภาษาเดียว (`th`) → ไม่มี hreflang
- โมเดล **quote ไม่ใช่ checkout** → `Product` schema **ไม่มี `price`** (ต้องจัดการเป็นพิเศษ ไม่ให้ GSC ขึ้น error)
- Blog ย้าย slug ไทย → `/blog/<english>` + 301 (ทำแล้ว)

### ความสัมพันธ์กับเอกสารอื่น
| เอกสาร | บทบาท |
|---|---|
| `docs/marketing-plan.md` | รายละเอียด **tracking/tooling** (GTM/GA4/GSC/Clarity/cookie/OG) — เอกสารนี้ **อ้างอิง ไม่เขียนซ้ำ** |
| **`docs/seo/seo-strategy.md`** (ไฟล์นี้) | แกนกลยุทธ์ SEO: technical / on-page / content / local / off-page / measurement |
| `docs/seo/keyword-map.md` | Output ของ keyword research → cluster ไป URL |
| `docs/seo/301-parity-checklist.md` | ขั้นตอน + ตารางเช็ค 301 ครบก่อน cutover |
| `docs/seo/cutover-seo-checklist.md` | Runbook สัปดาห์ cutover |
| `docs/seo/measurement-plan.md` | Layer วัดผล SEO (events / GSC / rank / KPI / baseline capture) |
| `TASKS.md` (Phase 5.5) | อัปเดตให้ชี้มาที่เอกสารนี้ |

### ป้ายกำกับงาน
- `[code]` — build ในรีโปได้เลย (Next.js/Supabase)
- `[playbook]` — งาน ops / marketing (คน/ทีมทำตาม checklist)
- `[data]` — ต้องเก็บ **ก่อน WP เดิมถูกปิด** (ดึงย้อนหลังไม่ได้)

---

## 2) Baseline ปัจจุบัน (ของจริงในรีโป ณ 2026-07-12)

**มีแล้ว (ดี):**
- `middleware.ts` → 301 จากตาราง `redirects` (**109 rules**)
- `app/sitemap.ts` → dynamic จาก DB (static + category + product + post), `revalidate 3600`, ใช้ `updated_at` เป็น `lastModified` — **ไฟล์เดียว** (โอเคที่ ~400 URL)
- `app/robots.ts` (พื้นฐาน — ต้อง review)
- `generateMetadata` ครบเกือบทุก route; **canonical มีเฉพาะ product**
- Root `layout.tsx`: `metadataBase` ✓, title default+template ✓, description ✓, OG (website/th_TH/siteName) ✓, `robots index/follow` ✓
- JSON-LD: **Product** (offers: InStock, THB, **ไม่มี price**) + **Article** เท่านั้น
- ข้อมูล: **347 products / 42 categories / 31 posts**, ฟอนต์ Sukhumvit Set self-host + `display: swap`

**ช่องว่าง:**
- Canonical ยังไม่ครบ (category/blog/shop/static ยังไม่มี), ยังไม่บังคับ host canonical (www/https/slash)
- Schema ขาด: **Organization, WebSite+SearchAction, LocalBusiness, BreadcrumbList, ItemList/CollectionPage** (breadcrumb ตอนนี้เป็น visual เปล่า)
- `Product` schema ยังไม่มี **brand** (`brand_id` = null ทั้งหมด — WooCommerce เดิมไม่มี brand taxonomy) และเรื่อง no-price ยังไม่ได้จัดการ
- Sitemap ยังไม่แตก index / `lastmod` อิง `updated_at` ล้วน
- ยังไม่มี category SEO-copy, contextual internal link จาก blog → product/หมวด
- ยังไม่มี GTM/GA4/GSC verify, ยังไม่มี `generate_lead` event
- **ยังไม่ได้เก็บ baseline WP เดิม** (GSC export / crawl inventory / backlink export) ⏰

**หนี้ที่ยกมาจาก migration (ดู session log):**
- `brand_id` mapping = งาน manual/admin
- `posts.category_id` = null (ไม่ได้ย้าย blog category)
- `[dflip id]` shortcode ใน description บางอันเป็น literal text

---

## 3) Pillar 0 — Keyword & Market Research (input จาก Approach C)

ทำ **ในเฟส 0** เพื่อ feed on-page template, category copy และ content plan — **ไม่รื้อ URL** (ติด guardrail parity)

**แหล่งข้อมูล:**
1. `[data]` **GSC ของ WP เดิม** — top queries + top pages + CTR/position → baseline สำคัญที่สุด (ต้องดึงก่อน WP ปิด)
2. `[playbook]` Google Keyword Planner (Thai construction / งานระบบ terms)
3. `[playbook]` วิเคราะห์ SERP คู่แข่ง **3–5 ราย** — เช่น ไทวัสดุ, ดูโฮม, โกลบอลเฮ้าส์, ตัวแทน SCG/TOA, ร้านท่อ/วาล์ว/ปั๊มเฉพาะทาง
4. `[playbook]` Autocomplete + People-Also-Ask ของหมวดหลัก

**Output → `keyword-map.md`:** cluster keyword ไปที่ **หน้าที่มีอยู่แล้ว**
- **หมวด (commercial intent)** = ตัวหลัก
- **product (long-tail: brand + รุ่น)**
- **blog (informational)**

เสนอ **หน้าใหม่เฉพาะที่มี gap จริง** (category landing / pillar article) → ได้ URL ใหม่ ไม่ต้อง 301

---

## 4) 6 Pillars — ขอบเขตงาน

### ⚙️ Pillar 1 — Technical SEO (`[code]` เป็นหลัก)
- **Indexation/crawl:** review `robots.ts`; sitemap เน้น `lastmod` ที่ถูกต้อง + ใส่เฉพาะ URL canonical ที่ published (คงไฟล์เดียวได้ที่ ~400 URL — **แตกเป็น sitemap index ก็ต่อเมื่อ** โตเกิน ~1k หรือจะแยก media sitemap)
- **Canonical:** self-referencing ทุก page type (เพิ่ม category / blog / shop / static); จัดการ params `?q=` / `?page=` / sort (canonical → clean URL + noindex ตามเหมาะ)
- **Host canonical:** บังคับ **non-www + https + trailing-slash เดียว** ตอน cutover (Vercel/Cloudflare + `next.config`)
- **Structured data (เพิ่มใน `lib/seo/`):**
  - `Organization` + `WebSite`(+`SearchAction`) — sitewide ใน root layout
  - `LocalBusiness` / `HardwareStore` — home + contact (NAP, geo, `openingHours`, `telephone`, `sameAs`)
  - `BreadcrumbList` — ทุกหน้าที่มี breadcrumb (ตอนนี้ visual เปล่า)
  - `ItemList` / `CollectionPage` — หน้าหมวด
  - `Product` — เติม `brand` เมื่อ map แล้ว; **จัดการ no-price** (ใช้ `offers` โดยไม่ใส่ `price` + `availability` — GSC จะเป็น *warning* ไม่ใช่ error; ไม่ใส่ `PriceSpecification` ปลอม)
  - `FAQPage` — เมื่อมีเนื้อหา FAQ
- **Core Web Vitals:** audit LCP / CLS / INP; เช็ค `next/image` ครบ; webp + lazy; น้ำหนัก JS ของ `pdf-flipbook` / `home-carousel`; preload ฟอนต์
- **404/410:** custom 404, กัน soft-404, map URL ตายที่ index → 301 หรือ 410

### 📝 Pillar 2 — On-page (`[code]` template + `[playbook]` copy)
- **Title/meta/H1 template ต่อ page-type:** home ✓ / category (สูตร + meta) / product (ปรับ fallback formula ของ `seo_title`/`seo_description`) / blog ✓ / static
- **Category SEO copy** `[playbook]`: บล็อก H1 + 100–200 คำต่อหมวด (จาก keyword map) — **ลีเวอร์ใหญ่สุดของ B2B category ranking**; ต้องมี field ใน DB/admin (ถ้ายังไม่มี → `[code]` เพิ่ม)
- **Internal linking architecture:** home→หมวดเด่น, หมวด→product ✓, product→related ✓ + →หมวดแม่ ✓, **blog→product/หมวด (contextual — ยังขาด)**, footer, breadcrumb; เช็ค orphan pages
- **Image SEO:** audit `alt` ภาษาไทยบนรูป product

### ✍️ Pillar 3 — Content / Keyword (`[playbook]`)
- Category-landing copy (priority — intent สูง)
- Blog pillar/cluster: วิธีเลือกท่อ PVC, ชนิดสี TOA, การเลือกวาล์ว/ปั๊ม, คู่มืองานระบบประปา-ไฟฟ้า → link เข้า product/หมวด
- Editorial calendar 2–4 บทความ/เดือน (topic จาก keyword map + GSC top queries + competitor gap)
- FAQ (site + product) → `FAQPage`
- Refresh 31 โพสต์ที่ย้ายมา (dedupe/update; internal link rewritten แล้ว)

### 📍 Pillar 4 — Local SEO (`[playbook]` + schema `[code]`)
- Google Business Profile: claim/verify, หมวดร้าน (Hardware store / วัสดุก่อสร้าง), **NAP consistency**, รูป/สินค้า/โพสต์, **ขอรีวิวหลังส่งของ**, Q&A
- Local citations (directory ไทย), ฝัง Google Maps หน้า contact
- ผูกกับ `LocalBusiness` schema (Pillar 1)

### 🔗 Pillar 5 — Off-page (`[playbook]` + `[data]`)
- **Backlink preservation (สำคัญตอน migrate):** export backlink เดิม (GSC Links + Ahrefs/Semrush) → เช็ค URL ปลายทาง 301 ถูก → รักษา link equity
- Link building: ตัวแทน brand (TOA/SCG dealer listing), พันธมิตรผู้รับเหมา, B2B directory, guest post
- Disavow เฉพาะเมื่อเจอ toxic profile

### 📊 Pillar 6 — Measurement (`[code]` wiring + `[ops]`)
- อ้าง `marketing-plan.md` เรื่อง GTM/GA4/GSC/Clarity; เอกสารนี้เพิ่ม **layer SEO**:
  - Event `generate_lead` (quote/contact), GSC coverage monitor, rank tracking (target kw), funnel organic→lead, CWV (Vercel Speed Insights), monthly health check
- รายละเอียด → `measurement-plan.md`

---

## 5) Roadmap 3 เฟส

### 🟢 เฟส 0 — Pre-cutover Foundation (ทำตอนนี้ ก่อนสลับ DNS)
| # | งาน | ป้าย |
|---|-----|------|
| 0.1 | **เก็บ baseline WP เดิม** — export GSC (queries/pages), crawl URL inventory เว็บเก่า, export backlink | `[data]` ⏰ ด่วนสุด |
| 0.2 | Keyword + competitor research → `keyword-map.md` | `[data][playbook]` |
| 0.3 | **301 parity audit** — เทียบ URL inventory เก่า vs redirects(109) + route ใหม่ → เติมช่องโหว่ (`301-parity-checklist.md`) | `[code][ops]` |
| 0.4 | Technical foundation — sitemap `lastmod` ถูกต้อง (+แตก index ถ้าจำเป็น), canonical ทุก type, host canonical, robots, noindex params | `[code]` |
| 0.5 | Structured data ครบ — Org, WebSite+SearchAction, LocalBusiness, BreadcrumbList, ItemList, Product(no-price fix) | `[code]` |
| 0.6 | On-page templates + category SEO-copy field/render | `[code]` (+`[playbook]` เขียน copy) |
| 0.7 | CWV audit + fixes | `[code]` |
| 0.8 | Measurement wiring — GTM/GA4/GSC verify + `generate_lead` | `[code]` (อ้าง marketing-plan) |

### 🟡 เฟส 1 — Cutover Week (`cutover-seo-checklist.md`)
- Freeze content 7 วัน → สลับ DNS → **verify 301 ทุกตัว live** + บังคับ host canonical → submit sitemap ใหม่ GSC → request-index หน้า priority → **monitor coverage / 404 spike / organic / CWV field**
- โดเมนเดิม → **ไม่ต้อง** "Change of Address" ใน GSC
- **Gate:** ถ้ามี 404 บน URL ที่เคย index หรือ organic ตก >20% → หยุด + แก้ก่อนไปต่อ

### 🔵 เฟส 2 — Post-launch Growth (ต่อเนื่อง)
- Content program (calendar + category copy rollout + pillar/cluster)
- Local (GBP + citations + reviews)
- Off-page (link building + ตาม preservation)
- CRO บน quote funnel
- **Monthly SEO health check** — optimize หน้า top-10-not-1 จาก GSC Queries

---

## 6) KPI & Success gates
- **Parity gate (เฟส 1):** ≥95% ของ URL ที่เคย index คืน `200` หรือ `301→200` (ไม่มี 404 บนหน้าที่ index) · GSC coverage นิ่งใน 4 สัปดาห์ · organic ไม่ตกค้าง >20%
- **Growth (6 เดือน):** organic sessions **+X%** · non-brand category keyword ติด top-10 · จำนวน quote-lead จาก organic
  - *(ตั้ง baseline ตัวเลขจริงตอน launch แล้วค่อยเคาะเป้า % — ยังไม่ล็อกตัวเลขตอนนี้)*

---

## 7) Deliverables & Implementation handoff
- เอกสารกลยุทธ์ (ไฟล์นี้) + artifacts → commit
- **เฉพาะก้อน `[code]` เฟส 0 (0.3–0.8)** → เข้า **writing-plans** = implementation plan จริง
- `[data]` / `[playbook]` → เป็น checklist/playbook ในเอกสารให้ทีมทำตาม
- ลำดับ implement แนะนำ: 0.1/0.2 (data, ขนานกันได้) → 0.3 (parity) → 0.4/0.5 (technical+schema) → 0.6 (on-page) → 0.7 (CWV) → 0.8 (measurement)

---

## 8) Dependencies / Blocked (รอ user หรือ phase อื่น)
- **Brand mapping** — `brand_id` ยัง null; ต้อง map ก่อน `Product.brand` schema จะสมบูรณ์ (งาน admin/manual)
- **Category SEO-copy field** — ต้องมี field ใน schema/admin ก่อนกรอก copy
- **GTM/GA4/GSC/Clarity IDs, Resend domain, LINE token** — รอ user (ดู `marketing-plan.md` §1)
- **Keyword/competitor input** — ยังไม่มี; เฟส 0.2 เป็นตัวสร้าง
- **Old-site GSC access + crawl tool** (Screaming Frog/Sitebulb) — ต้องมีก่อน 0.1

---

## 9) Change log
- **2026-07-12** — สร้างเอกสารจาก brainstorming (Approach A+C). ยังไม่เริ่ม implement.
- **2026-07-12** — **0.5 Structured data foundation implemented** (branch `feat/seo-structured-data-foundation`): `lib/seo/schema.ts` (builders + vitest 10/10) + `<JsonLd>` component (escapes `</script>`); wired Organization + WebSite(+SearchAction) sitewide, LocalBusiness (home/contact), BreadcrumbList + ItemList (category, gated on non-empty), Product (no-price) + Article refactored to builders (product/blog). Verify: `npm run test` 10/10 + `typecheck` + **`npm run build` เขียวครบ** (whole-branch review by opus = ready-to-merge).
  - **เหลือก่อน launch:** (1) ใส่ FB/LINE **profile URL จริง** ใน `lib/site-config.ts` — ตอนนี้ `sameAs` ถูก omit เพราะเป็น bare origin; (2) รัน **Google Rich Results Test** ต่อ page type (Org/LocalBusiness/Breadcrumb/ItemList/Product/Article) — browser, ทำเอง; (3) `brand` ใน Product รอ brand mapping (strategy §8).
