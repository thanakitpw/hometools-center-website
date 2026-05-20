// Download WP images → upload to Supabase Storage → update DB URLs.
// Resumable: skips existing files. Builds URL mapping at the end.
require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error('missing env'); process.exit(1); }
const sb = createClient(url, key, { auth: { persistSession: false } });

const BUCKET = 'media';
const RESEARCH = path.join(__dirname, '..', 'research');
const MAPPING_PATH = path.join(RESEARCH, 'image-url-map.json');
const CONCURRENCY = 4;
const WP_PREFIX = 'https://hometools-center.com/wp-content/uploads/';

function pathFromWpUrl(u) {
  if (!u.startsWith(WP_PREFIX)) return null;
  // Strip prefix; decode for proper byte handling but keep safe chars
  const rel = decodeURIComponent(u.slice(WP_PREFIX.length));
  // Sanitize: replace whitespace and disallowed characters with -
  return rel.replace(/[^\w.\-/]+/g, '-').replace(/-+/g, '-');
}

function mimeFromName(name) {
  const ext = name.split('.').pop().toLowerCase();
  return ({
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
    gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml',
    pdf: 'application/pdf',
  })[ext] || 'application/octet-stream';
}

async function ensureBucket() {
  const { data: buckets } = await sb.storage.listBuckets();
  if (buckets?.some(b => b.id === BUCKET)) return;
  const { error } = await sb.storage.createBucket(BUCKET, { public: true });
  if (error) throw error;
  console.log('created bucket:', BUCKET);
}

async function uploadOne(src) {
  const objectPath = pathFromWpUrl(src);
  if (!objectPath) return { src, skip: 'not-wp' };

  // Skip if already uploaded
  const head = await sb.storage.from(BUCKET).list(path.dirname(objectPath), {
    search: path.basename(objectPath), limit: 1,
  });
  if (head.data?.some(f => f.name === path.basename(objectPath))) {
    const { data } = sb.storage.from(BUCKET).getPublicUrl(objectPath);
    return { src, dest: data.publicUrl, cached: true };
  }

  const res = await fetch(src, { headers: { 'User-Agent': 'HT-Migration/1.0' } });
  if (!res.ok) return { src, error: `fetch ${res.status}` };
  const buf = Buffer.from(await res.arrayBuffer());
  const { error } = await sb.storage.from(BUCKET).upload(objectPath, buf, {
    contentType: mimeFromName(objectPath),
    cacheControl: '31536000',
    upsert: false,
  });
  if (error && !/Duplicate|already exists/i.test(error.message)) {
    return { src, error: error.message };
  }
  const { data } = sb.storage.from(BUCKET).getPublicUrl(objectPath);
  return { src, dest: data.publicUrl };
}

async function migrateAll() {
  const images = JSON.parse(fs.readFileSync(path.join(RESEARCH, 'data', 'images.json'), 'utf8'));

  // Add home page images that aren't in products/categories/posts
  const homeSections = JSON.parse(fs.readFileSync(path.join(RESEARCH, 'home-sections.json'), 'utf8'));
  homeSections.images.forEach(i => i.src && images.push(i.src));

  // Dedup
  const all = [...new Set(images.filter(s => s && s.startsWith(WP_PREFIX)))];
  console.log(`Total unique images: ${all.length}`);

  const mapping = fs.existsSync(MAPPING_PATH) ? JSON.parse(fs.readFileSync(MAPPING_PATH, 'utf8')) : {};
  let idx = 0, ok = 0, err = 0, cached = 0;

  async function worker(workerId) {
    while (idx < all.length) {
      const i = idx++;
      const src = all[i];
      if (mapping[src]) { cached++; continue; }
      const r = await uploadOne(src);
      if (r.dest) {
        mapping[src] = r.dest;
        ok++;
        if (r.cached) cached++;
        process.stdout.write(`\r[${i + 1}/${all.length}] ok=${ok} err=${err} cached=${cached}     `);
      } else {
        err++;
        console.error(`\nFAIL ${src}: ${r.error || r.skip}`);
      }
      // periodic save
      if ((i + 1) % 20 === 0) fs.writeFileSync(MAPPING_PATH, JSON.stringify(mapping, null, 2));
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, (_, i) => worker(i)));
  fs.writeFileSync(MAPPING_PATH, JSON.stringify(mapping, null, 2));
  console.log(`\nDone. ok=${ok} err=${err} cached=${cached} total-mapped=${Object.keys(mapping).length}`);
  return mapping;
}

async function rewriteDb(mapping) {
  console.log('\n=== Rewriting DB URLs ===');
  const remap = (u) => u && mapping[u] ? mapping[u] : u;

  // PRODUCTS
  const { data: products } = await sb.from('products').select('id, images, og_image_url');
  let n = 0;
  for (const p of products) {
    const newImages = (p.images || []).map(i => ({ ...i, src: remap(i.src) }));
    const newOg = remap(p.og_image_url);
    if (JSON.stringify(newImages) !== JSON.stringify(p.images) || newOg !== p.og_image_url) {
      await sb.from('products').update({ images: newImages, og_image_url: newOg }).eq('id', p.id);
      n++;
    }
  }
  console.log(`products updated: ${n}/${products.length}`);

  // CATEGORIES
  const { data: cats } = await sb.from('categories').select('id, banner_image_url');
  n = 0;
  for (const c of cats) {
    const newUrl = remap(c.banner_image_url);
    if (newUrl !== c.banner_image_url) {
      await sb.from('categories').update({ banner_image_url: newUrl }).eq('id', c.id);
      n++;
    }
  }
  console.log(`categories updated: ${n}/${cats.length}`);

  // POSTS
  const { data: posts } = await sb.from('posts').select('id, cover_image_url, og_image_url, content_md');
  n = 0;
  for (const p of posts) {
    let newContent = p.content_md || '';
    for (const [oldUrl, newUrl] of Object.entries(mapping)) {
      if (newContent.includes(oldUrl)) newContent = newContent.split(oldUrl).join(newUrl);
    }
    const newCover = remap(p.cover_image_url);
    const newOg = remap(p.og_image_url);
    if (newContent !== (p.content_md || '') || newCover !== p.cover_image_url || newOg !== p.og_image_url) {
      await sb.from('posts').update({
        cover_image_url: newCover, og_image_url: newOg, content_md: newContent,
      }).eq('id', p.id);
      n++;
    }
  }
  console.log(`posts updated: ${n}/${posts.length}`);
}

(async () => {
  await ensureBucket();
  const mapping = await migrateAll();
  await rewriteDb(mapping);
  console.log('\n✓ Migration complete. URL map at research/image-url-map.json');
})().catch(e => { console.error('FATAL', e); process.exit(1); });
