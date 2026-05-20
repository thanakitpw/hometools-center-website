// Import extracted WP data → Supabase via service role (bypasses RLS).
// Run: node scripts/import-to-supabase.js
require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error('missing env'); process.exit(1); }
const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

const DATA = path.join(__dirname, '..', 'research', 'data');
const read = (n) => JSON.parse(fs.readFileSync(path.join(DATA, n), 'utf8'));
const redirects = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'research', 'redirect-map.json'), 'utf8'));

const categoriesIn = read('categories.json');
const brandsIn = read('brands.json');
const productsIn = read('products.json');
const postsIn = read('posts.json');

const parentSlug = (s) => s.includes('/') ? s.split('/').slice(0, -1).join('/') : null;
const inferBrand = (name) => {
  const ups = name.toUpperCase();
  for (const b of brandsIn) {
    if (ups.includes(b.name.toUpperCase())) return b.slug;
  }
  return null;
};

async function step(label, fn) {
  process.stdout.write(label + ' ... ');
  const t = Date.now();
  try { const r = await fn(); console.log('OK', (Date.now() - t) + 'ms', r ? '(' + r + ')' : ''); }
  catch (e) { console.error('FAIL', e.message); throw e; }
}

(async () => {
  // ---------- BRANDS ----------
  await step('brands', async () => {
    const rows = brandsIn.map(b => ({ slug: b.slug, name: b.name }));
    const { data, error } = await sb.from('brands').upsert(rows, { onConflict: 'slug' }).select('id, slug');
    if (error) throw error;
    return `${data.length} rows`;
  });

  const { data: brandRows } = await sb.from('brands').select('id, slug');
  const brandMap = Object.fromEntries(brandRows.map(b => [b.slug, b.id]));

  // ---------- CATEGORIES (2-pass for parent_id) ----------
  await step('categories pass 1 (without parent)', async () => {
    const rows = categoriesIn.map(c => ({
      slug: c.slug,
      name_th: c.name_th,
      seo_title: c.seo_title,
      seo_description: c.seo_description,
      banner_image_url: c.banner_image_url,
      is_published: true,
    }));
    const { error } = await sb.from('categories').upsert(rows, { onConflict: 'slug' });
    if (error) throw error;
    return `${rows.length} rows`;
  });

  const { data: catRows } = await sb.from('categories').select('id, slug');
  const catMap = Object.fromEntries(catRows.map(c => [c.slug, c.id]));

  await step('categories pass 2 (set parent_id)', async () => {
    const updates = categoriesIn
      .map(c => ({ slug: c.slug, parent_slug: parentSlug(c.slug) }))
      .filter(c => c.parent_slug && catMap[c.parent_slug]);
    for (const u of updates) {
      const { error } = await sb.from('categories')
        .update({ parent_id: catMap[u.parent_slug] })
        .eq('slug', u.slug);
      if (error) throw error;
    }
    return `${updates.length} parents linked`;
  });

  // ---------- PRODUCTS ----------
  await step('products', async () => {
    const rows = productsIn.map(p => {
      // pick primary category from breadcrumb (last category-like part)
      let primaryCategorySlug = null;
      const bc = (p.breadcrumb || []).join(' / ');
      for (const c of categoriesIn) {
        if (bc.includes(c.name_th)) { primaryCategorySlug = c.slug; }
      }
      return {
        slug: p.slug,
        name_th: p.name_th,
        sku: p.sku,
        short_description: p.short_description?.slice(0, 1000) || '',
        description_md: p.description_md || '',
        images: p.images || [],
        specs: p.specs || [],
        seo_title: p.seo_title,
        seo_description: p.seo_description?.slice(0, 500) || '',
        og_image_url: p.og_image,
        brand_id: brandMap[inferBrand(p.name_th)] || null,
        primary_category_id: primaryCategorySlug ? catMap[primaryCategorySlug] : null,
        status: 'published',
        published_at: new Date().toISOString(),
      };
    });
    // Batch upsert in chunks of 50
    let total = 0;
    for (let i = 0; i < rows.length; i += 50) {
      const chunk = rows.slice(i, i + 50);
      const { error } = await sb.from('products').upsert(chunk, { onConflict: 'slug' });
      if (error) throw error;
      total += chunk.length;
    }
    return `${total} rows`;
  });

  // ---------- POSTS ----------
  await step('posts', async () => {
    const rows = postsIn.filter(p => p.new_slug_suggested).map(p => ({
      slug: p.new_slug_suggested,
      title: p.title,
      seo_title: p.seo_title,
      seo_description: p.seo_description?.slice(0, 500) || '',
      cover_image_url: p.cover_image_url,
      content_md: p.content_html || '',
      og_image_url: p.og_image,
      status: 'published',
      published_at: new Date().toISOString(),
    }));
    const { error } = await sb.from('posts').upsert(rows, { onConflict: 'slug' });
    if (error) throw error;
    return `${rows.length} rows`;
  });

  // ---------- REDIRECTS ----------
  await step('redirects', async () => {
    const rows = redirects.map(r => ({
      from_path: r.from_path,
      to_path: r.to_path,
      status_code: r.status_code,
      note: r.reason,
    }));
    const { error } = await sb.from('redirects').upsert(rows, { onConflict: 'from_path' });
    if (error) throw error;
    return `${rows.length} rows`;
  });

  // ---------- MENUS (seed) ----------
  await step('menus header seed', async () => {
    const headerItems = [
      { label: 'หน้าหลัก', url: '/' },
      { label: 'สินค้า&บริการ', url: '/shop' },
      { label: 'โปรโมชั่น', url: '/promotion' },
      { label: 'วิธีการสั่งซื้อ', url: '/how-to-place-an-order' },
      { label: 'เกี่ยวกับเรา', url: '/about-us' },
      { label: 'ติดต่อ', url: '/contact-us' },
    ];
    const { error } = await sb.from('menus').upsert(
      { location: 'header', items: headerItems },
      { onConflict: 'location' }
    );
    if (error) throw error;
    return 'header ok';
  });

  // ---------- Summary ----------
  console.log('\n=== Verification ===');
  for (const t of ['categories', 'brands', 'products', 'posts', 'redirects', 'site_settings', 'menus']) {
    const { count } = await sb.from(t).select('*', { count: 'exact', head: true });
    console.log(`  ${t}: ${count}`);
  }
})().catch(e => { console.error('FATAL:', e); process.exit(1); });
