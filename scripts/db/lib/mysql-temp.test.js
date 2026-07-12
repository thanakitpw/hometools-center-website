// scripts/db/lib/mysql-temp.test.js
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const { startTempMysql, connect } = require('./mysql-temp');

test('temp mysql boots and answers a query, then stops', async () => {
  const srv = await startTempMysql();
  try {
    const conn = await connect(srv, 'mysql');
    const [rows] = await conn.query('SELECT 1 + 1 AS two');
    assert.strictEqual(rows[0].two, 2);
    await conn.end();
  } finally {
    srv.stop();
  }
  assert.strictEqual(fs.existsSync(srv.dataDir), false);
});
