const { chromium } = require('playwright');
const path = require('path');

const pages = [
  { name: 'home', url: 'http://localhost:3000/' },
  { name: 'shop', url: 'http://localhost:3000/shop' },
  { name: 'category', url: 'http://localhost:3000/product-category/system-work' },
  { name: 'product', url: 'http://localhost:3000/product/supershield-extra-polyurethane' },
  { name: 'blog', url: 'http://localhost:3000/blog' },
  { name: 'blog-detail', url: 'http://localhost:3000/blog/pvc-pipe-lifespan' },
];

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  for (const p of pages) {
    try {
      const resp = await page.goto(p.url, { waitUntil: 'networkidle', timeout: 30000 });
      console.log(p.name, '→', resp?.status());
      await page.waitForTimeout(800);
      await page.screenshot({ path: path.join(__dirname, '..', 'research', `preview-${p.name}.png`), fullPage: true });
    } catch (e) {
      console.log(p.name, 'ERR', e.message);
    }
  }
  await browser.close();
})();
