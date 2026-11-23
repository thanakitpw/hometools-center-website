#!/usr/bin/env node
/**
 * Fill empty products.seo_title / seo_description from seo/product-meta.json.
 *
 *   node scripts/seo/apply-product-meta.js --dry
 *   node scripts/seo/apply-product-meta.js
 *
 * The catalog-style system-work products were imported with a bare brand as their name
 * ("ANA", "SR", "ELIXIR") and no Rank Math title or description, so Google saw
 * "ANA | Home Tool Center" with no snippet. Only fields that are currently empty are
 * written — a title someone set by hand in /admin is never overwritten.
 */
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const ROOT = path.resolve(__dirname, '..', '..');
process.loadEnvFile(path.join(ROOT, '.env.local'));
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const dry = process.argv.includes('--dry');

(async () => {
  const meta = JSON.parse(fs.readFileSync(path.join(ROOT, 'seo/product-meta.json'), 'utf8'));
  delete meta._note;
  const { data, error } = await sb.from('products')
    .select('id,slug,seo_title,seo_description,catalog_pdf_url')
    .in('slug', Object.keys(meta));
  if (error) throw error;
  const unknown = Object.keys(meta).filter((s) => !data.some((p) => p.slug === s));
  if (unknown.length) throw new Error(`unknown slugs: ${unknown.join(', ')}`);

  let n = 0;
  for (const p of data) {
    const [title, what] = meta[p.slug];
    if (/home\s*tool/i.test(title)) throw new Error(`${p.slug}: title contains the brand`);
    const desc = `${what} ${p.catalog_pdf_url ? 'ดูสเปกและแคตตาล็อก PDF' : 'ดูรายละเอียดสินค้า'} แล้วขอใบเสนอราคาได้ที่ Home Tool Center จัดส่งทั่วไทย`;
    if (desc.length > 165) throw new Error(`${p.slug}: description ${desc.length} chars`);
    const patch = {};
    if (!(p.seo_title || '').trim()) patch.seo_title = title;
    if (!(p.seo_description || '').trim()) patch.seo_description = desc;
    if (!Object.keys(patch).length) continue;
    console.log(`${dry ? 'would update' : 'update'}  ${p.slug}: ${patch.seo_title ?? '(title kept)'} | ${desc.length}`);
    if (!dry) {
      const { error: e } = await sb.from('products').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', p.id);
      if (e) throw e;
    }
    n++;
  }
  console.log(`\n${n} ${dry ? 'to update' : 'updated'}`);
})();
