#!/usr/bin/env node
/**
 * DNS cutover: point hometools-center.com at Vercel via the Cloudflare API.
 *
 * Only touches the apex and `www` records. Mail (MX, mail/webmail A records),
 * SPF and the Google site-verification TXT are left untouched — the client's
 * email still lives on the old host at 27.254.134.234.
 *
 *   node scripts/launch/cloudflare-cutover.js            # dry run — prints the plan, writes nothing
 *   node scripts/launch/cloudflare-cutover.js --apply    # point the domain at Vercel
 *   node scripts/launch/cloudflare-cutover.js --rollback # put it back on the old host
 *
 * Reads CLOUDFLARE_API_TOKEN from .env.local (or the environment). The token needs
 * Zone → DNS → Edit, scoped to hometools-center.com, issued from the Cloudflare account
 * that actually holds the zone.
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env.local') });

const ZONE_NAME = 'hometools-center.com';
const VERCEL_CNAME = 'f719314d174704b9.vercel-dns-017.com';
const OLD_ORIGIN_IP = '27.254.134.234'; // for --rollback
const TTL = 60; // low during cutover; raise to 300+ once stable

const TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const APPLY = process.argv.includes('--apply');
const ROLLBACK = process.argv.includes('--rollback');

if (!TOKEN) {
  console.error('CLOUDFLARE_API_TOKEN is required');
  process.exit(1);
}

const API = 'https://api.cloudflare.com/client/v4';

async function cf(pathname, init = {}) {
  const res = await fetch(API + pathname, {
    ...init,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
  const body = await res.json();
  if (!body.success) {
    throw new Error(`${init.method || 'GET'} ${pathname} → ${JSON.stringify(body.errors)}`);
  }
  return body.result;
}

/** Records we are allowed to touch. Everything else in the zone is off-limits. */
const isApex = (r) => r.name === ZONE_NAME && (r.type === 'A' || r.type === 'AAAA' || r.type === 'CNAME');
const isWww = (r) => r.name === `www.${ZONE_NAME}` && (r.type === 'A' || r.type === 'AAAA' || r.type === 'CNAME');

async function main() {
  const check = await cf('/user/tokens/verify');
  console.log(`token: ${check.status}\n`);

  const zones = await cf(`/zones?name=${ZONE_NAME}`);
  if (!zones.length) {
    throw new Error(
      `zone ${ZONE_NAME} is not visible to this token.\n` +
        `  The domain's nameservers already point at Cloudflare, so the zone exists on SOME\n` +
        `  account — just not the one that issued this token, or the token is not scoped to it.\n` +
        `  Re-issue it from the account holding the zone, with Zone → DNS → Edit.`
    );
  }
  const zone = zones[0];
  console.log(`zone: ${zone.name} (${zone.id})  status=${zone.status}\n`);

  const records = await cf(`/zones/${zone.id}/dns_records?per_page=200`);

  console.log('--- current zone ---');
  for (const r of records) {
    const touched = isApex(r) || isWww(r) ? ' <== will change' : '';
    console.log(
      `${r.type.padEnd(6)} ${r.name.padEnd(34)} ${String(r.content).slice(0, 46).padEnd(48)} ` +
        `proxied=${r.proxied} ttl=${r.ttl}${touched}`
    );
  }

  // Guard: never let this script near mail.
  const mailish = records.filter(
    (r) => r.type === 'MX' || /^(mail|webmail|smtp|imap|pop)\./.test(r.name)
  );
  console.log(`\nmail records left untouched: ${mailish.length}`);
  mailish.forEach((r) => console.log(`  ${r.type} ${r.name} → ${r.content}`));

  const target = ROLLBACK
    ? { type: 'A', content: OLD_ORIGIN_IP }
    : { type: 'CNAME', content: VERCEL_CNAME };

  const plan = [];
  const apexNow = records.filter(isApex);
  const wwwNow = records.filter(isWww);

  for (const [label, existing, name] of [
    ['apex', apexNow, ZONE_NAME],
    ['www', wwwNow, `www.${ZONE_NAME}`],
  ]) {
    // www keeps pointing at the apex on rollback, mirroring the pre-cutover zone.
    const desired =
      ROLLBACK && label === 'www' ? { type: 'CNAME', content: ZONE_NAME } : target;

    if (existing.length === 0) {
      plan.push({ op: 'create', label, name, ...desired });
    } else {
      const [keep, ...extra] = existing;
      plan.push({ op: 'update', label, id: keep.id, name, ...desired, from: `${keep.type} ${keep.content}` });
      extra.forEach((r) => plan.push({ op: 'delete', label, id: r.id, name, from: `${r.type} ${r.content}` }));
    }
  }

  console.log(`\n--- plan (${ROLLBACK ? 'ROLLBACK to old host' : 'CUTOVER to Vercel'}) ---`);
  for (const p of plan) {
    console.log(
      p.op === 'delete'
        ? `DELETE  ${p.name}  (${p.from})`
        : `${p.op.toUpperCase().padEnd(6)}  ${p.name}  ${p.from ? p.from + '  →  ' : ''}${p.type} ${p.content}  proxied=false ttl=${TTL}`
    );
  }

  if (!APPLY) {
    console.log('\nDRY RUN — nothing changed. Re-run with --apply to execute.');
    return;
  }

  console.log('\napplying…');
  for (const p of plan) {
    if (p.op === 'delete') {
      await cf(`/zones/${zone.id}/dns_records/${p.id}`, { method: 'DELETE' });
      console.log(`  deleted ${p.name} (${p.from})`);
      continue;
    }
    const payload = {
      type: p.type,
      name: p.name,
      content: p.content,
      ttl: TTL,
      proxied: false, // Vercel requires DNS-only (grey cloud)
    };
    if (p.op === 'create') {
      await cf(`/zones/${zone.id}/dns_records`, { method: 'POST', body: JSON.stringify(payload) });
      console.log(`  created ${p.name} → ${p.content}`);
    } else {
      await cf(`/zones/${zone.id}/dns_records/${p.id}`, { method: 'PUT', body: JSON.stringify(payload) });
      console.log(`  updated ${p.name} → ${p.content}`);
    }
  }
  console.log('\ndone. propagation is ~TTL seconds; verify with:');
  console.log(`  dig +short ${ZONE_NAME}`);
  console.log(`  curl -sI https://${ZONE_NAME}/ | grep -i "HTTP/\\|server:\\|x-robots-tag"`);
}

main().catch((e) => {
  console.error('\nFAILED:', e.message);
  process.exit(1);
});
