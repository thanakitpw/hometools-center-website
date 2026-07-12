// scripts/db/lib/media-key.js
const crypto = require('node:crypto');

const MIME = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif',
  webp: 'image/webp', svg: 'image/svg+xml', pdf: 'application/pdf',
  avif: 'image/avif',
};

function mimeForExt(ext) {
  return MIME[String(ext).toLowerCase()] || 'application/octet-stream';
}

function storageKeyForFile(relPath) {
  const base = relPath.split('/').pop();
  const ext = base.split('.').pop().toLowerCase();
  if (/^[\x00-\x7F]+$/.test(base)) return relPath;         // ascii → keep path
  const md5 = crypto.createHash('md5').update(relPath).digest('hex').slice(0, 12);
  return `u-${md5}.${ext}`;
}

module.exports = { storageKeyForFile, mimeForExt };
