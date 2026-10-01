'use strict';

const net = require('net');

function ipv4ToInt(ip) {
  return ip.split('.').reduce((acc, o) => acc * 256 + Number(o), 0);
}

const V4_BLOCKED = [
  ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8], ['169.254.0.0', 16],
  ['172.16.0.0', 12], ['192.0.0.0', 24], ['192.0.2.0', 24], ['192.168.0.0', 16],
  ['198.18.0.0', 15], ['198.51.100.0', 24], ['203.0.113.0', 24], ['224.0.0.0', 3],
].map(([base, bits]) => ({ start: ipv4ToInt(base), size: 2 ** (32 - bits) }));

function isPublicIPv4(ip) {
  if (net.isIPv4(ip) !== true) return false;
  const n = ipv4ToInt(ip);
  return !V4_BLOCKED.some((r) => n >= r.start && n < r.start + r.size);
}

// Expand an IPv6 address into 8 numeric groups (IPv4-embedded forms are rejected by the caller).
function expandIPv6(ip) {
  const [head, tail] = ip.split('::');
  const h = head ? head.split(':') : [];
  const t = tail === undefined ? [] : tail ? tail.split(':') : [];
  const missing = 8 - h.length - t.length;
  const groups = tail === undefined ? h : [...h, ...Array(missing).fill('0'), ...t];
  return groups.map((g) => parseInt(g, 16));
}

function isPublicIPv6(ip) {
  if (net.isIPv6(ip) !== true || ip.includes('.')) return false;
  const g = expandIPv6(ip);
  if (g.every((x) => x === 0)) return false; // ::
  if (g.slice(0, 7).every((x) => x === 0) && g[7] === 1) return false; // ::1
  if ((g[0] & 0xfe00) === 0xfc00) return false; // fc00::/7 unique local
  if ((g[0] & 0xffc0) === 0xfe80) return false; // fe80::/10 link local
  if ((g[0] & 0xff00) === 0xff00) return false; // multicast
  if (g[0] === 0x2001 && g[1] === 0x0db8) return false; // documentation
  if (g.slice(0, 5).every((x) => x === 0) && g[5] === 0xffff) return false; // v4-mapped
  return (g[0] & 0xe000) === 0x2000; // only global unicast 2000::/3
}

module.exports = { isPublicIPv4, isPublicIPv6 };
