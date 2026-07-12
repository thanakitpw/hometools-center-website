// scripts/db/lib/slug-map.test.js
const { test } = require('node:test');
const assert = require('node:assert');
const { blogRedirects, reconcileBlogSlug } = require('./slug-map');

const MAP = [
  { from_path: '/article/', to_path: '/blog', reason: 'blog index moved' },
  { from_path: '/มารู้-5-สาเหตุ/', to_path: '/blog/5-causes-dirty-tap-water',
    reason: 'blog post: มารู้ 5 สาเหตุของการเกิดน้ำประปาสกปรก พร้อมวิธีแก้' },
];

test('blogRedirects excludes the index', () => {
  const r = blogRedirects(MAP);
  assert.strictEqual(r.length, 1);
  assert.strictEqual(r[0].to_path, '/blog/5-causes-dirty-tap-water');
});

test('matches a post to its english slug by title containment', () => {
  const rules = blogRedirects(MAP);
  const out = reconcileBlogSlug(
    { ID: 42, post_title: 'มารู้ 5 สาเหตุของการเกิดน้ำประปาสกปรก พร้อมวิธีแก้', post_name: 'มารู้-5-สาเหตุ' },
    rules);
  assert.deepStrictEqual(out, { slug: '5-causes-dirty-tap-water', matched: true });
});

test('falls back to blog-post-<ID> when unmatched', () => {
  const rules = blogRedirects(MAP);
  const out = reconcileBlogSlug({ ID: 99, post_title: 'ใหม่เอี่ยม', post_name: 'ใหม่' }, rules);
  assert.deepStrictEqual(out, { slug: 'blog-post-99', matched: false });
});
