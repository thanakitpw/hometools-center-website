// scripts/db/lib/rankmath.test.js
const { test } = require('node:test');
const assert = require('node:assert');
const { resolveSeoTitle } = require('./rankmath');

test('resolves standard tokens', () => {
  const out = resolveSeoTitle('%title% %sep% %sitename%',
    { postTitle: 'ท่อ PVC', siteName: 'Home Tool Center', sep: '-' });
  assert.strictEqual(out, 'ท่อ PVC - Home Tool Center');
});

test('keeps an explicit literal title', () => {
  assert.strictEqual(
    resolveSeoTitle('โปรโมชั่นพิเศษ', { postTitle: 'x', siteName: 'y' }),
    'โปรโมชั่นพิเศษ');
});

test('strips unknown tokens and trims separators', () => {
  const out = resolveSeoTitle('%title% %sep% %term% ', { postTitle: 'A', siteName: 'B', sep: '-' });
  assert.strictEqual(out, 'A');
});

test('returns null for empty input', () => {
  assert.strictEqual(resolveSeoTitle('', { postTitle: 'A', siteName: 'B' }), null);
  assert.strictEqual(resolveSeoTitle(null, { postTitle: 'A', siteName: 'B' }), null);
});

// Regression: an interior token that resolves empty (%page% on non-paginated
// content) must not leave a doubled separator like "A - - B".
test('collapses a doubled separator left by an empty interior token', () => {
  const out = resolveSeoTitle('%title% %sep% %page% %sep% %sitename%',
    { postTitle: 'A', siteName: 'B', sep: '-' });
  assert.strictEqual(out, 'A - B');
});

// Regression: separator collapsing must not touch an intra-word hyphen.
test('preserves an intra-word hyphen', () => {
  const out = resolveSeoTitle('%title%', { postTitle: 'PVC-U ท่อ', siteName: 'B' });
  assert.strictEqual(out, 'PVC-U ท่อ');
});
