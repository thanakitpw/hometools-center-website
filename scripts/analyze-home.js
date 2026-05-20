// Parse home HTML, extract section structure + all image URLs.
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const meta = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'research', 'crawl-meta.json'), 'utf8'));
const home = meta.find(m => m.type === 'home');
if (!home) { console.error('home not found'); process.exit(1); }

const html = fs.readFileSync(path.join(__dirname, '..', 'research', 'crawl', `${home.id}.html`), 'utf8');
const $ = cheerio.load(html);

// Strip header/footer/scripts to focus on body content
$('script, style, header, footer, noscript').remove();

// List top-level sections (Elementor usually creates section.elementor-section)
const sections = [];
$('main section, .elementor-section, .elementor-top-section').each((i, el) => {
  const $el = $(el);
  const cls = ($el.attr('class') || '').slice(0, 60);
  const headings = $el.find('h1, h2, h3').map((_, h) => $(h).text().trim().slice(0, 70)).get();
  const images = $el.find('img').map((_, img) => {
    const src = $(img).attr('data-src') || $(img).attr('src');
    return src && !src.startsWith('data:') ? src : null;
  }).get().filter(Boolean);
  const text = $el.text().replace(/\s+/g, ' ').trim().slice(0, 200);
  sections.push({ i, cls, headings, imageCount: images.length, sampleImages: images.slice(0, 3), textPreview: text });
});

// All images on the page
const allImgs = [];
$('img').each((_, img) => {
  const $i = $(img);
  const src = $i.attr('data-src') || $i.attr('src');
  if (src && !src.startsWith('data:')) {
    allImgs.push({ src, alt: $i.attr('alt') || '', class: ($i.attr('class') || '').slice(0, 40) });
  }
});

console.log('Total sections found:', sections.length);
sections.slice(0, 30).forEach((s, idx) => {
  console.log(`\n--- Section ${idx + 1} ---`);
  console.log('classes:', s.cls);
  console.log('headings:', s.headings.join(' | '));
  console.log('images:', s.imageCount);
  if (s.sampleImages.length) console.log('  sample:', s.sampleImages[0]);
  console.log('text:', s.textPreview.slice(0, 120));
});

console.log('\n=== All images on home page (' + allImgs.length + ') ===');
allImgs.forEach((i, n) => console.log(`${n + 1}. ${i.src.replace('https://hometools-center.com/wp-content/uploads/', '...')} (alt: ${i.alt.slice(0, 30)})`));

fs.writeFileSync(path.join(__dirname, '..', 'research', 'home-sections.json'), JSON.stringify({ sections, images: allImgs }, null, 2));
console.log('\nSaved research/home-sections.json');
