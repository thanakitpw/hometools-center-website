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

// Regression: a stray '%' that isn't a valid escape (e.g. "100%-guarantee")
// must not throw URI malformed and halt the batch.
test('does not throw on an invalid percent-escape in post_name', () => {
  const out = reconcileBlogSlug(
    { ID: 1, post_title: 'ทดสอบ', post_name: '100%-guarantee' },
    []);
  assert.deepStrictEqual(out, { slug: 'blog-post-1', matched: false });
});

// Regression: exact match must win over a shorter reason that happens to be
// a substring of a longer, more specific reason.
test('exact reason match wins over shorter containment match', () => {
  const rules = blogRedirects([
    { from_path: '/a/', to_path: '/blog/short', reason: 'ทดสอบ' },
    { from_path: '/b/', to_path: '/blog/correct', reason: 'ทดสอบระบบใหม่' },
  ]);

  const exact = reconcileBlogSlug({ ID: 2, post_title: 'ทดสอบระบบใหม่', post_name: 'x' }, rules);
  assert.deepStrictEqual(exact, { slug: 'correct', matched: true });

  const short = reconcileBlogSlug({ ID: 3, post_title: 'ทดสอบ', post_name: 'y' }, rules);
  assert.deepStrictEqual(short, { slug: 'short', matched: true });
});
