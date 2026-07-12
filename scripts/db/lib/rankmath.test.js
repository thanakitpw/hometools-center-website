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
