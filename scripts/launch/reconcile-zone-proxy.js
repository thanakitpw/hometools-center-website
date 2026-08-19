#!/usr/bin/env node
/**
 * Turn off Cloudflare proxying on every record except the ones we deliberately changed.
 *
 * When a domain that is already on Cloudflare gets added to a second account, the scan
 * imports records with proxying ON — but the zone actually serving the domain has it OFF
 * everywhere. Switching nameservers makes the whole imported zone authoritative at once,
 * so `mail`, `ftp`, `ns1`/`ns2` and a BunnyCDN `cdn` alias would suddenly answer with
 * Cloudflare's HTTP proxy IPs and every non-HTTP service on them would break.
 *
 * This makes the pending zone a faithful copy of the live one, so the nameserver flip
 * changes exactly one thing: apex + www now point at Vercel.
 *
 *   node scripts/launch/reconcile-zone-proxy.js           # dry run
 *   node scripts/launch/reconcile-zone-proxy.js --apply
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env.local') });

const ZONE_NAME = 'hometools-center.com';
const TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const APPLY = process.argv.includes('--apply');

if (!TOKEN) {
  console.error('CLOUDFLARE_API_TOKEN is required');
  process.exit(1);
}

const API = 'https://api.cloudflare.com/client/v4';

async function cf(pathname, init = {}) {
  const res = await fetch(API + pathname, {
    ...init,
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json', ...(init.headers || {}) },
  });
  const body = await res.json();
  if (!body.success) throw new Error(`${init.method || 'GET'} ${pathname} → ${JSON.stringify(body.errors)}`);
  return body.result;
}

(async () => {
  const [zone] = await cf(`/zones?name=${ZONE_NAME}`);
  if (!zone) throw new Error(`zone ${ZONE_NAME} not visible to this token`);
  console.log(`zone: ${zone.name}  status=${zone.status}\n`);

  const records = await cf(`/zones/${zone.id}/dns_records?per_page=200`);
  const proxied = records.filter((r) => r.proxied);

  if (!proxied.length) {
    console.log('nothing proxied — zone already matches the live one.');
    return;
  }

  console.log(`records with proxying ON: ${proxied.length}`);
  for (const r of proxied) console.log(`  ${r.type.padEnd(6)} ${r.name.padEnd(36)} ${r.content}`);

  if (!APPLY) {
    console.log('\nDRY RUN — re-run with --apply to set proxied=false on all of the above.');
    return;
  }

  console.log('\napplying…');
  for (const r of proxied) {
    await cf(`/zones/${zone.id}/dns_records/${r.id}`, {
      method: 'PUT',
      body: JSON.stringify({ type: r.type, name: r.name, content: r.content, ttl: r.ttl, proxied: false }),
    });
    console.log(`  ${r.name} (${r.type}) → proxied=false`);
  }

  const after = (await cf(`/zones/${zone.id}/dns_records?per_page=200`)).filter((r) => r.proxied);
  console.log(`\nverify: ${after.length} records still proxied (expected 0)`);
})().catch((e) => {
  console.error('FAILED:', e.message);
  process.exit(1);
});
