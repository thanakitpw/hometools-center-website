# seo/published

หนึ่งบทความ = 2 ไฟล์ (+ cover ที่ generate ขึ้นมา)

| ไฟล์ | คืออะไร |
|---|---|
| `<slug>.html` | เนื้อบทความ **เป็น HTML** — `posts.content_md` เก็บ HTML ดิบ ชื่อคอลัมน์เป็นของเก่าตกทอดมาจากตอน import WordPress |
| `<slug>.json` | metadata (title / seo_title / seo_description / excerpt / tags / cover) |
| `<slug>-cover.png` | cover + OG image 1200×630 ที่ `make-cover.js` เรนเดอร์ให้ |

## ขั้นตอนลงบทความใหม่

```bash
# 1) เขียน <slug>.html + <slug>.json  (ดู paint-coverage-per-bucket.* เป็นตัวอย่าง)

# 2) สร้าง cover — ต้องเพิ่ม art direction ของ slug นั้นใน COVERS ใน make-cover.js ก่อน
node scripts/seo/make-cover.js seo/published/<slug>.json

# 3) ตรวจก่อนลงจริง
node scripts/seo/publish-post.js seo/published/<slug>.json --dry

# 4) ลงจริง (upsert ด้วย slug — รันซ้ำได้ URL ไม่เปลี่ยน, published_at เดิมถูกเก็บไว้)
node scripts/seo/publish-post.js seo/published/<slug>.json
```

## กติกาของตัวบทความ (publish-post.js บังคับให้)

- **ห้ามมี `<h1>`** ในเนื้อบทความ — หน้าเว็บ render `post.title` เป็น H1 ให้อยู่แล้ว ใส่เพิ่มจะกลายเป็น 2 H1
- FAQ ต้องเป็น `<div class="faq-item"><h3>คำถาม</h3><p>คำตอบ</p></div>` และ **ห้ามมี `<div>` ซ้อนข้างใน** —
  `lib/seo/faq.ts` อ่านโครงนี้ไปทำ FAQPage JSON-LD ให้อัตโนมัติ
- ลิงก์ภายในทุกอันต้องมีอยู่จริงใน DB (`/product/…`, `/product-category/…` แบบ full path, `/blog/…`)
- `<h2 id="…">` ทุกอันที่อยู่ในสารบัญต้องมี id ตรงกัน
- คลาสที่ `.article-body` (ใน `app/globals.css`) รองรับ: `lead`, `callout` / `callout-warning` / `callout-title`,
  `toc` / `toc-title`, `table-wrap`, `formula`, `example`, `faq-item`, `cta` / `cta-title` / `cta-links` / `cta-btn` / `cta-btn-ghost`
