// scripts/db/lib/mysql-temp.js
const { execFileSync, spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const mysql = require('mysql2/promise');

const SCRATCH = process.env.CLAUDE_SCRATCH ||
  path.join(os.tmpdir(), 'htc-mysql');

// Homebrew MySQL 9.6 basedir — needed so mysqld can find its share/ files
// (error-message defaults, charset data, etc) when spawned with a bare
// binary name resolved via PATH.
function resolveBasedir() {
  try {
    return execFileSync('brew', ['--prefix', 'mysql'], { encoding: 'utf8' }).trim();
  } catch {
    return undefined;
  }
}

function waitForSocket(socket, timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (fs.existsSync(socket)) return;
    execFileSync('sleep', ['0.3']);
  }
  throw new Error(`mysqld socket not ready: ${socket}`);
}

async function startTempMysql() {
  // fs.mkdtempSync always creates a fresh, empty directory, which
  // --initialize-insecure requires.
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'htc-mysqld-'));
  const socket = path.join(dataDir, 'mysql.sock');
  const basedir = resolveBasedir();
  const basedirArgs = basedir ? [`--basedir=${basedir}`] : [];

  let proc;
  try {
    execFileSync('mysqld', [
      ...basedirArgs,
      '--initialize-insecure', `--datadir=${dataDir}`,
    ], { stdio: 'inherit' });

    proc = spawn('mysqld', [
      ...basedirArgs,
      `--datadir=${dataDir}`, `--socket=${socket}`,
      // Only the Unix socket is used by this harness (connect() and
      // importSqlFile() both go through it) — disable TCP entirely so we
      // don't open a needless, collision-prone network listener.
      '--skip-networking',
      // MySQL 9.6 starts the mysqlx plugin (extra socket/port, default 33060)
      // by default; it can fail to bind or collide across concurrent runs, so
      // turn it off — this harness only needs classic protocol.
      '--mysqlx=OFF',
      '--pid-file=' + path.join(dataDir, 'mysqld.pid'),
    ], { stdio: 'inherit', detached: false });

    waitForSocket(socket);
    // give the server a moment to accept connections
    execFileSync('sleep', ['1']);
  } catch (err) {
    if (proc) { try { proc.kill('SIGKILL'); } catch {} }
    try { fs.rmSync(dataDir, { recursive: true, force: true }); } catch {}
    throw err;
  }

  return {
    socket, dataDir,
    stop() {
      try {
        execFileSync('mysqladmin', ['--socket', socket, '-u', 'root', 'shutdown'], { timeout: 10000 });
      } catch { proc.kill('SIGKILL'); }
      try { fs.rmSync(dataDir, { recursive: true, force: true }); } catch {}
    },
  };
}

function importSqlFile({ socket }, dbName, sqlFile) {
  execFileSync('mysql', ['--socket', socket, '-u', 'root', '-e',
    `CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4;`]);
  execFileSync('sh', ['-c',
    `mysql --socket='${socket}' -u root '${dbName}' < '${sqlFile}'`],
    { stdio: 'inherit', maxBuffer: 1024 * 1024 * 64 });
}

async function connect({ socket }, dbName) {
  return mysql.createConnection({
    socketPath: socket, user: 'root', database: dbName,
    multipleStatements: false, charset: 'utf8mb4',
  });
}

module.exports = { startTempMysql, importSqlFile, connect, SCRATCH };
