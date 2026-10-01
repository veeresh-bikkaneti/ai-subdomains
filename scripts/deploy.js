#!/usr/bin/env node
'use strict';
// Declarative sync: makes the managed DNS records in Cloudflare match domains/*.json.
// Usage: node scripts/deploy.js [--dry-run]   Env: CF_API_TOKEN, CF_ZONE_ID, MAX_DELETES (default 10), FORCE=true

const { loadDomains } = require('../lib/domains');
const { validateAll } = require('../lib/validate');
const { desiredRecords, planChanges } = require('../lib/plan');
const { Cloudflare } = require('../lib/cloudflare');

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const loaded = loadDomains();
  const bad = loaded.filter((e) => e.error).map((e) => `${e.label}: ${e.error}`);
  bad.push(...validateAll(loaded.filter((e) => !e.error)).map((p) => `${p.label}: ${p.message}`));
  if (bad.length) throw new Error(`Refusing to deploy invalid data:\n  ${bad.join('\n  ')}`);

  const cf = new Cloudflare({ token: process.env.CF_API_TOKEN, zoneId: process.env.CF_ZONE_ID });
  const plan = planChanges(desiredRecords(loaded), await cf.listRecords());

  for (const name of plan.conflicts) console.warn(`⚠️  ${name} already has a record that this registry does not manage; skipping it.`);
  for (const d of plan.deletes) console.log(`- delete ${d.type} ${d.name} ${d.content}`);
  for (const p of plan.posts) console.log(`+ create ${p.type} ${p.name} ${p.content}`);
  for (const p of plan.patches) console.log(`~ normalize ${p.id}`);

  const maxDeletes = Number(process.env.MAX_DELETES || 10);
  if (plan.deletes.length > maxDeletes && process.env.FORCE !== 'true') {
    throw new Error(`Plan deletes ${plan.deletes.length} records (limit ${maxDeletes}). Re-run with FORCE=true if this is intended.`);
  }
  if (dryRun) {
    console.log(`\nDry run: ${plan.posts.length} to create, ${plan.deletes.length} to delete, ${plan.patches.length} to normalize.`);
  } else if (plan.posts.length + plan.deletes.length + plan.patches.length === 0) {
    console.log('✅ Cloudflare is already in sync.');
  } else {
    await cf.applyChanges(plan);
    console.log(`\n✅ Applied: ${plan.posts.length} created, ${plan.deletes.length} deleted, ${plan.patches.length} normalized.`);
  }
  if (plan.conflicts.length) process.exitCode = 1;
}

main().catch((err) => {
  console.error(`❌ ${err.message}`);
  process.exit(1);
});
