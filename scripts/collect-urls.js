// Phase 0.1 — Pull all URLs from sitemaps.
const fs = require('fs');
const path = require('path');

const SITEMAPS = [
  'https://hometools-center.com/post-sitemap.xml',
  'https://hometools-center.com/page-sitemap.xml',
  'https://hometools-center.com/product-sitemap.xml',
  'https://hometools-center.com/product_cat-sitemap.xml',
];

function classify(url, sitemap) {
  if (url.replace(/\/$/, '') === 'https://hometools-center.com') return 'home';
  if (/\/product-category\//.test(url)) return 'product_category';
  if (/\/product\/[^/]+\/?$/.test(url)) return 'product';
  if (sitemap === 'post-sitemap.xml') return 'post';
  if (sitemap === 'page-sitemap.xml') return 'page';
  return 'other';
}

async function fetchXml(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'HT-Migration/1.0' } });
  return await res.text();
}

(async () => {
  const all = [];
  for (const sm of SITEMAPS) {
    const xml = await fetchXml(sm);
    const items = [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)].map(m => {
      const block = m[1];
      const loc = (block.match(/<loc>([^<]+)<\/loc>/) || [])[1];
      const lastmod = (block.match(/<lastmod>([^<]+)<\/lastmod>/) || [])[1] || null;
      const img = (block.match(/<image:loc>([^<]+)<\/image:loc>/) || [])[1] || null;
      return { url: loc, lastmod, image: img, source_sitemap: sm.split('/').pop() };
    });
    all.push(...items);
  }
  const enriched = all.map(it => ({ ...it, type: classify(it.url, it.source_sitemap) }));
  const byType = enriched.reduce((acc, x) => ((acc[x.type] = (acc[x.type] || 0) + 1), acc), {});

  const outDir = path.join(__dirname, '..', 'research');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'url-list.json'), JSON.stringify(enriched, null, 2));
  console.log('Total URLs:', enriched.length);
  console.log('By type:', byType);
})();
