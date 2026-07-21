#!/usr/bin/env node
/**
 * One-shot repair: decode percent-encoded slugs left behind by the 2026-07 migration.
 *
 * WordPress persists `post_name` percent-encoded when the title is non-ASCII, so 38
 * Thai-named products landed in Postgres as '%e0%b8%97%e0%b9%88%e0%b8%ad-pb' instead of
 * 'ท่อ-pb'. Next.js decodes route params before handing them to us, so `.eq('slug', …)`
 * never matched and every one of those product pages 404'd. The same applies to
 * `redirects.to_path`, whose 301s pointed at those encoded slugs.
 *
 * `scripts/db/extract.js` now decodes at the source, so a re-migration produces the
 * correct form; this script only repairs the rows already imported. Idempotent —
 * decoding an already-decoded slug is a no-op.
 *
 *   node scripts/db/fix-encoded-slugs.js          # dry run, prints the diff
 *   node scripts/db/fix-encoded-slugs.js --apply  # write
 */
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const APPLY = process.argv.includes('--apply');
const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const isEncoded = (s) => typeof s === 'string' && /%[0-9a-fA-F]{2}/.test(s);

function decode(s) {
  try {
    return decodeURIComponent(s);
  } catch {
    return null; // malformed escape — leave it alone rather than corrupt it
  }
}

async function fixColumn(table, column) {
  const { data, error } = await sb.from(table).select(`id, ${column}`);
  if (error) throw new Error(`${table}.${column}: ${error.message}`);

  const changes = [];
  for (const row of data) {
    const before = row[column];
    if (!isEncoded(before)) continue;
    const after = decode(before);
    if (after === null) {
      console.log(`  ! SKIP undecodable  ${before}`);
      continue;
    }
    if (after !== before) changes.push({ id: row.id, before, after });
  }

  // A decode that lands on a slug another row already owns would break the unique
  // index (and silently point two products at one URL) — bail before writing anything.
  if (column === 'slug') {
    const existing = new Set(data.map((r) => r[column]));
    changes.forEach((c) => existing.delete(c.before));
    const collisions = changes.filter((c) => existing.has(c.after));
    if (collisions.length) {
      throw new Error(
        `${table}.${column}: ${collisions.length} decoded slug(s) collide with an existing row — ` +
          `resolve by hand:\n${collisions.map((c) => `  ${c.before} -> ${c.after}`).join('\n')}`
      );
    }
  }

  console.log(`\n${table}.${column}: ${changes.length} row(s) to decode`);
  for (const c of changes) console.log(`  ${c.after}`);

  if (APPLY) {
    for (const c of changes) {
      const { error: upErr } = await sb
        .from(table)
        .update({ [column]: c.after })
        .eq('id', c.id);
      if (upErr) throw new Error(`${table}.${c.id}: ${upErr.message}`);
    }
    console.log(`  -> updated ${changes.length}`);
  }
  return changes.length;
}

(async () => {
  let total = 0;
  for (const [table, column] of [
    ['products', 'slug'],
    ['categories', 'slug'],
    ['posts', 'slug'],
    ['redirects', 'to_path'],
    ['redirects', 'from_path'],
  ]) {
    total += await fixColumn(table, column);
  }
  console.log(
    `\n${total} row(s) ${APPLY ? 'updated' : 'would change'}` +
      (APPLY ? '' : ' — re-run with --apply to write')
  );
})().catch((e) => {
  console.error('\nFAILED:', e.message);
  process.exit(1);
});
