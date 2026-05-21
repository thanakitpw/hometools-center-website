# Marketing & SEO Plan — Home Tool Center

> **Status:** PLAN ONLY. Implementation happens **after the website is done**
> (Phase 5 admin + Phase 6 polish complete).
>
> **Last updated:** 2026-05-21

---

## 1) Checklist — ถามลูกค้าก่อนเริ่ม

ขอข้อมูล/บัญชี/IDs เหล่านี้จากลูกค้า:

### Analytics
- [ ] **Google account** สำหรับ admin GA4 + GSC (account email)
- [ ] **Google Analytics 4** — มี property แล้วยัง? ถ้ามี ขอ `Measurement ID` (`G-XXXXXXXXXX`). ถ้ายัง → สร้างใหม่
- [ ] **Google Tag Manager** — มี container ไหม? ขอ `Container ID` (`GTM-XXXXXXX`). ถ้ายัง → สร้าง
- [ ] **Google Search Console** — domain ยืนยันยัง? ถ้ายัง ต้อง verify ด้วย DNS หรือ HTML tag
- [ ] **Google Business Profile** — มีไหม? (สำหรับ Local SEO + Maps + reviews) — ขอ profile URL
- [ ] **Microsoft Clarity** — มีบัญชีไหม? ถ้ายัง สมัครฟรีที่ clarity.microsoft.com → ขอ Project ID

### Ads / Social
- [ ] **Facebook Business Manager** — มีไหม? ขอ Business ID
- [ ] **Facebook Pixel** — มี Pixel ID ไหม? (`123456789012345`)
- [ ] **LINE Official Account** — confirm มีอยู่แล้ว, ขอ:
  - Channel access token (สำหรับ notify)
  - Channel ID (สำหรับ LINE Login ถ้าจะใช้ภายหลัง)
- [ ] **LINE Tag** (ถ้าจะลง LINE Ads) — Tag ID
- [ ] **TikTok Pixel** (ถ้าจะลง TikTok ads) — Pixel ID
- [ ] **Google Ads account** (ถ้าจะลง search/display) — Customer ID

### Email Marketing
- [ ] **Sending domain** ที่อยากใช้ส่ง email (e.g. `notify@hometools-center.com`)
- [ ] **DNS access** — ต้องเพิ่ม SPF/DKIM record ใน Cloudflare เพื่อ verify domain
- [ ] **Reply-to email** — อีเมลที่ลูกค้ารับ reply
- [ ] **Newsletter platform** — มี Mailchimp / MailerLite / Brevo อยู่แล้วไหม?

### SEO tools (สำหรับ ongoing SEO)
- [ ] **Ahrefs / Semrush / Ubersuggest** — มี subscription ไหม?
- [ ] **DataForSEO API** (ทางเลือก backup) — ถ้าจะใช้ keyword research อัตโนมัติใน admin
- [ ] **Backlink data** — ขอ Ahrefs/Semrush export ของ backlinks เก่า (เผื่อต้องไล่ outreach)

### CRM / Lead pipeline
- [ ] **CRM ที่ใช้อยู่** — HubSpot / Pipedrive / Bitrix / Zoho / ไม่มี (ใช้ Excel)
- [ ] **Workflow ปกติ** — ตอนนี้รับ lead ทาง Line / โทร / email ยังไง? ใครรับ?
- [ ] **เวลาตอบกลับเป้าหมาย** — ภายใน X นาที/ชั่วโมง?

### Content / SEO direction
- [ ] **เป้าหมาย keyword** — keyword หลักที่อยากติด rank top 3 คืออะไร?
- [ ] **Competitor list** — แข่งกับใครใน Google? (ขอ 3-5 ชื่อ)
- [ ] **Content calendar** — มี plan เขียนบทความเดือนละกี่บทความ?
- [ ] **Brand voice** — รูปแบบการเขียนที่ลูกค้าชอบ (formal / casual / technical)
- [ ] **Existing blog performance** — บทความเก่าตัวไหน traffic ดีที่สุด? (ดูจาก GA4 เก่า WP ถ้ามี)

---

## 2) Tier 1 — ใส่ก่อน launch (essential)

