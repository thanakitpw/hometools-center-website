#!/usr/bin/env node
/**
 * Demote <h1> inside posts.content_md to <h2>.
 *
 *   node scripts/seo/demote-content-h1.js --dry
 *   node scripts/seo/demote-content-h1.js
 *
 * The page template already renders post.title as the page's only H1. Nine posts migrated
 * from WordPress carried a second <h1> in their body (an Elementor heading), so those pages
 * had two. The originals are written to seo/content-h1-backup.json before any change.
 */
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const ROOT = path.resolve(__dirname, '..', '..');
process.loadEnvFile(path.join(ROOT, '.env.local'));
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const dry = process.argv.includes('--dry');

(async () => {
  const { data, error } = await sb.from('posts').select('id,slug,content_md');
  if (error) throw error;
  const hit = data.filter((p) => /<h1[\s>]/i.test(p.content_md || ''));
  console.log(`${hit.length} posts with an <h1> in the body`);
  if (!dry && hit.length) {
    const backup = path.join(ROOT, 'seo/content-h1-backup.json');
    if (!fs.existsSync(backup)) fs.writeFileSync(backup, JSON.stringify(Object.fromEntries(hit.map((p) => [p.slug, p.content_md])), null, 1) + '\n');
  }
  for (const p of hit) {
    const next = p.content_md.replace(/<h1(\s[^>]*)?>/gi, (_, a) => `<h2${a || ''}>`).replace(/<\/h1>/gi, '</h2>');
    console.log(`  ${dry ? 'would fix' : 'fix'} ${p.slug} (${(p.content_md.match(/<h1[\s>]/gi) || []).length})`);
    if (!dry) {
      const { error: e } = await sb.from('posts').update({ content_md: next }).eq('id', p.id);
      if (e) throw e;
    }
  }
})();
