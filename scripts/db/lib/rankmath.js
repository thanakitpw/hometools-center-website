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
    .split('%currentyear%').join('2026');
  t = t.replace(/%[a-z0-9_()]+%/gi, '')       // drop any remaining tokens
       .replace(/\s+/g, ' ')                   // collapse whitespace
       .trim();
  const sepRe = new RegExp(`^[\\s${escapeRe(sep)}]+|[\\s${escapeRe(sep)}]+$`, 'g');
  t = t.replace(sepRe, '').trim();
  return t || null;
}

module.exports = { resolveSeoTitle };
