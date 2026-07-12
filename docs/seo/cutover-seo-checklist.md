# Cutover SEO Checklist — เฟส 1 (launch week runbook)

> อ้างอิง: `seo-strategy.md` §5 เฟส 1 · โดเมนเดิม (hometools-center.com) → **ไม่ต้อง** ทำ "Change of Address" ใน GSC
> เงื่อนไขเข้าเฟสนี้: เฟส 0 (0.1–0.8) เสร็จ + `301-parity-checklist.md` ผ่าน gate บน staging

---

## T‑7 → T‑1 (ก่อนสลับ)
- [ ] **Content freeze 7 วัน** บน WP เดิม (แจ้งลูกค้า — ตาม CLAUDE.md)
- [ ] ยืนยัน parity gate ผ่านบน preview (≥95%)
- [ ] ยืนยัน `robots.ts` ให้ index ได้ (ไม่มี `Disallow: /` ค้างจาก staging)
- [ ] ยืนยัน `sitemap.xml` (+ sitemap index) generate ถูก, มีเฉพาะ URL canonical published
- [ ] ยืนยัน host canonical rule (www/https/slash) ตั้งไว้แล้ว
- [ ] GTM/GA4/GSC verify tag อยู่บน production build + cookie consent ไม่บล็อกจน tracking ไม่ยิง
- [ ] snapshot baseline (organic, rankings, index count) — ดู `measurement-plan.md`

## T‑0 (วันสลับ DNS)
- [ ] สลับ DNS → Vercel (Cloudflare DNS-only / gray cloud)
- [ ] เช็ค SSL ออกครบ, `https://` เขียว
- [ ] ยิง smoke test URL ชุด priority (home, top หมวด, top product, top blog) → 200
- [ ] เช็ค host canonical ทำงาน: `www` / `http` / มี-ไม่มี slash → 301 ปลายทางเดียว
- [ ] Submit `sitemap.xml` ใหม่ใน GSC
- [ ] **URL Inspection → Request Indexing** หน้า priority (home + top หมวด/สินค้า/blog)
- [ ] ยืนยัน GA4 realtime มี traffic + `page_view` ยิง

## T+1 → T+7 (เฝ้าระวัง)
- [ ] GSC Coverage/Indexing รายวัน — จับ **404 spike / Excluded / Crawl anomaly**
- [ ] GA4 organic รายวัน เทียบ baseline
- [ ] CWV field data (Vercel Speed Insights / CrUX) — LCP/INP/CLS ไม่แดง
- [ ] เช็ค log 404 (middleware) → เพิ่ม 301 ที่หลุด
- [ ] เช็ค `Product`/`Article`/`Breadcrumb`/`Org` ผ่าน Rich Results Test (ไม่มี error)
- [ ] **Gate:** ถ้า 404 บน URL ที่เคย index หรือ organic ตกค้าง >20% → **หยุด + แก้** ก่อนทำงาน growth

## T+7 → T+30
- [ ] GSC coverage นิ่ง (indexed count กลับมาใกล้เดิม)
- [ ] ปลด content freeze → เริ่ม content program (เฟส 2)
- [ ] รีวิว GSC Queries: อันดับ/CTR หน้า priority ไม่ถดถอย
