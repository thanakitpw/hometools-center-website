// scripts/db/lib/php-pattern.js
// PHP serialize encodes string byte-length: s:<bytes>:"<content>";
// Extract the `pattern` field byte-accurately via a Buffer.
function extractRankMathPattern(sources) {
  if (!sources) return null;
  const buf = Buffer.from(String(sources), 'utf8');
  const marker = Buffer.from('s:7:"pattern";s:', 'utf8');
  const i = buf.indexOf(marker);
  if (i === -1) return null;
  let j = i + marker.length;
  let len = 0;
  while (buf[j] >= 0x30 && buf[j] <= 0x39) { len = len * 10 + (buf[j] - 0x30); j++; }
  // buf[j] === ':' (0x3a), buf[j+1] === '"' (0x22)
  const start = j + 2;
  return buf.slice(start, start + len).toString('utf8');
}

module.exports = { extractRankMathPattern };
