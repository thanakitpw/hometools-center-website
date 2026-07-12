// scripts/db/lib/php-pattern.test.js
const { test } = require('node:test');
const assert = require('node:assert');
const { extractRankMathPattern } = require('./php-pattern');

test('extracts an ascii pattern', () => {
  const s = 'a:1:{i:0;a:3:{s:6:"ignore";s:0:"";s:7:"pattern";s:12:"old-slug-abc";s:10:"comparison";s:5:"exact";}}';
  assert.strictEqual(extractRankMathPattern(s), 'old-slug-abc');
});

test('is byte-accurate for multibyte content', () => {
  // "ก" is 3 bytes in UTF-8 → s:3:"ก"
  const s = 's:7:"pattern";s:3:"ก";s:10:"comparison";';
  assert.strictEqual(extractRankMathPattern(s), 'ก');
});

test('returns null when no pattern present', () => {
  assert.strictEqual(extractRankMathPattern('a:0:{}'), null);
});
