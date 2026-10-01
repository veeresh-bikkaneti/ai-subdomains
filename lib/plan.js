'use strict';

const { ZONE, MANAGED_PREFIX } = require('./config');

const asArray = (v) => (Array.isArray(v) ? v : [v]);
const stripQuotes = (s) => (s.length >= 2 && s.startsWith('"') && s.endsWith('"') ? s.slice(1, -1) : s);
const norm = (type, content) => (type === 'TXT' ? stripQuotes(content) : content.toLowerCase().replace(/\.$/, ''));
const keyOf = (type, name, content) => `${type}|${name.toLowerCase()}|${norm(type, content)}`;

const isManaged = (r) => typeof r.comment === 'string' && r.comment.startsWith(MANAGED_PREFIX);

// domains: [{ label, data }] that already passed validation.
function desiredRecords(domains) {
  const out = [];
  for (const { label, data } of domains) {
    const name = `${label}.${ZONE}`;
    const comment = `${MANAGED_PREFIX} (domains/${label}.json)`;
    for (const [type, value] of Object.entries(data.records)) {
      for (const content of asArray(value)) {
        out.push({ type, name, content, comment });
      }
    }
  }
  return out;
}

// Pure diff: what must change in Cloudflare so that managed records equal the desired state.
// Records we did not create (no marker comment) are never modified; a name occupied by one is a conflict.
function planChanges(desired, existing) {
  const managed = existing.filter(isManaged);
  const unmanagedNames = new Set(existing.filter((r) => !isManaged(r)).map((r) => r.name.toLowerCase()));

  const conflicts = [...new Set(desired.map((d) => d.name))].filter((n) => unmanagedNames.has(n.toLowerCase()));
  const skip = new Set(conflicts.map((n) => n.toLowerCase()));
  const wanted = desired.filter((d) => !skip.has(d.name.toLowerCase()));

  const wantedKeys = new Set(wanted.map((d) => keyOf(d.type, d.name, d.content)));
  const managedByKey = new Map(managed.map((r) => [keyOf(r.type, r.name, r.content), r]));

  const posts = wanted
    .filter((d) => !managedByKey.has(keyOf(d.type, d.name, d.content)))
    .map((d) => ({ type: d.type, name: d.name, content: d.content, ttl: 1, proxied: false, comment: d.comment }));

  // Managed records whose name is owned by a skipped (conflicting) label are left alone too.
  const deletes = managed.filter((r) => !wantedKeys.has(keyOf(r.type, r.name, r.content)) && !skip.has(r.name.toLowerCase()));

  const patches = managed
    .filter((r) => wantedKeys.has(keyOf(r.type, r.name, r.content)) && (r.proxied !== false || r.ttl !== 1))
    .map((r) => ({ id: r.id, ttl: 1, proxied: false }));

  return { posts, deletes: deletes.map((r) => ({ id: r.id, type: r.type, name: r.name, content: r.content })), patches, conflicts };
}

module.exports = { desiredRecords, planChanges, isManaged, keyOf };
