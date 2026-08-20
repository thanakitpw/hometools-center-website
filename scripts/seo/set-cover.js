#!/usr/bin/env node
/**
 * Attach cover images to articles: resize, convert, upload to Supabase Storage, and
 * patch cover_image_url / og_image_url into each article's JSON.
 *
 *   node scripts/seo/set-cover.js <slug> <path/to/artwork.(png|jpg)> [<slug> <art> ...]
 *   node scripts/seo/set-cover.js --dry <slug> <artwork.png>     # encode + report, no upload
 *
 * Covers are delivered as 1200x630 — the size that serves the in-article image, og:image
 * and every link preview. The blog cards use the same aspect ratio, so nothing is cropped
 * and artwork can run edge to edge.
 *
 * Source art tends to arrive as a multi-megabyte PNG straight out of an image generator.
 * A 1.5 MB cover is a real cost on a page Google measures for LCP, so this re-encodes to
 * WebP — ~10x smaller at the same visual quality, and every browser and social scraper
 * that matters (Facebook, LINE, X, Google) has supported it for years. Uses `sharp`,
 * which Next.js already pulls in, so no new dependency and better resampling than sips.
 *
 * The source filename is recorded in _notes.cover_source so a cover can be rebuilt
 * without guessing which piece of artwork belonged to which article.
 */
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local', quiet: true });
const sharp = require('sharp');
const { createClient } = require('@supabase/supabase-js');

const ROOT = path.resolve(__dirname, '..', '..');
const WIDTH = 1200;
const QUALITY = 80;
const WARN_BYTES = 300 * 1024;
const TARGET_RATIO = 1200 / 630;

async function encode(src) {
  const meta = await sharp(src).metadata();
  const buf = await sharp(src)
    .resize({ width: WIDTH, withoutEnlargement: true })
    .webp({ quality: QUALITY, effort: 6 })
    .toBuffer();
  return { meta, buf };
}

(async () => {
  const argv = process.argv.slice(2);
  const dry = argv.includes('--dry');
  const pairs = argv.filter((a) => a !== '--dry');
  if (pairs.length === 0 || pairs.length % 2 !== 0) {
    console.error('usage: node scripts/seo/set-cover.js [--dry] <slug> <artwork.png> [<slug> <artwork> ...]');
    process.exit(1);
  }

  const jobs = [];
  for (let i = 0; i < pairs.length; i += 2) {
    const [slug, src] = [pairs[i], pairs[i + 1]];
    const metaPath = path.join(ROOT, 'seo', 'published', `${slug}.json`);
    if (!fs.existsSync(metaPath)) throw new Error(`no article metadata at ${path.relative(ROOT, metaPath)}`);
    if (!fs.existsSync(src)) throw new Error(`no such file: ${src}`);
    jobs.push({ slug, src, metaPath });
  }

  const sb = dry
    ? null
    : createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  let totalIn = 0;
  let totalOut = 0;
  for (const { slug, src, metaPath } of jobs) {
    const srcBytes = fs.statSync(src).size;
    const { meta, buf } = await encode(src);
    totalIn += srcBytes;
    totalOut += buf.length;

    const ratio = meta.width / meta.height;
    console.log(
      `${slug}\n  source   ${path.basename(src)} ${meta.width}x${meta.height} ` +
        `(${ratio.toFixed(3)}), ${(srcBytes / 1024 / 1024).toFixed(2)} MB`
    );
    if (Math.abs(ratio - TARGET_RATIO) > 0.04) {
      console.warn(`  warn     aspect ${ratio.toFixed(3)} is not 1.905 (1200x630) — object-cover will crop the long side`);
    }
    const out = await sharp(buf).metadata();
    console.log(
      `  encoded  ${out.width}x${out.height} webp q${QUALITY}, ${(buf.length / 1024).toFixed(0)} KB ` +
        `(-${(100 - (buf.length / srcBytes) * 100).toFixed(0)}%)`
    );
    if (buf.length > WARN_BYTES) console.warn(`  warn     over ${WARN_BYTES / 1024} KB — consider lowering QUALITY`);

    const key = `blog/${slug}-cover.webp`;
    if (dry) {
      console.log(`  dry-run  would upload ${key}\n`);
      continue;
    }

    const { error } = await sb.storage
      .from('media')
      .upload(key, buf, { contentType: 'image/webp', upsert: true, cacheControl: '31536000' });
    if (error) throw error;
    const url = sb.storage.from('media').getPublicUrl(key).data.publicUrl;

    const meta_ = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
    meta_.cover_image_url = url;
    meta_.og_image_url = url;
    meta_._notes = meta_._notes || {};
    meta_._notes.cover_source = path.relative(ROOT, path.resolve(src));
    delete meta_._notes.cover_pending;
    fs.writeFileSync(metaPath, JSON.stringify(meta_, null, 2) + '\n');

    // Keep a copy in the repo so the cover can be rebuilt without hunting for the original.
    fs.writeFileSync(path.join(ROOT, 'seo', 'published', `${slug}-cover.webp`), buf);

    console.log(`  uploaded ${url}\n`);
  }

  console.log(
    `${jobs.length} cover(s): ${(totalIn / 1024 / 1024).toFixed(1)} MB -> ` +
      `${(totalOut / 1024 / 1024).toFixed(1)} MB (-${(100 - (totalOut / totalIn) * 100).toFixed(0)}%)`
  );
  if (!dry) {
    console.log(`\n  next: node scripts/seo/publish-post.js ${jobs.map((j) => `seo/published/${j.slug}.json`).join(' ')}`);
  }
})().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
