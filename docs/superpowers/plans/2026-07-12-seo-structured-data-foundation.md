# SEO Structured Data Foundation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** เพิ่ม JSON-LD structured data ให้ครบทุก page type (Organization, WebSite+SearchAction, LocalBusiness, BreadcrumbList, ItemList, Product no-price, Article) ผ่าน builder ที่ test ได้ใน `lib/seo/`

**Architecture:** สร้าง pure builder functions ใน `lib/seo/schema.ts` (return plain JSON-LD objects, unit-tested ด้วย vitest) + server component `<JsonLd>` ตัวเดียวสำหรับ render `<script type="application/ld+json">`. แล้ว wire เข้า root layout (sitewide Org+WebSite), home/contact (LocalBusiness), category (Breadcrumb+ItemList), product & blog (refactor inline schema เดิม → builder + เพิ่ม Breadcrumb).

**Tech Stack:** Next.js 16 App Router, React 19 Server Components, TypeScript, vitest (เพิ่มใหม่), Supabase (อ่านผ่าน query helper เดิม)

## Global Constraints

- **Framework:** Next.js 16 App Router; JSON-LD ต้อง render แบบ server (ห้ามใส่ `'use client'` ใน `JsonLd` หรือ `schema.ts`)
- **Render pattern:** `<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />` เท่านั้น
- **Quote model:** `Product` schema **ห้ามมี `price` / `priceCurrency`** (ลูกค้าขอใบเสนอราคา ไม่มีราคาแสดง) — offer ใส่ได้แค่ `url` + `availability` + `seller`
- **ภาษาเดียว:** `inLanguage: 'th'`; ไม่มี hreflang
- **Alias:** import ภายในใช้ `@/…` (เช่น `@/lib/site-config`)
- **siteConfig** เป็น `as const` (readonly) — อ่านอย่างเดียว ห้ามแก้ shape ในแผนนี้
- **ห้าม regress:** product & blog page มี schema inline อยู่แล้ว — refactor แล้ว output ต้อง "เท่าเดิมหรือดีกว่า" (ไม่มี field หาย)
- **`@id` linking:** Organization ใช้ `@id = ${url}/#organization` และถูก emit sitewide → schema อื่น reference ผ่าน `{ '@id': ORG_ID }` ได้ (ไม่ต้องซ้ำ name/logo)
- **Verify ต่อ task:** `npm run typecheck` ต้องผ่าน; task ที่แก้ page → `npm run build` ต้องผ่าน; builder → `npm run test` เขียว

---

### Task 1: Vitest harness + `organizationSchema` + `websiteSchema`

**Files:**
- Modify: `package.json` (devDeps + scripts)
- Create: `vitest.config.ts`
- Create: `lib/seo/schema.ts`
- Test: `lib/seo/schema.test.ts`

**Interfaces:**
- Produces: `organizationSchema(): object`, `websiteSchema(): object`, และ (ภายในไฟล์) const `ORG_ID = '${siteConfig.url}/#organization'`, `WEBSITE_ID`, helper `absoluteUrl(path: string): string`

- [ ] **Step 1: ติดตั้ง vitest**

Run:
```bash
npm install -D vitest
```
Expected: เพิ่ม `vitest` ใน `devDependencies` สำเร็จ

- [ ] **Step 2: เพิ่ม test scripts ใน `package.json`**

ใน `"scripts"` เพิ่ม 2 บรรทัด (ต่อจาก `"typecheck"`):
```json
    "test": "vitest run",
    "test:watch": "vitest",
```

- [ ] **Step 3: สร้าง `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['lib/**/*.test.ts'],
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
});
```

- [ ] **Step 4: เขียน failing test** — `lib/seo/schema.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { organizationSchema, websiteSchema } from './schema';
import { siteConfig } from '@/lib/site-config';

describe('organizationSchema', () => {
  it('is an Organization with stable @id, name, url, absolute logo', () => {
    const o = organizationSchema();
    expect(o['@type']).toBe('Organization');
    expect(o['@id']).toBe(`${siteConfig.url}/#organization`);
    expect(o.name).toBe(siteConfig.name);
    expect(o.url).toBe(siteConfig.url);
    expect(o.logo).toBe(`${siteConfig.url}/logo-htc.png`);
    expect(o.contactPoint.telephone).toBe(siteConfig.contact.phone);
  });
});

