'use strict';

const path = require('path');

module.exports = {
  ZONE: 'is-ai.si',
  DOMAINS_DIR: path.join(__dirname, '..', 'domains'),
  MIN_LABEL: 3,
  MAX_LABEL: 32,
  MAX_DOMAINS_PER_OWNER: 3,
  MAX_DOMAIN_FILES_PER_PR: 3,
  MAX_DESCRIPTION: 140,
  MIN_DESCRIPTION: 5,
  MAX_TXT_LENGTH: 255,
  MAX_RECORDS_PER_TYPE: 4,
  MAX_TXT_RECORDS: 5,
  ALLOWED_TYPES: ['A', 'AAAA', 'CNAME', 'TXT'],
  // Free-plan Cloudflare comments are limited to 100 chars; records we own start with this.
  MANAGED_PREFIX: 'managed by is-ai.si registry',
  reserved: new Set(require('../config/reserved.json').labels),
  blockedSubstrings: require('../config/blocked.json').substrings,
  maintainers: new Set(require('../config/maintainers.json').maintainers.map((m) => m.toLowerCase())),
};
