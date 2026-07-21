#!/usr/bin/env node
/**
 * Backfill `products.catalog_pdf_url` from the old site's dFlip records.
 *
 * 41 products embed their catalog as a `[dflip id="123"]` shortcode inside
 * `description_md`. WordPress expanded that into a flipbook; the new site renders the
 * catalog from `catalog_pdf_url` instead and strips the shortcode
 * (see lib/product-description.ts). For 34 products catalog_pdf_url was already set by
 * the 2026-07 migration, but 7 were left null — for those the shortcode was the *only*
 * pointer to the PDF, so dropping it would have lost the catalog entirely.
 *
 * dFlip stores each book as a `dflip` post whose `_dflip_data` postmeta is a
 * PHP-serialized array containing `pdf_source` (the original wp-content URL). This
 * script reads those out of the SQL dump, maps them through the media migration's
 * url-map to their Supabase Storage URLs, and fills the gap. It writes the resolved
 * mapping to research/db-2026-07/dflip-map.json for the record.
 *
 * Idempotent: only ever fills a null catalog_pdf_url, never overwrites one.
 *
 *   node scripts/db/fix-product-catalog-pdfs.js          # dry run
 *   node scripts/db/fix-product-catalog-pdfs.js --apply  # write
 */
require('dotenv').config({ path: '.env.local' });
const fs = require('node:fs');
const path = require('node:path');
const { createClient } = require('@supabase/supabase-js');
const { startTempMysql, importSqlFile, connect } = require('./lib/mysql-temp');

const APPLY = process.argv.includes('--apply');
const P = 'jQH0o_';
const DB = 'htc_dflip';
const ROOT = path.join(__dirname, '..', '..');
const DUMP = path.join(ROOT, 'backup-oldwebsite', 'adminhometools_wp_orpro.sql');
const URL_MAP = path.join(ROOT, 'research', 'db-2026-07', 'url-map.json');
const OUT = path.join(ROOT, 'research', 'db-2026-07', 'dflip-map.json');

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

/**
 * Pull one value out of a PHP-serialized array without a full unserializer: find the
 * `s:N:"key";` marker, then read exactly the byte length the next `s:LEN:"…"` declares.
 * Reading the declared length (rather than scanning to the next quote) is what keeps
 * this correct for the Thai filenames here, where one char is 3 bytes.
 */
function phpString(serialized, key) {
  const marker = `s:${Buffer.byteLength(key)}:"${key}";`;
  const at = serialized.indexOf(marker);
  if (at === -1) return null;
  const rest = serialized.slice(at + marker.length);
  const m = /^s:(\d+):"/.exec(rest);
  if (!m) return null;
  const start = m[0].length;
  const buf = Buffer.from(rest.slice(start), 'utf8');
  return buf.subarray(0, Number(m[1])).toString('utf8');
}

(async () => {
  const urlMap = JSON.parse(fs.readFileSync(URL_MAP, 'utf8'));
  const lookup = (u) => urlMap[u] || urlMap[decodeURIComponent(u)] || urlMap[encodeURI(u)] || null;

  const { data: products, error } = await sb
    .from('products')
    .select('id, slug, name_th, description_md, catalog_pdf_url')
    .eq('status', 'published');
  if (error) throw new Error(error.message);

  const needing = products
    .map((p) => {
      const ids = [...(p.description_md || '').matchAll(/\[dflip\b[^\]]*\bid=["']?(\d+)/gi)].map((m) =>
        Number(m[1])
      );
      return { ...p, dflipIds: ids };
    })
    .filter((p) => p.dflipIds.length > 0);

  const missing = needing.filter((p) => !p.catalog_pdf_url);
  console.log(`${needing.length} products embed a [dflip] shortcode`);
  console.log(`  already have catalog_pdf_url: ${needing.length - missing.length}`);
  console.log(`  missing it                  : ${missing.length}`);
  if (!missing.length) {
    console.log('\nnothing to backfill');
    return;
  }

  const wanted = [...new Set(missing.flatMap((p) => p.dflipIds))];
  const srv = await startTempMysql();
  let dflipRows;
  try {
    importSqlFile(srv, DB, DUMP);
    const db = await connect(srv, DB);
    const [rows] = await db.query(
      `SELECT post_id, meta_value FROM ${P}postmeta
        WHERE meta_key = '_dflip_data' AND post_id IN (${wanted.join(',')})`
    );
    dflipRows = rows;
    await db.end();
  } finally {
    srv.stop();
  }

  const pdfById = new Map();
  for (const r of dflipRows) {
    const src = phpString(r.meta_value, 'pdf_source');
    if (src) pdfById.set(r.post_id, src);
  }

  const resolved = [];
  const unresolved = [];
  for (const p of missing) {
    const wpUrl = p.dflipIds.map((id) => pdfById.get(id)).find(Boolean);
    const storageUrl = wpUrl ? lookup(wpUrl) : null;
    if (storageUrl) resolved.push({ ...p, wpUrl, storageUrl });
    else unresolved.push({ slug: p.slug, dflipIds: p.dflipIds, wpUrl: wpUrl || null });
  }

  console.log(`\nresolved to a Storage PDF: ${resolved.length}`);
  resolved.forEach((r) => console.log(`  ${r.slug}\n      ${r.storageUrl.split('/').pop()}`));
  if (unresolved.length) {
    console.log(`\nUNRESOLVED (left as-is): ${unresolved.length}`);
    unresolved.forEach((u) => console.log(`  ${u.slug}  dflip=${u.dflipIds}  wp=${u.wpUrl}`));
  }

  fs.writeFileSync(
    OUT,
    JSON.stringify(
      { generatedFrom: path.basename(DUMP), resolved: resolved.map(({ slug, wpUrl, storageUrl }) => ({ slug, wpUrl, storageUrl })), unresolved },
      null,
      2
    )
  );
  console.log(`\nwrote ${path.relative(ROOT, OUT)}`);

  if (APPLY) {
    for (const r of resolved) {
      const { error: upErr } = await sb
        .from('products')
        .update({ catalog_pdf_url: r.storageUrl })
        .eq('id', r.id)
        .is('catalog_pdf_url', null); // never clobber an existing value
      if (upErr) throw new Error(`${r.slug}: ${upErr.message}`);
    }
    console.log(`\nupdated ${resolved.length} product(s)`);
  } else {
    console.log('\ndry run — re-run with --apply to write');
  }
})().catch((e) => {
  console.error('\nFAILED:', e.message);
  process.exit(1);
});
