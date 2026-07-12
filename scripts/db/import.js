// scripts/db/import.js
// Stage 3: truncate the 5 target tables and insert from extracted JSON.
//
// SAFETY: this script is DESTRUCTIVE. It clears exactly 5 tables —
//   product_categories, products, posts, redirects, categories
// in that FK-safe order — and re-inserts from research/db-2026-07/*.json.
// It NEVER touches quote_requests, contact_messages, admin_users,
// site_settings, menus, brands, or media. Row counts of those preserved
// tables are printed before AND after the run so a diff proves they were
// untouched.
//
// Run: node scripts/db/import.js
require('dotenv').config({ path: require('node:path').join(__dirname, '..', '..', '.env.local') });
const path = require('node:path');
const { createClient } = require('@supabase/supabase-js');
const { resolveSeoTitle } = require('./lib/rankmath');
const { blogRedirects, reconcileBlogSlug } = require('./lib/slug-map');

const ROOT = path.join(__dirname, '..', '..');
const DIR = path.join(ROOT, 'research', 'db-2026-07');
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } });

const categories = require(path.join(DIR, 'categories.json'));
const products = require(path.join(DIR, 'products.json'));
const posts = require(path.join(DIR, 'posts.json'));
const dbRedirects = require(path.join(DIR, 'redirects.json'));
const urlMap = require(path.join(DIR, 'url-map.json'));
const site = require(path.join(DIR, 'site.json'));
const migrationMap = require(path.join(ROOT, 'research', 'redirect-map.json'));
const attachments = require(path.join(DIR, 'attachments.json'));
// recrawl supplies rendered specs / catalog PDF / fallback descriptions, matched by slug
const recrawl = require(path.join(ROOT, 'research', 'recrawl-2026-06', 'products-detailed.json'));
const recrawlBySlug = new Map(recrawl.map(r => [r.slug, r]));

const SITE_NAME = site.blogname || 'Home Tool Center';
const statusMap = (s) => (s === 'publish' ? 'published' : s === 'trash' ? 'archived' : 'draft');
const attUrl = (id) => (id && urlMap[`att:${id}`]) || (id && attachments[id] && urlMap[attachments[id].file]) || null;
const rewrite = (html) => {
  if (!html) return html;
  let out = html;
  for (const [oldU, newU] of Object.entries(urlMap)) {
    if (oldU.startsWith('http')) out = out.split(oldU).join(newU);
  }
  // root-relativize any remaining internal links (order matters: www before bare)
  out = out
    .split('https://www.hometools-center.com').join('')
    .split('http://www.hometools-center.com').join('')
    .split('https://hometools-center.com').join('')
    .split('http://hometools-center.com').join('');
  return out;
};

// --- SAFETY: hard-coded allow-list, in FK-safe delete order ---
const PRESERVED = ['quote_requests', 'contact_messages', 'site_settings', 'menus', 'admin_users', 'brands', 'media'];
const TRUNCATE_ORDER = ['product_categories', 'products', 'posts', 'redirects', 'categories'];

async function countTable(t) {
  const { count, error } = await sb.from(t).select('*', { count: 'exact', head: true });
  if (error) throw new Error(`count ${t}: ${error.message}`);
  return count;
}

async function printPreservedCounts(label) {
  console.log(`--- preserved tables (${label}, must be untouched) ---`);
  const counts = {};
  for (const t of PRESERVED) {
    counts[t] = await countTable(t);
    console.log(`  ${t}: ${counts[t]}`);
  }
  return counts;
}

async function clearTable(t) {
  // product_categories has a composite PK (product_id, category_id) — no `id` column.
  const query = t === 'product_categories'
    ? sb.from(t).delete().neq('product_id', '00000000-0000-0000-0000-000000000000')
    : sb.from(t).delete().neq('id', '00000000-0000-0000-0000-000000000000');
  const { error } = await query;
  if (error) throw new Error(`truncate ${t}: ${error.message}`);
  console.log(`  cleared ${t}`);
}

