'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { validateLabel, validateHostname, validateDomain, validateAll } = require('../lib/validate');
const { isPublicIPv4, isPublicIPv6 } = require('../lib/ip');

const good = () => ({
  description: 'My personal portfolio',
  owner: { username: 'octocat', email: 'octo@example.com' },
  records: { CNAME: 'octocat.github.io' },
});
const errs = (label, data) => validateDomain(label, data);

test('accepts a minimal valid domain', () => assert.deepEqual(errs('meridian', good()), []));

test('label rules', () => {
  assert.ok(validateLabel('ab').length, 'too short');
  assert.ok(validateLabel('a'.repeat(33)).length, 'too long');
  assert.ok(validateLabel('-abc').length, 'leading hyphen');
  assert.ok(validateLabel('abc-').length, 'trailing hyphen');
  assert.ok(validateLabel('ab_c').length, 'underscore');
  assert.ok(validateLabel('Abc').length, 'uppercase');
  assert.ok(validateLabel('xn--abc').length, 'punycode');
  assert.ok(validateLabel('my--site').length, 'double hyphen');
  assert.ok(validateLabel('a.b.c').length, 'nested');
  assert.deepEqual(validateLabel('my-site-2'), []);
});

test('reserved and blocked labels are rejected', () => {
  assert.ok(validateLabel('admin').some((e) => /reserved/.test(e)));
  assert.ok(validateLabel('www').some((e) => /reserved/.test(e)));
  assert.ok(validateLabel('paypal-support').some((e) => /blocked/.test(e)));
  assert.ok(validateLabel('free-airdrop').some((e) => /blocked/.test(e)));
  assert.deepEqual(validateLabel('pineapple'), [], 'short substrings must not cause false positives');
});

test('schema: required fields and unknown keys', () => {
  const d = good();
  delete d.description;
  assert.ok(errs('meridian', d).some((e) => /description/.test(e)));
  assert.ok(errs('meridian', { ...good(), extra: 1 }).some((e) => /unknown field 'extra'/.test(e)));
  assert.ok(errs('meridian', { ...good(), owner: { username: 'bad name!' } }).some((e) => /username/.test(e)));
  assert.ok(errs('meridian', { ...good(), owner: { username: 'octocat', email: 'nope' } }).some((e) => /email/.test(e)));
  assert.deepEqual(errs('meridian', { ...good(), owner: { username: 'octocat' } }), [], 'email is optional');
  assert.ok(errs('meridian', null).length);
  assert.ok(errs('meridian', { ...good(), description: 'visit http://spam.example' }).some((e) => /links/.test(e)));
});

test('record type rules', () => {
  assert.ok(errs('meridian', { ...good(), records: {} }).length);
  assert.ok(errs('meridian', { ...good(), records: { MX: 'mail.example.com' } }).some((e) => /not allowed/.test(e)));
  assert.ok(errs('meridian', { ...good(), records: { NS: 'ns.evil.com' } }).some((e) => /not allowed/.test(e)));
  assert.ok(errs('meridian', { ...good(), records: { CNAME: 'a.example.com', TXT: 'x' } }).some((e) => /combined/.test(e)));
  assert.ok(errs('meridian', { ...good(), records: { CNAME: 'a.example.com', A: '8.8.8.8' } }).some((e) => /combined/.test(e)));
  assert.deepEqual(errs('meridian', { ...good(), records: { A: ['8.8.8.8', '1.1.1.1'], TXT: ['hello'] } }), []);
  assert.deepEqual(errs('meridian', { ...good(), records: { AAAA: '2606:4700:4700::1111' } }), []);
});

test('CNAME target rules', () => {
  for (const bad of ['localhost', '127.0.0.1', 'foo', 'Foo.Example.com', 'a.example.com.', 'x.internal', 'a_b.example.com',
    'is-ai.si', 'foo.is-ai.si', 'foo.example.123', '-a.example.com']) {
    assert.ok(validateHostname(bad).length, `${bad} should be rejected`);
  }
  assert.deepEqual(validateHostname('octocat.github.io'), []);
  assert.ok(errs('meridian', { ...good(), records: { CNAME: ['a.example.com'] } }).some((e) => /single hostname/.test(e)));
});

test('IP rules reject private, loopback and special ranges', () => {
  for (const ip of ['10.0.0.1', '127.0.0.1', '192.168.1.1', '172.16.5.5', '169.254.1.1', '0.0.0.0', '100.64.0.1',
    '224.0.0.1', '255.255.255.255', '203.0.113.9', '999.1.1.1', '1.1.1']) {
    assert.equal(isPublicIPv4(ip), false, ip);
  }
  assert.equal(isPublicIPv4('8.8.8.8'), true);
  assert.equal(isPublicIPv4('172.32.0.1'), true);
  for (const ip of ['::', '::1', 'fe80::1', 'fd00::1', 'ff02::1', '2001:db8::1', '::ffff:1.2.3.4', 'nonsense']) {
    assert.equal(isPublicIPv6(ip), false, ip);
  }
  assert.equal(isPublicIPv6('2606:4700:4700::1111'), true);
});

test('TXT rules', () => {
  assert.ok(errs('meridian', { ...good(), records: { TXT: 'x'.repeat(256) } }).length);
  assert.ok(errs('meridian', { ...good(), records: { TXT: '' } }).length);
  assert.ok(errs('meridian', { ...good(), records: { TXT: 'café' } }).length);
  assert.ok(errs('meridian', { ...good(), records: { TXT: ['1', '2', '3', '4', '5', '6'] } }).length);
});

test('validateAll: per-owner cap and duplicates', () => {
  const mk = (label, user = 'octocat') => ({ label, data: { ...good(), owner: { username: user } } });
  assert.deepEqual(validateAll([mk('one-site'), mk('two-site'), mk('three-site')]), []);
  const over = validateAll([mk('one-site'), mk('two-site'), mk('three-site'), mk('four-site')]);
  assert.equal(over.length, 4);
  assert.ok(over.every((p) => /limit is 3/.test(p.message)));
  assert.ok(validateAll([mk('one-site'), mk('ONE-SITE')]).some((p) => /duplicate/.test(p.message)));
  const maint = ['a-site', 'b-site', 'c-site', 'd-site'].map((l) => mk(l, 'veeresh-bikkaneti'));
  assert.deepEqual(validateAll(maint), [], 'maintainers are exempt from the cap');
});
