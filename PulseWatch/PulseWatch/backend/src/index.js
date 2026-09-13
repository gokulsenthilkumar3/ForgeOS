const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');

const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());

// In-memory store
let endpoints = [
  { id: uuidv4(), name: 'GitHub API', url: 'https://api.github.com', method: 'GET', interval: 60, timeout: 10, status: 'UNKNOWN', latency: null, uptime24h: 0, uptime90d: 0, lastChecked: null, checks: [] },
  { id: uuidv4(), name: 'Google',     url: 'https://www.google.com', method: 'GET', interval: 60, timeout: 10, status: 'UNKNOWN', latency: null, uptime24h: 0, uptime90d: 0, lastChecked: null, checks: [] }
];
let incidents = [];
let notifications = [];

const MAX_CHECKS = 8640;

async function checkEndpoint(ep) {
  const start = Date.now();
  let status = 'DOWN';
  let latency = null;
  let errorMsg = '';
  try {
    const res = await axios({
      method: ep.method || 'GET',
      url: ep.url,
      timeout: (ep.timeout || 10) * 1000,
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
    incidents.unshift({ id: uuidv4(), endpointId: ep.id, endpointName: ep.name, error: errorMsg, startedAt: now.toISOString(), resolvedAt: null, duration: null });
    if (incidents.length > 200) incidents.pop();
    notifications.unshift({ id: uuidv4(), type: 'DOWN', message: `${ep.name} is DOWN — ${errorMsg}`, ts: now.toISOString(), read: false });
    if (notifications.length > 100) notifications.pop();
  }
  if (prev === 'DOWN' && status === 'UP') {
    const open = incidents.find(i => i.endpointId === ep.id && !i.resolvedAt);
    if (open) { open.resolvedAt = now.toISOString(); open.duration = Math.round((now - new Date(open.startedAt)) / 1000); }
    notifications.unshift({ id: uuidv4(), type: 'UP', message: `${ep.name} recovered`, ts: now.toISOString(), read: false });
    if (notifications.length > 100) notifications.pop();
  }
}

const timers = {};
function scheduleEndpoint(ep) {
  if (timers[ep.id]) clearInterval(timers[ep.id]);
  checkEndpoint(ep);
  timers[ep.id] = setInterval(() => checkEndpoint(ep), (ep.interval || 60) * 1000);
}
endpoints.forEach(scheduleEndpoint);

// Endpoints CRUD
app.get('/api/endpoints', (_, res) => res.json(endpoints.map(e => ({ ...e, checks: undefined }))));
app.get('/api/endpoints/:id', (req, res) => {
  const ep = endpoints.find(e => e.id === req.params.id);
  if (!ep) return res.status(404).json({ error: 'Not found' });
  res.json(ep);
});
app.post('/api/endpoints', (req, res) => {
  const { name, url, method='GET', interval=60, timeout=10 } = req.body;
  if (!name || !url) return res.status(400).json({ error: 'name and url required' });
  const ep = { id: uuidv4(), name, url, method, interval, timeout, status: 'UNKNOWN', latency: null, uptime24h: 0, uptime90d: 0, lastChecked: null, checks: [] };
  endpoints.push(ep);
  scheduleEndpoint(ep);
  res.status(201).json({ ...ep, checks: undefined });
});
app.put('/api/endpoints/:id', (req, res) => {
  const ep = endpoints.find(e => e.id === req.params.id);
  if (!ep) return res.status(404).json({ error: 'Not found' });
  const { name, url, method, interval, timeout } = req.body;
  if (name) ep.name = name;
  if (url) ep.url = url;
  if (method) ep.method = method;
  if (interval) ep.interval = Number(interval);
  if (timeout) ep.timeout = Number(timeout);
  scheduleEndpoint(ep);
  res.json({ ...ep, checks: undefined });
});
app.delete('/api/endpoints/:id', (req, res) => {
  const idx = endpoints.findIndex(e => e.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  clearInterval(timers[endpoints[idx].id]);
  endpoints.splice(idx, 1);
  res.json({ ok: true });
});
app.post('/api/endpoints/:id/check', async (req, res) => {
  const ep = endpoints.find(e => e.id === req.params.id);
  if (!ep) return res.status(404).json({ error: 'Not found' });
  await checkEndpoint(ep);
  res.json({ ...ep, checks: undefined });
});

// Incidents
app.get('/api/incidents', (_, res) => res.json(incidents));

// Notifications
app.get('/api/notifications', (_, res) => res.json(notifications));
app.post('/api/notifications/read-all', (_, res) => { notifications.forEach(n => (n.read = true)); res.json({ ok: true }); });

// Stats
app.get('/api/stats', (_, res) => {
  const upCount = endpoints.filter(e => e.status === 'UP').length;
  const since24h = Date.now() - 86400000;
  const checks24h = endpoints.reduce((s, e) => s + e.checks.filter(c => new Date(c.ts) >= since24h).length, 0);
  const openIncidents = incidents.filter(i => !i.resolvedAt).length;
  const avg24h = endpoints.length ? +(endpoints.reduce((s, e) => s + e.uptime24h, 0) / endpoints.length).toFixed(2) : 0;
  res.json({ total: endpoints.length, up: upCount, down: endpoints.length - upCount, uptime24h: avg24h, checks24h, openIncidents });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`PulseWatch backend on :${PORT}`));
