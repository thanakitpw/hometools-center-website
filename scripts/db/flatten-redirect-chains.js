#!/usr/bin/env node
/**
 * Flatten multi-hop redirect chains to a single 301.
 *
 * Three things make a stored `to_path` non-terminal:
 *   1. trailing slash        — Next normalises it away with a 308 before middleware runs
 *   2. an intermediate slug  — e.g. an old Thai blog slug that itself redirects again
 *   3. a bare leaf category  — /product-category/<leaf> 308s to the full ancestor chain
 *
 * Each costs a hop that Google has to follow and that dilutes link equity. This walks
 * every redirect against a live deployment, records where it actually lands, and rewrites
 * `to_path` to that terminal path.
 *
 *   node scripts/db/flatten-redirect-chains.js                 # dry run
 *   node scripts/db/flatten-redirect-chains.js --apply
 *   SMOKE_HOST=https://hometools-center.com node ... --apply   # after cutover
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env.local') });
const { createClient } = require('@supabase/supabase-js');

const HOST = process.env.SMOKE_HOST || 'https://hometools-website-redesign.vercel.app';
const APPLY = process.argv.includes('--apply');
const MAX_HOPS = 6;

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

/** Follow a path to its terminal URL, returning the hop count and final status. */
async function resolve(pathname) {
  let url = HOST + pathname;
  let hops = 0;
  for (let i = 0; i < MAX_HOPS; i++) {
    const res = await fetch(url, { redirect: 'manual', headers: { 'user-agent': 'htc-flatten/1.0' } });
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get('location');
      if (!loc) return { status: res.status, hops, final: null };
      hops++;
      url = new URL(loc, url).toString();
      continue;
    }
    const u = new URL(url);
    // Slugs are stored decoded (see scripts/db/fix-encoded-slugs.js); keep that invariant.
    return { status: res.status, hops, final: decodeURIComponent(u.pathname) + u.search };
  }
  return { status: -1, hops, final: null };
}

async function pool(items, size, fn) {
  const out = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: size }, async () => {
      while (i < items.length) {
        const idx = i++;
        out[idx] = await fn(items[idx]);
      }
    })
  );
  return out;
}

(async () => {
  const { data: rows, error } = await db.from('redirects').select('id,from_path,to_path,status_code');
  if (error) throw new Error(error.message);
  console.log(`checking ${rows.length} redirects against ${HOST}\n`);

  const traced = await pool(rows, 10, async (r) => ({ ...r, ...(await resolve(r.from_path)) }));

  const fixes = [];
  const deadEnds = [];
  for (const r of traced) {
    if (r.status !== 200) {
      deadEnds.push(r);
      continue;
    }
    if (r.hops > 1 && r.final && r.final !== r.to_path) fixes.push(r);
  }

  console.log(`already single-hop : ${traced.filter((r) => r.status === 200 && r.hops <= 1).length}`);
  console.log(`to flatten         : ${fixes.length}`);
  console.log(`not reaching 200   : ${deadEnds.length}`);
  for (const d of deadEnds) console.log(`   ! ${d.status} (${d.hops} hops) ${d.from_path}`);

  console.log('\n--- rewrites ---');
  for (const f of fixes) {
    console.log(`${String(f.hops)} hops  ${f.from_path}`);
    console.log(`         ${f.to_path}  →  ${f.final}`);
  }

  if (!APPLY) {
    console.log('\nDRY RUN — nothing written. Re-run with --apply.');
    return;
  }

  let ok = 0;
  for (const f of fixes) {
    const { error: e } = await db
      .from('redirects')
      .update({ to_path: f.final, status_code: 301 })
      .eq('id', f.id);
    if (e) console.error(`  FAILED ${f.from_path}: ${e.message}`);
    else ok++;
  }
  console.log(`\nupdated ${ok}/${fixes.length} rows`);

  // Re-check: every rewritten row should now land in exactly one hop.
  const recheck = await pool(fixes, 10, async (f) => ({ ...f, ...(await resolve(f.from_path)) }));
  const stillLong = recheck.filter((r) => r.hops > 1);
  console.log(`verify: ${recheck.length - stillLong.length}/${recheck.length} now single-hop`);
  for (const s of stillLong) console.log(`   still ${s.hops} hops: ${s.from_path} → ${s.final}`);
})().catch((e) => {
  console.error('FAILED:', e.message);
  process.exit(1);
});
