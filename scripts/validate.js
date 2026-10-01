#!/usr/bin/env node
'use strict';

const { loadDomains } = require('../lib/domains');
const { validateAll } = require('../lib/validate');

const loaded = loadDomains();
const problems = loaded.filter((e) => e.error).map((e) => ({ label: e.label, message: e.error }));
problems.push(...validateAll(loaded.filter((e) => !e.error)));

if (problems.length) {
  for (const p of problems) console.error(`::error title=${p.label}.json::${p.message}`);
  console.error(`\n❌ ${problems.length} problem(s) found. See CONTRIBUTING.md for the file format.`);
  process.exit(1);
}
console.log(`✅ ${loaded.length} domain file(s) are valid.`);
