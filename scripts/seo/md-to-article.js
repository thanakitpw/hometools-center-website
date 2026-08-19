#!/usr/bin/env node
/**
 * Convert an SEO draft (markdown, as written by the content team) into the pair of
 * files `publish-post.js` expects: `seo/published/<slug>.html` + `<slug>.json`.
 *
 *   node scripts/seo/md-to-article.js seo/blogs/<file>.md [--force]
 *   node scripts/seo/md-to-article.js seo/blogs/*.md
 *
 * The drafts all follow one house template — an SEO META comment block, an H1, a bold
 * lead paragraph, `##` sections, markdown tables, a bold-question FAQ, and a closing CTA
 * that links to the homepage. This converts the mechanical parts and applies the
 * `.article-body` class vocabulary from app/globals.css; the editorial part that cannot be
 * derived from the draft — which category or product page the CTA should point at — comes
 * from the CTA_LINKS table below and has to be filled in per article.
 *
 * Existing files are left alone unless --force, so hand-tuned articles are never
 * silently overwritten by a re-run.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const OUT_DIR = path.join(ROOT, 'seo', 'published');

const CAT = {
  system: '/product-category/system-work',
  pvc: '/product-category/system-work/pvc-pipes-and-fittings-scg',
  ppr: '/product-category/system-work/ppr-pipes-and-fittings',
  pumps: '/product-category/system-work/meters-taps-sluices-water-pumps-and-valves',
  tank: '/product-category/system-work/water-tank',
  manhole: '/product-category/system-work/manhole-roof-drain-fordren-and-other-accessories',
  conduit: '/product-category/system-work/conduit-pipe',
  paint: '/product-category/construction-materials-and-equipment/toa-color/decorative-coatings',
  chemicals: '/product-category/construction-materials-and-equipment/toa-color/construction-chemicals',
};

/** Per-article CTA: which page on this site actually answers the article's question. */
const CTA_LINKS = {
  'paint-coverage-per-bucket':       [CAT.paint,     'ดูสีทาบ้าน TOA ทั้งหมด'],
  'exterior-paint-guide':            [CAT.paint,     'ดูสีทาบ้าน TOA ทั้งหมด'],
  'precast-manhole-vs-brick':        [CAT.manhole,   'ดูบ่อพักและอุปกรณ์ระบายน้ำ'],
  'drain-grating-guide':             [CAT.manhole,   'ดูตะแกรงและฝาบ่อพัก'],
  'ppr-pipe-vs-pvc':                 [CAT.ppr,       'ดูท่อและอุปกรณ์ PPR'],
  'pvc-pipe-size-chart':             [CAT.pvc,       'ดูท่อและอุปกรณ์ PVC'],
  'noisy-water-pump-fix':            [CAT.pumps,     'ดูปั๊มน้ำและอุปกรณ์'],
  'pvc-pipe-glue':                   [CAT.pvc,       'ดูท่อและอุปกรณ์ PVC'],
  'water-pump-size-house':           [CAT.pumps,     'ดูปั๊มน้ำทุกรุ่น'],
  'how-to-paint-wall':               [CAT.paint,     'ดูสีทาบ้าน TOA ทั้งหมด'],
  'pvc-pipe-types':                  [CAT.pvc,       'ดูท่อและอุปกรณ์ PVC'],
  'home-plumbing-system-guide':      [CAT.system,    'ดูสินค้างานระบบทั้งหมด'],
  'rooftop-waterproof-paint':        [CAT.chemicals, 'ดูเคมีภัณฑ์กันซึม TOA'],
  'paint-comparison-guide':          [CAT.paint,     'ดูสีทาบ้าน TOA ทั้งหมด'],
  'acrylic-vs-oil-paint':            [CAT.paint,     'ดูสีทาบ้าน TOA ทั้งหมด'],
  'wall-prep-before-painting':       [CAT.paint,     'ดูสีรองพื้นและสีทาบ้าน'],
  'how-to-choose-water-pump':        [CAT.pumps,     'ดูปั๊มน้ำทุกรุ่น'],
  'auto-vs-centrifugal-pump':        [CAT.pumps,     'ดูปั๊มน้ำทุกรุ่น'],
  'water-tank-above-vs-underground': [CAT.tank,      'ดูแท๊งค์น้ำทุกขนาด'],
  'read-water-meter':                [CAT.pumps,     'ดูมิเตอร์น้ำและอุปกรณ์'],
  'how-to-choose-faucet':            [CAT.pumps,     'ดูก๊อกน้ำและวาล์ว'],
  'ppr-heat-fusion':                 [CAT.ppr,       'ดูท่อและอุปกรณ์ PPR'],
  'plumbing-fittings-guide':         [CAT.system,    'ดูอุปกรณ์ประปาทั้งหมด'],
  'gate-valve-vs-ball-valve':        [CAT.pumps,     'ดูประตูน้ำและบอลวาล์ว'],
  'home-drainage-system':            [CAT.manhole,   'ดูอุปกรณ์ระบายน้ำ'],
  'electrical-conduit-types':        [CAT.conduit,   'ดูท่อร้อยสายไฟ'],
};

