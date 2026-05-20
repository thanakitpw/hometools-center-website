const { chromium } = require('playwright');

const pages = [
  { name: '01-home', url: 'https://hometools-center.com/' },
  { name: '02-shop', url: 'https://hometools-center.com/shop/' },
  { name: '03-system-work-cat', url: 'https://hometools-center.com/product-category/system-work/' },
  { name: '04-product-detail', url: 'https://hometools-center.com/product/toa-premium-grout-plus/' },
  { name: '05-blog', url: 'https://hometools-center.com/blog/' },
  { name: '06-about', url: 'https://hometools-center.com/about-us/' },
  { name: '07-contact', url: 'https://hometools-center.com/contact-us/' },
];

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const meta = [];
  for (const p of pages) {
    try {
      await page.goto(p.url, { waitUntil: 'networkidle', timeout: 45000 });
      await page.waitForTimeout(1500);
      const title = await page.title();
      const desc = await page.$eval('meta[name="description"]', el => el.content).catch(() => '');
      const h1 = await page.$$eval('h1', els => els.map(e => e.textContent.trim())).catch(() => []);
      await page.screenshot({ path: `research/screenshots/${p.name}-desktop.png`, fullPage: true });
      // mobile
      await page.setViewportSize({ width: 390, height: 844 });
      await page.waitForTimeout(800);
      await page.screenshot({ path: `research/screenshots/${p.name}-mobile.png`, fullPage: true });
      await page.setViewportSize({ width: 1440, height: 900 });
      meta.push({ name: p.name, url: p.url, title, desc, h1 });
      console.log('OK', p.name);
    } catch (e) {
      console.log('ERR', p.name, e.message);
      meta.push({ name: p.name, url: p.url, error: e.message });
    }
  }
  require('fs').writeFileSync('research/page-meta.json', JSON.stringify(meta, null, 2));
  await browser.close();
})();
