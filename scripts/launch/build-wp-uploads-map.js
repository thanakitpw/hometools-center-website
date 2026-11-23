#!/usr/bin/env node
/**
 * Build lib/wp-uploads-map.json: old WordPress upload path ("2024/07/ANA.pdf") → key in the
 * Supabase Storage `media` bucket. worker.ts uses it to 301 /wp-content/uploads/* to Storage.
 *
 *   node scripts/launch/build-wp-uploads-map.js
 *
 * Google still had the old catalog PDFs and images indexed after the cutover (the PAT catalog
 * PDF alone took 163 organic clicks, May–Nov 2026), and every one of them was a 404 on the new
 * site. Sources are the two migration url-maps; only targets that answer HEAD 200 on the current
 * Storage host are kept, so the redirect never points at a missing file.
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const OUT = path.join(ROOT, 'lib', 'wp-uploads-map.json');
const NEW = 'https://dwogyznhmveltanehaya.supabase.co/storage/v1/object/public/media/';
const pairs = [
  ...Object.entries(require(path.join(ROOT, 'research/db-2026-07/url-map.json'))),
  ...Object.entries(require(path.join(ROOT, 'research/image-url-map.json'))),
];
const map = {};
for (const [from, to] of pairs) {
  let rel = from.replace(/^https?:\/\/(www\.)?hometools-center\.com\/wp-content\/uploads\//, '');
  if (/^https?:/.test(rel) || rel.startsWith('/')) continue;
  try { rel = decodeURIComponent(rel); } catch {}
  rel = rel.normalize('NFC');
  const key = to.replace(/^https:\/\/[a-z]+\.supabase\.co\/storage\/v1\/object\/public\/media\//, '');
  if (key === to) continue;
  map[rel] ??= key;
}
console.log('entries', Object.keys(map).length, 'unique targets', new Set(Object.values(map)).size);
(async () => {
  const targets = [...new Set(Object.values(map))];
  const ok = new Set(); let i = 0;
  await Promise.all(Array.from({ length: 12 }, async () => {
    while (i < targets.length) { const k = targets[i++]; const r = await fetch(NEW + k.split('/').map(encodeURIComponent).join('/'), { method: 'HEAD' }); if (r.ok) ok.add(k); }
  }));
  const good = Object.fromEntries(Object.entries(map).filter(([, k]) => ok.has(k)).sort());
  console.log('targets ok', ok.size, '/', targets.length, '-> map entries', Object.keys(good).length);
  for (const t of ['2022/10/14.Catalog-PAT.pdf', '2024/07/ANA.pdf', '2024/10/17.SYLER_.pdf', '2024/09/PP.pdf', '2024/07/โบชัวร์ถังเก็บน้ำตราจัมโบ้-2021.pdf', '2024/05/6.ท่อและอุปกรณ์-PVC-สีฟ้า.pdf']) console.log(t, '->', good[t] || 'MISSING');
  fs.writeFileSync(OUT, JSON.stringify(good, null, 0) + '\n');
})();
