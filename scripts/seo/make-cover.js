#!/usr/bin/env node
/**
 * Render a 1200x630 cover / OG image for a blog post and upload it to Supabase Storage.
 *
 * The site has no photo library for editorial covers — every asset in the `media`
 * bucket is a product pack shot. So the cover is composed here: brand gradient,
 * the site's own Sukhumvit Set faces, the HTC logo and one product shot.
 *
 *   node scripts/seo/make-cover.js seo/published/<slug>.json
 *
 * Writes `blog/<slug>-cover.png` to the bucket and patches cover_image_url /
 * og_image_url back into the article's JSON so publish-post.js picks them up.
 */
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local', quiet: true });
const { chromium } = require('playwright');
const { createClient } = require('@supabase/supabase-js');

const ROOT = path.resolve(__dirname, '..', '..');
const FONTS = path.join(ROOT, 'app', 'fonts');
const LOGO =
  'https://jwyvdngiccmjhcwlmyql.supabase.co/storage/v1/object/public/media/2024/05/revise_logo_2022_27D_10.png';

/** Per-article art direction. Keyed by slug so re-running reproduces the same cover. */
const COVERS = {
  'paint-coverage-per-bucket': {
    eyebrow: 'ความรู้งานสี',
    headline: 'สี 1 ถัง<br>ทาได้กี่ตารางเมตร?',
    sub: 'พร้อมสูตรคำนวณปริมาณสีทาบ้านให้พอดี',
    stats: [
      { label: 'ถังใหญ่ 5 แกลลอน', value: '150–160 ตร.ม.' },
      { label: 'ถังเล็ก 2.5 แกลลอน', value: '75–80 ตร.ม.' },
    ],
    product:
      'https://jwyvdngiccmjhcwlmyql.supabase.co/storage/v1/object/public/media/2024/12/20231026-toa-supershield-titanium.png',
  },
};

const face = (file, weight) => `
  @font-face {
    font-family: 'Sukhumvit Set';
    src: url('file://${path.join(FONTS, file)}') format('truetype');
    font-weight: ${weight};
    font-style: normal;
  }`;

function html(c) {
  return `<!doctype html><html lang="th"><head><meta charset="utf-8"><style>
  ${face('SukhumvitSet-Text.ttf', 400)}
  ${face('SukhumvitSet-Medium.ttf', 500)}
  ${face('SukhumvitSet-SemiBold.ttf', 600)}
  ${face('SukhumvitSet-Bold.ttf', 700)}
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: 1200px; height: 630px; display: flex; overflow: hidden;
    font-family: 'Sukhumvit Set', sans-serif; color: #222;
    background: linear-gradient(135deg, #ffffff 0%, #eff6ff 55%, #dbeafe 100%);
  }
  .accent { position: absolute; inset: 0 0 auto 0; height: 10px; background: linear-gradient(90deg, #1e73be, #f7931e); }
  .left { flex: 1 1 60%; padding: 72px 0 56px 72px; display: flex; flex-direction: column; justify-content: space-between; }
  .eyebrow {
    display: inline-block; align-self: flex-start; padding: 7px 18px; border-radius: 999px;
    background: #f7931e; color: #fff; font-size: 21px; font-weight: 600; letter-spacing: .01em;
  }
  h1 { margin: 26px 0 0; font-size: 66px; line-height: 1.18; font-weight: 700; color: #14395c; }
  .sub { margin-top: 18px; font-size: 26px; font-weight: 500; color: #4b5563; }
  .stats { display: flex; gap: 16px; margin-top: 32px; }
  .stat { background: #fff; border: 1px solid #dbeafe; border-left: 5px solid #1e73be; border-radius: 12px; padding: 12px 20px; }
  .stat .l { font-size: 18px; color: #757575; }
  .stat .v { font-size: 26px; font-weight: 700; color: #1e73be; }
  .brand { display: flex; align-items: center; gap: 16px; margin-top: 40px; }
  .brand img { height: 52px; }
  .brand span { font-size: 20px; color: #757575; }
  .right { position: relative; flex: 0 0 380px; display: flex; align-items: center; justify-content: center; }
  .disc { position: absolute; width: 430px; height: 430px; border-radius: 50%; background: rgba(30,115,190,.10); }
  .right img { position: relative; width: 330px; filter: drop-shadow(0 26px 46px rgba(20,57,92,.30)); }
  </style></head><body>
  <div class="accent"></div>
  <div class="left">
    <div>
      <span class="eyebrow">${c.eyebrow}</span>
      <h1>${c.headline}</h1>
      <p class="sub">${c.sub}</p>
      <div class="stats">
        ${c.stats.map((s) => `<div class="stat"><div class="l">${s.label}</div><div class="v">${s.value}</div></div>`).join('')}
      </div>
    </div>
    <div class="brand"><img src="${LOGO}" alt=""><span>hometools-center.com</span></div>
  </div>
  <div class="right"><div class="disc"></div><img src="${c.product}" alt=""></div>
  </body></html>`;
}

(async () => {
  const metaPath = process.argv[2];
  if (!metaPath) {
    console.error('usage: node scripts/seo/make-cover.js <seo/published/<slug>.json>');
    process.exit(1);
  }
  const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
  const cfg = COVERS[meta.slug];
  if (!cfg) throw new Error(`no cover art direction for slug "${meta.slug}" — add one to COVERS`);

  // No `npx playwright install` browsers on this machine — fall back to the
  // system Google Chrome, which renders this page identically.
  const browser = await chromium
    .launch()
    .catch(() => chromium.launch({ channel: 'chrome' }));
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  await page.setContent(html(cfg), { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  const png = await page.screenshot({ type: 'png' });
  await browser.close();

  const outFile = path.join(ROOT, 'seo', 'published', `${meta.slug}-cover.png`);
  fs.writeFileSync(outFile, png);
  console.log(`rendered ${path.relative(ROOT, outFile)} (${(png.length / 1024).toFixed(0)} KB)`);

  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const key = `blog/${meta.slug}-cover.png`;
  const { error } = await sb.storage
    .from('media')
    .upload(key, png, { contentType: 'image/png', upsert: true, cacheControl: '31536000' });
  if (error) throw error;
  const url = sb.storage.from('media').getPublicUrl(key).data.publicUrl;

  meta.cover_image_url = url;
  meta.og_image_url = url;
  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2) + '\n');
  console.log(`uploaded  ${url}`);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
