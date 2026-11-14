import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';

const origin = process.env.FORGEOS_SMOKE_ORIGIN || 'http://localhost:3000';
const password = process.env.FORGEOS_ADMIN_PASSWORD;
const secret = process.env.FORGEOS_SESSION_SECRET;
assert(password, 'FORGEOS_ADMIN_PASSWORD is required for smoke test');
assert(secret && secret.length >= 32, 'FORGEOS_SESSION_SECRET is required for smoke test');

async function request(path, options = {}, expectedStatus = 200) {
  const response = await fetch(new URL(path, origin), { redirect: 'manual', signal: AbortSignal.timeout(15000), ...options });
  assert.equal(response.status, expectedStatus, `${path} returned ${response.status}, expected ${expectedStatus}`);
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

await waitFor('/api/v1/health');
await expectStatus('/api/v1/overview', 401);
const setupStatus = await (await request('/api/v1/auth/setup')).json();
const email = process.env.FORGEOS_SMOKE_EMAIL || 'forgeos-smoke@example.test';
const accountPassword = process.env.FORGEOS_SMOKE_PASSWORD || password;
let ownerId = process.env.FORGEOS_SMOKE_USER_ID;
if (setupStatus.ownerRequired) {
  const setup = await request('/api/v1/auth/setup', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password: accountPassword, bootstrapPassword: password }),
  }, 201);
  ownerId = (await setup.json()).userId;
}
assert(ownerId, 'Existing installations require FORGEOS_SMOKE_USER_ID; CI creates a temporary owner');
await expectStatus('/api/session', 401, {
  method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ action: 'password', email, password: `${accountPassword}-invalid` }),
});

const enrollmentLogin = await request('/api/session', {
  method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ action: 'password', email, password: accountPassword }),
});
const enrollmentCookie = enrollmentLogin.headers.get('set-cookie')?.split(';', 1)[0];
const passwordMode = setupStatus.authenticationMode === 'password';
assert(enrollmentCookie?.startsWith(`forgeos_session=${passwordMode ? 'p' : 'u'}.`), 'Password session must match the configured authentication mode');
await expectStatus('/api/v1/overview', passwordMode ? 200 : 403, { headers: { cookie: enrollmentCookie } });
await expectStatus('/', passwordMode ? 200 : 307, { headers: { cookie: enrollmentCookie } });

// This CI fixture has the test-only signing secret, so it can exercise routing
// behind a key-authenticated session. It does not substitute for a real FIDO2
// ceremony; WebAuthn verification is covered by API tests and physical-key QA.
const authAt = String(Date.now());
const expires = String(Date.now() + 10 * 60_000);
const signature = createHmac('sha256', secret).update(`webauthn:${ownerId}:${authAt}:${expires}`).digest('hex');
const auth = { cookie: `forgeos_session=w.${ownerId}.${authAt}.${expires}.${signature}` };

const overviewResponse = await waitFor('/api/v1/overview', { headers: auth });
const overview = await overviewResponse.json();
assert(overview.workspace?.id, 'Workspace overview is missing');
assert(Array.isArray(overview.workspace.moduleIds), 'Workspace module list is missing');
assert.equal(overview.workspace.moduleIds.length, 14, 'Fresh workspace must enable all 14 modules');

await expectStatus('/api/v1/overview', 401, { headers: { cookie: 'forgeos_session=invalid' } });
await request('/', { headers: auth });
await request('/api/v1/health', { headers: auth });
await request('/api/v1/workspaces', { headers: auth });
await expectStatus(`/api/v1/agent-access/projects?workspaceId=${overview.workspace.id}`, 401);
await expectStatus('/api/pulsewatch/endpoints', 400, { headers: auth });
await waitFor(`/api/pulsewatch/endpoints?workspaceId=${overview.workspace.id}`, { headers: auth });
await waitFor('/shield.js');
for (const id of overview.workspace.moduleIds) {
  const page = await request(`/modules/${id}`, { headers: auth });
  assert(page.headers.get('content-type')?.includes('text/html'), `${id} did not return an HTML page`);
  const records = await request(`/api/v1/modules/${id}/records?workspaceId=${overview.workspace.id}`, { headers: auth });
  assert(Array.isArray(await records.json()), `${id} records did not return a list`);
}

for (const path of ['/help','/tutorial','/help/desk','/help/competitors','/settings/profile','/settings/sessions','/activity']) {
  await expectStatus(path, 307);
  await request(path, { headers: auth });
}
const support = await request(`/api/v1/support/tickets?workspaceId=${overview.workspace.id}`, { headers: auth });
assert(Array.isArray(await support.json()), 'Help desk must return accessible tickets');
const currentSession = await (await request('/api/v1/auth/session', { headers: auth })).json();
assert.equal(currentSession.session?.method, 'security-key');
assert(currentSession.session?.expiresAt, 'Current session expiry is missing');

console.log(`ForgeOS smoke passed: one origin, ${overview.workspace.moduleIds.length} module pages, ${passwordMode ? 'password login' : 'password-only denial'}, signed-agent denial, PulseWatch, and MathShield widget. Physical-key ceremony needs a real trusted key.`);
