// scripts/db/lib/rankmath.js
function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

function resolveSeoTitle(rawTitle, { postTitle = '', siteName = '', sep = '-' } = {}) {
  if (!rawTitle) return null;
  let t = String(rawTitle)
    .split('%title%').join(postTitle)
    .split('%sitename%').join(siteName)
    .split('%sitedesc%').join('')
    .split('%sep%').join(sep)
    .split('%page%').join('')
    .split('%pagenumber%').join('')
    .split('%currentyear%').join(String(new Date().getFullYear()));
  t = t.replace(/%[a-z0-9_()]+%/gi, '')       // drop any remaining tokens
       .replace(/\s+/g, ' ')                   // collapse whitespace
       .trim();

  // Collapse consecutive whitespace-flanked separator tokens — e.g. an
  // interior token that resolved empty (%page% on non-paginated content)
  // leaves "A -  - B". Only collapse the separator when it stands alone as
  // its own whitespace-delimited token, so an intra-word hyphen like
  // "PVC-U" (never its own token) is left untouched.
  const tokens = t.split(' ').filter(Boolean);
  const collapsed = [];
  for (const tok of tokens) {
    if (tok === sep && collapsed[collapsed.length - 1] === sep) continue;
    collapsed.push(tok);
  }
  t = collapsed.join(' ');

  const sepRe = new RegExp(`^[\\s${escapeRe(sep)}]+|[\\s${escapeRe(sep)}]+$`, 'g');
  t = t.replace(sepRe, '').trim();
  return t || null;
}

module.exports = { resolveSeoTitle };
