'use strict';

const cfg = require('./config');
const { isPublicIPv4, isPublicIPv6 } = require('./ip');

const LABEL_RE = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;
const GH_USER_RE = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const HOST_LABEL_RE = /^(?!-)[a-z0-9-]{1,63}(?<!-)$/;
const BAD_TLDS = new Set(['local', 'localhost', 'internal', 'test', 'invalid', 'example', 'lan', 'home', 'corp']);
const TOP_KEYS = new Set(['description', 'owner', 'records']);
const OWNER_KEYS = new Set(['username', 'email']);

const asArray = (v) => (Array.isArray(v) ? v : [v]);

function validateLabel(label) {
  const errors = [];
  if (label !== label.toLowerCase()) errors.push('file name must be lowercase');
  if (label.length < cfg.MIN_LABEL || label.length > cfg.MAX_LABEL) {
    errors.push(`subdomain must be ${cfg.MIN_LABEL}-${cfg.MAX_LABEL} characters long`);
  }
  if (!LABEL_RE.test(label)) {
    errors.push('subdomain may only contain a-z, 0-9 and hyphens, and cannot start or end with a hyphen');
  }
  if (label.startsWith('xn--') || label.includes('--')) {
    errors.push('punycode and double hyphens are not allowed (prevents look-alike names)');
  }
  if (cfg.reserved.has(label)) errors.push(`'${label}' is reserved`);
  const hit = cfg.blockedSubstrings.find((s) => label.includes(s));
  if (hit) errors.push(`'${label}' contains a blocked term ('${hit}'); open an issue if you think this is a mistake`);
  return errors;
}

function validateHostname(host) {
  const errors = [];
  if (typeof host !== 'string') return ['must be a string'];
  if (host !== host.toLowerCase()) errors.push('must be lowercase');
  if (host.endsWith('.')) errors.push('must not end with a dot');
  const h = host.replace(/\.$/, '').toLowerCase();
  if (h.length > 253) errors.push('is too long');
  const labels = h.split('.');
  if (labels.length < 2) errors.push('must be a fully qualified hostname such as user.github.io');
  if (!labels.every((l) => HOST_LABEL_RE.test(l))) errors.push('is not a valid hostname');
  if (/^[0-9.]+$/.test(h) || h.includes(':')) errors.push('must be a hostname, not an IP address');
  if (/^\d+$/.test(labels[labels.length - 1])) errors.push('has a numeric top-level domain');
  if (BAD_TLDS.has(labels[labels.length - 1])) errors.push('uses a non-public top-level domain');
  if (h === cfg.ZONE || h.endsWith(`.${cfg.ZONE}`)) errors.push(`must not point back into ${cfg.ZONE}`);
  return errors;
}

function validateRecords(records) {
  const errors = [];
  if (!records || typeof records !== 'object' || Array.isArray(records)) return ['"records" must be an object'];
  const types = Object.keys(records);
  if (types.length === 0) return ['"records" must contain at least one record'];

  for (const type of types) {
    if (!cfg.ALLOWED_TYPES.includes(type)) {
      errors.push(`record type '${type}' is not allowed (allowed: ${cfg.ALLOWED_TYPES.join(', ')})`);
    }
  }
  if (records.CNAME !== undefined && types.some((t) => t !== 'CNAME')) {
    errors.push('CNAME cannot be combined with other record types on the same name');
  }

  if (records.CNAME !== undefined) {
    if (typeof records.CNAME !== 'string') errors.push('CNAME must be a single hostname string');
    else validateHostname(records.CNAME).forEach((e) => errors.push(`CNAME ${e}`));
  }
  for (const [type, check] of [['A', isPublicIPv4], ['AAAA', isPublicIPv6]]) {
    if (records[type] === undefined) continue;
    const values = asArray(records[type]);
    if (values.length > cfg.MAX_RECORDS_PER_TYPE) errors.push(`${type}: at most ${cfg.MAX_RECORDS_PER_TYPE} records`);
    for (const v of values) {
      if (typeof v !== 'string' || !check(v)) errors.push(`${type} '${v}' is not a valid public ${type === 'A' ? 'IPv4' : 'IPv6'} address`);
    }
    if (new Set(values).size !== values.length) errors.push(`${type}: duplicate values`);
  }
  if (records.TXT !== undefined) {
    const values = asArray(records.TXT);
    if (values.length > cfg.MAX_TXT_RECORDS) errors.push(`TXT: at most ${cfg.MAX_TXT_RECORDS} records`);
    for (const v of values) {
      if (typeof v !== 'string' || v.length === 0 || v.length > cfg.MAX_TXT_LENGTH || !/^[\x20-\x7e]+$/.test(v)) {
        errors.push(`TXT values must be 1-${cfg.MAX_TXT_LENGTH} printable ASCII characters`);
        break;
      }
    }
    if (new Set(values).size !== values.length) errors.push('TXT: duplicate values');
  }
  return errors;
}

function validateDomain(label, data) {
  const errors = validateLabel(label);
  if (!data || typeof data !== 'object' || Array.isArray(data)) return [...errors, 'file must contain a JSON object'];

  for (const k of Object.keys(data)) if (!TOP_KEYS.has(k)) errors.push(`unknown field '${k}'`);

  const d = data.description;
  if (typeof d !== 'string' || d.trim().length < cfg.MIN_DESCRIPTION || d.length > cfg.MAX_DESCRIPTION) {
    errors.push(`"description" is required (${cfg.MIN_DESCRIPTION}-${cfg.MAX_DESCRIPTION} characters)`);
  } else if (/https?:\/\/|www\./i.test(d)) {
    errors.push('"description" must not contain links');
  }

  const o = data.owner;
  if (!o || typeof o !== 'object') {
    errors.push('"owner" is required');
  } else {
    for (const k of Object.keys(o)) if (!OWNER_KEYS.has(k)) errors.push(`unknown field 'owner.${k}'`);
    if (typeof o.username !== 'string' || !GH_USER_RE.test(o.username)) errors.push('"owner.username" must be a valid GitHub username');
    if (o.email !== undefined && (typeof o.email !== 'string' || !EMAIL_RE.test(o.email))) errors.push('"owner.email" is not a valid email address');
  }

  return [...errors, ...validateRecords(data.records)];
}

// entries: [{ label, data }]. Returns [{ label, message }].
function validateAll(entries) {
  const problems = [];
  const owners = new Map();
  const seen = new Set();
  for (const { label, data } of entries) {
    for (const message of validateDomain(label, data)) problems.push({ label, message });
    if (seen.has(label.toLowerCase())) problems.push({ label, message: 'duplicate subdomain (case-insensitive)' });
    seen.add(label.toLowerCase());
    const owner = data && data.owner && typeof data.owner.username === 'string' ? data.owner.username.toLowerCase() : null;
    if (owner) owners.set(owner, [...(owners.get(owner) || []), label]);
  }
  for (const [owner, labels] of owners) {
    if (labels.length > cfg.MAX_DOMAINS_PER_OWNER && !cfg.maintainers.has(owner)) {
      for (const label of labels) {
        problems.push({ label, message: `'${owner}' owns ${labels.length} subdomains; the limit is ${cfg.MAX_DOMAINS_PER_OWNER}` });
      }
    }
  }
  return problems;
}

module.exports = { validateLabel, validateHostname, validateRecords, validateDomain, validateAll };
