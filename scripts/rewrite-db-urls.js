// Reapply image URL mapping → DB (covers re-mapped files after fix-collided-images run).
require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const mapping = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'research', 'image-url-map.json'), 'utf8'));

const WP_PREFIX = 'https://hometools-center.com/wp-content/uploads/';

// Also build a "any old URL pattern" remap including non-mapped Supabase variants
function remap(url) {
  if (!url) return url;
  // If it's a WP url, try direct mapping
  if (mapping[url]) return mapping[url];
  // If it's already a Supabase URL with a bad path that has a corresponding "good" mapping,
  // try to find a similar entry
  return url;
}

function remapText(text) {
  if (!text) return text;
  let out = text;
  for (const [oldUrl, newUrl] of Object.entries(mapping)) {
    if (out.includes(oldUrl)) out = out.split(oldUrl).join(newUrl);
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

  // Verify: count remaining WP URLs in products/posts
  const { data: leftovers } = await sb.from('products').select('id, images').limit(500);
  const stillWp = leftovers.filter(p => (p.images || []).some(i => i.src && i.src.startsWith(WP_PREFIX))).length;
  console.log(`products still pointing to WP: ${stillWp}`);
})();
