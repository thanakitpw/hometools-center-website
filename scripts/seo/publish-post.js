#!/usr/bin/env node
/**
 * Publish an SEO article into `posts`.
 *
 *   node scripts/seo/publish-post.js seo/published/<slug>.json [--draft] [--dry]
 *
 * `posts.content_md` stores raw HTML (the column name is a leftover from the WP
 * import) and the blog page renders it with dangerouslySetInnerHTML, so the
 * article body ships as HTML, not markdown.
 *
 * Idempotent: upserts on `slug`, so re-running republishes in place and keeps
 * the URL — never creates a duplicate that would need a redirect.
 *
 * Gates before writing (each one is a mistake we would otherwise ship to Google):
 *   - no <h1> in the body (the page template already renders the title as H1)
 *   - FAQ items free of nested <div>, which would break lib/seo/faq.ts extraction
 *   - every internal /product/ and /product-category/ link resolves in the DB
 *   - title / meta description within the lengths Google renders
 */
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local', quiet: true });
const { createClient } = require('@supabase/supabase-js');

const ROOT = path.resolve(__dirname, '..', '..');
const LIMITS = { seo_title: 60, seo_description: 160 };


/** categories.slug holds only the leaf segment; URLs carry the full ancestor chain. */
function categoryPaths(rows) {
  const byId = new Map(rows.map((c) => [c.id, c]));
  return new Set(
    rows.map((c) => {
      const segs = [];
      for (let cur = c; cur; cur = cur.parent_id ? byId.get(cur.parent_id) : null) segs.unshift(cur.slug);
      return segs.join('/');
    })
  );
}