describe('websiteSchema', () => {
  it('is a WebSite with a SearchAction pointing at /shop?q=', () => {
    const w = websiteSchema();
    expect(w['@type']).toBe('WebSite');
    expect(w.potentialAction['@type']).toBe('SearchAction');
    expect(w.potentialAction.target.urlTemplate).toBe(
      `${siteConfig.url}/shop?q={search_term_string}`,
    );
    expect(w.publisher['@id']).toBe(`${siteConfig.url}/#organization`);
  });
});
```

- [ ] **Step 5: รัน test ให้ FAIL**

Run: `npm run test`
Expected: FAIL — `Cannot find module './schema'` (ยังไม่มีไฟล์)

- [ ] **Step 6: เขียน `lib/seo/schema.ts` (2 builder แรก + helpers)**

```ts
import { siteConfig } from '@/lib/site-config';

export const ORG_ID = `${siteConfig.url}/#organization`;
export const WEBSITE_ID = `${siteConfig.url}/#website`;

/** คืน absolute URL จาก path ภายใน (ถ้าเป็น http(s) อยู่แล้วคืนเดิม) */
export function absoluteUrl(pathOrUrl: string): string {
  if (/^https?:\/\//.test(pathOrUrl)) return pathOrUrl;
  return `${siteConfig.url}${pathOrUrl.startsWith('/') ? '' : '/'}${pathOrUrl}`;
}

export function organizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': ORG_ID,
    name: siteConfig.name,
    url: siteConfig.url,
    logo: absoluteUrl(siteConfig.logoUrl),
    image: absoluteUrl(siteConfig.logoUrl),
    telephone: siteConfig.contact.phone,
    email: siteConfig.contact.email,
    sameAs: [siteConfig.social.facebook, siteConfig.social.line],
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: siteConfig.contact.phone,
      contactType: 'sales',
      areaServed: 'TH',
      availableLanguage: ['th'],
    },
  };
}

export function websiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    url: siteConfig.url,
    name: siteConfig.name,
    inLanguage: 'th',
    publisher: { '@id': ORG_ID },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${siteConfig.url}/shop?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}
```

- [ ] **Step 7: รัน test ให้ PASS**

Run: `npm run test`
Expected: PASS (2 tests)

- [ ] **Step 8: typecheck**

Run: `npm run typecheck`
Expected: ไม่มี error

- [ ] **Step 9: Commit**

```bash
git add package.json package-lock.json vitest.config.ts lib/seo/schema.ts lib/seo/schema.test.ts
git commit -m "feat(seo): vitest harness + Organization/WebSite JSON-LD builders"
```

---

### Task 2: `localBusinessSchema`

**Files:**
- Modify: `lib/seo/schema.ts`
- Modify: `lib/seo/schema.test.ts`

**Interfaces:**
- Consumes: `ORG_ID`, `absoluteUrl` (Task 1)
- Produces: `localBusinessSchema(): object` (`@type: HardwareStore`, มี PostalAddress + openingHoursSpecification Mon–Sat 08:00–17:00)

- [ ] **Step 1: เขียน failing test** — เพิ่มใน `lib/seo/schema.test.ts`

```ts
import { localBusinessSchema } from './schema';

