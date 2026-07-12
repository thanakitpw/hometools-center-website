// scripts/db/verify.js
// Parity gate for the WP → Supabase DB re-migration: counts, referential
// integrity, dead-media-URL detection, and sample media reachability.
//
// Run: node scripts/db/verify.js
//
// Deviations from the original task brief (see .superpowers/sdd/task-9-brief.md):
//   - EXPECT.products is 347, not 348 (348 was a grep artifact on the raw SQL
//     dump; 347 is the authoritative SQL COUNT — see progress.md Task 6/8).
//   - The strict "all-products-have-images" (==0) check is replaced: 2 products
//     legitimately ship with an empty images[] (no featured image ever existed
//     in WP — toa-polyurethane-semi-gloss-2k, toa-polyurethane-matt-2k). That's
//     now an INFO line, not a failure. The real integrity gate instead fails on
//     any *dead* media URL — i.e. any product/post image, cover, or OG URL that
//     is not hosted on Supabase Storage (for example a leftover
//     hometools-center.com URL).
require('dotenv').config({ path: require('node:path').join(__dirname, '..', '..', '.env.local') });
const path = require('node:path');
const fs = require('node:fs');
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } });

const EXPECT = { products: 347, categories: 42, posts: 31 };
const STORAGE_PREFIX = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/`;

(async () => {
  const report = { checks: [], info: [], ok: true };
  const check = (name, pass, detail) => { report.checks.push({ name, pass, detail }); if (!pass) report.ok = false; };
  const info = (name, detail) => { report.info.push({ name, detail }); };

  for (const [t, n] of Object.entries(EXPECT)) {
    const { count } = await sb.from(t).select('*', { count: 'exact', head: true });
    check(`count:${t}`, count === n, `${count}/${n}`);
  }
  const { count: rc } = await sb.from('redirects').select('*', { count: 'exact', head: true });
  check('count:redirects>=78', rc >= 78, `${rc}`);

  // referential: no product with a dangling primary category
  const { data: prods } = await sb.from('products').select('id,slug,primary_category_id,images,og_image_url,description_md').limit(1000);
  const { data: cats } = await sb.from('categories').select('id');
  const catIds = new Set(cats.map(c => c.id));
  const dangling = prods.filter(p => p.primary_category_id && !catIds.has(p.primary_category_id));
  check('no-dangling-primary-category', dangling.length === 0, `${dangling.length} dangling`);

  // imageless products: expected exactly 2 (no featured image ever existed in WP)
  const noImg = prods.filter(p => !p.images || p.images.length === 0);
  info('imageless-products', `${noImg.length} product(s) with empty images[] (expect 2): ${noImg.map(p => p.slug).join(', ') || 'none'}`);

  // dead-media-URL gate: every product image/og URL, and every post
  // cover/og URL, must be a Supabase Storage URL (never a raw hometools-center.com URL)
  const { data: posts } = await sb.from('posts').select('id,slug,cover_image_url,og_image_url,content_md').limit(1000);
  const urls = [];
  for (const p of prods) {
    for (const u of (p.images || [])) urls.push({ src: `product:${p.slug}:images`, url: u });
    if (p.og_image_url) urls.push({ src: `product:${p.slug}:og_image_url`, url: p.og_image_url });
  }
  for (const p of posts) {
    if (p.cover_image_url) urls.push({ src: `post:${p.slug}:cover_image_url`, url: p.cover_image_url });
    if (p.og_image_url) urls.push({ src: `post:${p.slug}:og_image_url`, url: p.og_image_url });
  }
  const dead = urls.filter(({ url }) => !url.startsWith(STORAGE_PREFIX));
  check('no-dead-media-urls', dead.length === 0,
    dead.length === 0 ? `${urls.length} URLs checked, all on Storage` : `${dead.length} non-Storage URL(s): ${dead.slice(0, 5).map(d => `${d.src}=${d.url}`).join(' | ')}`);

  // media reachability: sample 3 products that DO have images → HTTP 200
  const sample = prods.filter(p => p.images && p.images[0]).slice(0, 3);
  for (const p of sample) {
    const r = await fetch(p.images[0]);
    check(`img-200:${p.slug}`, r.status === 200, `${r.status}`);
  }

  // body-scan gate: catches dead links embedded IN the rich-text body itself
  // (as opposed to the images[]/og_image_url/cover_image_url columns checked
  // above), e.g. an un-rewritten <a href> to a WP upload, or the
  // root-relativized-but-still-dead form left behind when rewrite()'s
  // unconditional domain-stripping runs on a URL that was never resolved
  // through url-map: "/wp-content/uploads/...".
  //
  // The hometools-center.com check is scoped to it appearing as an actual
  // (unescaped) link target — i.e. immediately preceded by "://" — rather
  // than a bare substring match anywhere in the text. A bare substring match
  // also fires on things like a Facebook l.php share-redirect whose "u="
  // query param percent-encodes "http%3A%2F%2Fwww.hometools-center.com":
  // that's a live, functioning external link (and hometools-center.com
  // remains the site's own live domain post-cutover) — not a dead one — so
  // flagging it would be a false positive unrelated to the media migration.
  const bodyOffenders = [];
  const isDeadBody = (text) => !!text && (text.includes('/wp-content/uploads/') || /:\/\/(?:www\.)?hometools-center\.com/.test(text));
  for (const p of prods) {
    if (isDeadBody(p.description_md)) bodyOffenders.push(`product:${p.slug}`);
  }
  for (const p of posts) {
    if (isDeadBody(p.content_md)) bodyOffenders.push(`post:${p.slug}`);
  }
  check('no-dead-links-in-body', bodyOffenders.length === 0,
    bodyOffenders.length === 0 ? `${prods.length + posts.length} bodies checked, none dead` : `${bodyOffenders.length} offender(s): ${bodyOffenders.slice(0, 10).join(', ')}`);

  fs.mkdirSync(path.join(__dirname, '..', '..', 'research', 'db-2026-07'), { recursive: true });
  fs.writeFileSync(path.join(__dirname, '..', '..', 'research', 'db-2026-07', 'verify-report.json'),
    JSON.stringify(report, null, 2));
  for (const i of report.info) console.log(`INFO ${i.name} (${i.detail})`);
  for (const c of report.checks) console.log(`${c.pass ? 'OK ' : 'FAIL'} ${c.name} (${c.detail})`);
  process.exit(report.ok ? 0 : 1);
})();
