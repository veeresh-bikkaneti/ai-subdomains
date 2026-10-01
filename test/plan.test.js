'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { desiredRecords, planChanges } = require('../lib/plan');
const { Cloudflare } = require('../lib/cloudflare');

const MARK = 'managed by is-ai.si registry (domains/x.json)';
const domain = (label, records) => ({ label, data: { records } });
const rec = (id, type, name, content, extra = {}) => ({ id, type, name, content, ttl: 1, proxied: false, comment: MARK, ...extra });

test('desiredRecords expands arrays and uses FQDNs', () => {
  const d = desiredRecords([domain('site', { A: ['8.8.8.8', '1.1.1.1'], TXT: 'hello' })]);
  assert.equal(d.length, 3);
  assert.ok(d.every((r) => r.name === 'site.is-ai.si' && r.comment.startsWith('managed by is-ai.si registry')));
  assert.ok(d.every((r) => r.comment.length <= 100));
});

test('creates missing records on an empty zone', () => {
  const plan = planChanges(desiredRecords([domain('site', { CNAME: 'u.github.io' })]), []);
  assert.equal(plan.posts.length, 1);
  assert.deepEqual(plan.posts[0], { type: 'CNAME', name: 'site.is-ai.si', content: 'u.github.io', ttl: 1, proxied: false, comment: plan.posts[0].comment });
  assert.equal(plan.deletes.length, 0);
});

test('is idempotent: no changes when already in sync (TXT quotes and case ignored)', () => {
  const desired = desiredRecords([domain('site', { CNAME: 'U.GitHub.io', TXT: 'hello' })]);
  const existing = [rec('1', 'CNAME', 'site.is-ai.si', 'u.github.io'), rec('2', 'TXT', 'site.is-ai.si', '"hello"')];
  const plan = planChanges(desired.map((d) => ({ ...d, content: d.content })), existing);
  assert.deepEqual([plan.posts.length, plan.deletes.length, plan.patches.length], [0, 0, 0]);
});

test('removing a domain file deletes only its managed records', () => {
  const existing = [rec('1', 'A', 'gone.is-ai.si', '8.8.8.8'), { id: '9', type: 'A', name: 'is-ai.si', content: '1.2.3.4', comment: 'my site', ttl: 1, proxied: true }];
  const plan = planChanges([], existing);
  assert.deepEqual(plan.deletes.map((d) => d.id), ['1']);
});

test('changing a record type deletes the old and creates the new', () => {
  const existing = [rec('1', 'A', 'site.is-ai.si', '8.8.8.8')];
  const plan = planChanges(desiredRecords([domain('site', { CNAME: 'u.github.io' })]), existing);
  assert.equal(plan.deletes.length, 1);
  assert.equal(plan.posts.length, 1);
});

test('never touches a name occupied by an unmanaged record', () => {
  const existing = [{ id: '5', type: 'A', name: 'site.is-ai.si', content: '9.9.9.9', comment: '', ttl: 1, proxied: false }];
  const plan = planChanges(desiredRecords([domain('site', { CNAME: 'u.github.io' })]), existing);
  assert.deepEqual(plan.conflicts, ['site.is-ai.si']);
  assert.equal(plan.posts.length, 0);
  assert.equal(plan.deletes.length, 0);
});

test('normalizes proxied/ttl drift on managed records', () => {
  const existing = [rec('1', 'CNAME', 'site.is-ai.si', 'u.github.io', { proxied: true })];
  const plan = planChanges(desiredRecords([domain('site', { CNAME: 'u.github.io' })]), existing);
  assert.deepEqual(plan.patches, [{ id: '1', ttl: 1, proxied: false }]);
});

test('Cloudflare client paginates and sends a batch payload', async () => {
  const calls = [];
  const fetchImpl = async (url, opts) => {
    calls.push({ url, opts });
    const page = Number(new URL(url).searchParams.get('page'));
    const body = url.includes('/batch') ? { success: true, result: {} } : { success: true, result: [{ id: String(page) }], result_info: { total_pages: 2 } };
    return { ok: true, status: 200, json: async () => body };
  };
  const cf = new Cloudflare({ token: 't', zoneId: 'z', fetchImpl });
  assert.equal((await cf.listRecords()).length, 2);
  await cf.applyChanges({ deletes: [{ id: 'd' }], patches: [], posts: [{ type: 'A' }] });
  const batch = calls.at(-1);
  assert.match(batch.url, /zones\/z\/dns_records\/batch$/);
  assert.deepEqual(JSON.parse(batch.opts.body), { deletes: [{ id: 'd' }], patches: [], posts: [{ type: 'A' }] });
  assert.equal(batch.opts.headers.Authorization, 'Bearer t');
});

test('Cloudflare client surfaces API errors', async () => {
  const fetchImpl = async () => ({ ok: false, status: 400, json: async () => ({ success: false, errors: [{ code: 9005, message: 'bad' }] }) });
  const cf = new Cloudflare({ token: 't', zoneId: 'z', fetchImpl });
  await assert.rejects(cf.listRecords(), /9005: bad/);
});
