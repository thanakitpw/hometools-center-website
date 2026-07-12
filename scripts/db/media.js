// scripts/db/media.js
// Stage 2: upload only referenced media (featured images, post covers, category
// images, embedded content images, catalog PDFs) to Supabase Storage.
// Run: node scripts/db/media.js
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { createClient } = require('@supabase/supabase-js');
const { storageKeyForFile, mimeForExt } = require('./lib/media-key');

require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.local') });

const ROOT = path.join(__dirname, '..', '..');
const DIR = path.join(ROOT, 'research', 'db-2026-07');
const ZIP = path.join(ROOT, 'backup-oldwebsite', 'wpuploads.zip');
const BUCKET = 'media';
const PUB = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}/`;
const WP_UPLOADS = 'https://hometools-center.com/wp-content/uploads/';

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } });

const attachments = require(path.join(DIR, 'attachments.json'));
const products = require(path.join(DIR, 'products.json'));
const posts = require(path.join(DIR, 'posts.json'));
const categories = require(path.join(DIR, 'categories.json'));
const recrawlProducts = require(path.join(ROOT, 'research', 'recrawl-2026-06', 'products-detailed.json'));

// collect referenced attachment ids
const attIds = new Set();
const addId = (id) => { if (id) attIds.add(String(id)); };
for (const p of products) { addId(p.thumbId); addId(p.ogImageId); p.galleryIds.forEach(addId); }
for (const b of posts) { addId(b.thumbId); addId(b.ogImageId); }
for (const c of categories) { addId(c.thumbId); }

// collect uploads URLs embedded in HTML content (for content rewrite + upload)
// — description_html/content_html AND short_description/excerpt, which also
// carry embedded catalog-PDF/icon links that would otherwise be dropped.
const contentUrls = new Set();
const urlRe = /https?:\/\/hometools-center\.com\/wp-content\/uploads\/([^\s"'<>)]+)/g;
for (const p of products) {
  let m;
  while ((m = urlRe.exec(p.description_html || ''))) contentUrls.add(m[1]);
  while ((m = urlRe.exec(p.short_description || ''))) contentUrls.add(m[1]);
}
for (const b of posts) {
  let m;
  while ((m = urlRe.exec(b.content_html || ''))) contentUrls.add(m[1]);
  while ((m = urlRe.exec(b.excerpt || ''))) contentUrls.add(m[1]);
}

// recrawl catalog PDFs: Task 8 does urlMap[rc.catalog_pdf_url] || rc.catalog_pdf_url,
// so url-map.json must have a key equal to the EXACT catalog_pdf_url string
// (encoded or not) for every recrawl record whose slug is also in products.json.
const productSlugs = new Set(products.map((p) => p.slug));
const catalogPdfRecords = recrawlProducts.filter(
  (rc) => rc.catalog_pdf_url && productSlugs.has(rc.slug)
);
function relFromWpUploadsUrl(url) {
  if (!url || !url.startsWith(WP_UPLOADS)) return null;
  // the zip stores raw UTF-8 filenames, so the DECODED path is the member to extract
  return decodeURIComponent(url.slice(WP_UPLOADS.length));
}

// precompute the concrete relative file paths we actually need, so we can
// extract only those from the zip (the full archive is ~640MB uncompressed
// and doesn't fit in the available disk space; the referenced subset is
// only a few hundred files / tens of MB).
const neededFiles = new Set();
for (const id of attIds) {
  const att = attachments[id];
  if (!att || !att.file) {
    console.warn('no attachments.json record (or missing .file) for referenced id:', id);
    continue;
  }
  neededFiles.add(att.file);
}
for (const rel of contentUrls) neededFiles.add(rel);
for (const rc of catalogPdfRecords) {
  const rel = relFromWpUploadsUrl(rc.catalog_pdf_url);
  if (rel) neededFiles.add(rel);
  else console.warn('catalog_pdf_url does not match expected uploads prefix:', rc.slug, rc.catalog_pdf_url);
}

if (neededFiles.size === 0) {
  throw new Error('no referenced files collected — refusing to fall back to full 609MB unzip');
}

(async () => {
  // selectively unzip only the referenced files to a temp dir
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'htc-uploads-'));
  const members = Array.from(neededFiles).map((f) => 'uploads/' + f);
  console.log(`unzipping ${members.length} referenced files…`);
  try {
    execFileSync('unzip', ['-q', '-o', ZIP, ...members, '-d', tmp]);
  } catch (err) {
    // exit code 11 = "no matching files" for one or more members, but
    // others may still have extracted successfully — warn and continue.
    if (err.status === 11) {
      console.warn('some referenced files were not found in the zip (see "filename not matched" warnings above); continuing with what extracted');
    } else {
      throw err;
    }
  }
  const base = path.join(tmp, 'uploads');

  const urlMap = {};
  async function uploadRel(relFile) {
    if (!relFile) return null;
    const abs = path.join(base, relFile);
    if (!fs.existsSync(abs)) { console.warn('missing file:', relFile); return null; }
    const key = storageKeyForFile(relFile);
    const ext = relFile.split('.').pop();
    const body = fs.readFileSync(abs);
    const { error } = await sb.storage.from(BUCKET).upload(key, body,
      { contentType: mimeForExt(ext), upsert: true });
    if (error && !String(error.message).includes('already exists')) {
      console.warn('upload error', key, error.message); return null;
    }
    const publicUrl = PUB + key;
    urlMap[WP_UPLOADS + relFile] = publicUrl;   // full old URL
    urlMap[relFile] = publicUrl;                // bare rel path
    return publicUrl;
  }

  // 1) attachment-referenced files
  for (const id of attIds) {
    const att = attachments[id];
    if (att && att.file) { const u = await uploadRel(att.file); if (u) urlMap[`att:${id}`] = u; }
  }
  // 2) content-embedded files (description/content HTML + short_description/excerpt)
  for (const rel of contentUrls) await uploadRel(rel);

  // 3) recrawl catalog PDFs — map the EXACT original catalog_pdf_url string
  // (encoded or not) in addition to the standard full-URL/bare-relpath keys,
  // so Task 8's urlMap[rc.catalog_pdf_url] lookup always hits.
  let catalogPdfMapped = 0;
  for (const rc of catalogPdfRecords) {
    const rel = relFromWpUploadsUrl(rc.catalog_pdf_url);
    if (!rel) continue;
    const u = await uploadRel(rel);
    if (u) { urlMap[rc.catalog_pdf_url] = u; catalogPdfMapped++; }
    else console.warn('failed to upload/map catalog PDF for slug:', rc.slug, rc.catalog_pdf_url);
  }

  fs.writeFileSync(path.join(DIR, 'url-map.json'), JSON.stringify(urlMap, null, 2));
  console.log(`uploaded/mapped ${Object.keys(urlMap).length} url keys (${attIds.size} attachments, ${contentUrls.size} embedded, ${catalogPdfMapped}/${catalogPdfRecords.length} recrawl catalog PDFs)`);
  fs.rmSync(tmp, { recursive: true, force: true });
})();
