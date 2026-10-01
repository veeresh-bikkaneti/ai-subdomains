'use strict';

const fs = require('fs');
const path = require('path');
const { DOMAINS_DIR } = require('./config');

// Reads every domains/*.json. Parse failures are returned as { label, error } so callers can report them.
function loadDomains(dir = DOMAINS_DIR) {
  return fs
    .readdirSync(dir)
    .filter((f) => !f.startsWith('.'))
    .sort()
    .map((file) => {
      const label = file.replace(/\.json$/, '');
      if (!file.endsWith('.json')) return { label, file, error: 'only .json files are allowed in domains/' };
      try {
        return { label, file, data: JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8')) };
      } catch (err) {
        return { label, file, error: `invalid JSON: ${err.message}` };
      }
    });
}

module.exports = { loadDomains };
