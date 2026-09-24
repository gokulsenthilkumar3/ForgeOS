const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const net = require('node:net');

const personal = '00000000-0000-4000-8000-000000000001';
const other = '00000000-0000-4000-8000-000000000002';

async function freePort() {
  const server = net.createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  await new Promise(resolve => server.close(resolve));
  return port;
}

test('isolates monitors and preserves unscoped legacy incidents in the personal workspace', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'forgeos-pulsewatch-'));
  const dataFile = path.join(directory, 'pulsewatch.json');
  fs.writeFileSync(dataFile, JSON.stringify({ endpoints: [], incidents: [{ id: 'legacy-incident', endpointId: 'old', endpointName: 'Old', error: 'Down', startedAt: new Date().toISOString(), resolvedAt: null }], notifications: [] }));
  const port = await freePort();
  const origin = `http://127.0.0.1:${port}`;
  const child = spawn(process.execPath, [path.join(__dirname, 'index.js')], {
    env: { ...process.env, PORT: String(port), PULSEWATCH_DATA_FILE: dataFile },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let startupError = '';
  child.stderr.on('data', chunk => { startupError += String(chunk); });
  try {
    let ready = false;
    for (let attempt = 0; attempt < 100; attempt++) {
      try { const response = await fetch(`${origin}/api/stats?workspaceId=${personal}`); ready = response.ok; if (ready) break; }
      catch { await new Promise(resolve => setTimeout(resolve, 100)); }
    }
    assert.equal(ready, true, `PulseWatch did not start: ${startupError}`);
    const legacy = await fetch(`${origin}/api/incidents?workspaceId=${personal}`).then(response => response.json());
    const isolatedLegacy = await fetch(`${origin}/api/incidents?workspaceId=${other}`).then(response => response.json());
    assert.equal(legacy.length, 1);
    assert.equal(isolatedLegacy.length, 0);

    const created = await fetch(`${origin}/api/endpoints?workspaceId=${personal}`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Local check', url: `${origin}/api/stats?workspaceId=${personal}` }),
    });
    assert.equal(created.status, 201);
    const endpoint = await created.json();
    const own = await fetch(`${origin}/api/endpoints?workspaceId=${personal}`).then(response => response.json());
    const foreign = await fetch(`${origin}/api/endpoints?workspaceId=${other}`).then(response => response.json());
    assert.equal(own.length, 1);
    assert.equal(foreign.length, 0);
    assert.equal((await fetch(`${origin}/api/endpoints/${endpoint.id}?workspaceId=${other}`)).status, 404);
    assert.equal((await fetch(`${origin}/api/endpoints/${endpoint.id}?workspaceId=${other}`, { method: 'DELETE' })).status, 404);
    assert.equal((await fetch(`${origin}/api/endpoints/${endpoint.id}?workspaceId=${personal}`)).status, 200);
  } finally {
    child.kill();
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