async function checkInternalLinks(sb, html, fail, warn, batchSlugs) {
  const links = [...html.matchAll(/href="(\/[^"#]*)"/g)].map((m) => m[1].replace(/\/$/, ''));
  const wanted = { product: new Set(), category: new Set() };
  const known = new Set(['', '/blog', '/shop', '/contact-us', '/about-us', '/promotion', '/how-to-place-an-order', '/privacy-policy', '/cookie-policy']);

  const blogSlugs = new Set();
  for (const href of new Set(links)) {
    if (href.startsWith('/product-category/')) wanted.category.add(href.slice('/product-category/'.length));
    else if (href.startsWith('/product/')) wanted.product.add(href.slice('/product/'.length));
    else if (href.startsWith('/blog/')) blogSlugs.add(href.slice('/blog/'.length));
    else if (!known.has(href)) warn.push(`internal link points at an unrecognised route: ${href}`);
  }

  const [{ data: prods }, { data: cats }, { data: posts }] = await Promise.all([
    wanted.product.size ? sb.from('products').select('slug').in('slug', [...wanted.product]) : { data: [] },
    wanted.category.size ? sb.from('categories').select('id, slug, parent_id') : { data: [] },
    blogSlugs.size ? sb.from('posts').select('slug, status').in('slug', [...blogSlugs]) : { data: [] },
  ]);

  const haveProducts = new Set((prods || []).map((p) => p.slug));
  for (const s of wanted.product) if (!haveProducts.has(s)) fail.push(`dead internal link: /product/${s}`);

  if (wanted.category.size) {
    const havePaths = categoryPaths(cats || []);
    for (const s of wanted.category) if (!havePaths.has(s)) fail.push(`dead internal link: /product-category/${s}`);
  }

  // A batch of articles is written and reviewed together, so cross-links between them are
  // expected to point at drafts for a while. Only a slug that exists in no form is a defect;
  // a draft target is worth a warning so it cannot be forgotten before the batch goes live.
  const postStatus = new Map((posts || []).map((p) => [p.slug, p.status]));
  for (const s of blogSlugs) {
    // A slug being written in this same run counts as existing — a batch of articles
    // cross-links to itself, and no ordering of the inserts makes that resolvable.
    if (batchSlugs.has(s)) { warn.push(`links to /blog/${s}, published in this same batch`); continue; }
    if (!postStatus.has(s)) fail.push(`dead internal link: /blog/${s}`);
    else if (postStatus.get(s) !== 'published') warn.push(`links to /blog/${s}, which is still a draft`);
  }
}

function checkBody(html, fail, warn) {
  if (/<h1[\s>]/i.test(html)) fail.push('body contains an <h1> — the page template already renders the title as the page H1');

  const faqItems = [...html.matchAll(/<div[^>]*class="[^"]*\bfaq-item\b[^"]*"[^>]*>([\s\S]*?)<\/div>/gi)];
  for (const [, inner] of faqItems) {
    if (/<div[\s>]/i.test(inner)) fail.push('a .faq-item contains a nested <div> — lib/seo/faq.ts would truncate the answer');
    if (!/<h[34][\s>]/i.test(inner)) fail.push('a .faq-item has no <h3> question');
  }
  if (!faqItems.length) warn.push('no .faq-item blocks found — the page will emit no FAQPage schema');

  const headings = [...html.matchAll(/<h2[^>]*\bid="([^"]+)"/gi)].map((m) => m[1]);
  for (const href of [...html.matchAll(/href="#([^"]+)"/g)].map((m) => m[1])) {
    if (!new RegExp(`id="${href}"`).test(html)) fail.push(`table-of-contents anchor #${href} has no matching id`);
  }
  if (!headings.length) warn.push('no <h2 id> headings — in-page anchors and outline will be weak');
}

function checkMeta(meta, fail, warn) {
  for (const [field, max] of Object.entries(LIMITS)) {
    const v = meta[field];
    if (!v) { fail.push(`${field} is required`); continue; }
    // The layout appends " | Home Tool Center" via the metadata title template.
    const rendered = field === 'seo_title' ? `${v} | Home Tool Center` : v;
    if (rendered.length > max) warn.push(`${field} renders at ${rendered.length} chars (target ≤ ${max}): ${rendered}`);
  }
  for (const field of ['slug', 'title', 'excerpt']) if (!meta[field]) fail.push(`${field} is required`);
  if (!/^[a-z0-9-]+$/.test(meta.slug || '')) fail.push(`slug must be lowercase ascii-kebab: ${meta.slug}`);
  if (!meta.cover_image_url) warn.push('no cover_image_url — the blog card and OG preview will be blank');
}

(async () => {
  const argv = process.argv.slice(2);
  const dry = argv.includes('--dry');
  const draft = argv.includes('--draft');
  const paths = argv.filter((a) => !a.startsWith('--'));
  if (!paths.length) {
    console.error('usage: node scripts/seo/publish-post.js <seo/published/<slug>.json …> [--draft] [--dry]');
    process.exit(1);
  }

  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  const articles = paths.map((metaPath) => {
    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
    const html = fs.readFileSync(path.join(path.dirname(metaPath), meta.content_file), 'utf8').trim();
    return { metaPath, meta, html };
  });
  const batchSlugs = new Set(articles.map((a) => a.meta.slug));

  let failed = 0, wrote = 0;
  for (const { metaPath, meta, html } of articles) {
    const fail = [], warn = [];
    checkMeta(meta, fail, warn);
    checkBody(html, fail, warn);
    await checkInternalLinks(sb, html, fail, warn, batchSlugs);

    const label = meta.slug || path.basename(metaPath);
    if (fail.length) {
      console.error(`\n✗ ${label}`);
      fail.forEach((f) => console.error(`    FAIL  ${f}`));
      warn.forEach((w) => console.error(`    warn  ${w}`));
      failed++;
      continue;
    }
    if (warn.length && paths.length === 1) warn.forEach((w) => console.warn(`  warn  ${w}`));

    const { data: existing } = await sb.from('posts').select('id, published_at').eq('slug', meta.slug).maybeSingle();
    const row = {
      slug: meta.slug,
      title: meta.title,
      excerpt: meta.excerpt,
      content_md: html,
      cover_image_url: meta.cover_image_url || null,
      og_image_url: meta.og_image_url || meta.cover_image_url || null,
      author: meta.author || null,
      tags: meta.tags || [],
      seo_title: meta.seo_title,
      seo_description: meta.seo_description,
      status: draft ? 'draft' : meta.status || 'published',
      // Keep the original publish date on re-runs — changing it would reset the
      // article's age signal and its position in the blog listing.
      published_at: existing?.published_at || new Date().toISOString(),
    };

    if (dry) {
      console.log(`  ok     ${label} — would ${existing ? 'update' : 'insert'} (${row.status})`);
      continue;
    }
    const { error } = await sb.from('posts').upsert(row, { onConflict: 'slug' });
    if (error) throw error;
    console.log(`  ${existing ? 'updated' : 'created'}  ${row.status.padEnd(9)} /blog/${meta.slug}`);
    wrote++;
  }

  console.log(`\n${dry ? 'dry run — ' : ''}${wrote} written, ${failed} failed, ${articles.length} checked`);
  if (failed) process.exit(1);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
