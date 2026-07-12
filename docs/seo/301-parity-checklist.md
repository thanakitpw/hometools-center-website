# 301 Parity Checklist — pre-cutover

> **เป้า:** ทุก URL ที่ Google เคย index บน WP เดิม ต้องคืน `200` หรือ `301 → 200` บนเว็บใหม่ (ไม่มี 404 บนหน้าที่เคย index)
> **ต้องทำก่อน cutover** — parity gate ของเฟส 1
> อ้างอิง: `seo-strategy.md` §5 (0.1, 0.3)

---

## A) รวบรวม URL inventory ของเว็บเก่า (`[data]` ⏰ ก่อน WP ปิด)
- [ ] Export **GSC → Pages** (Performance + Coverage/Indexing) ของ WP เดิม → รายการ URL ที่ index จริง
- [ ] Crawl เว็บเก่าด้วย Screaming Frog / Sitebulb → export ทุก URL (200/301/404), title, canonical
- [ ] ดึง `sitemap.xml` เก่าของ WP (ถ้ายังมี)
- [ ] รวมเป็นชุดเดียว `research/seo/old-url-inventory.csv` (คอลัมน์: url, status, indexed?, clicks, impressions)

## B) เทียบกับปลายทางใหม่
- [ ] Map ทุก old URL → เว็บใหม่: **200 ตรง** / **301 มีอยู่แล้ว** (109 rules ในตาราง `redirects`) / **ต้องเพิ่ม 301** / **ตั้งใจปล่อย 410**
- [ ] เช็คหมวด URL หลัก:
  - [ ] `/product/<slug>` — 347 สินค้า
  - [ ] `/product-category/<slug>` — 42 หมวด (รวม nested)
  - [ ] `/blog/<english-slug>` — 31 โพสต์ (slug ไทยเดิม → 301 ครบ?)
  - [ ] หน้า static (about/contact/promotion/how-to-order/privacy/cookie)
  - [ ] home + `/shop`
  - [ ] URL รูป/ไฟล์แนบเก่า (uploads) ที่มี backlink/hotlink
- [ ] Query params เก่า (`?p=`, `?product_cat=`, feed, `?attachment_id=`) → กติกาการ handle
- [ ] Pagination เก่า (`/page/2/`, `?paged=`) → map ไป pattern ใหม่

## C) เติมช่องโหว่ (`[code]`)
- [ ] เพิ่ม 301 ที่ขาดเข้า `redirects` table (ผ่าน import script / admin)
- [ ] กันลูป redirect (มี guard แล้ว — verify)
- [ ] ยืนยัน redirect ทั้งหมดเป็น **301** (ไม่ใช่ 302/307) ยกเว้นที่ตั้งใจ

## D) ยืนยัน (before flipping DNS — รันบน preview/staging)
- [ ] สคริปต์เช็ค: ยิงทุก URL ใน `old-url-inventory.csv` → บันทึก status ปลายทาง
- [ ] **Gate:** ≥95% ของ URL ที่ index = 200 หรือ 301→200; 404 ที่เหลือเป็น URL ที่ไม่ได้ index/ตั้งใจทิ้ง
- [ ] Host canonical: `http→https`, `www→non-www` (หรือกลับกัน — เลือกให้ตรงของเดิม), trailing slash → 301 เดียว ไม่ซ้อน
- [ ] เช็ค chain: old → ควรถึงปลายทางใน **1 hop** (ไม่ 301→301→200)

---

## ตารางบันทึกผล (เติมตอนทำจริง)
| กลุ่ม URL | จำนวน index เดิม | 200 | 301→200 | 404 (ตั้งใจ) | 404 (ต้องแก้) |
|---|---|---|---|---|---|
| product | | | | | |
| category | | | | | |
| blog | | | | | |
| static | | | | | |
| media/uploads | | | | | |
| อื่นๆ (params/paged) | | | | | |