describe('localBusinessSchema', () => {
  it('is a HardwareStore with NAP, address parts, and Mon-Sat hours', () => {
    const b = localBusinessSchema();
    expect(b['@type']).toBe('HardwareStore');
    expect(b.telephone).toBe(siteConfig.contact.phone);
    expect(b.address['@type']).toBe('PostalAddress');
    expect(b.address.postalCode).toBe('10150');
    expect(b.address.addressCountry).toBe('TH');
    const hours = b.openingHoursSpecification[0];
    expect(hours.opens).toBe('08:00');
    expect(hours.closes).toBe('17:00');
    expect(hours.dayOfWeek).toContain('Saturday');
    expect(hours.dayOfWeek).not.toContain('Sunday');
    expect(b.parentOrganization['@id']).toBe(`${siteConfig.url}/#organization`);
  });
});
```

- [ ] **Step 2: รัน test ให้ FAIL**

Run: `npm run test`
Expected: FAIL — `localBusinessSchema is not a function`

- [ ] **Step 3: เพิ่ม builder ใน `lib/seo/schema.ts`**

```ts
export function localBusinessSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'HardwareStore',
    '@id': `${siteConfig.url}/#localbusiness`,
    name: siteConfig.name,
    url: siteConfig.url,
    image: absoluteUrl(siteConfig.logoUrl),
    logo: absoluteUrl(siteConfig.logoUrl),
    telephone: siteConfig.contact.phone,
    email: siteConfig.contact.email,
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'เลขที่ 642 ถนนพระราม 2 แขวงบางมด',
      addressLocality: 'เขตจอมทอง',
      addressRegion: 'กรุงเทพมหานคร',
      postalCode: '10150',
      addressCountry: 'TH',
    },
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
        opens: '08:00',
        closes: '17:00',
      },
    ],
    sameAs: [siteConfig.social.facebook, siteConfig.social.line],
    parentOrganization: { '@id': ORG_ID },
  };
}
```

> **หมายเหตุ:** address parts ถอดจาก `siteConfig.contact.address` (แปลงเลขไทย ๒→2). ยังไม่ใส่ `geo` (lat/lng) — ไม่บังคับ และจะให้ Google Business Profile เป็นตัวถือพิกัด; ถ้ามีพิกัดภายหลังค่อยเติมใน builder นี้

- [ ] **Step 4: รัน test ให้ PASS**

Run: `npm run test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/seo/schema.ts lib/seo/schema.test.ts
git commit -m "feat(seo): LocalBusiness (HardwareStore) JSON-LD builder"
```

---

### Task 3: `breadcrumbSchema` + `itemListSchema`

**Files:**
- Modify: `lib/seo/schema.ts`
- Modify: `lib/seo/schema.test.ts`

**Interfaces:**
- Consumes: `absoluteUrl` (Task 1)
- Produces:
  - `breadcrumbSchema(items: { name: string; path?: string }[]): object` — BreadcrumbList; item ที่ไม่มี `path` (หน้าปัจจุบัน) จะไม่ใส่ field `item`
  - `itemListSchema(items: { name: string; path: string }[]): object` — ItemList + `numberOfItems`

- [ ] **Step 1: เขียน failing test** — เพิ่มใน `lib/seo/schema.test.ts`

```ts
import { breadcrumbSchema, itemListSchema } from './schema';

describe('breadcrumbSchema', () => {
  it('numbers positions from 1 and makes paths absolute; last item has no url', () => {
    const b = breadcrumbSchema([
      { name: 'หน้าแรก', path: '/' },
      { name: 'สินค้าทั้งหมด', path: '/shop' },
      { name: 'ท่อ PVC' },
    ]);
    expect(b['@type']).toBe('BreadcrumbList');
    expect(b.itemListElement).toHaveLength(3);
    expect(b.itemListElement[0].position).toBe(1);
    expect(b.itemListElement[0].item).toBe(`${siteConfig.url}/`);
    expect(b.itemListElement[2].position).toBe(3);
    expect(b.itemListElement[2].item).toBeUndefined();
  });
});

describe('itemListSchema', () => {
  it('lists items with absolute urls and numberOfItems', () => {
    const l = itemListSchema([
      { name: 'A', path: '/product/a' },
      { name: 'B', path: '/product/b' },
    ]);
    expect(l['@type']).toBe('ItemList');
    expect(l.numberOfItems).toBe(2);
    expect(l.itemListElement[1].url).toBe(`${siteConfig.url}/product/b`);
  });
});
```

- [ ] **Step 2: รัน test ให้ FAIL**

Run: `npm run test`
Expected: FAIL — `breadcrumbSchema is not a function`

- [ ] **Step 3: เพิ่ม 2 builder ใน `lib/seo/schema.ts`**

```ts
export function breadcrumbSchema(items: { name: string; path?: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      ...(it.path ? { item: absoluteUrl(it.path) } : {}),
    })),
  };
}

