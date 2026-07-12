# WP DB Re-migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Re-migrate products, categories, posts, referenced media, SEO meta, and redirects from the authoritative WooCommerce DB dump into Supabase, fully replacing the incomplete crawl-derived data.

**Architecture:** A three-stage pipeline of standalone Node (CommonJS) scripts under `scripts/db/`. Stage 1 spins up a throwaway local MySQL instance, imports the dump, and extracts clean JSON. Stage 2 uploads only the referenced media from the uploads zip to Supabase Storage and produces an old→new URL map. Stage 3 truncates exactly five tables and inserts the extracted rows (FK-safe order), rewriting media URLs. A verify stage gates on parity.

**Tech Stack:** Node 24 (CommonJS, matching existing `scripts/`), `mysql2` (new devDependency) for querying the temp MySQL, `@supabase/supabase-js` (service role) for inserts, built-in `node:test`/`node:assert` for unit tests, Homebrew `mysql` 9.6 CLI for dump import.

## Global Constraints

- **Runtime:** Node 24. Scripts are **CommonJS** (`require`, `module.exports`) to match existing `scripts/*.js`. Load env with `require('dotenv').config({ path: '.env.local' })`.
- **Supabase:** service-role client from `.env.local` (`NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`), `{ auth: { persistSession: false } }`. Storage bucket `media` (public). Public URL prefix: `${NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/media/`.
- **Truncate allow-list (HARD):** only `product_categories`, `products`, `posts`, `redirects`, `categories` may be truncated (in that FK-safe order). NEVER touch `quote_requests`, `contact_messages`, `admin_users`, `site_settings`, `menus`, `brands`, `media`.
- **Storage key convention:** ASCII file path kept as-is; non-ASCII (Thai) basename → `u-<md5-12>.<ext>` (Storage rejects non-ASCII keys).
- **Blog slugs:** preserve existing English `/blog/<english>` slugs; never overwrite with Thai `post_name`.
- **brand_id:** always `null` (DB has no brand taxonomy).
- **DB facts:** table prefix `jQH0o_`; 348 products, 42 product_cat, 31 posts, 746 attachments; products are all `simple` with **no gallery** (`_product_image_gallery` = 0) and effectively no `rank_math_facebook_image` → product `images` = `[featured]`, `og_image_url` = featured.
- **Local quirks:** `head` is libwww-perl — never pipe to `head -n` (use `awk 'NR<=N'`). Run temp MySQL on a **non-default socket & datadir** under the scratchpad so it never collides with the user's environment. Use cheerio (not jsdom) if any HTML parsing is needed.
- **Artifacts dir:** `research/db-2026-07/` (committed).
- **Dump path:** `backup-oldwebsite/adminhometools_wp_orpro.sql`. Uploads zip: `backup-oldwebsite/wpuploads.zip`.

---

### Task 1: Temp MySQL harness + `mysql2` dependency

**Files:**
- Modify: `package.json` (add `mysql2` devDependency)
- Create: `scripts/db/lib/mysql-temp.js`
- Test: `scripts/db/lib/mysql-temp.test.js`

**Interfaces:**
- Produces:
  - `async function startTempMysql(): Promise<{ socket: string, port: number, dataDir: string, stop: () => void }>` — initializes a fresh datadir, boots `mysqld` on a private socket/port, waits until reachable.
  - `function importSqlFile({ socket }, dbName: string, sqlFile: string): void` — creates `dbName` and imports `sqlFile` via the `mysql` CLI.
  - `async function connect({ socket }, dbName: string): Promise<mysql2.Connection>` — a `mysql2/promise` connection to the temp server.

- [ ] **Step 1: Add the dependency**

Run: `npm install --save-dev mysql2`
Expected: `mysql2` appears under `devDependencies` in `package.json`; install exits 0.

- [ ] **Step 2: Write the failing test**

```js
// scripts/db/lib/mysql-temp.test.js
const { test } = require('node:test');
const assert = require('node:assert');
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
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `node --test scripts/db/lib/mysql-temp.test.js`
Expected: FAIL — `Cannot find module './mysql-temp'`.

- [ ] **Step 4: Implement the harness**

```js
// scripts/db/lib/mysql-temp.js
const { execFileSync, spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const mysql = require('mysql2/promise');

const SCRATCH = process.env.CLAUDE_SCRATCH ||
  path.join(os.tmpdir(), 'htc-mysql');

function waitForSocket(socket, timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (fs.existsSync(socket)) return;
    execFileSync('sleep', ['0.3']);
  }
  throw new Error(`mysqld socket not ready: ${socket}`);
}

