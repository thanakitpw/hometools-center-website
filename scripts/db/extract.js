// scripts/db/extract.js
// Stage 1: boot temp MySQL, import dump, extract clean JSON.
// Run: node scripts/db/extract.js
const fs = require('node:fs');
const path = require('node:path');
const { startTempMysql, importSqlFile, connect } = require('./lib/mysql-temp');
const { extractRankMathPattern } = require('./lib/php-pattern');

const P = 'jQH0o_';
const DUMP = path.join(__dirname, '..', '..', 'backup-oldwebsite', 'adminhometools_wp_orpro.sql');
const OUT = path.join(__dirname, '..', '..', 'research', 'db-2026-07');
const SITE_URL = 'https://hometools-center.com';

function pathFromUrl(u) {
  try { return new URL(u).pathname; } catch { return u.startsWith('/') ? u : `/${u}`; }
}

/**
 * WordPress stores `post_name`/term slugs percent-encoded when the title is non-ASCII
 * (Thai), e.g. 'ท่อ-pb' is persisted as '%e0%b8%97%e0%b9%88%e0%b8%ad-pb'. Next.js hands
 * route params to us already decoded, so storing the encoded form makes every such page
 * 404 on an exact-match lookup. Decode here so the DB holds one canonical form.
 */
const decodeSlug = (s) => {
  if (typeof s !== 'string' || !s) return s;
  try { return decodeURIComponent(s); } catch { return s; }
};