/** Tag chips shown under the article. Grouped by topic so related posts read as a set. */
const TAGS = {
  [CAT.paint]:     ['สีทาบ้าน', 'สี TOA', 'งานสี'],
  [CAT.chemicals]: ['กันซึม', 'เคมีภัณฑ์ก่อสร้าง', 'งานสี'],
  [CAT.pvc]:       ['ท่อ PVC', 'งานประปา', 'งานระบบ'],
  [CAT.ppr]:       ['ท่อ PPR', 'งานประปา', 'งานระบบ'],
  [CAT.pumps]:     ['ปั๊มน้ำ', 'วาล์วและก๊อกน้ำ', 'งานประปา'],
  [CAT.tank]:      ['แท๊งค์น้ำ', 'งานประปา'],
  [CAT.manhole]:   ['ระบบระบายน้ำ', 'งานระบบ'],
  [CAT.conduit]:   ['ท่อร้อยสายไฟ', 'งานไฟฟ้า'],
  [CAT.system]:    ['งานระบบ', 'งานประปา'],
};

/** Articles whose HTML was written by hand — never regenerate these, even with --force. */
const HAND_TUNED = new Set(['paint-coverage-per-bucket']);

const CTA_BODY =
  'ทีมงาน Home Tool Center ยินดีให้คำแนะนำเรื่องการเลือกสินค้าให้เหมาะกับหน้างาน พร้อมจัดส่งและออกใบเสนอราคาให้';

// ---------------------------------------------------------------- helpers

const esc = (t) => t.replace(/&(?![a-zA-Z#0-9]+;)/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Inline markdown → HTML. Runs after escaping, so it only ever introduces our own tags. */
function inline(t) {
  return esc(t)
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, txt, url) => `<a href="${url}">${txt}</a>`)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[\s(])\*([^*\n]+)\*(?=$|[\s.,)])/g, '$1<em>$2</em>');
}

/** Stable anchor id: reuse the heading's own Latin words when it has any, else position. */
function headingId(text, index, used) {
  let id;
  if (/faq|คำถามที่พบบ่อย/i.test(text)) id = 'faq';
  else if (/^สรุป/.test(text.trim())) id = 'summary';
  else {
    const latin = (text.match(/[A-Za-z0-9]+/g) || []).join('-').toLowerCase().slice(0, 32);
    id = latin.length >= 2 ? latin : `section-${index}`;
  }
  let final = id, n = 2;
  while (used.has(final)) final = `${id}-${n++}`;
  used.add(final);
  return final;
}

