// Phase 0.4 — Use Playwright to extract design tokens from live site.
// Captures: fonts, colors (from key elements), spacing samples, breakpoints (CSS), logo URL.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  await page.goto('https://hometools-center.com/', { waitUntil: 'networkidle', timeout: 60000 });

  const tokens = await page.evaluate(() => {
    const root = document.documentElement;
    const body = document.body;
    const cs = getComputedStyle.bind(window);

    const cssVars = {};
    for (const sheet of document.styleSheets) {
      try {
        for (const rule of sheet.cssRules || []) {
          if (rule.style) {
            for (const prop of rule.style) {
              if (prop.startsWith('--')) {
                cssVars[prop] = rule.style.getPropertyValue(prop).trim();
              }
            }
          }
        }
      } catch { /* CORS */ }
    }

    const grab = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const s = cs(el);
      return {
        color: s.color,
        background: s.backgroundColor,
        font: s.fontFamily,
        fontSize: s.fontSize,
        fontWeight: s.fontWeight,
        lineHeight: s.lineHeight,
        padding: s.padding,
        margin: s.margin,
        borderRadius: s.borderRadius,
      };
    };

    return {
      cssVars,
      body: { font: cs(body).fontFamily, color: cs(body).color, bg: cs(body).backgroundColor, fontSize: cs(body).fontSize },
      h1: grab('h1'),
      h2: grab('h2'),
      h3: grab('h3'),
      link: grab('a'),
      button: grab('button, .button, .btn, a.button'),
      header: grab('header, .site-header, #masthead'),
      footer: grab('footer, .site-footer'),
      heroBg: grab('.hero, .banner, .home-banner, section:first-of-type'),
      logo: (() => {
        const i = document.querySelector('.site-logo img, .logo img, header img');
        return i ? { src: i.currentSrc || i.src, alt: i.alt, w: i.naturalWidth, h: i.naturalHeight } : null;
      })(),
      productCard: grab('.product, .product-card, .woocommerce ul.products li.product'),
      categoryCard: grab('.category-card, .product-category'),
    };
  });

  // collect all unique colors used (sample)
  const colors = await page.evaluate(() => {
    const seen = new Set();
    document.querySelectorAll('*').forEach(el => {
      const s = getComputedStyle(el);
      [s.color, s.backgroundColor, s.borderColor].forEach(c => {
        if (c && c !== 'rgba(0, 0, 0, 0)' && c !== 'transparent') seen.add(c);
      });
    });
    return [...seen];
  });

  const fonts = await page.evaluate(() => {
    const seen = new Set();
    document.querySelectorAll('*').forEach(el => {
      const f = getComputedStyle(el).fontFamily;
      if (f) seen.add(f);
    });
    return [...seen];
  });

  const out = {
    ...tokens,
    palette: colors,
    fonts,
  };

  fs.writeFileSync(path.join(__dirname, '..', 'research', 'design-tokens.json'), JSON.stringify(out, null, 2));
  console.log('Saved design-tokens.json');
  console.log('Colors:', colors.length, 'Fonts:', fonts.length);
  await browser.close();
})();