### 2.1 Google Tag Manager + Google Analytics 4
**Why:** ครอบ tracking ทั้ง site + ใส่ tag อื่นภายหลังโดยไม่ต้องแก้โค้ด
**Needs:** `NEXT_PUBLIC_GTM_ID` ใน `.env.local`
**Where:** เพิ่ม `<Script>` ใน `app/layout.tsx` + GTM noscript fallback
**Inside GTM:** สร้าง GA4 tag + trigger "All Pages" + เพิ่ม events: form_submit (quote/contact), product_view, search_query

### 2.2 Google Search Console verification
**Why:** ต้องยืนยัน ownership ก่อน submit sitemap + monitor coverage
**Method:** เพิ่ม `<meta name="google-site-verification">` ใน root layout (verification token จาก GSC)

### 2.3 Schema.org JSON-LD เพิ่ม
**Already have:** Product (product pages), Article (blog)
**To add (component แบบ reusable ใน `lib/seo/`):**
- **Organization** — site-wide ใน root layout (name, logo, sameAs, contactPoint)
- **LocalBusiness** — home page + contact page (NAP, openingHours, geo coords)
- **BreadcrumbList** — ทุก page ที่มี breadcrumb component (currently visual only)
- **WebSite** — site-wide กับ SearchAction (เปิด sitelinks search box ใน Google)
- **FAQPage** — เมื่อ admin เพิ่มหน้า FAQ
- **AggregateOffer** — ใน category page (price range ขั้นต่ำ-สูงสุด)

### 2.4 Cookie consent banner
**Why:** PDPA compliance, WP เดิมมี (Complianz)
**Pattern:** banner + 3 ปุ่ม (Accept / Reject / Manage) + cookie modal
**Storage:** localStorage flag → block GTM until consented
**Library:** ใช้ `react-cookie-consent` หรือ custom (50 lines)

### 2.5 Microsoft Clarity
**Why:** ฟรี + heatmap + session recording → ดู UX pain points
**Needs:** `NEXT_PUBLIC_CLARITY_ID`
**Where:** snippet ใน root layout (โหลด lazy)

### 2.6 OG image generation
**Why:** ตอนนี้บางหน้าใช้ภาพสินค้าเป็น OG — ไม่สวย ไม่ branded
**Solution:** Next.js `ImageResponse` API → generate dynamic OG image ต่อ template (home/product/blog/category) ด้วย brand colors + ชื่อ

---

## 3) Tier 2 — หลัง launch ทันที

### 3.1 GSC sitemap submit
- ส่ง `/sitemap.xml` → request indexing สำคัญๆ
- ตั้ง email alert บน coverage errors

### 3.2 Vercel Analytics + Speed Insights
- Vercel native, ฟรี 25k events/mo
- RUM data จริงสำหรับ Core Web Vitals → เช็ก regression

### 3.3 404 → suggest redirect (admin)
- จาก middleware log → store 404 paths ใน table ใหม่ `not_found_log`
- Admin เห็น list → กดเพิ่มเป็น redirect rule ได้จาก UI

### 3.4 Site search analytics
- Log query จาก `/shop?q=` ลง table `search_queries`
- Admin ดูได้ว่าคนหาอะไรบ่อย (= keyword ideas ฟรี)

### 3.5 GA4 enhanced events
- `view_item` ตอนเข้าหน้า product
- `select_item` ตอนคลิกใน category
- `generate_lead` ตอน quote/contact submit
- `view_promotion` ตอนเห็น banner หน้า home

### 3.6 Resend domain verification + sender
- Verify `hometools-center.com` (SPF+DKIM ใน Cloudflare)
- เปลี่ยน `from:` ใน `lib/notify.ts`

---

## 4) Tier 3 — เมื่อจะทำ paid marketing

### 4.1 Facebook Pixel + Conversions API
- Pixel snippet ใน GTM
- Server-side CAPI ผ่าน Vercel function (deduplication + iOS workaround)

### 4.2 Google Ads conversion tracking
- เพิ่ม Google Ads tag ใน GTM
- Track conversions: quote_submit, contact_submit, phone_click

