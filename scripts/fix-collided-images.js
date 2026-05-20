// Fix images that collided due to Thai/Unicode chars being stripped.
// New strategy: keep original characters URL-encoded; only replace truly unsafe chars.
require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const sb = createClient(url, key, { auth: { persistSession: false } });

const BUCKET = 'media';
const WP_PREFIX = 'https://hometools-center.com/wp-content/uploads/';
const MAPPING_PATH = path.join(__dirname, '..', 'research', 'image-url-map.json');
const mapping = JSON.parse(fs.readFileSync(MAPPING_PATH, 'utf8'));

// Supabase Storage requires ASCII-safe keys.
// Strategy: keep ASCII-only filenames as-is (replace whitespace + @); for non-ASCII names use md5 hash.
function newPath(u) {
  const rel = decodeURIComponent(u.slice(WP_PREFIX.length));
  const dir = rel.split('/').slice(0, -1).join('/');
  const basename = rel.split('/').pop();
  const ext = (basename.match(/\.[^.]+$/) || [''])[0].toLowerCase();
  const stem = basename.slice(0, basename.length - ext.length);

  // If stem has any non-ASCII char, use hash-only
  if (/[^\x20-\x7E]/.test(stem)) {
    const hash = crypto.createHash('md5').update(rel).digest('hex').slice(0, 12);
    return `${dir}/u-${hash}${ext}`;
  }
  // ASCII-only — keep but sanitize unsafe chars
  const safeStem = stem.replace(/\s+/g, '-').replace(/@/g, '-at-').replace(/[?#%]/g, '-');
  return `${dir}/${safeStem}${ext}`;
}

function mimeFromName(name) {
  const ext = name.split('.').pop().toLowerCase();
  return ({
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
    gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml', pdf: 'application/pdf',
  })[ext] || 'application/octet-stream';
}

(async () => {
  // Find collisions: multiple OLD URLs mapped to same NEW URL
  const reverse = {};
  for (const [oldUrl, newUrl] of Object.entries(mapping)) {
    (reverse[newUrl] ||= []).push(oldUrl);
  }
  const collisions = Object.entries(reverse).filter(([_, olds]) => olds.length > 1);
  console.log(`Found ${collisions.length} collision groups`);

  // Also detect "near-empty" filenames like '-.svg', '-2x-8.png'
  const suspicious = Object.entries(mapping).filter(([_, newUrl]) => {
    const stem = newUrl.split('/').pop().replace(/\.[^.]+$/, '');
    return /^-+$/.test(stem) || stem.length <= 4;
  });
  console.log(`Found ${suspicious.length} suspicious sanitized names`);

  const toFix = new Set();
  collisions.forEach(([_, olds]) => olds.forEach(o => toFix.add(o)));
  suspicious.forEach(([o]) => toFix.add(o));
  console.log(`Total to re-upload: ${toFix.size}`);

  let ok = 0, err = 0;
  for (const oldUrl of toFix) {
    const objectPath = newPath(oldUrl);
    try {
      const res = await fetch(oldUrl);
      if (!res.ok) { err++; console.error('fetch fail', oldUrl); continue; }
      const buf = Buffer.from(await res.arrayBuffer());
      const { error } = await sb.storage.from(BUCKET).upload(objectPath, buf, {
        contentType: mimeFromName(objectPath),
        cacheControl: '31536000',
        upsert: true,
      });
      if (error && !/Duplicate/i.test(error.message)) {
        err++; console.error('upload fail', objectPath, error.message); continue;
      }
      const { data } = sb.storage.from(BUCKET).getPublicUrl(objectPath);
      mapping[oldUrl] = data.publicUrl;
      ok++;
      process.stdout.write(`\r ok=${ok} err=${err}     `);
    } catch (e) {
      err++; console.error('err', e.message);
    }
  }

  fs.writeFileSync(MAPPING_PATH, JSON.stringify(mapping, null, 2));
  console.log(`\nDone. ok=${ok} err=${err}`);
})();