export function itemListSchema(items: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    numberOfItems: items.length,
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: absoluteUrl(it.path),
      name: it.name,
    })),
  };
}
```

- [ ] **Step 4: รัน test ให้ PASS**

Run: `npm run test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/seo/schema.ts lib/seo/schema.test.ts
git commit -m "feat(seo): BreadcrumbList + ItemList JSON-LD builders"
```

---

### Task 4: `productSchema` (no-price) + `articleSchema`

**Files:**
- Modify: `lib/seo/schema.ts`
- Modify: `lib/seo/schema.test.ts`

**Interfaces:**
- Consumes: `ORG_ID` (Task 1); types `Product`, `Post` จาก `@/lib/queries/types`
- Produces:
  - `productSchema(p: Product, opts?: { brandName?: string }): object` — Product; offer **ไม่มี price/priceCurrency**; ใส่ `brand` เฉพาะเมื่อส่ง `brandName`
  - `articleSchema(p: Post): object` — Article; author/publisher = `{ '@id': ORG_ID }`

- [ ] **Step 1: เขียน failing test** — เพิ่มใน `lib/seo/schema.test.ts`

```ts
import { productSchema, articleSchema } from './schema';
import type { Product, Post } from '@/lib/queries/types';

const fakeProduct = {
  slug: 'pvc-pipe-1', sku: 'SKU1', name_th: 'ท่อ PVC',
  short_description: '<p>ท่อพีวีซีคุณภาพ</p>', seo_description: null,
  images: [{ src: 'https://cdn/x.jpg' }], brand_id: null,
} as unknown as Product;

const fakePost = {
  slug: 'water-system', title: 'ระบบน้ำ', published_at: '2025-01-02T00:00:00Z',
  cover_image_url: 'https://cdn/c.jpg', og_image_url: null,
} as unknown as Post;

describe('productSchema', () => {
  it('is a Product with NO price/priceCurrency and InStock offer', () => {
    const s = productSchema(fakeProduct);
    expect(s['@type']).toBe('Product');
    expect(s.name).toBe('ท่อ PVC');
    expect(s.description).toBe('ท่อพีวีซีคุณภาพ'); // HTML ถูกถอด
    expect(s.offers.availability).toBe('https://schema.org/InStock');
    expect(s.offers).not.toHaveProperty('price');
    expect(s.offers).not.toHaveProperty('priceCurrency');
    expect(s).not.toHaveProperty('brand');
  });
  it('adds brand only when brandName is given', () => {
    const s = productSchema(fakeProduct, { brandName: 'SCG' });
    expect(s.brand).toEqual({ '@type': 'Brand', name: 'SCG' });
  });
});

describe('articleSchema', () => {
  it('references Organization @id for author and publisher', () => {
    const s = articleSchema(fakePost);
    expect(s['@type']).toBe('Article');
    expect(s.headline).toBe('ระบบน้ำ');
    expect(s.author['@id']).toBe(`${siteConfig.url}/#organization`);
    expect(s.publisher['@id']).toBe(`${siteConfig.url}/#organization`);
    expect(s.mainEntityOfPage['@id']).toBe(`${siteConfig.url}/blog/water-system`);
  });
});
```

- [ ] **Step 2: รัน test ให้ FAIL**

Run: `npm run test`
Expected: FAIL — `productSchema is not a function`

- [ ] **Step 3: เพิ่ม 2 builder ใน `lib/seo/schema.ts`**

เพิ่ม import ที่บนสุดของไฟล์ (ต่อจาก import siteConfig):
```ts
import type { Product, Post } from '@/lib/queries/types';
```

แล้วเพิ่ม 2 ฟังก์ชัน:
```ts
export function productSchema(p: Product, opts: { brandName?: string } = {}) {
  const description = (p.short_description || p.seo_description || '')
    .replace(/<[^>]+>/g, '')
    .trim();
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.name_th,
    ...(p.sku ? { sku: p.sku } : {}),
    ...(description ? { description } : {}),
    image: p.images.map((i) => i.src),
    ...(opts.brandName ? { brand: { '@type': 'Brand', name: opts.brandName } } : {}),
    offers: {
      '@type': 'Offer',
      url: `${siteConfig.url}/product/${p.slug}`,
      availability: 'https://schema.org/InStock',
      seller: { '@id': ORG_ID },
    },
  };
}

