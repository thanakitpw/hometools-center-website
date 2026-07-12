// scripts/db/lib/slug-map.js
function blogRedirects(redirectMap) {
  return (redirectMap || []).filter(r =>
    typeof r.to_path === 'string' &&
    r.to_path.startsWith('/blog/') &&
    r.to_path.length > '/blog/'.length);
}

function norm(s) { return (s || '').normalize('NFC').trim(); }

function reconcileBlogSlug(post, blogRules) {
  const title = norm(post.post_title);
  const name = norm(decodeURIComponent(post.post_name || ''));
  // 1) match by title containment against the rule reason
  for (const r of blogRules) {
    const reason = norm((r.reason || '').replace(/^blog post:\s*/i, ''));
    if (reason && title && (reason === title || reason.includes(title) || title.includes(reason))) {
      return { slug: r.to_path.replace(/^\/blog\//, ''), matched: true };
    }
  }
  // 2) match by thai slug in from_path
  for (const r of blogRules) {
    const fp = norm(decodeURIComponent(r.from_path || '')).replace(/\//g, '');
    if (name && fp && fp === name.replace(/\//g, '')) {
      return { slug: r.to_path.replace(/^\/blog\//, ''), matched: true };
    }
  }
  return { slug: `blog-post-${post.ID}`, matched: false };
}

module.exports = { blogRedirects, reconcileBlogSlug };
