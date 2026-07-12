// scripts/db/lib/slug-map.js
function blogRedirects(redirectMap) {
  return (redirectMap || []).filter(r =>
    typeof r.to_path === 'string' &&
    r.to_path.startsWith('/blog/') &&
    r.to_path.length > '/blog/'.length);
}

function norm(s) { return (s || '').normalize('NFC').trim(); }

// decodeURIComponent throws on a lone/invalid '%' escape (e.g. "100%-guarantee").
// Never let a single bad row halt a batch job — fall back to the raw string.
function safeDecode(s) {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

function reconcileBlogSlug(post, blogRules) {
  const title = norm(post.post_title);
  const name = norm(safeDecode(post.post_name || ''));

  // 1) Exact pass over ALL rules: normalized reason === normalized title wins outright.
  for (const r of blogRules) {
    const reason = norm((r.reason || '').replace(/^blog post:\s*/i, ''));
    if (reason && title && reason === title) {
      return { slug: r.to_path.replace(/^\/blog\//, ''), matched: true };
    }
  }

  // 2) Containment pass: among rules where one contains the other, pick the
  // rule with the longest reason (closest/most specific match), not the
  // first one encountered in array order.
  let best = null;
  for (const r of blogRules) {
    const reason = norm((r.reason || '').replace(/^blog post:\s*/i, ''));
    if (reason && title && (reason.includes(title) || title.includes(reason))) {
      if (!best || reason.length > best.reason.length) {
        best = { reason, rule: r };
      }
    }
  }
  if (best) {
    return { slug: best.rule.to_path.replace(/^\/blog\//, ''), matched: true };
  }

  // 3) match by thai slug in from_path
  for (const r of blogRules) {
    const fp = norm(safeDecode(r.from_path || '')).replace(/\//g, '');
    if (name && fp && fp === name.replace(/\//g, '')) {
      return { slug: r.to_path.replace(/^\/blog\//, ''), matched: true };
    }
  }
  return { slug: `blog-post-${post.ID}`, matched: false };
}

module.exports = { blogRedirects, reconcileBlogSlug, safeDecode };
