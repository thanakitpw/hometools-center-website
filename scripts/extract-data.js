// Phase 0.3 — Parse crawled HTML → structured data (cheerio, fast + low memory).
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const ROOT = path.join(__dirname, '..');
const RESEARCH = path.join(ROOT, 'research');
const CRAWL = path.join(RESEARCH, 'crawl');
const OUT = path.join(RESEARCH, 'data');
fs.mkdirSync(OUT, { recursive: true });

const meta = JSON.parse(fs.readFileSync(path.join(RESEARCH, 'crawl-meta.json'), 'utf8'));

const slugFromUrl = (url) => decodeURIComponent(new URL(url).pathname).replace(/^\/|\/$/g, '');
const txt = (s) => (s || '').replace(/\s+/g, ' ').trim();
const readHtml = (id) => {
  const p = path.join(CRAWL, `${id}.html`);
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null;
};

function findProductJsonLd(jsonld = []) {
  for (const block of jsonld) {
    if (!block) continue;
    if (block['@type'] === 'Product') return block;
    if (block['@graph']) {
      const p = block['@graph'].find(g => g['@type'] === 'Product');
      if (p) return p;
    }
  }
  return null;
}

function extractProduct(item) {
  const html = readHtml(item.id);
  if (!html) return null;
  const $ = cheerio.load(html, { decodeEntities: false });
  const product = findProductJsonLd(item.meta.jsonld) || {};
  const slug = slugFromUrl(item.url).replace(/^product\//, '');

  const galleryImgs = [];
  $('.woocommerce-product-gallery img, .product-gallery img, figure.wp-block-image img').each((_, el) => {
    const $el = $(el);
    const src = $el.attr('data-large_image') || $el.attr('data-src') || $el.attr('src');
    if (src && !src.startsWith('data:')) galleryImgs.push({ src, alt: $el.attr('alt') || '' });
  });

  const shortDesc = txt($('.woocommerce-product-details__short-description, .product-short-description').first().text());
  const longDesc = txt($('#tab-description, .woocommerce-Tabs-panel--description, .product-description').first().text());

  const specs = [];
  $('.product-attributes tr, .shop_attributes tr').each((_, tr) => {
    const k = txt($(tr).find('th, .label').first().text());
    const v = txt($(tr).find('td, .value').first().text());
    if (k && v) specs.push({ key: k, value: v });
  });

  return {
    slug, url: item.url, title: item.title,
    name_th: item.meta.h1?.[0] || product.name || item.title,
    sku: product.sku || null,
    short_description: shortDesc || product.description || '',
    description_md: longDesc || '',
    images: galleryImgs.length ? galleryImgs : (product.image ? (Array.isArray(product.image) ? product.image : [product.image]).map(src => ({ src, alt: '' })) : []),
    specs,
    breadcrumb: item.meta.breadcrumb || [],
    seo_title: item.title,
    seo_description: item.meta.description || '',
    og_image: item.meta.og?.image || null,
  };
}

function extractCategory(item) {
  const html = readHtml(item.id);
  if (!html) return null;
  const $ = cheerio.load(html, { decodeEntities: false });
  const slug = slugFromUrl(item.url).replace(/^product-category\//, '');
  const banner = $('.term-description img, .category-banner img, .archive-header img').first();
  return {
    slug, url: item.url,
    name_th: (item.meta.h1?.[0] || item.title).replace(/^หมวดหมู่\s*:\s*/, '').trim(),
    title: item.title,
    seo_title: item.title,
    seo_description: item.meta.description || '',
    banner_image_url: banner.length ? banner.attr('data-src') || banner.attr('src') : null,
    breadcrumb: item.meta.breadcrumb || [],
  };
}

function extractPost(item) {
  const html = readHtml(item.id);
  if (!html) return null;
  const $ = cheerio.load(html, { decodeEntities: false });
  const $article = $('article, .entry-content, .post-content').first();
  const content = $article.length ? $article.html() : '';
  const cover = $('article img, .post-thumbnail img, figure img').first();
  return {
    old_slug_thai: slugFromUrl(item.url),
    url: item.url,
    title: item.meta.h1?.[0] || item.title,
    seo_title: item.title,
    seo_description: item.meta.description || '',
    cover_image_url: cover.length ? (cover.attr('data-src') || cover.attr('src')) : null,
    content_html: content || '',
    og_image: item.meta.og?.image || null,
    new_slug_suggested: null,
  };
}

function extractPage(item) {
  return {
    slug: slugFromUrl(item.url),
    url: item.url,
    title: item.title,
    h1: item.meta.h1?.[0] || null,
    seo_description: item.meta.description || '',
  };
}

const products = [], categories = [], posts = [], pages = [];
let n = 0;
for (const it of meta) {
  n++;
  if (!it.ok) continue;
  try {
    if (it.type === 'product') { const p = extractProduct(it); if (p) products.push(p); }
    else if (it.type === 'product_category') { const c = extractCategory(it); if (c) categories.push(c); }
    else if (it.type === 'post') { const p = extractPost(it); if (p) posts.push(p); }
    else if (it.type === 'page') pages.push(extractPage(it));
  } catch (e) { console.error('err', it.url, e.message); }
  if (n % 50 === 0) console.log('progress', n, '/', meta.length);
}

const brands = ['TOA','SCG','ANA','ELIXIR','SANWA','GRAND','Grundfos'].map(name => ({ slug: name.toLowerCase(), name }));

const allImages = new Set();
products.forEach(p => p.images.forEach(i => i.src && allImages.add(i.src)));
categories.forEach(c => c.banner_image_url && allImages.add(c.banner_image_url));
posts.forEach(p => p.cover_image_url && allImages.add(p.cover_image_url));

fs.writeFileSync(path.join(OUT, 'products.json'), JSON.stringify(products, null, 2));
fs.writeFileSync(path.join(OUT, 'categories.json'), JSON.stringify(categories, null, 2));
fs.writeFileSync(path.join(OUT, 'posts.json'), JSON.stringify(posts, null, 2));
fs.writeFileSync(path.join(OUT, 'pages.json'), JSON.stringify(pages, null, 2));
fs.writeFileSync(path.join(OUT, 'brands.json'), JSON.stringify(brands, null, 2));
fs.writeFileSync(path.join(OUT, 'images.json'), JSON.stringify([...allImages], null, 2));

console.log('Products:', products.length);
console.log('Categories:', categories.length);
console.log('Posts:', posts.length);
console.log('Pages:', pages.length);
console.log('Brand seeds:', brands.length);
console.log('Unique images:', allImages.size);