async function startTempMysql() {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'htc-mysqld-'));
  const socket = path.join(dataDir, 'mysql.sock');
  const port = 33061; // private, non-default
  execFileSync('mysqld', [
    '--initialize-insecure', `--datadir=${dataDir}`,
  ], { stdio: 'inherit' });
  const proc = spawn('mysqld', [
    `--datadir=${dataDir}`, `--socket=${socket}`, `--port=${port}`,
    '--skip-networking=0', '--pid-file=' + path.join(dataDir, 'mysqld.pid'),
  ], { stdio: 'inherit', detached: false });
  waitForSocket(socket);
  // give the server a moment to accept connections
  execFileSync('sleep', ['1']);
  return {
    socket, port, dataDir,
    stop() {
      try { execFileSync('mysqladmin', ['--socket', socket, '-u', 'root', 'shutdown']); }
      catch { proc.kill('SIGKILL'); }
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
```

- [ ] **Step 5: Run test to verify it passes**

Run: `node --test scripts/db/lib/mysql-temp.test.js`
Expected: PASS (1 test). If `mysqld` fails to init, check `command -v mysqld` resolves to the Homebrew binary.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json scripts/db/lib/mysql-temp.js scripts/db/lib/mysql-temp.test.js
git commit -m "feat(db): add temp MySQL harness for dump extraction"
```

---

### Task 2: RankMath serialized-`pattern` extractor

**Files:**
- Create: `scripts/db/lib/php-pattern.js`
- Test: `scripts/db/lib/php-pattern.test.js`

**Interfaces:**
- Produces: `function extractRankMathPattern(sources: string): string | null` — byte-accurate extraction of the `pattern` value from a RankMath `sources` PHP-serialized blob.

- [ ] **Step 1: Write the failing test**

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test scripts/db/lib/php-pattern.test.js`
Expected: FAIL — `Cannot find module './php-pattern'`.

- [ ] **Step 3: Implement**

```js
// scripts/db/lib/php-pattern.js
// PHP serialize encodes string byte-length: s:<bytes>:"<content>";
// Extract the `pattern` field byte-accurately via a Buffer.
function extractRankMathPattern(sources) {
  if (!sources) return null;
  const buf = Buffer.from(String(sources), 'utf8');
  const marker = Buffer.from('s:7:"pattern";s:', 'utf8');
  const i = buf.indexOf(marker);
  if (i === -1) return null;
  let j = i + marker.length;
  let len = 0;
  while (buf[j] >= 0x30 && buf[j] <= 0x39) { len = len * 10 + (buf[j] - 0x30); j++; }
  // buf[j] === ':' (0x3a), buf[j+1] === '"' (0x22)
  const start = j + 2;
  return buf.slice(start, start + len).toString('utf8');
}

module.exports = { extractRankMathPattern };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test scripts/db/lib/php-pattern.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add scripts/db/lib/php-pattern.js scripts/db/lib/php-pattern.test.js
git commit -m "feat(db): add RankMath serialized-pattern extractor"
```

---

### Task 3: RankMath SEO-title template resolver

**Files:**
- Create: `scripts/db/lib/rankmath.js`
- Test: `scripts/db/lib/rankmath.test.js`

**Interfaces:**
- Produces: `function resolveSeoTitle(rawTitle: string | null, opts: { postTitle: string, siteName: string, sep?: string }): string | null` — resolves `%title%`/`%sitename%`/`%sep%`/`%page%` tokens; strips any remaining `%...%`; returns `null` if empty so the app default applies.

- [ ] **Step 1: Write the failing test**

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test scripts/db/lib/rankmath.test.js`
Expected: FAIL — `Cannot find module './rankmath'`.

- [ ] **Step 3: Implement**

```js
// scripts/db/lib/rankmath.js
function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

function resolveSeoTitle(rawTitle, { postTitle = '', siteName = '', sep = '-' } = {}) {
  if (!rawTitle) return null;
  let t = String(rawTitle)
    .split('%title%').join(postTitle)
    .split('%sitename%').join(siteName)
    .split('%sitedesc%').join('')
    .split('%sep%').join(sep)
    .split('%page%').join('')
    .split('%pagenumber%').join('')
    .split('%currentyear%').join('2026');
  t = t.replace(/%[a-z0-9_()]+%/gi, '')       // drop any remaining tokens
       .replace(/\s+/g, ' ')                   // collapse whitespace
       .trim();
  const sepRe = new RegExp(`^[\\s${escapeRe(sep)}]+|[\\s${escapeRe(sep)}]+$`, 'g');
  t = t.replace(sepRe, '').trim();
  return t || null;
}

module.exports = { resolveSeoTitle };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test scripts/db/lib/rankmath.test.js`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add scripts/db/lib/rankmath.js scripts/db/lib/rankmath.test.js
git commit -m "feat(db): add RankMath SEO title resolver"
```

---

### Task 4: Blog slug reconciliation

**Files:**
- Create: `scripts/db/lib/slug-map.js`
- Test: `scripts/db/lib/slug-map.test.js`

**Interfaces:**
- Consumes: entries from `research/redirect-map.json` (`{ from_path, to_path, reason }`).
- Produces:
  - `function blogRedirects(redirectMap: object[]): object[]` — filters to entries whose `to_path` targets a specific `/blog/<slug>` post (excludes the `/blog` index).
  - `function reconcileBlogSlug(post: { ID: number, post_title: string, post_name: string }, blogRules: object[]): { slug: string, matched: boolean }` — returns the existing English slug, or a deterministic `blog-post-<ID>` fallback.

- [ ] **Step 1: Write the failing test**

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test scripts/db/lib/slug-map.test.js`
Expected: FAIL — `Cannot find module './slug-map'`.

- [ ] **Step 3: Implement**

```js
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test scripts/db/lib/slug-map.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add scripts/db/lib/slug-map.js scripts/db/lib/slug-map.test.js
git commit -m "feat(db): add blog slug reconciliation against redirect map"
```

---

### Task 5: Media storage-key helper

**Files:**
- Create: `scripts/db/lib/media-key.js`
- Test: `scripts/db/lib/media-key.test.js`

**Interfaces:**
- Produces:
  - `function storageKeyForFile(relPath: string): string` — ASCII path kept; non-ASCII basename → `u-<md5-12>.<ext>`.
  - `function mimeForExt(ext: string): string` — content-type lookup.

- [ ] **Step 1: Write the failing test**

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test scripts/db/lib/media-key.test.js`
Expected: FAIL — `Cannot find module './media-key'`.

- [ ] **Step 3: Implement**

```js
// scripts/db/lib/media-key.js
const crypto = require('node:crypto');

const MIME = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif',
  webp: 'image/webp', svg: 'image/svg+xml', pdf: 'application/pdf',
  avif: 'image/avif',
};

function mimeForExt(ext) {
  return MIME[String(ext).toLowerCase()] || 'application/octet-stream';
}

function storageKeyForFile(relPath) {
  const ext = relPath.split('.').pop().toLowerCase();
  const base = relPath.split('/').pop();
  if (/^[\x00-\x7F]+$/.test(base)) return relPath;         // ascii → keep path
  const md5 = crypto.createHash('md5').update(relPath).digest('hex').slice(0, 12);
  return `u-${md5}.${ext}`;
}

module.exports = { storageKeyForFile, mimeForExt };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test scripts/db/lib/media-key.test.js`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add scripts/db/lib/media-key.js scripts/db/lib/media-key.test.js
git commit -m "feat(db): add media storage-key + mime helper"
```

---

### Task 6: Extraction stage — dump → clean JSON

**Files:**
- Create: `scripts/db/extract.js`
- Uses: `scripts/db/lib/mysql-temp.js`, `scripts/db/lib/php-pattern.js`
- Output: `research/db-2026-07/{products,categories,posts,redirects,attachments,site}.json`

**Interfaces:**
- Consumes: `startTempMysql`, `importSqlFile`, `connect` (Task 1); `extractRankMathPattern` (Task 2).
- Produces JSON artifacts consumed by Tasks 6-verify, 7, 8. Object shapes:
  - `attachments.json`: `{ [attId: string]: { file: string, alt: string } }` (file = `_wp_attached_file`).
  - `categories.json`: `[{ wpTermId, slug, name_th, parentWpTermId, description, thumbId, order, seo_title, seo_description }]`.
  - `products.json`: `[{ ID, slug, name_th, short_description, description_html, status, post_date, menu_order, thumbId, galleryIds:[], primaryCatWpTermId, catWpTermIds:[], seo_title, seo_description, ogImageId }]`.
  - `posts.json`: `[{ ID, post_title, post_name, excerpt, content_html, status, post_date, thumbId, tagNames:[], categoryWpTermId, seo_title, seo_description, ogImageId }]`.
  - `redirects.json`: `[{ from_path, to_path, status_code, source }]`.
  - `site.json`: `{ blogname }`.

- [ ] **Step 1: Write the extraction script**

```js
// scripts/db/extract.js
// Stage 1: boot temp MySQL, import dump, extract clean JSON.
// Run: node scripts/db/extract.js
const fs = require('node:fs');
const path = require('node:path');
const { startTempMysql, importSqlFile, connect } = require('./lib/mysql-temp');
const { extractRankMathPattern } = require('./lib/php-pattern');

const P = 'jQH0o_';
const DUMP = path.join(__dirname, '..', '..', 'backup-oldwebsite', 'adminhometools_wp_orpro.sql');
const OUT = path.join(__dirname, '..', '..', 'research', 'db-2026-07');
const SITE_URL = 'https://hometools-center.com';

function pathFromUrl(u) {
  try { return new URL(u).pathname; } catch { return u.startsWith('/') ? u : `/${u}`; }
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const srv = await startTempMysql();
  try {
    console.log('importing dump…');
    importSqlFile(srv, 'htc_wp', DUMP);
    const db = await connect(srv, 'htc_wp');

    // ---- raw pulls ----
    const [posts] = await db.query(
      `SELECT ID, post_name, post_title, post_excerpt, post_content, post_status, post_date, menu_order, post_type
       FROM ${P}posts WHERE post_type IN ('product','post','attachment')`);
    const [metaRows] = await db.query(
      `SELECT post_id, meta_key, meta_value FROM ${P}postmeta
       WHERE meta_key IN ('_thumbnail_id','_product_image_gallery','_wp_attached_file',
         '_wp_attachment_image_alt','rank_math_title','rank_math_description',
         'rank_math_facebook_image','rank_math_primary_product_cat')`);
    const [terms] = await db.query(`SELECT term_id, name, slug FROM ${P}terms`);
    const [tax] = await db.query(
      `SELECT term_taxonomy_id, term_id, taxonomy, description, parent FROM ${P}term_taxonomy`);
    const [rels] = await db.query(
      `SELECT object_id, term_taxonomy_id FROM ${P}term_relationships`);
    const [termmeta] = await db.query(
      `SELECT term_id, meta_key, meta_value FROM ${P}termmeta
       WHERE meta_key IN ('thumbnail_id','order','rank_math_title','rank_math_description')`);
    const [rmRedir] = await db.query(
      `SELECT sources, url_to, header_code FROM ${P}rank_math_redirections WHERE status='active'`);
    const [rdItems] = await db.query(
      `SELECT url, action_data, action_code FROM ${P}redirection_items WHERE status='enabled'`);
    const [[siteRow]] = await db.query(
      `SELECT option_value AS blogname FROM ${P}options WHERE option_name='blogname'`);

    await db.end();

    // ---- indexes ----
    const metaBy = new Map();           // post_id -> {key:value}
    for (const m of metaRows) {
      if (!metaBy.has(m.post_id)) metaBy.set(m.post_id, {});
      metaBy.get(m.post_id)[m.meta_key] = m.meta_value;
    }
    const tmBy = new Map();              // term_id -> {key:value}
    for (const t of termmeta) {
      if (!tmBy.has(t.term_id)) tmBy.set(t.term_id, {});
      tmBy.get(t.term_id)[t.meta_key] = t.meta_value;
    }
    const taxByTtid = new Map(tax.map(t => [t.term_taxonomy_id, t]));
    const termById = new Map(terms.map(t => [t.term_id, t]));
    const relsByObj = new Map();         // object_id -> [ttid]
    for (const r of rels) {
      if (!relsByObj.has(r.object_id)) relsByObj.set(r.object_id, []);
      relsByObj.get(r.object_id).push(r.term_taxonomy_id);
    }

    // ---- attachments ----
    const attachments = {};
    for (const p of posts) {
      if (p.post_type !== 'attachment') continue;
      const m = metaBy.get(p.ID) || {};
      if (m._wp_attached_file) attachments[p.ID] = { file: m._wp_attached_file, alt: m._wp_attachment_image_alt || '' };
    }

    // ---- categories (product_cat) ----
    const categories = tax.filter(t => t.taxonomy === 'product_cat').map(t => {
      const term = termById.get(t.term_id) || {};
      const tm = tmBy.get(t.term_id) || {};
      const parentTax = t.parent ? tax.find(x => x.term_id === t.parent && x.taxonomy === 'product_cat') : null;
      return {
        wpTermId: t.term_id, slug: term.slug, name_th: term.name,
        parentWpTermId: parentTax ? parentTax.term_id : null,
        description: t.description || null,
        thumbId: tm.thumbnail_id || null,
        order: Number(tm.order || 0),
        seo_title: tm.rank_math_title || null,
        seo_description: tm.rank_math_description || null,
      };
    });

    // helper: term_ids of a taxonomy attached to an object
    const catTtids = new Set(tax.filter(t => t.taxonomy === 'product_cat').map(t => t.term_taxonomy_id));
    const tagTtids = new Map(tax.filter(t => t.taxonomy === 'post_tag').map(t => [t.term_taxonomy_id, t.term_id]));
    const blogCatTtids = new Map(tax.filter(t => t.taxonomy === 'category').map(t => [t.term_taxonomy_id, t.term_id]));

    // ---- products ----
    const products = posts.filter(p => p.post_type === 'product').map(p => {
      const m = metaBy.get(p.ID) || {};
      const ttids = relsByObj.get(p.ID) || [];
      const catTermIds = ttids.filter(id => catTtids.has(id))
        .map(id => taxByTtid.get(id).term_id);
      return {
        ID: p.ID, slug: p.post_name, name_th: p.post_title,
        short_description: p.post_excerpt || null,
        description_html: p.post_content || null,
        status: p.post_status, post_date: p.post_date, menu_order: p.menu_order,
        thumbId: m._thumbnail_id || null,
        galleryIds: (m._product_image_gallery || '').split(',').map(s => s.trim()).filter(Boolean),
        primaryCatWpTermId: m.rank_math_primary_product_cat ? Number(m.rank_math_primary_product_cat) : null,
        catWpTermIds: catTermIds,
        seo_title: m.rank_math_title || null,
        seo_description: m.rank_math_description || null,
        ogImageId: m.rank_math_facebook_image || null,
      };
    });

    // ---- posts (blog) ----
    const blog = posts.filter(p => p.post_type === 'post').map(p => {
      const m = metaBy.get(p.ID) || {};
      const ttids = relsByObj.get(p.ID) || [];
      const tagNames = ttids.filter(id => tagTtids.has(id))
        .map(id => (termById.get(tagTtids.get(id)) || {}).name).filter(Boolean);
      const catTtid = ttids.find(id => blogCatTtids.has(id));
      return {
        ID: p.ID, post_title: p.post_title, post_name: p.post_name,
        excerpt: p.post_excerpt || null, content_html: p.post_content || null,
        status: p.post_status, post_date: p.post_date, thumbId: m._thumbnail_id || null,
        tagNames,
        categoryWpTermId: catTtid ? blogCatTtids.get(catTtid) : null,
        seo_title: m.rank_math_title || null, seo_description: m.rank_math_description || null,
        ogImageId: m.rank_math_facebook_image || null,
      };
    });

    // ---- redirects ----
    const redirects = [];
    for (const r of rmRedir) {
      const pat = extractRankMathPattern(r.sources);
      if (!pat) continue;
      redirects.push({
        from_path: pathFromUrl(pat.startsWith('http') ? pat : `/${pat.replace(/^\//, '')}`),
        to_path: pathFromUrl(r.url_to), status_code: Number(r.header_code) || 301, source: 'rankmath',
      });
    }
    for (const r of rdItems) {
      redirects.push({
        from_path: pathFromUrl(r.url), to_path: pathFromUrl(r.action_data),
        status_code: Number(r.action_code) || 301, source: 'redirection',
      });
    }

    // ---- write ----
    const write = (name, data) => fs.writeFileSync(path.join(OUT, name), JSON.stringify(data, null, 2));
    write('attachments.json', attachments);
    write('categories.json', categories);
    write('products.json', products);
    write('posts.json', blog);
    write('redirects.json', redirects);
    write('site.json', { blogname: siteRow ? siteRow.blogname : 'Home Tool Center' });

    console.log(`extracted: ${products.length} products, ${categories.length} categories, ${blog.length} posts, ${redirects.length} redirects, ${Object.keys(attachments).length} attachments`);
  } finally {
    srv.stop();
  }
})();
```

- [ ] **Step 2: Run the extraction**

Run: `node scripts/db/extract.js`
Expected stdout ends with: `extracted: 348 products, 42 categories, 31 posts, <N> redirects, 746 attachments` (redirects ≥ 70).

- [ ] **Step 3: Assert the artifacts (parity spot-check)**

Run:
```bash
node -e "const p=require('./research/db-2026-07/products.json'); const c=require('./research/db-2026-07/categories.json'); const b=require('./research/db-2026-07/posts.json'); console.log('products',p.length,'cats',c.length,'posts',b.length); const t=p.find(x=>/[ก-๙]/.test(x.name_th)); console.log('thai-title-roundtrip:', !!t, t&&t.name_th.slice(0,20)); console.log('with-primary-cat:', p.filter(x=>x.primaryCatWpTermId).length);"
```
Expected: `products 348 cats 42 posts 31`; `thai-title-roundtrip: true …`; `with-primary-cat:` ≈ 347.

- [ ] **Step 4: Commit**

```bash
git add scripts/db/extract.js research/db-2026-07/
git commit -m "feat(db): extract products/categories/posts/redirects from WP dump"
```

---

### Task 7: Media stage — referenced uploads → Supabase Storage

**Files:**
- Create: `scripts/db/media.js`
- Uses: `scripts/db/lib/media-key.js`, `research/db-2026-07/*.json`
- Output: `research/db-2026-07/url-map.json`

**Interfaces:**
- Consumes: `storageKeyForFile`, `mimeForExt` (Task 5); `attachments.json`, `products.json`, `posts.json`, `categories.json` (Task 6).
- Produces: `url-map.json` = `{ [oldPathOrId: string]: publicUrl }` mapping both the WP uploads URL and the bare attachment id path to the Supabase public URL. Also a helper other tasks import:
  - `function resolveAttUrl(attId, urlMap, attachments): string | null`

- [ ] **Step 1: Write the media script**

```js
// scripts/db/media.js
// Stage 2: upload only referenced media (featured images, post covers, category
// images, embedded content images, catalog PDFs) to Supabase Storage.
// Run: node scripts/db/media.js
require('dotenv').config({ path: path0() });
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { createClient } = require('@supabase/supabase-js');
const { storageKeyForFile, mimeForExt } = require('./lib/media-key');

function path0() { return path.join(__dirname, '..', '..', '.env.local'); }
const ROOT = path.join(__dirname, '..', '..');
const DIR = path.join(ROOT, 'research', 'db-2026-07');
const ZIP = path.join(ROOT, 'backup-oldwebsite', 'wpuploads.zip');
const BUCKET = 'media';
const PUB = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}/`;
const WP_UPLOADS = 'https://hometools-center.com/wp-content/uploads/';

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } });

const attachments = require(path.join(DIR, 'attachments.json'));
const products = require(path.join(DIR, 'products.json'));
const posts = require(path.join(DIR, 'posts.json'));
const categories = require(path.join(DIR, 'categories.json'));

// collect referenced attachment ids
const attIds = new Set();
const addId = (id) => { if (id) attIds.add(String(id)); };
for (const p of products) { addId(p.thumbId); addId(p.ogImageId); p.galleryIds.forEach(addId); }
for (const b of posts) { addId(b.thumbId); addId(b.ogImageId); }
for (const c of categories) { addId(c.thumbId); }

// collect uploads URLs embedded in HTML content (for content rewrite + upload)
const contentUrls = new Set();
const urlRe = /https?:\/\/hometools-center\.com\/wp-content\/uploads\/([^\s"'<>)]+)/g;
for (const p of products) { let m; while ((m = urlRe.exec(p.description_html || '')) ) contentUrls.add(m[1]); }
for (const b of posts) { let m; while ((m = urlRe.exec(b.content_html || '')) ) contentUrls.add(m[1]); }

(async () => {
  // unzip once to a temp dir
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'htc-uploads-'));
  console.log('unzipping uploads…');
  execFileSync('unzip', ['-q', '-o', ZIP, '-d', tmp]);
  const base = path.join(tmp, 'uploads');

  const urlMap = {};
  async function uploadRel(relFile) {
    if (!relFile) return null;
    const abs = path.join(base, relFile);
    if (!fs.existsSync(abs)) { console.warn('missing file:', relFile); return null; }
    const key = storageKeyForFile(relFile);
    const ext = relFile.split('.').pop();
    const body = fs.readFileSync(abs);
    const { error } = await sb.storage.from(BUCKET).upload(key, body,
      { contentType: mimeForExt(ext), upsert: true });
    if (error && !String(error.message).includes('already exists')) {
      console.warn('upload error', key, error.message); return null;
    }
    const publicUrl = PUB + key;
    urlMap[WP_UPLOADS + relFile] = publicUrl;   // full old URL
    urlMap[relFile] = publicUrl;                // bare rel path
    return publicUrl;
  }

  // 1) attachment-referenced files
  for (const id of attIds) {
    const att = attachments[id];
    if (att) { const u = await uploadRel(att.file); if (u) urlMap[`att:${id}`] = u; }
  }
  // 2) content-embedded files
  for (const rel of contentUrls) await uploadRel(rel);

  fs.writeFileSync(path.join(DIR, 'url-map.json'), JSON.stringify(urlMap, null, 2));
  console.log(`uploaded/mapped ${Object.keys(urlMap).length} url keys (${attIds.size} attachments, ${contentUrls.size} embedded)`);
  fs.rmSync(tmp, { recursive: true, force: true });
})();
```

- [ ] **Step 2: Run the media stage**

Run: `node scripts/db/media.js`
Expected: unzips, uploads, prints `uploaded/mapped <N> url keys (…)`; creates `research/db-2026-07/url-map.json`. `<N>` ≥ 348 (one featured per product at minimum).

- [ ] **Step 3: Assert a sample upload is reachable**

Run:
```bash
node -e "const m=require('./research/db-2026-07/url-map.json'); const k=Object.keys(m).find(x=>x.startsWith('att:')); const u=m[k]; console.log('sample:',u); fetch(u).then(r=>{console.log('HTTP',r.status); process.exit(r.status===200?0:1);});"
```
Expected: `HTTP 200`.

- [ ] **Step 4: Commit**

```bash
git add scripts/db/media.js research/db-2026-07/url-map.json
git commit -m "feat(db): upload referenced media to Storage + build url map"
```

---

### Task 8: Import stage — JSON → Supabase (truncate + insert)

**Files:**
- Create: `scripts/db/import.js`
- Uses: `scripts/db/lib/rankmath.js`, `scripts/db/lib/slug-map.js`, `research/db-2026-07/*.json`, `research/redirect-map.json`

**Interfaces:**
- Consumes: `resolveSeoTitle` (Task 3); `blogRedirects`, `reconcileBlogSlug` (Task 4); all `db-2026-07/*.json` + `url-map.json`.
- Produces: populated `categories`, `products`, `product_categories`, `posts`, `redirects` in Supabase.

- [ ] **Step 1: Write the import script**

```js
// scripts/db/import.js
// Stage 3: truncate the 5 target tables and insert from extracted JSON.
// Run: node scripts/db/import.js
require('dotenv').config({ path: require('node:path').join(__dirname, '..', '..', '.env.local') });
const path = require('node:path');
const { createClient } = require('@supabase/supabase-js');
const { resolveSeoTitle } = require('./lib/rankmath');
const { blogRedirects, reconcileBlogSlug } = require('./lib/slug-map');

const ROOT = path.join(__dirname, '..', '..');
const DIR = path.join(ROOT, 'research', 'db-2026-07');
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } });

const categories = require(path.join(DIR, 'categories.json'));
const products = require(path.join(DIR, 'products.json'));
const posts = require(path.join(DIR, 'posts.json'));
const dbRedirects = require(path.join(DIR, 'redirects.json'));
const urlMap = require(path.join(DIR, 'url-map.json'));
const site = require(path.join(DIR, 'site.json'));
const migrationMap = require(path.join(ROOT, 'research', 'redirect-map.json'));
const attachments = require(path.join(DIR, 'attachments.json'));
// recrawl supplies rendered specs / catalog PDF / fallback descriptions, matched by slug
const recrawl = require(path.join(ROOT, 'research', 'recrawl-2026-06', 'products-detailed.json'));
const recrawlBySlug = new Map(recrawl.map(r => [r.slug, r]));

const SITE_NAME = site.blogname || 'Home Tool Center';
const statusMap = (s) => (s === 'publish' ? 'published' : s === 'trash' ? 'archived' : 'draft');
const attUrl = (id) => (id && urlMap[`att:${id}`]) || (id && attachments[id] && urlMap[attachments[id].file]) || null;
const rewrite = (html) => {
  if (!html) return html;
  let out = html;
  for (const [oldU, newU] of Object.entries(urlMap)) {
    if (oldU.startsWith('http')) out = out.split(oldU).join(newU);
  }
  return out;
};

async function main() {
  // --- SAFETY: assert we are only clearing the allow-list ---
  const ALLOW = ['product_categories', 'products', 'posts', 'redirects', 'categories'];
  console.log('will truncate (in order):', ALLOW.join(', '));

  // Truncate via delete (RLS bypassed by service role). Order respects FKs.
  for (const t of ALLOW) {
    const { error } = await sb.from(t).delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (t === 'product_categories') {
      // product_categories has no `id`; clear by product_id predicate
      await sb.from('product_categories').delete().neq('product_id', '00000000-0000-0000-0000-000000000000');
    }
    if (error && t !== 'product_categories') throw error;
  }

  // --- categories: parents first ---
  const catIdByWp = new Map();
  const roots = categories.filter(c => !c.parentWpTermId);
  const children = categories.filter(c => c.parentWpTermId);
  async function insertCat(c) {
    const row = {
      slug: c.slug, name_th: c.name_th,
      parent_id: c.parentWpTermId ? catIdByWp.get(c.parentWpTermId) : null,
      description: c.description,
      banner_image_url: attUrl(c.thumbId),
      seo_title: resolveSeoTitle(c.seo_title, { postTitle: c.name_th, siteName: SITE_NAME }),
      seo_description: c.seo_description,
      sort_order: c.order, is_published: true,
    };
    const { data, error } = await sb.from('categories').insert(row).select('id').single();
    if (error) throw new Error(`category ${c.slug}: ${error.message}`);
    catIdByWp.set(c.wpTermId, data.id);
  }
  for (const c of roots) await insertCat(c);
  let remaining = children, guard = 0;
  while (remaining.length && guard++ < 10) {
    const next = [];
    for (const c of remaining) {
      if (catIdByWp.has(c.parentWpTermId)) await insertCat(c); else next.push(c);
    }
    remaining = next;
  }
  for (const c of remaining) { c.parentWpTermId = null; await insertCat(c); } // orphans → root

  // --- products ---
  const prodIdByWp = new Map();
  for (const p of products) {
    const featured = attUrl(p.thumbId);
    const rc = recrawlBySlug.get(p.slug);
    let images = [featured, ...p.galleryIds.map(attUrl)].filter(Boolean);
    if (images.length === 0 && rc && rc.images && rc.images.length) {
      images = rc.images.map(u => urlMap[u] || u);  // fallback to recrawl images (rewritten)
    }
    // §5.3: DB post_content empty → fall back to recrawl rendered description
    let description_md = rewrite(p.description_html);
    if ((!description_md || !description_md.trim()) && rc && rc.description_html) {
      description_md = rewrite(rc.description_html);
    }
    const row = {
      slug: p.slug, name_th: p.name_th,
      short_description: p.short_description || (rc && rc.short_description) || null,
      description_md,
      primary_category_id: p.primaryCatWpTermId ? (catIdByWp.get(p.primaryCatWpTermId) || null) : null,
      images, brand_id: null,
      specs: (rc && rc.specs) || [],
      catalog_pdf_url: rc && rc.catalog_pdf_url ? (urlMap[rc.catalog_pdf_url] || rc.catalog_pdf_url) : null,
      seo_title: resolveSeoTitle(p.seo_title, { postTitle: p.name_th, siteName: SITE_NAME }),
      seo_description: p.seo_description || (rc && rc.seo_description) || null,
      og_image_url: attUrl(p.ogImageId) || featured,
      status: statusMap(p.status), sort_order: p.menu_order || 0,
      published_at: p.post_date,
    };
    const { data, error } = await sb.from('products').insert(row).select('id').single();
    if (error) throw new Error(`product ${p.slug}: ${error.message}`);
    prodIdByWp.set(p.ID, data.id);
    // m2m categories
    const edges = [...new Set(p.catWpTermIds)].map(wp => catIdByWp.get(wp)).filter(Boolean)
      .map(cid => ({ product_id: data.id, category_id: cid }));
    if (edges.length) {
      const { error: e2 } = await sb.from('product_categories').insert(edges);
      if (e2) throw new Error(`product_categories ${p.slug}: ${e2.message}`);
    }
  }

  // --- posts (preserve english slugs) ---
  const blogRules = blogRedirects(migrationMap);
  for (const b of posts) {
    const { slug } = reconcileBlogSlug(b, blogRules);
    const row = {
      slug, title: b.post_title, excerpt: b.excerpt,
      content_md: rewrite(b.content_html), cover_image_url: attUrl(b.thumbId),
      tags: b.tagNames || [],
      category_id: null,
      seo_title: resolveSeoTitle(b.seo_title, { postTitle: b.post_title, siteName: SITE_NAME }),
      seo_description: b.seo_description, og_image_url: attUrl(b.ogImageId) || attUrl(b.thumbId),
      status: statusMap(b.status), published_at: b.post_date,
    };
    const { error } = await sb.from('posts').insert(row);
    if (error) throw new Error(`post ${slug}: ${error.message}`);
  }

  // --- redirects: migration map + DB, dedup by from_path ---
  const seen = new Set();
  const rows = [];
  const push = (from_path, to_path, status_code, note) => {
    if (!from_path || !to_path) return;
    if (from_path === to_path) return;
    const key = from_path;
    if (seen.has(key)) return;
    seen.add(key); rows.push({ from_path, to_path, status_code: status_code || 301, note });
  };
  for (const r of migrationMap) push(r.from_path, r.to_path, r.status_code, r.reason || 'migration');
  for (const r of dbRedirects) push(r.from_path, r.to_path, r.status_code, r.source);
  if (rows.length) {
    const { error } = await sb.from('redirects').insert(rows);
    if (error) throw error;
  }

  console.log(`imported: ${catIdByWp.size} categories, ${prodIdByWp.size} products, ${posts.length} posts, ${rows.length} redirects`);
}
main().catch(e => { console.error(e); process.exit(1); });
```

- [ ] **Step 2: Run the import**

Run: `node scripts/db/import.js`
Expected stdout: `imported: 42 categories, 348 products, 31 posts, <N> redirects` (N ≥ 78). No thrown errors.

- [ ] **Step 3: Assert Supabase counts + a sample product**

Run:
```bash
node -e "require('dotenv').config({path:'.env.local'});const{createClient}=require('@supabase/supabase-js');const sb=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});(async()=>{for(const t of ['products','categories','posts','redirects','product_categories']){const{count}=await sb.from(t).select('*',{count:'exact',head:true});console.log(t,count);}const{data}=await sb.from('products').select('slug,name_th,primary_category_id,images').not('primary_category_id','is',null).limit(1);console.log('sample',JSON.stringify(data[0]));})();"
```
Expected: `products 348`, `categories 42`, `posts 31`, `redirects ≥78`, `product_categories >348`; sample has a non-null `primary_category_id` and a non-empty `images` array.

- [ ] **Step 4: Commit**

```bash
git add scripts/db/import.js
git commit -m "feat(db): import extracted WP data into Supabase (truncate+insert)"
```

---

### Task 9: Verify stage + docs

**Files:**
- Create: `scripts/db/verify.js`
- Modify: `TASKS.md`, `CLAUDE.md` (session log + counts)
- Output: `research/db-2026-07/verify-report.json`

**Interfaces:**
- Consumes: Supabase + `db-2026-07/*.json`.
- Produces: a parity report; non-zero exit if any check fails.

- [ ] **Step 1: Write the verify script**

```js
// scripts/db/verify.js
// Parity gate: counts, referential integrity, sample media reachability.
// Run: node scripts/db/verify.js
require('dotenv').config({ path: require('node:path').join(__dirname, '..', '..', '.env.local') });
const path = require('node:path');
const fs = require('node:fs');
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } });

const EXPECT = { products: 348, categories: 42, posts: 31 };

(async () => {
  const report = { checks: [], ok: true };
  const check = (name, pass, detail) => { report.checks.push({ name, pass, detail }); if (!pass) report.ok = false; };

  for (const [t, n] of Object.entries(EXPECT)) {
    const { count } = await sb.from(t).select('*', { count: 'exact', head: true });
    check(`count:${t}`, count === n, `${count}/${n}`);
  }
  const { count: rc } = await sb.from('redirects').select('*', { count: 'exact', head: true });
  check('count:redirects>=78', rc >= 78, `${rc}`);

  // referential: no product with a dangling primary category
  const { data: prods } = await sb.from('products').select('id,slug,primary_category_id,images').limit(1000);
  const { data: cats } = await sb.from('categories').select('id');
  const catIds = new Set(cats.map(c => c.id));
  const dangling = prods.filter(p => p.primary_category_id && !catIds.has(p.primary_category_id));
  check('no-dangling-primary-category', dangling.length === 0, `${dangling.length} dangling`);
  const noImg = prods.filter(p => !p.images || p.images.length === 0);
  check('all-products-have-images', noImg.length === 0, `${noImg.length} without images`);

  // media reachability: sample 3 image URLs → HTTP 200
  const sample = prods.filter(p => p.images && p.images[0]).slice(0, 3);
  for (const p of sample) {
    const r = await fetch(p.images[0]);
    check(`img-200:${p.slug}`, r.status === 200, `${r.status}`);
  }

  fs.writeFileSync(path.join(__dirname, '..', '..', 'research', 'db-2026-07', 'verify-report.json'),
    JSON.stringify(report, null, 2));
  for (const c of report.checks) console.log(`${c.pass ? 'OK ' : 'FAIL'} ${c.name} (${c.detail})`);
  process.exit(report.ok ? 0 : 1);
})();
```

- [ ] **Step 2: Run verify**

Run: `node scripts/db/verify.js`
Expected: every line prefixed `OK `; exit 0.

- [ ] **Step 3: Run the production build**

Run: `npm run build`
Expected: build completes with no type/route errors (ISR pages prerender from the new data).

- [ ] **Step 4: Update docs**

In `TASKS.md`: tick the product/media gap items; add a line under the current phase: "DB re-migration complete — 348 products / 42 categories / 31 posts / ~N redirects from authoritative dump (`scripts/db/*`, `research/db-2026-07/`)."

In `CLAUDE.md`: bump "Last updated" to 2026-07-12; under "Current state" change the product count note from 200 → 348 and remove the "148 products missing" gap; append a Session log entry describing the DB dump re-migration (Stages 1-3, temp MySQL extraction, referenced-media upload, truncate+insert). Note `brand_id` mapping is still pending (DB has no brand taxonomy).

- [ ] **Step 5: Commit**

```bash
git add scripts/db/verify.js research/db-2026-07/verify-report.json TASKS.md CLAUDE.md
git commit -m "feat(db): add parity verify + update project docs for re-migration"
```

---

## Self-Review

**Spec coverage:**
- §3 Stage 1 (extract) → Tasks 1, 2, 6. Stage 2 (media) → Tasks 5, 7. Stage 3 (import) → Tasks 3, 4, 8. §6 verify → Task 9. ✅
- §4 field mappings: products/categories/posts/redirects all implemented in Tasks 6 & 8. ✅
- §5.1 blog slug preservation → Task 4 + Task 8 posts loop. ✅
- §5.2 SEO template → Task 3 + applied in Task 8. ✅
- §5.3 empty description fallback → Task 8 product loop: `require`s `recrawl-2026-06/products-detailed.json`, and when `description_html` (or images/short_description/seo) is empty, falls back to the recrawl record by slug. Also sources `specs` and `catalog_pdf_url` from the same record. ✅
- §5.4 redirect dedup/loop safety → Task 8 redirects block (`from===to` skip, `seen` dedup). ✅
- §2 truncate allow-list / preserved tables → Task 8 `ALLOW` list. ✅
- §6 verification (counts, referential, media 200, build) → Task 9. ✅

**Placeholder scan:** no TBD/TODO; all steps carry runnable code and exact commands. ✅

**Type consistency:** `attUrl`, `resolveSeoTitle`, `blogRedirects`/`reconcileBlogSlug`, `storageKeyForFile`/`mimeForExt`, `extractRankMathPattern`, `recrawlBySlug` names match across producing and consuming tasks. JSON shapes in Task 6 Interfaces match reads in Tasks 7-9. ✅

**All spec sections have a corresponding task; no placeholders remain.**
