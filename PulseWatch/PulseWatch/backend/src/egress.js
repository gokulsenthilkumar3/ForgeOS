const dns = require('node:dns/promises');
const net = require('node:net');

const ipv4BlockedRanges = [
  ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8],
  ['169.254.0.0', 16], ['172.16.0.0', 12], ['192.0.0.0', 24], ['192.0.2.0', 24],
  ['192.88.99.0', 24], ['192.168.0.0', 16], ['198.18.0.0', 15], ['198.51.100.0', 24],
  ['203.0.113.0', 24], ['224.0.0.0', 4], ['240.0.0.0', 4],
];
const ipv6BlockedRanges = [['2001::', 23], ['2001:db8::', 32], ['2002::', 16], ['3fff::', 20]];

function normalizeHostname(hostname) {
  return String(hostname || '').trim().toLowerCase().replace(/^\[|\]$/g, '').replace(/\.$/, '');
}

function ipv4ToBigInt(address) {
  return address.split('.').reduce((value, part) => (value << 8n) | BigInt(part), 0n);
}

function ipv6ToBigInt(address) {
  let normalized = address.toLowerCase();
  if (normalized.includes('.')) {
    const splitAt = normalized.lastIndexOf(':');
    const ipv4 = normalized.slice(splitAt + 1);
    const value = ipv4ToBigInt(ipv4);
    normalized = `${normalized.slice(0, splitAt)}:${(value >> 16n).toString(16)}:${(value & 0xffffn).toString(16)}`;
  }
  const halves = normalized.split('::');
  if (halves.length > 2) throw new Error('Invalid IPv6 address');
  const left = halves[0] ? halves[0].split(':') : [];
  const right = halves[1] ? halves[1].split(':') : [];
  const groups = halves.length === 2
    ? [...left, ...Array(8 - left.length - right.length).fill('0'), ...right]
    : left;
  if (groups.length !== 8 || groups.some(group => !/^[0-9a-f]{1,4}$/.test(group))) throw new Error('Invalid IPv6 address');
  return groups.reduce((value, group) => (value << 16n) | BigInt(`0x${group}`), 0n);
}

function inRange(address, network, prefix, bits) {
  const shift = BigInt(bits - prefix);
  return (address >> shift) === (network >> shift);
}

function isPublicAddress(address) {
  const version = net.isIP(address);
  if (version === 4) {
    const value = ipv4ToBigInt(address);
    return !ipv4BlockedRanges.some(([network, prefix]) => inRange(value, ipv4ToBigInt(network), prefix, 32));
  }
  if (version === 6) {
    const value = ipv6ToBigInt(address);
    if (!inRange(value, ipv6ToBigInt('2000::'), 3, 128)) return false;
    return !ipv6BlockedRanges.some(([network, prefix]) => inRange(value, ipv6ToBigInt(network), prefix, 128));
  }
  return false;
}

function parseMonitorUrl(urlString) {
  if (typeof urlString !== 'string' || urlString.length > 2048) throw new Error('A valid HTTP(S) URL is required');
  let parsed;
  try { parsed = new URL(urlString); }
  catch { throw new Error('A valid HTTP(S) URL is required'); }
  if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) {
    throw new Error('Only credential-free HTTP(S) URLs are allowed');
  }
  const hostname = normalizeHostname(parsed.hostname);
  if (!hostname || hostname === 'localhost' || hostname.endsWith('.localhost') ||
      hostname.endsWith('.local') || hostname.endsWith('.internal') || !hostname.includes('.') && !net.isIP(hostname)) {
    throw new Error('Only public HTTP(S) endpoints are allowed for monitoring');
  }
  const allowlist = (process.env.PULSEWATCH_ALLOWED_HOSTS || '').split(',').map(normalizeHostname).filter(Boolean);
  if (allowlist.length && !allowlist.some(value => hostname === value || hostname.endsWith(`.${value}`))) {
    throw new Error('Monitor host is not allowlisted');
  }
  if (net.isIP(hostname) && !isPublicAddress(hostname)) {
    throw new Error('Only public HTTP(S) endpoints are allowed for monitoring');
  }
  return { parsed, hostname };
}

async function resolveMonitorTarget(urlString, lookupAll = dns.lookup) {
  const target = parseMonitorUrl(urlString);
  const addresses = net.isIP(target.hostname)
    ? [{ address: target.hostname, family: net.isIP(target.hostname) }]
    : await lookupAll(target.hostname, { all: true, verbatim: true });
  if (!addresses.length || addresses.some(entry => !isPublicAddress(entry.address))) {
    throw new Error('Monitor host must resolve only to public IP addresses');
  }
  return { ...target, addresses };
}

function createPinnedLookup(hostname, addresses) {
  return (requestedHostname, options, callback) => {
    if (typeof options === 'function') {
      callback = options;
      options = {};
    }
    if (normalizeHostname(requestedHostname) !== hostname) {
      return process.nextTick(() => callback(new Error('Unexpected DNS lookup host')));
    }
    const matches = addresses.filter(entry => !options?.family || entry.family === options.family);
    if (!matches.length) return process.nextTick(() => callback(new Error('No approved address for requested IP family')));
    process.nextTick(() => callback(null, options?.all
      ? matches.map(({ address, family }) => ({ address, family }))
      : matches[0].address, matches[0].family));
  };
}

module.exports = { createPinnedLookup, isPublicAddress, resolveMonitorTarget };
