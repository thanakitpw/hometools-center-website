#!/usr/bin/env node
/**
 * Write the old site's curated sidebar order into `categories.sort_order`.
 *
 * The WooCommerce term order does NOT match what hometools-center.com actually showed:
 * the sidebar was a hand-built Elementor nav menu, so the running order (PVC SCG, PVC
 * ท่อน้ำไทย, PPR, PE, PB, PP, CONDUIT, …) is curated, not derived. This script replays
 * that menu's order onto sort_order so `listAllCategories()` — which already sorts by
 * sort_order — reproduces it, and the client can re-order later from /admin.
 *
 * Positions are spaced by 10 to leave room for manual insertions.
 * Idempotent: re-running writes the same values.
 *
 *   node scripts/db/set-category-order.js          # dry run
 *   node scripts/db/set-category-order.js --apply  # write
 */
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const APPLY = process.argv.includes('--apply');
const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

// Verbatim from the old site's sidebar widget (captured off research/crawl/). Indented
// entries are children. `pvc-pipes-and-fittings-thaipipe` is a ROOT category that the
// old menu nonetheless displayed inside the งานระบบ group — its URL stays root-level
// (that is what Google indexed); only its sidebar position is set here.
const MENU_ORDER = [
  'pvc-pipes-and-fittings-scg',
  'scg',
  'pvc-pipes-and-fittings-thaipipe',
  'thai-pipe',
  'ppr-pipes-and-fittings',
  'thai-ppr',
  'pe-pipes-and-fittings',
  'sr',
  'thai-asia-pipe',
  'uhm',
  'pb-pipes-and-fittings',
  'uhm-pb-pipes-and-fittings',
  'pp-pipes-and-fittings',
  'uhm-pp-pipes-and-fittings',
  'conduit-pipe',
  'pat',
  'pe-lined-steel-pipe',
  'syler',
  'industrial-rubber-hose',
  'ncr',
  'meters-taps-sluices-water-pumps-and-valves',
  'ana',
  'asahi',
  'grundfos',
  'hitachi',
  'mitsubishi',
  'sanwa',
  'water-tank',
  'jumbo',
  'diamond-brand',
  'manhole-roof-drain-fordren-and-other-accessories',
  'knack',
  'toa-color',
  'decorative-coatings',
  'construction-chemicals',
  'special-paint',
  'metal-coatings',
  'wood-coatings',
  'heavy-duty-coatings',
  'gypsum',
];

// The two section headings. Values place 'system-work' first and
// 'construction-materials-and-equipment' immediately before its own child 'toa-color'.
const SECTION_ORDER = {
  'system-work': 0,
  'construction-materials-and-equipment': 325,
};

(async () => {
  const { data: cats, error } = await sb.from('categories').select('id, slug, name_th, sort_order');
  if (error) throw new Error(error.message);

  const bySlug = new Map(cats.map((c) => [c.slug, c]));
  const target = new Map();

  MENU_ORDER.forEach((slug, i) => target.set(slug, (i + 1) * 10));
  Object.entries(SECTION_ORDER).forEach(([slug, v]) => target.set(slug, v));

  // Every category must be accounted for, or the sidebar silently falls back to
  // alphabetical for whatever was missed.
  const missingInDb = [...target.keys()].filter((s) => !bySlug.has(s));
  const missingInMenu = cats.filter((c) => !target.has(c.slug));
  if (missingInDb.length) {
    throw new Error(`slug(s) in the menu but not in the DB: ${missingInDb.join(', ')}`);
  }
  if (missingInMenu.length) {
    throw new Error(
      `category(ies) in the DB but not in the menu: ${missingInMenu
        .map((c) => `${c.slug} (${c.name_th})`)
        .join(', ')}`
    );
  }

  const changes = cats
    .map((c) => ({ ...c, next: target.get(c.slug) }))
    .filter((c) => c.sort_order !== c.next);

  console.log(`${cats.length} categories, ${changes.length} need a new sort_order`);
  for (const c of changes) console.log(`  ${String(c.sort_order).padStart(4)} -> ${String(c.next).padStart(4)}  ${c.slug}`);

  if (APPLY) {
    for (const c of changes) {
      const { error: upErr } = await sb.from('categories').update({ sort_order: c.next }).eq('id', c.id);
      if (upErr) throw new Error(`${c.slug}: ${upErr.message}`);
    }
    console.log(`\nupdated ${changes.length}`);
  } else {
    console.log('\ndry run — re-run with --apply to write');
  }
})().catch((e) => {
  console.error('\nFAILED:', e.message);
  process.exit(1);
});