export function articleSchema(p: Post) {
  const image = p.cover_image_url || p.og_image_url || undefined;
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: p.title,
    ...(image ? { image } : {}),
    ...(p.published_at ? { datePublished: p.published_at, dateModified: p.published_at } : {}),
    author: { '@id': ORG_ID },
    publisher: { '@id': ORG_ID },
    inLanguage: 'th',
    mainEntityOfPage: { '@type': 'WebPage', '@id': `${siteConfig.url}/blog/${p.slug}` },
  };
}
```

- [ ] **Step 4: รัน test ให้ PASS**

Run: `npm run test`
Expected: PASS (ทั้งไฟล์)

- [ ] **Step 5: typecheck + commit**

Run: `npm run typecheck` (ต้องผ่าน)
```bash
git add lib/seo/schema.ts lib/seo/schema.test.ts
git commit -m "feat(seo): Product (no-price) + Article JSON-LD builders"
```

---

### Task 5: `<JsonLd>` server component

**Files:**
- Create: `components/site/json-ld.tsx`

**Interfaces:**
- Produces: `JsonLd({ data }: { data: object | object[] }): JSX.Element` — render `<script type="application/ld+json">` เดียว (ถ้า `data` เป็น array จะ stringify ทั้ง array ใน script เดียว)

- [ ] **Step 1: สร้าง component** — `components/site/json-ld.tsx`

```tsx
/** Server component: render JSON-LD structured data.
 *  ส่ง object เดียวหรือ array ของ object ก็ได้ (array = หลาย schema ใน script เดียว) */
