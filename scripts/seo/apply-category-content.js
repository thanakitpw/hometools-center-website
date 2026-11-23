#!/usr/bin/env node
/**
 * Write category page content into categories.description.
 *
 *   node scripts/seo/apply-category-content.js --dry
 *   node scripts/seo/apply-category-content.js
 *
 * Sources:
 *   seo/categories/<slug>.html — intro paragraph, then `<!--more-->`, then a guide + FAQ
 *   seo/categories/_intros.json — a one-paragraph intro for brand sub-categories
 *
 * The category page renders everything before `<!--more-->` under the H1 and everything after
 * it below the product grid (page 1 only), and emits FAQPage JSON-LD from the `.faq-item`
 * blocks. The column is the existing `description` (editable in /admin) because no DDL access
 * was available to add a dedicated one.
 *
 * Every internal link is resolved against the database before anything is written, and the
 * current values are saved to seo/category-content.previous.json on the first real run.
 */
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const ROOT = path.resolve(__dirname, '..', '..');
const DIR = path.join(ROOT, 'seo', 'categories');
process.loadEnvFile(path.join(ROOT, '.env.local'));
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const dry = process.argv.includes('--dry');
const STATIC = new Set(['/', '/shop', '/blog', '/contact-us', '/about-us', '/how-to-place-an-order', '/promotion']);

(async () => {
  const { data: cats, error } = await sb.from('categories').select('id,slug,parent_id,description');
  if (error) throw error;
  const byId = Object.fromEntries(cats.map((c) => [c.id, c]));
  const catPath = (c) => (c.parent_id ? catPath(byId[c.parent_id]) + '/' : '') + c.slug;
  const catPaths = new Set(cats.map((c) => '/product-category/' + catPath(c)));
  const { data: posts } = await sb.from('posts').select('slug').eq('status', 'published');
  const postPaths = new Set(posts.map((p) => '/blog/' + p.slug));
  const prodPaths = new Set();
  for (let from = 0; ; from += 1000) {
    const { data } = await sb.from('products').select('slug').eq('status', 'published').range(from, from + 999);
    data.forEach((p) => prodPaths.add('/product/' + p.slug));
    if (data.length < 1000) break;
  }

  const content = {};
  for (const f of fs.readdirSync(DIR).filter((f) => f.endsWith('.html'))) {
    content[f.replace(/\.html$/, '')] = fs.readFileSync(path.join(DIR, f), 'utf8').trim();
  }
  const intros = JSON.parse(fs.readFileSync(path.join(DIR, '_intros.json'), 'utf8'));
  delete intros._note;
  for (const [slug, html] of Object.entries(intros)) {
    if (content[slug]) throw new Error(`${slug}: both an .html file and an _intros.json entry`);
    content[slug] = `<p>${html}</p>`;
  }

  const problems = [];
  for (const [slug, html] of Object.entries(content)) {
    if (!cats.some((c) => c.slug === slug)) problems.push(`${slug}: no such category`);
    if (/<h1[\s>]/i.test(html)) problems.push(`${slug}: contains <h1>`);
    if (/<script/i.test(html)) problems.push(`${slug}: contains <script>`);
    if (html.includes('<!--more-->') && !/<h2 id="faq">/.test(html)) problems.push(`${slug}: guide without FAQ`);
    for (const item of html.matchAll(/<div class="faq-item">([\s\S]*?)<\/div>/g)) {
      if (/<div/i.test(item[1])) problems.push(`${slug}: nested <div> in .faq-item`);
    }
    for (const [, href] of html.matchAll(/href="([^"]+)"/g)) {
      if (/^https?:/.test(href)) continue;
      const p = decodeURI(href.split('#')[0]);
      const ok = STATIC.has(p) || postPaths.has(p) || prodPaths.has(p) || catPaths.has(p);
      if (!ok) problems.push(`${slug}: dead link ${href}`);
    }
  }
  if (problems.length) {
    console.error(problems.join('\n'));
    process.exit(1);
  }

  const prevPath = path.join(ROOT, 'seo/category-content.previous.json');
  if (!dry && !fs.existsSync(prevPath)) {
    fs.writeFileSync(prevPath, JSON.stringify(Object.fromEntries(cats.map((c) => [c.slug, c.description])), null, 1) + '\n');
  }

  let n = 0;
  for (const c of cats) {
    const html = content[c.slug];
    if (!html || html === c.description) continue;
    const faq = (html.match(/class="faq-item"/g) || []).length;
    console.log(`${dry ? 'would write' : 'write'}  ${c.slug} (${html.length} chars, ${faq} FAQ)`);
    if (!dry) {
      const { error: e } = await sb.from('categories').update({ description: html, updated_at: new Date().toISOString() }).eq('id', c.id);
      if (e) throw e;
    }
    n++;
  }
  const missing = cats.filter((c) => !content[c.slug]).map((c) => c.slug);
  console.log(`\n${n} ${dry ? 'to write' : 'written'}; no content for: ${missing.join(', ') || '—'}`);
})();