async function main() {
  // Read-only assertion: prove the preserved tables exist and capture their
  // pre-run counts. This code path never issues a delete/insert against
  // any of them — only against TRUNCATE_ORDER below.
  await printPreservedCounts('before');

  console.log('will truncate (in FK-safe order):', TRUNCATE_ORDER.join(' -> '));
  for (const t of TRUNCATE_ORDER) await clearTable(t);

  // --- categories: parents first ---
  const catIdByWp = new Map();
  const roots = categories.filter(c => !c.parentWpTermId);
  const children = categories.filter(c => c.parentWpTermId);
  async function insertCat(c) {
    const row = {
      slug: c.slug, name_th: c.name_th,
      parent_id: c.parentWpTermId ? catIdByWp.get(c.parentWpTermId) : null,
      description: c.description,
      banner_image_url: attUrl(c.thumbId),
      seo_title: resolveSeoTitle(c.seo_title, { postTitle: c.name_th, siteName: SITE_NAME }),
      seo_description: c.seo_description,
      sort_order: c.order, is_published: true,
    };
    const { data, error } = await sb.from('categories').insert(row).select('id').single();
    if (error) throw new Error(`category ${c.slug}: ${error.message}`);
    catIdByWp.set(c.wpTermId, data.id);
  }
  for (const c of roots) await insertCat(c);
  let remaining = children, guard = 0;
  while (remaining.length && guard++ < 10) {
    const next = [];
    for (const c of remaining) {
      if (catIdByWp.has(c.parentWpTermId)) await insertCat(c); else next.push(c);
    }
    remaining = next;
  }
  for (const c of remaining) { c.parentWpTermId = null; await insertCat(c); } // orphans → root

  // --- products ---
  const prodIdByWp = new Map();
  let primaryFallbackCount = 0;
  let noImageCount = 0;
  for (const p of products) {
    const featured = attUrl(p.thumbId);
    const rc = recrawlBySlug.get(p.slug);
    let images = [featured, ...p.galleryIds.map(attUrl)].filter(Boolean);
    if (images.length === 0 && rc && rc.images && rc.images.length) {
      // recrawl images are {src, alt} objects — resolve ONLY through urlMap.
      // Never fall back to the raw WP URL: the WP host is dead, and a raw
      // hometools-center.com URL must never land in the DB.
      images = rc.images.map(im => urlMap[im.src]).filter(Boolean);
    }
    if (images.length === 0) noImageCount++;

    // §5.3: DB post_content empty → fall back to recrawl rendered description
    let description_md = rewrite(p.description_html);
    if ((!description_md || !description_md.trim()) && rc && rc.description_html) {
      description_md = rewrite(rc.description_html);
    }

    // primary_category_id: mapped(primaryCatWpTermId) if it maps,
    // ELSE the first of catWpTermIds that maps to a category, ELSE null.
    let primary_category_id = p.primaryCatWpTermId ? catIdByWp.get(p.primaryCatWpTermId) || null : null;
    if (!primary_category_id) {
      for (const wp of p.catWpTermIds || []) {
        const mapped = catIdByWp.get(wp);
        if (mapped) { primary_category_id = mapped; break; }
      }
      if (primary_category_id) primaryFallbackCount++;
    }

    const row = {
      slug: p.slug, name_th: p.name_th,
      short_description: rewrite(p.short_description || (rc && rc.short_description) || null),
      description_md,
      primary_category_id,
      images, brand_id: null,
      specs: (rc && rc.specs) || [],
      catalog_pdf_url: rc && rc.catalog_pdf_url ? (urlMap[rc.catalog_pdf_url] || null) : null,
      seo_title: resolveSeoTitle(p.seo_title, { postTitle: p.name_th, siteName: SITE_NAME }),
      seo_description: p.seo_description || (rc && rc.seo_description) || null,
      og_image_url: attUrl(p.ogImageId) || featured,
      status: statusMap(p.status), sort_order: p.menu_order || 0,
      published_at: p.post_date,
    };
    const { data, error } = await sb.from('products').insert(row).select('id').single();
    if (error) throw new Error(`product ${p.slug}: ${error.message}`);
    prodIdByWp.set(p.ID, data.id);
    // m2m categories
    const edges = [...new Set(p.catWpTermIds)].map(wp => catIdByWp.get(wp)).filter(Boolean)
      .map(cid => ({ product_id: data.id, category_id: cid }));
    if (edges.length) {
      const { error: e2 } = await sb.from('product_categories').insert(edges);
      if (e2) throw new Error(`product_categories ${p.slug}: ${e2.message}`);
    }
  }

  // --- posts (preserve english slugs) ---
  // NOTE: two WP posts (IDs 1131 publish / 1190 draft) share the exact same
  // post_title ("เลือกท่อน้ำดื่มอย่างไร..."), a leftover WP duplicate/autosave.
  // reconcileBlogSlug() resolves both to the same slug, which would violate
  // posts.slug's unique constraint. posts.slug has no natural per-post
  // disambiguation in the Task 4 contract, so dedup here: the published post
  // keeps the reconciled "nice" slug; any later collision (e.g. the draft
  // duplicate) falls back to the guaranteed-unique `blog-post-<ID>` pattern.
  // Every post from posts.json is still inserted — "migrate ALL, no pruning".
  const blogRules = blogRedirects(migrationMap);
  const usedSlugs = new Set();
  const slugByPostId = new Map();
  const priorityOrder = [...posts].sort((a, b) => {
    const pa = a.status === 'publish' ? 0 : 1;
    const pb = b.status === 'publish' ? 0 : 1;
    return pa - pb; // published posts get first claim on their reconciled slug
  });
  for (const b of priorityOrder) {
    let { slug } = reconcileBlogSlug(b, blogRules);
    if (usedSlugs.has(slug)) slug = `blog-post-${b.ID}`;
    usedSlugs.add(slug);
    slugByPostId.set(b.ID, slug);
  }

  for (const b of posts) {
    const slug = slugByPostId.get(b.ID);
    const row = {
      slug, title: b.post_title, excerpt: b.excerpt,
      content_md: rewrite(b.content_html), cover_image_url: attUrl(b.thumbId),
      tags: b.tagNames || [],
      category_id: null, // blog 'category' taxonomy intentionally NOT migrated
      seo_title: resolveSeoTitle(b.seo_title, { postTitle: b.post_title, siteName: SITE_NAME }),
      seo_description: b.seo_description, og_image_url: attUrl(b.ogImageId) || attUrl(b.thumbId),
      status: statusMap(b.status), published_at: b.post_date,
    };
    const { error } = await sb.from('posts').insert(row);
    if (error) throw new Error(`post ${slug}: ${error.message}`);
  }

  // --- redirects: migration map + DB, dedup by from_path ---
  const seen = new Set();
  const rows = [];
  const migrationFromPaths = new Set(); // first-wins priority source, per §5.4
  const push = (from_path, to_path, status_code, note, fromMigration) => {
    if (!from_path || !to_path) return;
    if (from_path === to_path) return;
    const key = from_path;
    if (seen.has(key)) return;
    seen.add(key); rows.push({ from_path, to_path, status_code: status_code || 301, note });
    if (fromMigration) migrationFromPaths.add(from_path);
  };
  for (const r of migrationMap) push(r.from_path, r.to_path, r.status_code, r.reason || 'migration', true);
  for (const r of dbRedirects) push(r.from_path, r.to_path, r.status_code, r.source, false);

  // §5.4 loop safety: drop 2-cycles (a pair where A.from_path == B.to_path
  // AND A.to_path == B.from_path — following either would bounce forever).
  // When exactly one side of the cycle came from the migration map (the
  // first-wins-priority source), keep that one and drop the other; otherwise
  // keep the first-seen row. Multi-hop chains (a row whose to_path equals
  // another row's from_path) are NOT dropped — just logged for manual review,
  // since a 2-hop 301 chain is valid (if suboptimal), unlike a true loop.
  const byFrom = new Map(rows.map((r) => [r.from_path, r]));
  const toDrop = new Set();
  const handledPairs = new Set();
  for (const r of rows) {
    const partner = byFrom.get(r.to_path);
    if (!partner || partner.to_path !== r.from_path) continue; // not a 2-cycle
    const pairKey = [r.from_path, r.to_path].sort().join(' <-> ');
    if (handledPairs.has(pairKey)) continue;
    handledPairs.add(pairKey);
    const rIsMigration = migrationFromPaths.has(r.from_path);
    const partnerIsMigration = migrationFromPaths.has(partner.from_path);
    const drop = rIsMigration && !partnerIsMigration ? partner
      : !rIsMigration && partnerIsMigration ? r
      : partner; // both/neither from migration map: keep r, drop partner
    const kept = drop === r ? partner : r;
    toDrop.add(drop.from_path);
    console.warn(`redirect 2-cycle dropped: ${drop.from_path} -> ${drop.to_path} (kept ${kept.from_path} -> ${kept.to_path})`);
  }
  const finalRows = rows.filter((r) => !toDrop.has(r.from_path));
  const finalByFrom = new Map(finalRows.map((r) => [r.from_path, r]));
  let chainCount = 0;
  for (const r of finalRows) {
    const next = finalByFrom.get(r.to_path);
    if (next) {
      chainCount++;
      console.warn(`redirect multi-hop chain (manual review): ${r.from_path} -> ${r.to_path} -> ${next.to_path}`);
    }
  }

  if (finalRows.length) {
    const { error } = await sb.from('redirects').insert(finalRows);
    if (error) throw new Error('redirects insert: ' + error.message);
  }

  console.log(`redirects: ${rows.length} deduped, ${toDrop.size} dropped (2-cycle), ${chainCount} multi-hop chain(s) warned, ${finalRows.length} inserted`);
  console.log(`imported: ${catIdByWp.size} categories, ${prodIdByWp.size} products, ${posts.length} posts, ${finalRows.length} redirects`);
  console.log(`primary_category_id fallback used for ${primaryFallbackCount} products`);
  console.log(`products with empty images[]: ${noImageCount}`);

  await printPreservedCounts('after');
}
main().catch(e => { console.error(e); process.exit(1); });
