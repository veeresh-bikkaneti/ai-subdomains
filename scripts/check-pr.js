#!/usr/bin/env node
'use strict';
// Verifies that a PR only touches domain files its author owns.
// Env: BASE_SHA, HEAD_SHA, PR_AUTHOR (provided by .github/workflows/validate.yml)

const { execFileSync } = require('child_process');
const { checkOwnership } = require('../lib/ownership');

const { BASE_SHA, HEAD_SHA, PR_AUTHOR } = process.env;
if (!BASE_SHA || !HEAD_SHA) {
  console.error('BASE_SHA and HEAD_SHA are required');
  process.exit(2);
}

const git = (...args) => execFileSync('git', args, { encoding: 'utf8' });
const parse = (rev, file) => {
  try {
    return JSON.parse(git('show', `${rev}:${file}`));
  } catch {
    return null;
  }
};

const changes = git('diff', '--name-status', '--no-renames', BASE_SHA, HEAD_SHA, '--', 'domains/')
  .split('\n')
  .filter(Boolean)
  .map((line) => {
    const [status, file] = line.split('\t');
    return {
      status,
      label: file.replace(/^domains\//, '').replace(/\.json$/, ''),
      before: status === 'A' ? null : parse(BASE_SHA, file),
      after: status === 'D' ? null : parse(HEAD_SHA, file),
    };
  })
  .filter((c) => !c.label.startsWith('.'));

const problems = checkOwnership(changes, PR_AUTHOR);
if (problems.length) {
  for (const p of problems) console.error(`::error title=${p.label}::${p.message}`);
  process.exit(1);
}
console.log(`✅ Ownership check passed for ${changes.length} changed domain file(s).`);
