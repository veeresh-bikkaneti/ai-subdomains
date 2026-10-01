'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { checkOwnership } = require('../lib/ownership');

const doc = (username) => ({ owner: { username }, records: { CNAME: 'a.example.com' } });

test('author may add a file that names them as owner', () => {
  assert.deepEqual(checkOwnership([{ status: 'A', label: 'mine', before: null, after: doc('Octocat') }], 'octocat'), []);
});

test('author cannot register on behalf of someone else', () => {
  const p = checkOwnership([{ status: 'A', label: 'mine', before: null, after: doc('someone') }], 'octocat');
  assert.equal(p.length, 1);
});

test('only the current owner can edit or delete a file', () => {
  const edit = { status: 'M', label: 'x', before: doc('alice'), after: doc('alice') };
  assert.equal(checkOwnership([edit], 'mallory').length, 1);
  assert.deepEqual(checkOwnership([edit], 'alice'), []);
  assert.equal(checkOwnership([{ status: 'D', label: 'x', before: doc('alice'), after: null }], 'mallory').length, 1);
  assert.deepEqual(checkOwnership([{ status: 'D', label: 'x', before: doc('alice'), after: null }], 'alice'), []);
});

test('owner cannot hand a domain to a different username by editing', () => {
  const p = checkOwnership([{ status: 'M', label: 'x', before: doc('alice'), after: doc('mallory') }], 'alice');
  assert.ok(p.some((x) => /cannot be changed/.test(x.message)));
});

test('limits files per PR and lets maintainers bypass', () => {
  const many = ['a', 'b', 'c', 'd'].map((l) => ({ status: 'A', label: l, before: null, after: doc('octocat') }));
  assert.ok(checkOwnership(many, 'octocat').some((x) => /at most/.test(x.message)));
  assert.deepEqual(checkOwnership(many, 'veeresh-bikkaneti'), []);
});

test('missing author fails closed', () => assert.equal(checkOwnership([], '').length, 1));
