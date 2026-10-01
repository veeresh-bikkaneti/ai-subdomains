'use strict';

const cfg = require('./config');

// changes: [{ status: 'A'|'M'|'D', label, before, after }] where before/after are parsed domain JSON (or null).
// Returns [{ label, message }]. Maintainers may touch anything; everyone else only their own files.
function checkOwnership(changes, author) {
  const problems = [];
  const who = (author || '').toLowerCase();
  if (!who) return [{ label: '*', message: 'could not determine the pull request author' }];
  if (cfg.maintainers.has(who)) return problems;

  if (changes.length > cfg.MAX_DOMAIN_FILES_PER_PR) {
    problems.push({ label: '*', message: `a pull request may change at most ${cfg.MAX_DOMAIN_FILES_PER_PR} domain files` });
  }
  for (const c of changes) {
    const claimed = c.status === 'A' ? c.after && c.after.owner && c.after.owner.username : c.before && c.before.owner && c.before.owner.username;
    if (!claimed || String(claimed).toLowerCase() !== who) {
      const verb = c.status === 'A' ? 'register a domain for' : c.status === 'D' ? 'remove the domain of' : 'edit the domain of';
      problems.push({ label: c.label, message: `@${author} cannot ${verb} '${claimed || 'unknown'}'; "owner.username" must match the PR author` });
    } else if (c.status === 'M' && c.after && c.after.owner && String(c.after.owner.username).toLowerCase() !== who) {
      problems.push({ label: c.label, message: 'owner.username cannot be changed to someone else' });
    }
  }
  return problems;
}

module.exports = { checkOwnership };
