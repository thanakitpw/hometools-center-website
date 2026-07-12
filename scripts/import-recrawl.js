// Import NEW products from research/recrawl-2026-06/products-detailed.json into Supabase.
// - Imports ONLY products whose slug is not already in DB (won't touch existing 200).
// - Migrates each new product's images / og / short-desc images / catalog PDF to Storage.
// - Maps primary_category_id from the crawled breadcrumb.
// Idempotent (upsert by slug). Run: node scripts/import-recrawl.js
require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const BUCKET = 'media';
const DIR = path.join(__dirname, '..', 'research', 'recrawl-2026-06');
const PUB = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}/`;
const WP = 'https://hometools-center.com/wp-content/uploads/';

const detailed = require(path.join(DIR, 'products-detailed.json'));
const existingMap = (() => { try { return require(path.join(__dirname, '..', 'research', 'image-url-map.json')); } catch { return {}; } })();
const existingKeys = Object.keys(existingMap);

const newMap = {}; // wp url -> supabase public url (migrated this run)

function mime(ext) {
  return ({ jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml', pdf: 'application/pdf' })[ext.toLowerCase()] || 'application/octet-stream';
}
function resolveExisting(wpUrl) {
  const dec = decodeURIComponent(wpUrl);
  const rel = dec.split('/uploads/')[1];
  if (!rel) return null;
  const base = rel.replace(/-\d+x\d+(\.\w+)$/, '$1');
  for (const cand of [rel, base]) {
    if (existingMap[WP + cand]) return existingMap[WP + cand];
    const fn = cand.split('/').pop();
    const hit = existingKeys.find(k => decodeURIComponent(k).endsWith('/' + fn));
    if (hit) return existingMap[hit];
  }
  return null;
}

async function migrate(wpUrl) {
  if (!wpUrl || !/wp-content\/uploads/.test(wpUrl)) return wpUrl;
  if (newMap[wpUrl]) return newMap[wpUrl];
  const ex = resolveExisting(wpUrl);
  if (ex) { newMap[wpUrl] = (typeof ex === 'string' ? ex : ex.url || ex.public_url); return newMap[wpUrl]; }
  const rel = decodeURIComponent(wpUrl).split('/uploads/')[1];
  const ext = (rel.split('.').pop() || 'jpg').toLowerCase().split('?')[0];
  const ascii = /^[\w.\-/]+$/.test(rel);
  const key = ascii ? 'recrawl/' + rel.replace(/[^\w.\-/]+/g, '-') : 'recrawl/u-' + crypto.createHash('md5').update(rel).digest('hex').slice(0, 12) + '.' + ext;
  const dir = key.split('/').slice(0, -1).join('/'), bn = key.split('/').pop();
  const head = await sb.storage.from(BUCKET).list(dir, { search: bn, limit: 1 });
  if (head.data?.some(f => f.name === bn)) { newMap[wpUrl] = PUB + key; return newMap[wpUrl]; }
  const res = await fetch(wpUrl, { headers: { 'User-Agent': 'HT-Migration/1.0' } });
  if (!res.ok) { console.log('  fetch fail', res.status, rel.slice(0, 40)); return wpUrl; }
  const buf = Buffer.from(await res.arrayBuffer());
  const up = await sb.storage.from(BUCKET).upload(key, buf, { contentType: mime(ext), upsert: true });
  if (up.error) { console.log('  upload fail', up.error.message); return wpUrl; }
  newMap[wpUrl] = PUB + key;
  return newMap[wpUrl];
}

async function rewriteHtml(html) {
  if (!html) return html;
  const urls = [...html.matchAll(/https:\/\/hometools-center\.com\/wp-content\/uploads\/[^"')\s]+/g)].map(m => m[0]);
  let out = html;
  for (const u of [...new Set(urls)]) { const nu = await migrate(u); out = out.split(u).join(nu); }
  return out;
}

(async () => {
  // categories map (normalize "Category: " prefix + spaces)
  const { data: catRows } = await sb.from('categories').select('id, slug, name_th');
  const norm = s => (s || '').replace(/^หมวดหมู่\s*:\s*/i, '').replace(/^Category\s*:\s*/i, '').replace(/\s+/g, '').trim().toLowerCase();
  const catByName = {};
  for (const c of catRows) { catByName[norm(c.name_th)] = c.id; catByName[norm(c.slug)] = c.id; }

  const { data: dbp } = await sb.from('products').select('slug');
  const dbSlugs = new Set(dbp.map(p => p.slug));
  const news = detailed.filter(d => !dbSlugs.has(d.slug));
  console.log(`new products to import: ${news.length}`);

  const rows = [];
  let i = 0;
  for (const p of news) {
    i++;
    // migrate images
    const images = [];
    for (const im of (p.images || [])) { images.push({ src: await migrate(im.src), alt: im.alt || p.name_th }); }
    const og = p.og_image_url ? await migrate(p.og_image_url) : null;
    const shortDesc = await rewriteHtml(p.short_description);
    const pdf = p.catalog_pdf_url ? await migrate(p.catalog_pdf_url) : null;
    // category from breadcrumb, deepest first
    let catId = null;
    const bc = (p.breadcrumb || []).filter(b => !['Home', 'หน้าแรก'].includes(b));
    for (const name of [...bc].reverse()) { if (catByName[norm(name)]) { catId = catByName[norm(name)]; break; } }
    rows.push({
      slug: p.slug,
      name_th: p.name_th,
      sku: p.sku || null,
      short_description: shortDesc || '',
      description_md: p.description_text || '',
      images,
      catalog_pdf_url: pdf,
      og_image_url: og,
      seo_title: p.title || null,
      seo_description: p.seo_description || null,
      primary_category_id: catId,
      brand_id: null,
      status: 'published',
    });
    if (i % 20 === 0) console.log(`  prepared ${i}/${news.length} (images migrated: ${Object.keys(newMap).length})`);
  }

  // upsert in chunks
  let inserted = 0;
  for (let c = 0; c < rows.length; c += 50) {
    const chunk = rows.slice(c, c + 50);
    const { error } = await sb.from('products').upsert(chunk, { onConflict: 'slug' });
    if (error) { console.log('UPSERT ERROR', error.message); } else { inserted += chunk.length; }
  }
  fs.writeFileSync(path.join(DIR, 'recrawl-image-map.json'), JSON.stringify(newMap, null, 1));
  const noCat = rows.filter(r => !r.primary_category_id).length;
  console.log(`\nDONE. upserted ${inserted}/${rows.length} products. images migrated/resolved: ${Object.keys(newMap).length}. without category: ${noCat}`);
})();
