#!/usr/bin/env node
/**
 * Compare the pending Cloudflare zone against DNS as it is actually being served.
 *
 * The domain already sits on Cloudflare under a *different* account, so a second zone was
 * created in ours and Cloudflare pre-populated it by scanning. Scans miss records. Because
 * flipping the registrar's nameservers makes the whole new zone authoritative at once —
 * mail included — every record has to be reconciled BEFORE the flip, not after.
 *
 *   node scripts/launch/compare-zone.js
 */

const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');
require('dotenv').config({ path: path.join(__dirname, '../../.env.local') });

const run = promisify(execFile);
const ZONE = 'hometools-center.com';
const TOKEN = process.env.CLOUDFLARE_API_TOKEN;

// Types worth reconciling, plus the hostnames a scan is most likely to have missed.
const TYPES = ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'SRV', 'NS', 'CAA'];
const EXTRA_NAMES = [
  'mail', 'webmail', 'smtp', 'imap', 'pop', 'ftp', 'cpanel', 'whm', 'cdn',
  'autodiscover', 'autoconfig', 'ns1', 'ns2', 'ipv4', 'shop', 'blog', 'admin',
  'staging', 'dev', 'test', 'api', 'm', 'lms', 'vpn', 'remote', '_dmarc',
  'default._domainkey', '_domainkey',
];

if (!TOKEN) {
  console.error('CLOUDFLARE_API_TOKEN is required');
  process.exit(1);
}

/** Ask the authoritative nameservers directly — not a resolver cache. */
async function dig(name, type) {
  try {
    const { stdout } = await run('dig', ['+short', '@kallie.ns.cloudflare.com', name, type]);
    return stdout.trim().split('\n').filter(Boolean);
  } catch {
    return [];
  }
}

const norm = (s) =>
  String(s).trim().replace(/\.$/, '').replace(/^"|"$/g, '').replace(/"\s+"/g, '').toLowerCase();

(async () => {
  const res = await fetch(`https://api.cloudflare.com/client/v4/zones?name=${ZONE}`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  const zone = (await res.json()).result[0];

  const recRes = await fetch(
    `https://api.cloudflare.com/client/v4/zones/${zone.id}/dns_records?per_page=500`,
    { headers: { Authorization: `Bearer ${TOKEN}` } }
  );
  const records = (await recRes.json()).result;

  const inZone = new Map(); // "type name" -> [contents]
  for (const r of records) {
    const k = `${r.type} ${norm(r.name)}`;
    if (!inZone.has(k)) inZone.set(k, []);
    inZone.get(k).push(norm(r.type === 'MX' || r.type === 'SRV' ? `${r.priority ?? ''} ${r.content}` : r.content));
  }

  const names = new Set([ZONE, ...EXTRA_NAMES.map((n) => `${n}.${ZONE}`), ...records.map((r) => norm(r.name))]);

  console.log(`comparing ${names.size} names x ${TYPES.length} types against the LIVE authoritative NS\n`);

  const missing = [];
  const differs = [];

  // A name that is a CNAME answers *every* query type by following the alias, so asking it
  // for MX/TXT/NS returns the target's records and looks like a pile of missing entries.
  // Compare those names on CNAME alone.
  //
  // Blind spot: a name we changed from A to CNAME (the apex, pointed at Vercel) is skipped
  // entirely — live has no CNAME to compare against, and its A record is filtered out here.
  // Verify the apex against the API directly.
  const isAlias = new Set(
    records.filter((r) => r.type === 'CNAME').map((r) => norm(r.name))
  );

  for (const name of names) {
    for (const type of TYPES) {
      if (isAlias.has(norm(name)) && type !== 'CNAME') continue;
      const live = await dig(name, type);
      if (!live.length) continue;
      const key = `${type} ${norm(name)}`;
      const mine = inZone.get(key) || [];

      // dig returns MX/SRV with their priority prefix already; A/CNAME/TXT come bare.
      const liveNorm = live.map((l) => norm(type === 'SRV' ? l.split(/\s+/).slice(0, 1).concat(l.split(/\s+/).slice(2)).join(' ') : l));
      const mineNorm = mine.map((m) => norm(type === 'SRV' ? m.split(/\s+/).filter((_, i) => i !== 1).join(' ') : m));

      if (!mine.length) {
        missing.push({ type, name, live });
        continue;
      }
      const same = liveNorm.every((l) => mineNorm.some((m) => m.includes(l) || l.includes(m)));
      if (!same) differs.push({ type, name, live: liveNorm, mine: mineNorm });
    }
  }

  console.log(`=== present live but MISSING from the new zone: ${missing.length} ===`);
  for (const m of missing) console.log(`  ${m.type.padEnd(6)} ${m.name.padEnd(38)} ${m.live.join(' | ')}`);

  console.log(`\n=== present in both but DIFFERENT: ${differs.length} ===`);
  for (const d of differs) {
    console.log(`  ${d.type.padEnd(6)} ${d.name}`);
    console.log(`     live: ${d.live.join(' | ')}`);
    console.log(`     ours: ${d.mine.join(' | ')}`);
  }

  if (!missing.length && !differs.length) {
    console.log('\nzone is a faithful copy — safe to switch nameservers once apex/www point at Vercel.');
  } else {
    console.log('\nreconcile the above BEFORE switching nameservers — the whole zone goes live at once.');
  }
})().catch((e) => {
  console.error('FAILED:', e.message);
  process.exit(1);
});
