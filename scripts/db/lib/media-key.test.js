// scripts/db/lib/media-key.test.js
const { test } = require('node:test');
const assert = require('node:assert');
const { storageKeyForFile, mimeForExt } = require('./media-key');

test('keeps ascii paths verbatim', () => {
  assert.strictEqual(storageKeyForFile('2022/10/Banner-scaled.jpg'), '2022/10/Banner-scaled.jpg');
});

test('hashes non-ascii basenames to u-<md5>.ext', () => {
  const k = storageKeyForFile('2025/02/สื่อ-campaign.jpg');
  assert.match(k, /^u-[0-9a-f]{12}\.jpg$/);
});

test('is deterministic', () => {
  assert.strictEqual(storageKeyForFile('a/ท่อ.pdf'), storageKeyForFile('a/ท่อ.pdf'));
});

test('mime lookup', () => {
  assert.strictEqual(mimeForExt('jpg'), 'image/jpeg');
  assert.strictEqual(mimeForExt('pdf'), 'application/pdf');
});
