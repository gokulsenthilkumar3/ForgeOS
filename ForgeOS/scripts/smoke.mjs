import assert from 'node:assert/strict';

const origin = process.env.FORGEOS_SMOKE_ORIGIN || 'http://localhost:3000';
const password = process.env.FORGEOS_ADMIN_PASSWORD;
assert(password, 'FORGEOS_ADMIN_PASSWORD is required for smoke test');

async function request(path, options = {}) {
  const response = await fetch(new URL(path, origin), { redirect: 'manual', signal: AbortSignal.timeout(15000), ...options });
  assert.equal(response.status, 200, `${path} returned ${response.status}`);
  return response;
}

async function waitFor(path, options = {}) {
  let lastError;
  for (let attempt = 0; attempt < 60; attempt++) {
    try { return await request(path, options); }
    catch (error) { lastError = error; await new Promise(resolve => setTimeout(resolve, 2000)); }
  }
  throw lastError;
}

async function expectStatus(path, status, options = {}) {
  const response = await fetch(new URL(path, origin), { redirect: 'manual', signal: AbortSignal.timeout(15000), ...options });
  assert.equal(response.status, status, `${path} returned ${response.status}, expected ${status}`);
}

let ready = false;
for (let attempt = 0; attempt < 90; attempt++) {
  try { await request('/login'); ready = true; break; }
  catch { await new Promise(resolve => setTimeout(resolve, 2000)); }
}
assert(ready, 'ForgeOS web did not become ready');

await expectStatus('/api/v1/overview', 401);
await expectStatus('/api/session', 401, {
  method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ password: `${password}-invalid` }),
});

const login = await request('/api/session', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ password }) });
const cookie = login.headers.get('set-cookie')?.split(';', 1)[0];
assert(cookie?.startsWith('forgeos_session='), 'Login did not establish a ForgeOS session');
const auth = { cookie };

const overviewResponse = await waitFor('/api/v1/overview', { headers: auth });
const overview = await overviewResponse.json();
assert(overview.workspace?.id, 'Workspace overview is missing');
assert(Array.isArray(overview.workspace.moduleIds), 'Workspace module list is missing');
assert.equal(overview.workspace.moduleIds.length, 14, 'Fresh workspace must enable all 14 modules');

await expectStatus('/api/v1/overview', 401, { headers: { cookie: 'forgeos_session=invalid' } });
await request('/', { headers: auth });
await request('/api/v1/health', { headers: auth });
await request('/api/v1/workspaces', { headers: auth });
await waitFor('/api/pulsewatch/endpoints', { headers: auth });
await waitFor('/shield.js');
for (const id of overview.workspace.moduleIds) {
  const page = await request(`/modules/${id}`, { headers: auth });
  assert(page.headers.get('content-type')?.includes('text/html'), `${id} did not return an HTML page`);
  const records = await request(`/api/v1/modules/${id}/records?workspaceId=${overview.workspace.id}`, { headers: auth });
  assert(Array.isArray(await records.json()), `${id} records did not return a list`);
}

console.log(`ForgeOS smoke passed: one origin, ${overview.workspace.moduleIds.length} module pages and record APIs, protected routes, PulseWatch, and MathShield widget`);