export function JsonLd({ data }: { data: object | object[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
```

- [ ] **Step 2: typecheck**

Run: `npm run typecheck`
Expected: ไม่มี error

- [ ] **Step 3: Commit**

```bash
git add components/site/json-ld.tsx
git commit -m "feat(seo): JsonLd server component"
```

---

### Task 6: Wire sitewide (Organization + WebSite) + LocalBusiness (home + contact)

**Files:**
- Modify: `app/layout.tsx`
- Modify: `app/(site)/page.tsx`
- Modify: `app/(site)/contact-us/page.tsx`

**Interfaces:**
- Consumes: `JsonLd` (Task 5); `organizationSchema`, `websiteSchema`, `localBusinessSchema` (Tasks 1–2)

- [ ] **Step 1: root layout — เพิ่ม Org + WebSite sitewide**

ใน `app/layout.tsx` เพิ่ม import (ต่อจาก import `./globals.css`):
```tsx
import { JsonLd } from '@/components/site/json-ld';
import { organizationSchema, websiteSchema } from '@/lib/seo/schema';
```
แล้วแก้ `<body>` (บรรทัด `<body>{children}</body>`) เป็น:
```tsx
      <body>
        <JsonLd data={[organizationSchema(), websiteSchema()]} />
        {children}
      </body>
```

- [ ] **Step 2: home — เพิ่ม LocalBusiness**

ใน `app/(site)/page.tsx` เพิ่ม import (ต่อจาก import `HomeCarousel`):
```tsx
import { JsonLd } from '@/components/site/json-ld';
import { localBusinessSchema } from '@/lib/seo/schema';
```
แล้วใน `HomePage` (บรรทัด 92 `<>`) แทรกเป็น child แรกหลัง `<>`:
```tsx
    <>
      <JsonLd data={localBusinessSchema()} />
      {/* ========== 1. HERO ========== */}
```

- [ ] **Step 3: contact — เพิ่ม LocalBusiness**

ใน `app/(site)/contact-us/page.tsx` เพิ่ม import (ต่อจาก import `siteConfig`):
```tsx
import { JsonLd } from '@/components/site/json-ld';
import { localBusinessSchema } from '@/lib/seo/schema';
```
แล้วแทรกเป็น child แรกหลัง `<div className="mx-auto max-w-7xl px-6 py-6">`:
```tsx
    <div className="mx-auto max-w-7xl px-6 py-6">
      <JsonLd data={localBusinessSchema()} />
      <Breadcrumb items={[{ label: 'หน้าหลัก', href: '/' }, { label: 'ติดต่อเรา' }]} />
```

- [ ] **Step 4: typecheck + build**

Run: `npm run typecheck && npm run build`
Expected: ทั้งคู่ผ่าน

- [ ] **Step 5: Commit**

```bash
git add app/layout.tsx "app/(site)/page.tsx" "app/(site)/contact-us/page.tsx"
git commit -m "feat(seo): wire Organization/WebSite sitewide + LocalBusiness on home/contact"
```

---

### Task 7: Wire category (Breadcrumb + ItemList) + refactor product & blog

**Files:**
- Modify: `app/(site)/product-category/[...slug]/page.tsx`
- Modify: `app/(site)/product/[slug]/page.tsx`
- Modify: `app/(site)/blog/[slug]/page.tsx`

**Interfaces:**
- Consumes: `JsonLd` (Task 5); `breadcrumbSchema`, `itemListSchema`, `productSchema`, `articleSchema` (Tasks 3–4)

- [ ] **Step 1: category — เพิ่ม Breadcrumb + ItemList**

ใน `app/(site)/product-category/[...slug]/page.tsx` เพิ่ม import (ต่อจาก import `Link`):
```tsx
import { JsonLd } from '@/components/site/json-ld';
import { breadcrumbSchema, itemListSchema } from '@/lib/seo/schema';
```
แล้วในตัว return แทรกเป็น child แรกหลัง `<div className="mx-auto max-w-7xl px-6 py-6">`:
```tsx
    <div className="mx-auto max-w-7xl px-6 py-6">
      <JsonLd
        data={[
          breadcrumbSchema([
            { name: 'หน้าหลัก', path: '/' },
            { name: 'สินค้าทั้งหมด', path: '/shop' },
            { name: cat.name_th, path: `/product-category/${cat.slug}` },
          ]),
          itemListSchema(items.map((p) => ({ name: p.name_th, path: `/product/${p.slug}` }))),
        ]}
      />
      <Breadcrumb
```

- [ ] **Step 2: product — refactor inline schema → builder + เพิ่ม Breadcrumb**

ใน `app/(site)/product/[slug]/page.tsx`:

(a) เพิ่ม import (ต่อจาก import `siteConfig`):
```tsx
import { JsonLd } from '@/components/site/json-ld';
import { productSchema, breadcrumbSchema } from '@/lib/seo/schema';
```

(b) **ลบ** const `jsonLd = { … }` เดิม (บล็อก `const jsonLd = { '@context': … };` ทั้งก้อน)

(c) **แทน** บรรทัด render เดิม
```tsx
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
```
ด้วย:
```tsx
      <JsonLd
        data={[
          productSchema(p),
          breadcrumbSchema([
            { name: 'หน้าแรก', path: '/' },
            { name: 'สินค้าทั้งหมด', path: '/shop' },
            ...(category ? [{ name: category.name_th, path: `/product-category/${category.slug}` }] : []),
            { name: p.name_th, path: `/product/${p.slug}` },
          ]),
        ]}
      />
```
> `productSchema(p)` ยังไม่ส่ง `brandName` (brand mapping ค้างอยู่ — ดู `seo-strategy.md` §8); output ครอบ field เดิม (name/sku/description/image/offers) + ไม่มี `priceCurrency` ค้างแบบเดิมแล้ว

- [ ] **Step 3: blog — refactor inline schema → builder + เพิ่ม Breadcrumb**

ใน `app/(site)/blog/[slug]/page.tsx`:

(a) เพิ่ม import (ต่อจาก import `siteConfig`):
```tsx
import { JsonLd } from '@/components/site/json-ld';
import { articleSchema, breadcrumbSchema } from '@/lib/seo/schema';
```

(b) **ลบ** const `jsonLd = { … }` เดิมทั้งก้อน

(c) **แทน** บรรทัด
```tsx
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
```
ด้วย:
```tsx
      <JsonLd
        data={[
          articleSchema(p),
          breadcrumbSchema([
            { name: 'หน้าหลัก', path: '/' },
            { name: 'บทความ', path: '/blog' },
            { name: p.title, path: `/blog/${p.slug}` },
          ]),
        ]}
      />
```

(d) ถ้า `siteConfig` ไม่ถูกใช้ที่อื่นในไฟล์แล้ว ให้ลบ import `siteConfig` ออกเพื่อกัน lint error (เช็คก่อนลบ)

- [ ] **Step 4: typecheck + build**

Run: `npm run typecheck && npm run build`
Expected: ทั้งคู่ผ่าน

- [ ] **Step 5: Commit**

```bash
git add "app/(site)/product-category/[...slug]/page.tsx" "app/(site)/product/[slug]/page.tsx" "app/(site)/blog/[slug]/page.tsx"
git commit -m "feat(seo): breadcrumb+itemlist on category, refactor product/blog schema to builders"
```

---

### Task 8: Final verification (rendered output + rich results)

**Files:** (ไม่แก้โค้ด — verify อย่างเดียว)

- [ ] **Step 1: unit + typecheck + build ครบ**

Run: `npm run test && npm run typecheck && npm run build`
Expected: ผ่านทั้งหมด

- [ ] **Step 2: ตรวจ JSON-LD ที่ render จริง (dev server)**

Run: `npm run dev` แล้วเปิดหน้า (view-source หา `application/ld+json`):
- `/` → มี **Organization + WebSite + LocalBusiness** (3 block)
- `/contact-us` → **LocalBusiness**
- `/product-category/system-work` → **BreadcrumbList + ItemList** (+ Org/WebSite)
- product ตัวใดก็ได้ → **Product (ไม่มี price/priceCurrency) + BreadcrumbList**
- blog ตัวใดก็ได้ → **Article + BreadcrumbList**

Checklist ต่อหน้า:
- [ ] `<html lang="th">` ✓ และทุก `@id` เป็น absolute URL
- [ ] Product offer ไม่มี `price` และ `priceCurrency`

- [ ] **Step 3: validate ด้วย Rich Results Test**

วางซอร์ส/URL preview ที่ https://search.google.com/test/rich-results — ยืนยัน **0 error** (warning เรื่อง price บน Product = ยอมรับได้ตามโมเดล quote); Organization/LocalBusiness/Breadcrumb/Article ตรวจผ่าน

- [ ] **Step 4: อัปเดต strategy doc**

ใน `docs/seo/seo-strategy.md` §9 Change log เพิ่มบรรทัด:
```markdown
- **<วันที่>** — 0.5 Structured data foundation implemented (lib/seo/ + JsonLd; Org/WebSite/LocalBusiness/Breadcrumb/ItemList/Product-no-price/Article wired).
```
แล้ว commit:
```bash
git add docs/seo/seo-strategy.md
git commit -m "docs(seo): mark structured-data foundation (0.5) done"
```

---

## Self-Review (ทำแล้ว)

- **Spec coverage:** ครอบ 0.5 ครบทุก schema ที่ระบุใน `seo-strategy.md` §4 Pillar 1 (Org, WebSite+SearchAction, LocalBusiness, BreadcrumbList, ItemList, Product no-price) + Article (consolidate ของเดิม). Canonical/host/robots/noindex = **นอกขอบเขต** (อยู่ Plan 2 / 0.4)
- **Placeholder scan:** ไม่มี TODO/TBD; ทุก step มีโค้ดจริง; `brandName` เป็น optional param ที่นิยามครบ (ไม่ใช่ placeholder)
- **Type consistency:** ชื่อฟังก์ชัน/พารามิเตอร์ตรงกันข้าม task (`breadcrumbSchema({name,path})`, `itemListSchema({name,path})`, `productSchema(p,{brandName})`, `ORG_ID`); import types `Product`/`Post` จาก `@/lib/queries/types` ตรงกับของจริง
- **หมายเหตุ dependency:** brand ใน Product ค้างที่ brand mapping (strategy §8) — แผนนี้ไม่ block เพราะ `brandName` optional
