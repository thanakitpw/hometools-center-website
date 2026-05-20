// Phase 0.2 — Full crawl with Playwright. Saves HTML + meta + screenshots.
// Resumable: skips URLs already crawled.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');
const RESEARCH = path.join(ROOT, 'research');
const CRAWL_DIR = path.join(RESEARCH, 'crawl');
const SHOTS_DIR = path.join(RESEARCH, 'screenshots-full');
const META_PATH = path.join(RESEARCH, 'crawl-meta.json');
const PROGRESS_PATH = path.join(RESEARCH, 'crawl-progress.json');

fs.mkdirSync(CRAWL_DIR, { recursive: true });
fs.mkdirSync(SHOTS_DIR, { recursive: true });

const CONCURRENCY = 3;
const TIMEOUT = 45000;

function slugId(url) {
  // safe filename id from URL
  const u = new URL(url);
  let p = decodeURIComponent(u.pathname).replace(/\//g, '_').replace(/[^a-zA-Z0-9_\-]/g, '');
  if (!p || p === '_') p = '_home';
  // Add short hash to avoid collisions from heavy stripping (Thai slugs)
  const h = crypto.createHash('md5').update(url).digest('hex').slice(0, 6);
  return `${p.slice(0, 80)}__${h}`;
}

async function crawlOne(ctx, item) {
  const page = await ctx.newPage();
  const id = slugId(item.url);
  const result = { id, url: item.url, type: item.type, ok: false };
  try {
    const resp = await page.goto(item.url, { waitUntil: 'domcontentloaded', timeout: TIMEOUT });
    result.status = resp ? resp.status() : null;
    // wait a bit more for lazy load
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(800);

    const html = await page.content();
    fs.writeFileSync(path.join(CRAWL_DIR, `${id}.html`), html);

    result.title = await page.title();
    result.meta = await page.evaluate(() => {
      const get = (sel, attr) => {
        const el = document.querySelector(sel);
        return el ? (attr ? el.getAttribute(attr) : el.textContent.trim()) : null;
      };
      const getAll = (sel) => [...document.querySelectorAll(sel)].map(e => e.textContent.trim()).filter(Boolean);
      const jsonld = [...document.querySelectorAll('script[type="application/ld+json"]')].map(s => {
        try { return JSON.parse(s.textContent); } catch { return null; }
      }).filter(Boolean);
      return {
        description: get('meta[name="description"]', 'content'),
        canonical: get('link[rel="canonical"]', 'href'),
        robots: get('meta[name="robots"]', 'content'),
        og: {
          title: get('meta[property="og:title"]', 'content'),
          description: get('meta[property="og:description"]', 'content'),
          image: get('meta[property="og:image"]', 'content'),
          type: get('meta[property="og:type"]', 'content'),
        },
        h1: getAll('h1'),
        h2: getAll('h2').slice(0, 30),
        breadcrumb: getAll('.breadcrumbs a, .woocommerce-breadcrumb a, nav[aria-label="Breadcrumb"] a'),
        images: [...document.querySelectorAll('img')].slice(0, 60).map(i => ({
          src: i.currentSrc || i.src,
          alt: i.alt,
          w: i.naturalWidth || null,
          h: i.naturalHeight || null,
        })).filter(i => i.src && !i.src.startsWith('data:')),
        jsonld,
      };
    });

    // screenshots only for representative pages (limit total size)
    const shouldShoot = ['home', 'product_category', 'post', 'page'].includes(item.type)
      || (item.type === 'product' && Math.random() < 0.15);  // 15% sample of products
    if (shouldShoot) {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.screenshot({ path: path.join(SHOTS_DIR, `${id}__desktop.png`), fullPage: true }).catch(() => {});
      await page.setViewportSize({ width: 390, height: 844 });
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(SHOTS_DIR, `${id}__mobile.png`), fullPage: true }).catch(() => {});
    }
    result.ok = true;
  } catch (e) {
    result.error = e.message;
  } finally {
    await page.close().catch(() => {});
  }
  return result;
}

(async () => {
  const urls = JSON.parse(fs.readFileSync(path.join(RESEARCH, 'url-list.json'), 'utf8'));
  // dedupe
  const seen = new Set();
  const items = urls.filter(u => {
    if (seen.has(u.url)) return false;
    seen.add(u.url);
    return true;
  });

  // resume
  const progress = fs.existsSync(PROGRESS_PATH)
    ? JSON.parse(fs.readFileSync(PROGRESS_PATH, 'utf8'))
    : { done: {} };
  const todo = items.filter(it => !progress.done[it.url]);
  console.log(`Total: ${items.length}, todo: ${todo.length}, already done: ${Object.keys(progress.done).length}`);

  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    userAgent: 'HT-Migration-Crawler/1.0',
  });

  let idx = 0;
  const results = Object.values(progress.done);
  let lastSave = Date.now();

  async function worker() {
    while (idx < todo.length) {
      const i = idx++;
      const item = todo[i];
      const t0 = Date.now();
      const r = await crawlOne(ctx, item);
      progress.done[item.url] = r;
      results.push(r);
      const ms = Date.now() - t0;
      console.log(`[${results.length}/${items.length}] ${r.ok ? '✓' : '✗'} ${r.type} ${ms}ms ${item.url.replace('https://hometools-center.com', '')}`);
      // periodic save
      if (Date.now() - lastSave > 5000) {
        fs.writeFileSync(PROGRESS_PATH, JSON.stringify(progress, null, 2));
        lastSave = Date.now();
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  fs.writeFileSync(PROGRESS_PATH, JSON.stringify(progress, null, 2));
  fs.writeFileSync(META_PATH, JSON.stringify(results, null, 2));
  await browser.close();
  const okCount = results.filter(r => r.ok).length;
  console.log(`\nDONE. OK: ${okCount}/${results.length}`);
})();
