#!/usr/bin/env node
/**
 * Apply seo/category-meta.json to the categories table (seo_title + seo_description).
 *
 *   node scripts/seo/apply-category-meta.js --dry
 *   node scripts/seo/apply-category-meta.js
 *
 * The WordPress import carried Rank Math titles with "| Home Tool Center" already in them,
 * and the root layout's title template appends it again — so every category rendered the
 * brand twice. 41 of 42 categories also had no meta description at all.
 *
 * Before writing, the current values are saved to seo/category-meta.previous.json (only if
 * that file does not exist yet, so re-runs never overwrite the true originals).
 */
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const ROOT = path.resolve(__dirname, '..', '..');
process.loadEnvFile(path.join(ROOT, '.env.local'));
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const dry = process.argv.includes('--dry');

(async () => {
  const meta = JSON.parse(fs.readFileSync(path.join(ROOT, 'seo/category-meta.json'), 'utf8'));
  delete meta._note;
  const { data: cats, error } = await sb.from('categories').select('id,slug,seo_title,seo_description');
  if (error) throw error;

  const missing = cats.filter((c) => !meta[c.slug]).map((c) => c.slug);
  const unknown = Object.keys(meta).filter((s) => !cats.some((c) => c.slug === s));
  if (missing.length || unknown.length) {
    console.error('missing:', missing, 'unknown:', unknown);
    process.exit(1);
  }
  for (const [slug, m] of Object.entries(meta)) {
    if (/home\s*tool/i.test(m.seo_title)) throw new Error(`${slug}: seo_title contains the brand`);
    if (m.seo_description.length > 165) throw new Error(`${slug}: description ${m.seo_description.length} chars`);
  }

  const prevPath = path.join(ROOT, 'seo/category-meta.previous.json');
  if (!fs.existsSync(prevPath) && !dry) {
    const prev = Object.fromEntries(cats.map((c) => [c.slug, { seo_title: c.seo_title, seo_description: c.seo_description }]));
    fs.writeFileSync(prevPath, JSON.stringify(prev, null, 2) + '\n');
  }

  let n = 0;
  for (const c of cats) {
    const m = meta[c.slug];
    if (c.seo_title === m.seo_title && c.seo_description === m.seo_description) continue;
    console.log(`${dry ? 'would update' : 'update'}  ${c.slug}: ${m.seo_title} (${m.seo_description.length})`);
    if (!dry) {
      const { error: e } = await sb.from('categories')
        .update({ seo_title: m.seo_title, seo_description: m.seo_description, updated_at: new Date().toISOString() })
        .eq('id', c.id);
      if (e) throw e;
    }
    n++;
  }
  console.log(`\n${n} ${dry ? 'to update' : 'updated'}`);
})();
