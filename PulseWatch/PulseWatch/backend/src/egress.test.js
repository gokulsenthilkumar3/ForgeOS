const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createPinnedLookup, isPublicAddress, resolveMonitorTarget } = require('./egress');

test('allows public IPs and rejects private, local, and reserved ranges', () => {
  for (const address of ['8.8.8.8', '1.1.1.1', '2001:4860:4860::8888']) {
    assert.equal(isPublicAddress(address), true, address);
  }
  for (const address of [
    '0.1.2.3', '10.0.0.1', '100.64.0.1', '127.0.0.1', '169.254.1.1', '172.16.0.1',
    '192.0.2.1', '192.168.1.1', '198.18.0.1', '203.0.113.1', '224.0.0.1',
    '::', '::1', 'fc00::1', 'fe80::1', 'ff02::1', '2001:db8::1', '2002::1', '3fff::1',
    '::ffff:8.8.8.8',
  ]) {
    assert.equal(isPublicAddress(address), false, address);
  }
});

test('rejects a public-looking hostname when DNS resolves to a private address', async () => {
  await assert.rejects(
    resolveMonitorTarget('https://monitor.example', async () => [{ address: '10.0.0.5', family: 4 }]),
    /only to public IP addresses/,
  );
});

test('pins the validated DNS answers for the outbound request', async () => {
  const target = await resolveMonitorTarget('https://monitor.example/path', async () => [
    { address: '8.8.8.8', family: 4 },
    { address: '2001:4860:4860::8888', family: 6 },
  ]);
  const lookup = createPinnedLookup(target.hostname, target.addresses);
  const address = await new Promise((resolve, reject) => lookup('monitor.example', {}, (error, value, family) =>
    error ? reject(error) : resolve({ address: value, family })));
  assert.deepEqual(address, { address: '8.8.8.8', family: 4 });
});
