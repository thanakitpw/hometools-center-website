// Extract HTML body content for static pages from crawled data
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const meta = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'research', 'crawl-meta.json'), 'utf8'));
const STATIC_SLUGS = ['about-us', 'contact-us', 'promotion', 'how-to-place-an-order', 'privacy-policy', 'cookie-policy'];

const out = {};
for (const slug of STATIC_SLUGS) {
  const item = meta.find(m => m.type === 'page' && m.url.includes('/' + slug));
  if (!item) { console.log('MISS:', slug); continue; }
  const html = fs.readFileSync(path.join(__dirname, '..', 'research', 'crawl', `${item.id}.html`), 'utf8');
  const $ = cheerio.load(html, { decodeEntities: false });
  $('script, style, noscript, header, footer, .site-header, .site-footer, .header, .footer, .elementor-location-header, .elementor-location-footer').remove();

  // Try Elementor's main content container first
  let $main = $('.elementor-location-single, main .elementor, [data-elementor-type="single-page"]').first();
  if (!$main.length) $main = $('main').first();
  if (!$main.length) $main = $('body').first();

  // Extract plain text paragraphs + headings, preserve a minimal structure
  const blocks = [];
  $main.find('h1, h2, h3, h4, p, li, img, iframe').each((_, el) => {
    const $el = $(el);
    if (el.name === 'img') {
      const src = $el.attr('data-src') || $el.attr('src');
      if (src && !src.startsWith('data:')) blocks.push({ type: 'img', src, alt: $el.attr('alt') || '' });
    } else if (el.name === 'iframe') {
      const src = $el.attr('src');
      if (src) blocks.push({ type: 'iframe', src });
    } else {
      const text = $el.text().replace(/\s+/g, ' ').trim();
      if (text) blocks.push({ type: el.name, text });
    }
  });

  out[slug] = {
    slug,
    title: item.title,
    h1: item.meta.h1?.[0] || null,
    seo_description: item.meta.description || '',
    blocks: dedupe(blocks),
  };
  console.log(slug, '→', blocks.length, 'blocks');
}

function dedupe(blocks) {
  const seen = new Set();
  return blocks.filter(b => {
    const k = b.type + '|' + (b.text || b.src || '');
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

fs.writeFileSync(path.join(__dirname, '..', 'research', 'data', 'static-pages.json'), JSON.stringify(out, null, 2));
console.log('Saved research/data/static-pages.json');
