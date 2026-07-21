// scripts/db/fix-pdf-thumbnails.js
//
// Some WooCommerce products had a *PDF* set as their featured image (WordPress
// renders a first-page preview JPG for PDFs, so it looked fine on the old site —
// but our media migration only uploaded the referenced `.pdf`, so `<img src>`
// points at a PDF and renders broken).
//
// This repairs those products by uploading the WP-generated preview JPG
// (`<base>-pdf.jpg`, extracted from the uploads archive) to Storage and
// re-pointing `products.images[].src` and `products.og_image_url` at it.
//
// Idempotent: re-running just re-uploads (upsert) and re-writes the same URLs.
//
// Run: node scripts/db/fix-pdf-thumbnails.js
require('dotenv').config({ path: require('node:path').join(__dirname, '..', '..', '.env.local') });
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const { execFileSync } = require('node:child_process');
const { createClient } = require('@supabase/supabase-js');

const ROOT = path.join(__dirname, '..', '..');
const ZIP = path.join(ROOT, 'backup-oldwebsite', 'wpuploads.zip');
const BUCKET = 'media';
const PUBLIC_PREFIX = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}/`;

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// storagePdfPath (relative to bucket root) → its WP-generated preview JPG.
// Extend this list if more PDF-as-thumbnail products surface.
const FIXES = [
  { pdf: '2023/02/Cover_PVC.pdf', preview: '2023/02/Cover_PVC-pdf.jpg' },
];

function extractFromZip(memberRel) {
  // uploads archive stores paths under `uploads/…`; our Storage keys drop that prefix.
  const member = `uploads/${memberRel}`;
  const out = path.join(os.tmpdir(), path.basename(memberRel));
  execFileSync('unzip', ['-o', '-j', ZIP, member, '-d', os.tmpdir()], { stdio: 'ignore' });
  if (!fs.existsSync(out)) throw new Error(`not found in zip: ${member}`);
  return out;
}

async function main() {
  for (const { pdf, preview } of FIXES) {
    const pdfUrl = PUBLIC_PREFIX + pdf;
    const previewUrl = PUBLIC_PREFIX + preview;

    // 1. upload the preview JPG
    const local = extractFromZip(preview);
    const bytes = fs.readFileSync(local);
    const { error: upErr } = await sb.storage.from(BUCKET).upload(preview, bytes, {
      contentType: 'image/jpeg',
      upsert: true,
    });
    if (upErr) throw upErr;
    console.log(`uploaded  ${preview} (${bytes.length} bytes)`);

    // 2. re-point every product referencing the PDF
    const { data: rows, error: selErr } = await sb
      .from('products')
      .select('id, slug, name_th, images, og_image_url');
    if (selErr) throw selErr;

    for (const r of rows) {
      const imgs = Array.isArray(r.images) ? r.images : [];
      const hitImg = imgs.some(im => im && im.src === pdfUrl);
      const hitOg = r.og_image_url === pdfUrl;
      if (!hitImg && !hitOg) continue;

      const patch = {};
      if (hitImg) patch.images = imgs.map(im => (im && im.src === pdfUrl ? { ...im, src: previewUrl } : im));
      if (hitOg) patch.og_image_url = previewUrl;

      const { error: updErr } = await sb.from('products').update(patch).eq('id', r.id);
      if (updErr) throw updErr;
      console.log(`  fixed   ${r.name_th} (${r.slug.slice(0, 30)})`);
    }
  }
  console.log('done.');
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