// WooCommerce/RankMath sometimes store '0' as a "no value" sentinel (e.g. category
// thumbnail_id, product primary-cat) which is truthy in JS — normalize to null.
const posIntOrNull = (v) => {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
};

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const srv = await startTempMysql();
  try {
    console.log('importing dump…');
    importSqlFile(srv, 'htc_wp', DUMP);
    const db = await connect(srv, 'htc_wp');

    // ---- raw pulls ----
    const [posts] = await db.query(
      `SELECT ID, post_name, post_title, post_excerpt, post_content, post_status, post_date, menu_order, post_type
       FROM ${P}posts WHERE post_type IN ('product','post','attachment')`);
    const [metaRows] = await db.query(
      `SELECT post_id, meta_key, meta_value FROM ${P}postmeta
       WHERE meta_key IN ('_thumbnail_id','_product_image_gallery','_wp_attached_file',
         '_wp_attachment_image_alt','rank_math_title','rank_math_description',
         'rank_math_facebook_image','rank_math_primary_product_cat','rank_math_primary_category')`);
    const [terms] = await db.query(`SELECT term_id, name, slug FROM ${P}terms`);
    const [tax] = await db.query(
      `SELECT term_taxonomy_id, term_id, taxonomy, description, parent FROM ${P}term_taxonomy`);
    const [rels] = await db.query(
      `SELECT object_id, term_taxonomy_id FROM ${P}term_relationships`);
    const [termmeta] = await db.query(
      `SELECT term_id, meta_key, meta_value FROM ${P}termmeta
       WHERE meta_key IN ('thumbnail_id','order','rank_math_title','rank_math_description')`);
    const [rmRedir] = await db.query(
      `SELECT sources, url_to, header_code FROM ${P}rank_math_redirections WHERE status='active'`);
    const [rdItems] = await db.query(
      `SELECT url, action_data, action_code FROM ${P}redirection_items WHERE status='enabled'`);
    const [[siteRow]] = await db.query(
      `SELECT option_value AS blogname FROM ${P}options WHERE option_name='blogname'`);

    await db.end();

    // ---- indexes ----
    const metaBy = new Map();           // post_id -> {key:value}
    for (const m of metaRows) {
      if (!metaBy.has(m.post_id)) metaBy.set(m.post_id, {});
      metaBy.get(m.post_id)[m.meta_key] = m.meta_value;
    }
    const tmBy = new Map();              // term_id -> {key:value}
    for (const t of termmeta) {
      if (!tmBy.has(t.term_id)) tmBy.set(t.term_id, {});
      tmBy.get(t.term_id)[t.meta_key] = t.meta_value;
    }
    const taxByTtid = new Map(tax.map(t => [t.term_taxonomy_id, t]));
    const termById = new Map(terms.map(t => [t.term_id, t]));
    const relsByObj = new Map();         // object_id -> [ttid]
    for (const r of rels) {
      if (!relsByObj.has(r.object_id)) relsByObj.set(r.object_id, []);
      relsByObj.get(r.object_id).push(r.term_taxonomy_id);
    }

    // ---- attachments ----
    const attachments = {};
    for (const p of posts) {
      if (p.post_type !== 'attachment') continue;
      const m = metaBy.get(p.ID) || {};
      if (m._wp_attached_file) attachments[p.ID] = { file: m._wp_attached_file, alt: m._wp_attachment_image_alt || '' };
    }

    // ---- categories (product_cat) ----
    const categories = tax.filter(t => t.taxonomy === 'product_cat').map(t => {
      const term = termById.get(t.term_id) || {};
      const tm = tmBy.get(t.term_id) || {};
      const parentTax = t.parent ? tax.find(x => x.term_id === t.parent && x.taxonomy === 'product_cat') : null;
      return {
        wpTermId: t.term_id, slug: decodeSlug(term.slug), name_th: term.name,
        parentWpTermId: parentTax ? parentTax.term_id : null,
        description: t.description || null,
        thumbId: tm.thumbnail_id && tm.thumbnail_id !== '0' ? tm.thumbnail_id : null,
        order: Number(tm.order || 0),
        seo_title: tm.rank_math_title || null,
        seo_description: tm.rank_math_description || null,
      };
    });

    // helper: term_ids of a taxonomy attached to an object
    const catTtids = new Set(tax.filter(t => t.taxonomy === 'product_cat').map(t => t.term_taxonomy_id));
    const tagTtids = new Map(tax.filter(t => t.taxonomy === 'post_tag').map(t => [t.term_taxonomy_id, t.term_id]));
    const blogCatTtids = new Map(tax.filter(t => t.taxonomy === 'category').map(t => [t.term_taxonomy_id, t.term_id]));

    // ---- products ----
    const products = posts.filter(p => p.post_type === 'product').map(p => {
      const m = metaBy.get(p.ID) || {};
      const ttids = relsByObj.get(p.ID) || [];
      const catTermIds = ttids.filter(id => catTtids.has(id))
        .map(id => taxByTtid.get(id).term_id);
      return {
        ID: p.ID, slug: decodeSlug(p.post_name), name_th: p.post_title,
        short_description: p.post_excerpt || null,
        description_html: p.post_content || null,
        status: p.post_status, post_date: p.post_date, menu_order: p.menu_order,
        thumbId: m._thumbnail_id || null,
        galleryIds: (m._product_image_gallery || '').split(',').map(s => s.trim()).filter(Boolean),
        primaryCatWpTermId: posIntOrNull(m.rank_math_primary_product_cat),
        catWpTermIds: catTermIds,
        seo_title: m.rank_math_title || null,
        seo_description: m.rank_math_description || null,
        ogImageId: m.rank_math_facebook_image || null,
      };
    });

    // ---- posts (blog) ----
    const blog = posts.filter(p => p.post_type === 'post').map(p => {
      const m = metaBy.get(p.ID) || {};
      const ttids = relsByObj.get(p.ID) || [];
      const tagNames = ttids.filter(id => tagTtids.has(id))
        .map(id => (termById.get(tagTtids.get(id)) || {}).name).filter(Boolean);
      const catTtid = ttids.find(id => blogCatTtids.has(id));
      const primaryCatId = posIntOrNull(m.rank_math_primary_category);
      const fallbackCatId = catTtid ? blogCatTtids.get(catTtid) : null;
      return {
        ID: p.ID, post_title: p.post_title, post_name: p.post_name,
        excerpt: p.post_excerpt || null, content_html: p.post_content || null,
        status: p.post_status, post_date: p.post_date, thumbId: m._thumbnail_id || null,
        tagNames,
        categoryWpTermId: primaryCatId || fallbackCatId,
        seo_title: m.rank_math_title || null, seo_description: m.rank_math_description || null,
        ogImageId: m.rank_math_facebook_image || null,
      };
    });

    // ---- redirects ----
    const redirects = [];
    let skippedRedirects = 0;
    for (const r of rmRedir) {
      const pat = extractRankMathPattern(r.sources);
      if (!pat) { skippedRedirects++; continue; }
      redirects.push({
        from_path: pathFromUrl(pat.startsWith('http') ? pat : `/${pat.replace(/^\//, '')}`),
        to_path: pathFromUrl(r.url_to), status_code: Number(r.header_code) || 301, source: 'rankmath',
      });
    }
    for (const r of rdItems) {
      redirects.push({
        from_path: pathFromUrl(r.url), to_path: pathFromUrl(r.action_data),
        status_code: Number(r.action_code) || 301, source: 'redirection',
      });
    }

    // ---- write ----
    const write = (name, data) => fs.writeFileSync(path.join(OUT, name), JSON.stringify(data, null, 2));
    write('attachments.json', attachments);
    write('categories.json', categories);
    write('products.json', products);
    write('posts.json', blog);
    write('redirects.json', redirects);
    write('site.json', { blogname: siteRow ? siteRow.blogname : 'Home Tool Center' });

    console.log(`extracted: ${products.length} products, ${categories.length} categories, ${blog.length} posts, ${redirects.length} redirects, ${Object.keys(attachments).length} attachments`);
    if (skippedRedirects > 0) {
      console.warn(`skipped ${skippedRedirects} rank_math_redirections row(s) with unparseable source pattern`);
    }
  } finally {
    srv.stop();
  }
})();
