#!/usr/bin/env node
/**
 * Attach a cover image to an article: resize, convert, upload to Supabase Storage, and
 * patch cover_image_url / og_image_url into the article's JSON.
 *
 *   node scripts/seo/set-cover.js <slug> <path/to/artwork.(png|jpg)>
 *
 * Covers are delivered as 1200x630 — the size that serves the in-article image, og:image
 * and every link preview. The blog cards use the same aspect ratio, so nothing is cropped
 * and artwork can run edge to edge.
 *
 * Source art tends to arrive as a multi-megabyte PNG straight out of an image generator.
 * A 2 MB cover is a real cost on a page Google measures for LCP, so this re-encodes to
 * JPEG — the format every social scraper handles without question. Uses macOS `sips`,
 * which avoids adding an image dependency for a job run a couple of dozen times.
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');
require('dotenv').config({ path: '.env.local', quiet: true });
const { createClient } = require('@supabase/supabase-js');

const ROOT = path.resolve(__dirname, '..', '..');
const WIDTH = 1200;
const QUALITY = 82;
const WARN_BYTES = 300 * 1024;

const sips = (args) => execFileSync('sips', args, { stdio: ['ignore', 'pipe', 'pipe'] }).toString();

function dimensions(file) {
  const out = sips(['-g', 'pixelWidth', '-g', 'pixelHeight', file]);
  return {
    w: +(out.match(/pixelWidth:\s*(\d+)/) || [])[1],
    h: +(out.match(/pixelHeight:\s*(\d+)/) || [])[1],
  };
}

(async () => {
  const [slug, src] = process.argv.slice(2);
  if (!slug || !src) {
    console.error('usage: node scripts/seo/set-cover.js <slug> <artwork.png>');
    process.exit(1);
  }
  const metaPath = path.join(ROOT, 'seo', 'published', `${slug}.json`);
  if (!fs.existsSync(metaPath)) throw new Error(`no article metadata at ${path.relative(ROOT, metaPath)}`);
  if (!fs.existsSync(src)) throw new Error(`no such file: ${src}`);

  const before = dimensions(src);
  const ratio = before.w / before.h;
  const target = 1200 / 630;
  console.log(`  source   ${before.w}x${before.h} (${ratio.toFixed(3)}), ${(fs.statSync(src).size / 1024 / 1024).toFixed(1)} MB`);
  if (Math.abs(ratio - target) > 0.04) {
    console.warn(
      `  warn     aspect ${ratio.toFixed(3)} is not 1.905 (1200x630) — object-cover will crop the long side`
    );
  }

  const tmp = path.join(os.tmpdir(), `${slug}-cover.jpg`);
  sips(['--resampleWidth', String(WIDTH), '--setProperty', 'format', 'jpeg',
        '--setProperty', 'formatOptions', String(QUALITY), src, '--out', tmp]);
  const after = dimensions(tmp);
  const buf = fs.readFileSync(tmp);
  console.log(`  encoded  ${after.w}x${after.h} jpeg q${QUALITY}, ${(buf.length / 1024).toFixed(0)} KB`);
  if (buf.length > WARN_BYTES) console.warn(`  warn     over ${WARN_BYTES / 1024} KB — consider lowering QUALITY`);

  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const key = `blog/${slug}-cover.jpg`;
  const { error } = await sb.storage
    .from('media')
    .upload(key, buf, { contentType: 'image/jpeg', upsert: true, cacheControl: '31536000' });
  if (error) throw error;
  const url = sb.storage.from('media').getPublicUrl(key).data.publicUrl;

  const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
  meta.cover_image_url = url;
  meta.og_image_url = url;
  if (meta._notes) delete meta._notes.cover_pending;
  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2) + '\n');

  // Keep a copy in the repo so the cover can be rebuilt without hunting for the original.
  fs.copyFileSync(tmp, path.join(ROOT, 'seo', 'published', `${slug}-cover.jpg`));
  fs.unlinkSync(tmp);

  console.log(`  uploaded ${url}`);
  console.log(`\n  next: node scripts/seo/publish-post.js seo/published/${slug}.json`);
})().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
