# SEO Measurement Plan

> Layer วัดผลเฉพาะ SEO — ต่อยอดจาก `marketing-plan.md` (GTM/GA4/GSC/Clarity wiring)
> อ้างอิง: `seo-strategy.md` §4 Pillar 6, §6 KPI

---

## 1) Baseline capture ก่อน cutover (`[data]` ⏰ ทำก่อน WP ปิด)
เก็บครั้งเดียว ดึงย้อนหลังไม่ได้:
- [ ] **GSC (WP เดิม)** — export 16 เดือน: Queries, Pages, Countries, Devices (clicks/impr/CTR/position)
- [ ] **GA4 / Analytics เดิม** — organic sessions, top landing pages, conversion เดิม (ถ้ามี)
- [ ] **Index count** — `site:hometools-center.com` + GSC indexed pages
- [ ] **Rankings snapshot** — target keyword ชุดแรก (position ปัจจุบัน)
- [ ] **Backlinks** — GSC Links + Ahrefs/Semrush export (referring domains, top linked pages)
- [ ] เก็บไว้ที่ `research/seo/baseline-<date>/`

## 2) Events (`[code]` — ใน GTM/GA4)
| Event | Trigger | หมายเหตุ |
|---|---|---|
| `generate_lead` | quote_submit + contact_submit สำเร็จ | **Primary conversion** |
| `view_item` | เข้าหน้า product | |
| `select_item` | คลิก product ใน grid หมวด | |
| `search` | ใช้ `/shop?q=` | keyword idea ฟรี |
| `view_promotion` | เห็น banner หน้า home | |
| `pdf_download` | ดาวน์โหลด catalog PDF | intent สูง (B2B) |
| `phone_click` / `line_click` | คลิกโทร/LINE | micro-conversion |

## 3) Monitoring หลัง launch
| รอบ | เช็ค |
|---|---|
| รายวัน (T+1..7) | GSC coverage, 404 spike, organic vs baseline, CWV field |
| รายสัปดาห์ | GSC Queries (position/CTR หน้า priority), index count, new 404 → redirect |
| รายเดือน | health check: coverage errors, CWV report, organic trend YoY, rank tracking, top-10-not-1 pages, backlink ใหม่/หาย |

## 4) KPI targets
- **Parity gate (เฟส 1):** ≥95% URL ที่ index = 200/301→200 · coverage นิ่งใน 4 สัปดาห์ · organic ไม่ตกค้าง >20%
- **Growth (6 เดือน):** organic sessions **+X%** · non-brand category kw ติด top-10 · quote-lead จาก organic **+X%**
  - *เคาะ % หลังได้ baseline จริงตอน launch*

## 5) Tooling
- ฟรี: GSC + GA4 + PageSpeed Insights + Vercel Speed Insights + Microsoft Clarity
- Paid (ถ้ามี): Ahrefs/Semrush (rank tracking + backlink + keyword), Screaming Frog (crawl/parity)
- Rich results: `validator.schema.org` + Google Rich Results Test
