const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { createPinnedLookup, resolveMonitorTarget } = require('./egress');

const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json({ limit: '32kb' }));

const PERSONAL_WORKSPACE = '00000000-0000-4000-8000-000000000001';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
app.use('/api', (req, res, next) => {
  const id = req.query.workspaceId || PERSONAL_WORKSPACE;
  if (typeof id !== 'string' || !UUID.test(id)) return res.status(400).json({ error: 'Valid workspaceId required' });
  req.workspaceId = id;
  next();
});

const dataFile = process.env.PULSEWATCH_DATA_FILE || path.join(process.cwd(), 'data', 'pulsewatch.json');
let saved = {};
try { saved = JSON.parse(fs.readFileSync(dataFile, 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
let endpoints = Array.isArray(saved.endpoints) ? saved.endpoints.map(item => ({ ...item, workspaceId: item.workspaceId || PERSONAL_WORKSPACE })) : [];
let incidents = Array.isArray(saved.incidents) ? saved.incidents.map(item => ({ ...item, workspaceId: item.workspaceId || PERSONAL_WORKSPACE })) : [];
let notifications = Array.isArray(saved.notifications) ? saved.notifications.map(item => ({ ...item, workspaceId: item.workspaceId || PERSONAL_WORKSPACE })) : [];
function persist() {
  fs.mkdirSync(path.dirname(dataFile), { recursive: true });
  fs.writeFileSync(dataFile + '.tmp', JSON.stringify({ endpoints, incidents, notifications }));
  fs.renameSync(dataFile + '.tmp', dataFile);
}

const MAX_CHECKS = 8640;

async function checkEndpoint(ep) {
  const start = Date.now();
  let status = 'DOWN';
  let latency = null;
  let errorMsg = '';
  const timeoutSeconds = Number.isInteger(ep.timeout) && ep.timeout >= 1 && ep.timeout <= 60 ? ep.timeout : 10;
  try {
    if (!['GET', 'HEAD'].includes(ep.method || 'GET')) throw new Error('Unsupported monitor method');
    const target = await resolveMonitorTarget(ep.url);
    const res = await axios({
      method: ep.method || 'GET',
      url: ep.url,
      timeout: timeoutSeconds * 1000,
      maxRedirects: 0,
      maxContentLength: 64 * 1024,
      proxy: false,
      lookup: createPinnedLookup(target.hostname, target.addresses),
      validateStatus: () => true
    });
    latency = Date.now() - start;
    status = res.status >= 200 && res.status < 400 ? 'UP' : 'DOWN';
    if (status === 'DOWN') errorMsg = `HTTP ${res.status}`;
  } catch (err) {
    errorMsg = err.message;
  }

  const now = new Date();
  ep.checks.push({ ts: now.toISOString(), status, latency, error: errorMsg });
  if (ep.checks.length > MAX_CHECKS) ep.checks.shift();

  const prev = ep.status;
  ep.status = status;
  ep.latency = latency;
  ep.lastChecked = now.toISOString();

  const since24h = Date.now() - 86400000;
  const since90d = Date.now() - 7776000000;
  const c24 = ep.checks.filter(c => new Date(c.ts) >= since24h);
  const c90 = ep.checks.filter(c => new Date(c.ts) >= since90d);
  ep.uptime24h = c24.length ? +(c24.filter(c => c.status==='UP').length / c24.length * 100).toFixed(2) : 0;
  ep.uptime90d = c90.length ? +(c90.filter(c => c.status==='UP').length / c90.length * 100).toFixed(2) : 0;

  if (prev !== 'DOWN' && status === 'DOWN') {
    incidents.unshift({ id: uuidv4(), workspaceId: ep.workspaceId, endpointId: ep.id, endpointName: ep.name, error: errorMsg, startedAt: now.toISOString(), resolvedAt: null, duration: null });
    if (incidents.length > 200) incidents.pop();
    notifications.unshift({ id: uuidv4(), workspaceId: ep.workspaceId, type: 'DOWN', message: `${ep.name} is DOWN — ${errorMsg}`, ts: now.toISOString(), read: false });
    if (notifications.length > 100) notifications.pop();
  }
  if (prev === 'DOWN' && status === 'UP') {
    const open = incidents.find(i => i.workspaceId === ep.workspaceId && i.endpointId === ep.id && !i.resolvedAt);
    if (open) { open.resolvedAt = now.toISOString(); open.duration = Math.round((now - new Date(open.startedAt)) / 1000); }
    notifications.unshift({ id: uuidv4(), workspaceId: ep.workspaceId, type: 'UP', message: `${ep.name} recovered`, ts: now.toISOString(), read: false });
    if (notifications.length > 100) notifications.pop();
  }
  persist();
}

const timers = {};
function scheduleEndpoint(ep) {
  if (timers[ep.id]) clearInterval(timers[ep.id]);
  checkEndpoint(ep);
  const intervalSeconds = Number.isInteger(ep.interval) && ep.interval >= 10 && ep.interval <= 86400 ? ep.interval : 60;
  timers[ep.id] = setInterval(() => checkEndpoint(ep), intervalSeconds * 1000);
}
endpoints.forEach(scheduleEndpoint);

// Endpoints CRUD
app.get('/api/endpoints', (req, res) => res.json(endpoints.filter(e => e.workspaceId === req.workspaceId).map(e => ({ ...e, checks: undefined }))));
app.get('/api/endpoints/:id', (req, res) => {
  const ep = endpoints.find(e => e.id === req.params.id && e.workspaceId === req.workspaceId);
  if (!ep) return res.status(404).json({ error: 'Not found' });
  res.json(ep);
});
app.post('/api/endpoints', async (req, res) => {
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) return res.status(400).json({ error: 'Endpoint details are required' });
  const { name, url, method='GET', interval=60, timeout=10 } = req.body;
  if (typeof name !== 'string' || !name.trim() || name.trim().length > 100 || typeof url !== 'string' ||
      !['GET', 'HEAD'].includes(method) || !Number.isInteger(interval) || interval < 10 || interval > 86400 ||
      !Number.isInteger(timeout) || timeout < 1 || timeout > 60) {
    return res.status(400).json({ error: 'Endpoint details are invalid' });
  }
  try { await resolveMonitorTarget(url); }
  catch { return res.status(400).json({ error: 'Only public HTTP(S) endpoints are allowed for monitoring' }); }
  const ep = { id: uuidv4(), workspaceId: req.workspaceId, name: name.trim(), url, method, interval, timeout, status: 'UNKNOWN', latency: null, uptime24h: 0, uptime90d: 0, lastChecked: null, checks: [] };
  endpoints.push(ep);
  persist();
  scheduleEndpoint(ep);
  res.status(201).json({ ...ep, checks: undefined });
});
app.put('/api/endpoints/:id', async (req, res) => {
  const ep = endpoints.find(e => e.id === req.params.id && e.workspaceId === req.workspaceId);
  if (!ep) return res.status(404).json({ error: 'Not found' });
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) return res.status(400).json({ error: 'Endpoint details are required' });
  const { name, url, method, interval, timeout } = req.body;
  if (Object.hasOwn(req.body, 'name') && (typeof name !== 'string' || !name.trim() || name.trim().length > 100)) {
    return res.status(400).json({ error: 'Endpoint name is invalid' });
  }
  if (Object.hasOwn(req.body, 'url')) {
    if (typeof url !== 'string') return res.status(400).json({ error: 'Endpoint URL is invalid' });
    try { await resolveMonitorTarget(url); }
    catch { return res.status(400).json({ error: 'Only public HTTP(S) endpoints are allowed for monitoring' }); }
  }
  if (Object.hasOwn(req.body, 'method') && !['GET', 'HEAD'].includes(method)) return res.status(400).json({ error: 'Monitor method must be GET or HEAD' });
  if (Object.hasOwn(req.body, 'interval') && (!Number.isInteger(interval) || interval < 10 || interval > 86400)) return res.status(400).json({ error: 'Monitor interval is invalid' });
  if (Object.hasOwn(req.body, 'timeout') && (!Number.isInteger(timeout) || timeout < 1 || timeout > 60)) return res.status(400).json({ error: 'Monitor timeout is invalid' });
  if (Object.hasOwn(req.body, 'name')) ep.name = name.trim();
  if (Object.hasOwn(req.body, 'url')) ep.url = url;
  if (Object.hasOwn(req.body, 'method')) ep.method = method;
  if (Object.hasOwn(req.body, 'interval')) ep.interval = interval;
  if (Object.hasOwn(req.body, 'timeout')) ep.timeout = timeout;
  persist();
  scheduleEndpoint(ep);
  res.json({ ...ep, checks: undefined });
});
app.delete('/api/endpoints/:id', (req, res) => {
  const idx = endpoints.findIndex(e => e.id === req.params.id && e.workspaceId === req.workspaceId);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  clearInterval(timers[endpoints[idx].id]);
  endpoints.splice(idx, 1);
  persist();
  res.json({ ok: true });
});
app.post('/api/endpoints/:id/check', async (req, res) => {
  const ep = endpoints.find(e => e.id === req.params.id && e.workspaceId === req.workspaceId);
  if (!ep) return res.status(404).json({ error: 'Not found' });
  await checkEndpoint(ep);
  res.json({ ...ep, checks: undefined });
});

// Incidents
app.get('/api/incidents', (req, res) => res.json(incidents.filter(item => item.workspaceId === req.workspaceId)));

// Notifications
app.get('/api/notifications', (req, res) => res.json(notifications.filter(item => item.workspaceId === req.workspaceId)));
app.post('/api/notifications/read-all', (req, res) => { notifications.filter(item => item.workspaceId === req.workspaceId).forEach(n => (n.read = true)); persist(); res.json({ ok: true }); });

// Stats
app.get('/api/stats', (req, res) => {
  const scopedEndpoints = endpoints.filter(e => e.workspaceId === req.workspaceId);
  const scopedIncidents = incidents.filter(i => i.workspaceId === req.workspaceId);
  const upCount = scopedEndpoints.filter(e => e.status === 'UP').length;
  const since24h = Date.now() - 86400000;
  const checks24h = scopedEndpoints.reduce((s, e) => s + e.checks.filter(c => new Date(c.ts) >= since24h).length, 0);
  const openIncidents = scopedIncidents.filter(i => !i.resolvedAt).length;
  const avg24h = scopedEndpoints.length ? +(scopedEndpoints.reduce((s, e) => s + e.uptime24h, 0) / scopedEndpoints.length).toFixed(2) : 0;
  res.json({ total: scopedEndpoints.length, up: upCount, down: scopedEndpoints.length - upCount, uptime24h: avg24h, checks24h, openIncidents });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`PulseWatch backend on :${PORT}`));