### 4.3 LINE Ads / LINE Tag
- LINE Ads platform setup
- Pixel ใน GTM

### 4.4 CRM integration
- Webhook จาก `/api/quote` + `/api/contact` → CRM (HubSpot/Pipedrive/Bitrix)
- Field mapping + dedup
- Notification ใน LINE OA chat

### 4.5 Newsletter signup
- Footer + exit-intent popup
- Sync ไป Mailchimp/Brevo via API
- Welcome drip campaign

### 4.6 Marketing automation
- Abandoned quote follow-up (ส่งเมล 24 ชม. หลังขอใบเสนอราคา)
- Re-engagement (90 วัน inactive)
- New product announcement

---

## 5) Ongoing SEO workflow (หลัง launch)

### 5.1 Monthly health check
- GSC coverage + errors
- GA4 traffic trend vs same month last year
- Core Web Vitals report
- 404 audit + new redirects

### 5.2 Content production
- 2-4 บทความใหม่/เดือน
- Topic จาก: keyword research + GSC top queries + competitor gap
- Internal linking ทุก post → 2+ products หรือ pillar post

### 5.3 Existing content optimization
- Re-optimize top-10-but-not-1 pages (ใช้ GSC Queries report)
- Update old posts ที่เก่ากว่า 1 ปี (refresh + republish)

### 5.4 Backlink building
- Outreach แลก/guest post กับเว็บ supplier/contractor
- Local citations (Google Business, Wongnai, Pantip ฯลฯ)
- Internal team blog posts on Medium/LinkedIn → backlink

### 5.5 Local SEO
- Google Business Profile — update weekly (post, photo, review reply)
- Get reviews — ส่ง email/SMS หลัง deliver order
- Maps consistency (NAP across all listings)

---

## 6) Tooling stack แนะนำ

| Need | Free option | Paid (better) |
|---|---|---|
| Analytics | GA4 + GSC | + Mixpanel/PostHog |
| Heatmap | Microsoft Clarity | + Hotjar |
| SEO audit | GSC + PageSpeed Insights | + Ahrefs / Semrush |
| Keyword research | Google Keyword Planner | + Ahrefs / Semrush |
| Rank tracking | manual GSC | + Ahrefs / SerpRobot |
| Backlinks | GSC Links report | + Ahrefs |
| Schema testing | validator.schema.org | + Screaming Frog |
| Site crawl | manual | + Screaming Frog / Sitebulb |
| Newsletter | Brevo (300/day free) | + Mailchimp |
| CRM | HubSpot Free | + HubSpot Pro / Pipedrive |
| Forms | own (already done) | + Typeform |
| Live chat | LINE OA chat (already have) | + Intercom / Crisp |

---

## 7) Implementation order (when web is done)

```
Week 1 (pre-launch):
  Day 1: Collect IDs from client (Section 1 checklist)
  Day 2: GTM + GA4 + GSC verify + Clarity wiring
  Day 3: JSON-LD schemas (Org / LocalBusiness / Breadcrumb / WebSite)
  Day 4: Cookie consent + OG image generation
  Day 5: QA + Resend domain verify

Week 2 (launch):
  Day 1: DNS cutover + sitemap submit
  Day 2-7: Monitor + fix urgent issues

Week 3-4 (post-launch):
  Vercel Analytics + 404 tracking + search analytics
  Enhanced GA4 events
  First content piece + GSC top-query audit

Month 2+:
  Monthly health check rhythm
  Content calendar execution
  Paid ad pixel setup (if budget approved)
```

---

## 8) Definition of "marketing-ready"

ก่อน launch ลูกค้าควรมี:
- ✅ GA4 + GSC + GTM setup และ verified
- ✅ Schema markup ครบ (Product, Article, Org, LocalBusiness, Breadcrumb, WebSite)
- ✅ Cookie consent (PDPA)
- ✅ Branded OG images
- ✅ Resend sending domain verified
- ✅ LINE OA channel access token ใส่แล้ว
- ✅ Sitemap + robots ส่ง GSC แล้ว
- ✅ Google Business Profile claim แล้ว