function renderTable(rows) {
  const cells = rows.map((r) => r.replace(/^\||\|$/g, '').split('|').map((c) => c.trim()));
  const head = cells[0];
  const body = cells.slice(2); // row 1 is the |---| separator
  const longest = Math.max(...cells.flat().map((c) => c.length));
  const cls = longest <= 22 ? ' class="table-compact"' : '';
  const th = head.map((c) => `<th scope="col">${inline(c)}</th>`).join('');
  const tr = body
    .map((r) => {
      const first = `<th scope="row">${inline(r[0] ?? '')}</th>`;
      const rest = r.slice(1).map((c) => `<td>${inline(c)}</td>`).join('');
      return `      <tr>${first}${rest}</tr>`;
    })
    .join('\n');
  return `  <div class="table-wrap">\n    <table${cls}>\n      <thead>\n        <tr>${th}</tr>\n      </thead>\n      <tbody>\n${tr}\n      </tbody>\n    </table>\n  </div>`;
}

// ---------------------------------------------------------------- main convert

function convert(md, file) {
  const metaBlock = md.match(/^\s*<!--([\s\S]*?)-->/);
  const meta = metaBlock ? metaBlock[1] : '';
  const field = (re) => (meta.match(re) || [])[1]?.trim() || '';

  const slug = (field(/URL slug\s*:\s*\/blog\/([^\s(]+)/) || '').trim();
  if (!slug) throw new Error(`${file}: no "URL slug : /blog/…" in the SEO META block`);

  const primaryKw = field(/Primary KW\s*:\s*([^\n(]+)/);
  const secondaryKw = field(/Secondary KW\s*:\s*([^\n]+)/).split(',').map((s) => s.trim()).filter(Boolean);
  // The drafts write the title with the brand already appended; the layout's metadata
  // template adds "| Home Tool Center" itself, so strip it or it renders twice.
  // Some drafts write the brand in full, some truncate it to "| Home Tool"; either way the
  // layout's metadata template appends "| Home Tool Center" itself, so strip whatever is there.
  const seoTitle = field(/Title tag[^:]*:\s*([^\n]+)/).replace(/\s*\|\s*Home\s*Tool(\s*Center)?\s*$/i, '');
  const seoDesc = field(/Meta desc[^:]*:\s*([^\n]+)/);

  // Body = everything after the meta block, with every other HTML comment removed
  // (the drafts append INTERNAL LINKS / FAQ SCHEMA notes meant for the web team).
  let body = md.slice(metaBlock ? metaBlock[0].length : 0).replace(/<!--[\s\S]*?-->/g, '');

  const h1 = body.match(/^#\s+(.+)$/m);
  if (!h1) throw new Error(`${file}: no H1`);
  const title = h1[1].trim();
  body = body.slice(h1.index + h1[0].length);

  const lines = body.split('\n');
  const out = [];
  const toc = [];
  const used = new Set();
  let i = 0, hIndex = 0, inFaq = false, faqItems = [], leadDone = false;

  const flushFaq = () => {
    if (!faqItems.length) return;
    out.push('  <div class="faq">');
    for (const { q, a } of faqItems) {
      out.push('    <div class="faq-item">');
      out.push(`      <h3>${inline(q)}</h3>`);
      a.forEach((p) => out.push(`      <p>${inline(p)}</p>`));
      out.push('    </div>');
    }
    out.push('  </div>');
    faqItems = [];
  };

  while (i < lines.length) {
    const line = lines[i];
    const t = line.trim();

    if (!t || /^-{3,}$/.test(t)) { i++; continue; }

    // headings
    const h = t.match(/^(#{2,4})\s+(.+)$/);
    if (h) {
      flushFaq();
      const level = h[1].length;
      const text = h[2].replace(/\s*#*\s*$/, '').trim();
      if (level === 2) {
        const id = headingId(text, ++hIndex, used);
        inFaq = id === 'faq';
        toc.push({ id, text });
        out.push(`\n  <h2 id="${id}">${inline(text)}</h2>`);
      } else {
        out.push(`  <h${level}>${inline(text)}</h${level}>`);
      }
      i++;
      continue;
    }

    // table
    if (t.startsWith('|')) {
      flushFaq();
      const rows = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) rows.push(lines[i].trim()), i++;
      out.push(renderTable(rows));
      continue;
    }

    // blockquote → the "people get this wrong" callout
    if (t.startsWith('>')) {
      const buf = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) buf.push(lines[i].trim().replace(/^>\s?/, '')), i++;
      const joined = buf.join(' ').trim();
      const lead = joined.match(/^\*\*([^*]+?):?\*\*\s*(.*)$/);
      out.push('  <div class="callout callout-warning">');
      if (lead) {
        out.push(`    <p class="callout-title">${inline(lead[1])}</p>`);
        if (lead[2].trim()) out.push(`    <p>${inline(lead[2].trim())}</p>`);
      } else {
        out.push(`    <p>${inline(joined)}</p>`);
      }
      out.push('  </div>');
      continue;
    }

    // lists
    if (/^([-*])\s+/.test(t) || /^\d+\.\s+/.test(t)) {
      flushFaq();
      const ordered = /^\d+\.\s+/.test(t);
      const items = [];
      while (i < lines.length) {
        const cur = lines[i].trim();
        const m = ordered ? cur.match(/^\d+\.\s+(.*)$/) : cur.match(/^[-*]\s+(.*)$/);
        if (!m) break;
        items.push(m[1]);
        i++;
      }
      const tag = ordered ? 'ol' : 'ul';
      out.push(`  <${tag}>`);
      items.forEach((it) => out.push(`    <li>${inline(it)}</li>`));
      out.push(`  </${tag}>`);
      continue;
    }

    // paragraph (gather until blank line)
    const buf = [];
    while (i < lines.length && lines[i].trim() && !/^[#>|]/.test(lines[i].trim()) &&
           !/^([-*])\s+/.test(lines[i].trim()) && !/^\d+\.\s+/.test(lines[i].trim()) &&
           !/^-{3,}$/.test(lines[i].trim())) {
      buf.push(lines[i].trim());
      i++;
    }
    if (!buf.length) { i++; continue; }
    const para = buf.join(' ').trim();

    // Inside the FAQ section a bold line is a question and what follows is its answer.
    const q = para.match(/^\*\*(?:Q:\s*)?(?:\d+\.\s*)?([^*]+?)\*\*\s*(.*)$/s);
    if (inFaq && q) {
      const rest = q[2].replace(/^A:\s*/, '').trim();
      faqItems.push({ q: q[1].trim(), a: rest ? [rest] : [] });
      continue;
    }
    if (inFaq && faqItems.length) {
      faqItems[faqItems.length - 1].a.push(para.replace(/^A:\s*/, ''));
      continue;
    }

    if (!leadDone) {
      out.push(`  <p class="lead">${inline(para)}</p>`);
      leadDone = true;
      continue;
    }
    // worked examples / asides keep their own styling
    const cls = /^\*(ตัวอย่าง|หมายเหตุ|ต่อจากตัวอย่าง)/.test(para) ? ' class="example"' : '';
    out.push(`  <p${cls}>${inline(para)}</p>`);
  }
  flushFaq();

  // Table of contents, inserted straight after the lead.
  const tocHtml = [
    '  <nav class="toc" aria-label="สารบัญบทความ">',
    '    <p class="toc-title">สารบัญ</p>',
    '    <ol>',
    ...toc.map((t) => `      <li><a href="#${t.id}">${inline(t.text)}</a></li>`),
    '    </ol>',
    '  </nav>',
  ].join('\n');

  const leadAt = out.findIndex((l) => l.includes('class="lead"'));
  out.splice(leadAt + 1, 0, tocHtml);

  // Closing CTA. The drafts end with a homepage link, which wastes the article's best
  // internal-link slot — swap it for the page that actually answers the topic.
  const cta = CTA_LINKS[slug];
  if (!cta) throw new Error(`${file}: no CTA target for "${slug}" — add one to CTA_LINKS`);
  let html = out.join('\n').trim();
  html = html.replace(/^\s*<p>(?:(?!<\/p>).)*https:\/\/hometools-center\.com(?:(?!<\/p>).)*<\/p>\s*$/gm, '');
  const ctaHtml = [
    '',
    '  <div class="cta">',
    `    <p class="cta-title">ต้องการสินค้าสำหรับงานนี้?</p>`,
    `    <p>${CTA_BODY}</p>`,
    '    <p class="cta-links">',
    `      <a class="cta-btn" href="${cta[0]}">${cta[1]}</a>`,
    '      <a class="cta-btn cta-btn-ghost" href="/contact-us">ปรึกษา / ขอใบเสนอราคา</a>',
    '    </p>',
    '  </div>',
  ].join('\n');

  // Put the CTA just before the FAQ when there is one — it reads better than after it.
  const faqPos = html.indexOf('<h2 id="faq">');
  html = faqPos === -1 ? html + '\n' + ctaHtml : html.slice(0, faqPos).trimEnd() + '\n' + ctaHtml + '\n\n  ' + html.slice(faqPos);

  // Any remaining absolute self-link becomes relative so the validator can resolve it.
  html = html.replace(/https:\/\/hometools-center\.com(\/[^"']*)?/g, (_, p) => p || '/');

  // The lead paragraph is the article's own one-sentence answer, which makes it a better
  // excerpt than a truncated intro. It feeds the Article schema's description and the
  // meta-description fallback.
  const leadText = (html.match(/<p class="lead">([\s\S]*?)<\/p>/) || [, ''])[1]
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  const excerpt = leadText.length <= 165
    ? leadText
    : leadText.slice(0, 165).replace(/\s+\S*$/, '') + '…';

  const json = {
    slug,
    title,
    seo_title: seoTitle || title,
    seo_description: seoDesc,
    excerpt,
    author: 'Home Tool Center',
    tags: [...(TAGS[cta[0]] || []), 'ความรู้ช่าง'],
    status: 'draft',
    content_file: `${slug}.html`,
    cover_image_url: null,
    og_image_url: null,
    _notes: { primary_kw: primaryKw, secondary_kw: secondaryKw, source_draft: file },
  };
  return { slug, html: html.replace(/\n{3,}/g, '\n\n') + '\n', json };
}

// ---------------------------------------------------------------- cli

const args = process.argv.slice(2);
const force = args.includes('--force');
const files = args.filter((a) => !a.startsWith('--'));
if (!files.length) {
  console.error('usage: node scripts/seo/md-to-article.js <draft.md> [more.md …] [--force]');
  process.exit(1);
}

let made = 0, skipped = 0;
for (const f of files) {
  try {
    const { slug, html, json } = convert(fs.readFileSync(f, 'utf8'), f);
    if (HAND_TUNED.has(slug)) {
      console.log(`  skip   ${slug} (hand-tuned — see HAND_TUNED)`);
      skipped++;
      continue;
    }
    const htmlPath = path.join(OUT_DIR, `${slug}.html`);
    const jsonPath = path.join(OUT_DIR, `${slug}.json`);
    if (fs.existsSync(htmlPath) && !force) {
      console.log(`  skip   ${slug} (already in seo/published — pass --force to overwrite)`);
      skipped++;
      continue;
    }
    fs.writeFileSync(htmlPath, html);
    // Never clobber hand-edited metadata; regenerate the body only.
    if (!fs.existsSync(jsonPath) || force) fs.writeFileSync(jsonPath, JSON.stringify(json, null, 2) + '\n');
    console.log(`  write  ${slug}`);
    made++;
  } catch (e) {
    console.error(`  FAIL   ${f}: ${e.message}`);
    process.exitCode = 1;
  }
}
console.log(`\n${made} written, ${skipped} skipped`);
