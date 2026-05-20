// Phase 0.5 — Build redirect map old WP URL → new URL.
// Strategy:
//   - product / product-category / static pages → keep same URL (no redirect)
//   - /article/ → /blog/
//   - top-level Thai post slugs → /blog/<english-slug>
const fs = require('fs');
const path = require('path');

const posts = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'research', 'data', 'posts.json'), 'utf8'));

// Manually curated English slugs (1-to-1 with posts in order returned by sitemap)
// These are SEO-optimized keyword slugs based on the Thai titles.
const englishSlugMap = {
  'มารู้ 5 สาเหตุของการเกิดน้ำประปาสกปรก พร้อมวิธีแก้ไข': '5-causes-dirty-tap-water',
  'น้ำประปาดื่มได้จริงเหรอ??': 'is-tap-water-safe-to-drink',
  'รู้หรือไม่? ท่อPVC มีอายุการใช้งานเท่าไร': 'pvc-pipe-lifespan',
  'ทริคการบำรุงรักษาท่อ PPR เพื่อยืดอายุการใช้งาน': 'ppr-pipe-maintenance-tips',
  'โปรโมชั่นการจัดส่ง': 'delivery-promotion',
  'Home Tools Center บริการจัดส่ง': 'delivery-service',
  'น้ำประปามาจากไหน': 'where-tap-water-comes-from',
  'โปรโมชั่นสำหรับลูกค้าที่ต้องการเปิดร้านใหม่': 'new-shop-opening-promotion',
  'เลือกท่อน้ำดื่มอย่างไร ให้อุ่นใจ ไร้กังวล': 'how-to-choose-drinking-water-pipe',
  'ท่อพีวีซี เอสซีจี รุ่น Green Premium มีดีอย่างไร ทำไมจึงได้ มอก. ใหม่ "เป็นรายแรกในประเทศไทย"':
    'scg-green-premium-pvc-pipe',
  'ระบบประปา น้ำอุ่น น้ำร้อน ใช้ท่ออะไรดีนะ ?': 'best-pipe-for-hot-water-system',
  '4 เหตุผลที่ต้องเลือกท่อเอสซีจี': '4-reasons-choose-scg-pipe',
  'ระบบสุขาภิบาลมีกี่ประเภท ?': 'types-of-sanitary-system',
  'ระบบน้ำประปาภายในบ้าน': 'home-water-supply-system',
  'โปรโมชั่น ซื้อสี TOA': 'toa-paint-promotion',
  'ประเภทท่อในระบบสุขาภิบาล': 'sanitary-pipe-types',
  'ท่อประปารั่วใต้พื้นบ้าน': 'underground-water-pipe-leak',
  'สาเหตุของเสียงรบกวนจากระบบท่อน้ำทิ้ง เกิดจากอะไร': 'drain-pipe-noise-causes',
  'รูปแบบการเดินท่อประปาภายในบ้าน': 'home-plumbing-layout-guide',
  'ระบบน้ำที่เหมาะกับการใช้ท่อ PPR': 'ppr-pipe-applications',
  'ก๊อกน้ำรั่ว น้ำหยด เกิดจากอะไร': 'leaky-faucet-causes',
  'ปัญหาของระบบประปาที่ทำให้มีตะกอนและมีสิ่งเจือปน': 'tap-water-sediment-problems',
  '3 สาเหตุหลักส่งผลให้ น้ำประปา มีกลิ่นไม่พึง': '3-causes-bad-smell-tap-water',
  '3 วิธีกำจัดกลิ่นคลอรีนในน้ำประปา': '3-ways-remove-chlorine-smell',
  'การตรวจสอบมิเตอร์น้ำ': 'how-to-check-water-meter',
  'เทคนิคแก้ปัญหาท่อน้ำตันได้เองโดยไม่ต้องโทรเรียกช่าง': 'unclog-water-pipe-diy',
  'ความแตกต่างระหว่างท่อร้อยสายไฟ สีเหลือง VS สีขาว': 'yellow-vs-white-conduit-pipe',
  'สวิงเช็ควาล์ว & สปริงเช็ควาล์ว คืออะไร': 'swing-vs-spring-check-valve',
  'ผลิตภัณฑ์ท่อ PVC ตราช้าง SCG': 'scg-elephant-pvc-pipe',
  'ทำอย่างไรเมื่อท่อน้ำรั่วในบ้าน บ้านนะไม่ใช่สวนน้ำ ! อย่าปล่อยให้ปัญหาท่อรั่วบานปลาย':
    'home-pipe-leak-fix-guide',
};

const redirects = [];

// 1. /article/ → /blog
redirects.push({
  from_path: '/article/',
  to_path: '/blog',
  status_code: 301,
  reason: 'blog index moved',
});
redirects.push({
  from_path: '/article',
  to_path: '/blog',
  status_code: 301,
  reason: 'blog index moved',
});

// 2. Thai post slugs → /blog/<english-slug>
const unmapped = [];
for (const post of posts) {
  const fromPath = decodeURIComponent(new URL(post.url).pathname);
  const normalizedTitle = post.title.replace(/\s+/g, ' ').trim();
  const englishSlug = englishSlugMap[post.title]
    || Object.entries(englishSlugMap).find(([k]) => k.replace(/\s+/g, ' ').trim() === normalizedTitle)?.[1];
  if (!englishSlug) {
    unmapped.push(post.title);
    continue;
  }
  post.new_slug_suggested = englishSlug;
  redirects.push({
    from_path: fromPath,
    from_path_encoded: new URL(post.url).pathname,
    to_path: `/blog/${englishSlug}`,
    status_code: 301,
    reason: `blog post: ${post.title.slice(0, 50)}`,
  });
}

// Save updated posts with English slugs
fs.writeFileSync(
  path.join(__dirname, '..', 'research', 'data', 'posts.json'),
  JSON.stringify(posts, null, 2)
);

// Save redirect map
fs.writeFileSync(
  path.join(__dirname, '..', 'research', 'redirect-map.json'),
  JSON.stringify(redirects, null, 2)
);

// CSV for readability
const csv = ['from_path,to_path,status_code,reason'];
redirects.forEach(r => csv.push(`"${r.from_path}","${r.to_path}",${r.status_code},"${r.reason}"`));
fs.writeFileSync(
  path.join(__dirname, '..', 'research', 'redirect-map.csv'),
  csv.join('\n')
);

console.log('Redirects:', redirects.length);
console.log('Posts with English slugs:', posts.filter(p => p.new_slug_suggested).length, '/', posts.length);
if (unmapped.length) {
  console.log('UNMAPPED titles:');
  unmapped.forEach(t => console.log('  -', t));
}
