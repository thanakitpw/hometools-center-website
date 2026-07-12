// Detailed re-crawl of ALL live products (343) → research/recrawl-2026-06/products-detailed.json
// Resumable: skips URLs already in the output file. Run: node scripts/recrawl-products.js
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, '..', 'research', 'recrawl-2026-06');
const URLS = require(path.join(DIR, 'product-urls.json'));
const OUT = path.join(DIR, 'products-detailed.json');
const CONCURRENCY = 5;

function slugFromUrl(u) {
  const m = decodeURIComponent(u).match(/\/product\/([^/]+)\/?$/);
  return m ? m[1] : u;
}

async function extract(page, url) {
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
  } catch (e) {
    await page.goto(url, { waitUntil: 'load', timeout: 45000 }).catch(() => {});
  }
  await page.waitForTimeout(400);
  // force lazy imgs
  await page.evaluate(() => document.querySelectorAll('img').forEach(i => { const d = i.getAttribute('data-src') || i.getAttribute('data-lazy-src'); if (d) i.src = d; }));
  await page.waitForTimeout(150);
  const data = await page.evaluate(() => {
    const clean = s => (s || '').replace(/\s+/g, ' ').trim();
    let product = {};
    for (const s of document.querySelectorAll('script[type="application/ld+json"]')) {
      try {
        const j = JSON.parse(s.textContent);
        const nodes = j['@graph'] ? j['@graph'] : [j];
        const prod = nodes.find(n => n['@type'] === 'Product' || (Array.isArray(n['@type']) && n['@type'].includes('Product')));
        if (prod) product = prod;
      } catch (e) {}
    }
    const gallery = [...document.querySelectorAll('.woocommerce-product-gallery__image a, .woocommerce-product-gallery img')]
      .map(e => e.getAttribute('data-large_image') || e.getAttribute('href') || e.currentSrc || e.src)
      .filter(s => s && !s.startsWith('data:'));
    const breadcrumb = [...document.querySelectorAll('.woocommerce-breadcrumb a, nav.woocommerce-breadcrumb a')].map(a => a.innerText.trim());
    const shortEl = document.querySelector('.woocommerce-product-details__short-description');
    const longEl = document.querySelector('#tab-description, .woocommerce-Tabs-panel--description, .woocommerce-product-details__description');
    const attrs = [...document.querySelectorAll('.shop_attributes tr, .woocommerce-product-attributes tr')].map(tr => {
      const k = tr.querySelector('th,td:first-child'), v = tr.querySelector('td:last-child');
      return { key: clean(k && k.innerText), value: clean(v && v.innerText) };
    }).filter(a => a.key && a.value);
    const og = document.querySelector('meta[property="og:image"]')?.content || null;
    const metaDesc = document.querySelector('meta[name="description"]')?.content || null;
    const pdf = [...document.querySelectorAll('a[href$=".pdf"], a[href*=".pdf"]')].map(a => a.href).filter(Boolean);
    return {
      title: document.title,
      name_th: document.querySelector('h1')?.innerText.trim() || product.name || '',
      sku: product.sku || document.querySelector('.sku')?.innerText.trim() || null,
      short_description: shortEl ? shortEl.innerHTML.trim() : '',
      description_html: longEl ? longEl.innerHTML.trim() : '',
      description_text: longEl ? clean(longEl.innerText) : '',
      images: [...new Set(gallery)].map(src => ({ src, alt: '' })),
      breadcrumb,
      primary_category: breadcrumb.filter(b => b !== 'Home' && b !== 'หน้าแรก').slice(-1)[0] || null,
      specs: attrs,
      catalog_pdf_url: pdf[0] || null,
      og_image_url: og,
      seo_description: metaDesc,
    };
  });
  return data;
}

(async () => {
  const done = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : [];
  const doneUrls = new Set(done.map(d => d.url));
  const todo = URLS.filter(u => !doneUrls.has(u));
  console.log(`total ${URLS.length}, done ${done.length}, todo ${todo.length}`);

  const browser = await chromium.launch();
  const results = [...done];
  let idx = 0, ok = 0, fail = 0;

  async function worker(wid) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
    const page = await ctx.newPage();
    while (idx < todo.length) {
      const myIdx = idx++;
      const url = todo[myIdx];
      try {
        const d = await extract(page, url);
        d.url = url;
        d.slug = slugFromUrl(url);
        results.push(d);
        ok++;
      } catch (e) {
        fail++;
        console.log('FAIL', slugFromUrl(url), e.message.slice(0, 50));
      }
      if ((ok + fail) % 20 === 0) {
        fs.writeFileSync(OUT, JSON.stringify(results, null, 1));
        console.log(`progress ${ok + fail}/${todo.length} (ok ${ok}, fail ${fail})`);
      }
    }
    await ctx.close();
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, (_, i) => worker(i)));
  fs.writeFileSync(OUT, JSON.stringify(results, null, 1));
  console.log(`DONE. total saved ${results.length} (ok ${ok}, fail ${fail})`);
  await browser.close();
})();
