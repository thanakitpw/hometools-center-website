// Find Supabase URLs in DB that point to non-existent or collided objects, and replace with current good URL.
// Approach: iterate over current mapping; for each (oldWp → goodSupabase), try replacing oldWp first.
// Then also derive "old bad Supabase URL" using the original sanitize logic and replace those.
require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const mapping = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'research', 'image-url-map.json'), 'utf8'));

const SB_PREFIX = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/media/`;
const WP_PREFIX = 'https://hometools-center.com/wp-content/uploads/';

// Reproduce the original sanitize from migrate-images.js
function originalPath(u) {
  const rel = decodeURIComponent(u.slice(WP_PREFIX.length));
  return rel.replace(/[^\w.\-/]+/g, '-').replace(/-+/g, '-');
}

// Build bad→good mapping: for every WP URL, compare original-sanitize path vs current mapping
const badToGood = {};
for (const [wpUrl, goodUrl] of Object.entries(mapping)) {
  const badPath = originalPath(wpUrl);
  const badUrl = SB_PREFIX + badPath;
  if (badUrl !== goodUrl) badToGood[badUrl] = goodUrl;
}
console.log('bad→good entries:', Object.keys(badToGood).length);

function remap(url) {
  if (!url) return url;
  if (badToGood[url]) return badToGood[url];
  return url;
}
function remapText(t) {
  if (!t) return t;
  let out = t;
  for (const [bad, good] of Object.entries(badToGood)) {
    if (out.includes(bad)) out = out.split(bad).join(good);
  }
  return out;
}

(async () => {
  // PRODUCTS
  const { data: products } = await sb.from('products').select('id, images, og_image_url, description_md');
  let n = 0;
  for (const p of products) {
    const newImages = (p.images || []).map(i => ({ ...i, src: remap(i.src) }));
    const newOg = remap(p.og_image_url);
    const newDesc = remapText(p.description_md);
    if (JSON.stringify(newImages) !== JSON.stringify(p.images) || newOg !== p.og_image_url || newDesc !== p.description_md) {
      await sb.from('products').update({ images: newImages, og_image_url: newOg, description_md: newDesc }).eq('id', p.id);
      n++;
    }
  }
  console.log(`products: ${n}/${products.length}`);

  // POSTS
  const { data: posts } = await sb.from('posts').select('id, cover_image_url, og_image_url, content_md');
  n = 0;
  for (const p of posts) {
    const newCover = remap(p.cover_image_url);
    const newOg = remap(p.og_image_url);
    const newContent = remapText(p.content_md);
    if (newCover !== p.cover_image_url || newOg !== p.og_image_url || newContent !== p.content_md) {
      await sb.from('posts').update({ cover_image_url: newCover, og_image_url: newOg, content_md: newContent }).eq('id', p.id);
      n++;
    }
  }
  console.log(`posts: ${n}/${posts.length}`);
})();
