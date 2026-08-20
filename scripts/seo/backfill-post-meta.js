#!/usr/bin/env node
/**
 * Fill in `excerpt` on posts that arrived from the WordPress import without one, and
 * decode stray HTML entities in the fields the page renders as *text*.
 *
 *   node scripts/seo/backfill-post-meta.js --dry
 *   node scripts/seo/backfill-post-meta.js
 *   node scripts/seo/backfill-post-meta.js --force     # overwrite excerpts that already exist
 *
 * Copy lives in seo/post-meta-backfill.json so it is reviewable in a diff rather than
 * buried in a one-shot script.
 *
 * Why excerpt matters beyond the card: generateMetadata falls back to it for the meta
 * description, and articleSchema() uses it for the Article's `description`. A post without
 * one lets Google write its own snippet, and since 2026-08-20 it also renders as a
 * title-only card on /blog (the date that used to fill that line is gone).
 *
 * ⚠️ Entity decoding is deliberately limited to title / excerpt / seo_title /
 * seo_description. `content_md` holds raw HTML rendered through dangerouslySetInnerHTML,
 * where `&amp;` and `&#8211;` are *correct* — decoding them there would corrupt the markup.
 */
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local', quiet: true });
const { createClient } = require('@supabase/supabase-js');

const ROOT = path.resolve(__dirname, '..', '..');
const TEXT_FIELDS = ['title', 'excerpt', 'seo_title', 'seo_description'];
const MIN = 80;
const MAX = 165;

const NAMED = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

function decodeEntities(s) {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d))
    .replace(/&(amp|lt|gt|quot|apos|nbsp);/gi, (_, n) => NAMED[n.toLowerCase()]);
}

(async () => {
  const argv = process.argv.slice(2);
  const dry = argv.includes('--dry');
  const force = argv.includes('--force');

  const { excerpts } = JSON.parse(
    fs.readFileSync(path.join(ROOT, 'seo', 'post-meta-backfill.json'), 'utf8')
  );

  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { data: posts, error } = await sb.from('posts').select(`id, slug, ${TEXT_FIELDS.join(', ')}`);
  if (error) throw error;

  const bySlug = new Map(posts.map(p => [p.slug, p]));
  const unknown = Object.keys(excerpts).filter(s => !bySlug.has(s));
  if (unknown.length) throw new Error(`no such post: ${unknown.join(', ')}`);

  let wrote = 0;
  let skipped = 0;

  for (const post of posts) {
    const patch = {};

    const copy = excerpts[post.slug];
    if (copy) {
      if (copy.length < MIN || copy.length > MAX) {
        throw new Error(`${post.slug}: excerpt is ${copy.length} chars, want ${MIN}-${MAX}`);
      }
      if (!post.excerpt || force) patch.excerpt = copy;
      else skipped++;
    }

    for (const f of TEXT_FIELDS) {
      const before = f === 'excerpt' && patch.excerpt ? patch.excerpt : post[f];
      if (typeof before !== 'string') continue;
      const after = decodeEntities(before);
      if (after !== before) {
        patch[f] = after;
        console.log(`  entity   ${post.slug}.${f}: ${JSON.stringify(before)} -> ${JSON.stringify(after)}`);
      }
    }

    if (!Object.keys(patch).length) continue;
    const what = Object.keys(patch).join(', ');
    if (dry) {
      console.log(`  would   ${post.slug} (${what})`);
    } else {
      const { error: e } = await sb.from('posts').update(patch).eq('id', post.id);
      if (e) throw e;
      console.log(`  updated ${post.slug} (${what})`);
    }
    wrote++;
  }

  console.log(`\n${dry ? 'dry run — ' : ''}${wrote} post(s) ${dry ? 'would change' : 'updated'}, ${skipped} already had an excerpt`);
})().catch(e => {
  console.error(e.message || e);
  process.exit(1);
});
