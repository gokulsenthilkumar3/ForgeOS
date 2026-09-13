/**
 * VaultIQ - K6 Load Test: Assets API
 * Run: k6 run tests/load/assets-load-test.js
 *
 * Scenarios:
 *  1. smoke  - 1 VU, 30s  (sanity check)
 *  2. load   - ramp to 50 VUs, sustain 2min, ramp down
 *  3. stress - ramp to 200 VUs to find breaking point
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:4000';
const AUTH_TOKEN = __ENV.AUTH_TOKEN || '';

const assetListDuration = new Trend('asset_list_duration');
const assetGetDuration = new Trend('asset_get_duration');
const errorRate = new Rate('error_rate');

export const options = {
  scenarios: {
    smoke: {
      executor: 'constant-vus',
      vus: 1,
      duration: '30s',
      tags: { scenario: 'smoke' },
    },
    load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 50 },
        { duration: '2m', target: 50 },
        { duration: '30s', target: 0 },
      ],
      tags: { scenario: 'load' },
      startTime: '35s',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<500'],
    error_rate: ['rate<0.01'],
    asset_list_duration: ['p(95)<400'],
  },
};

const headers = {
  'Content-Type': 'application/json',
  ...(AUTH_TOKEN && { Authorization: `Bearer ${AUTH_TOKEN}` }),
};

export default function () {
  // Test 1: List assets (paginated)
  const listRes = http.get(`${BASE_URL}/assets?page=1&limit=20`, { headers });
  assetListDuration.add(listRes.timings.duration);
  const listOk = check(listRes, {
    'list assets: status 200': (r) => r.status === 200,
    'list assets: has data': (r) => {
      try {
        const body = JSON.parse(r.body);
        return Array.isArray(body.data);
      } catch { return false; }
    },
  });
  errorRate.add(!listOk);

  sleep(1);

  // Test 2: Get dashboard summary
  const summaryRes = http.get(`${BASE_URL}/assets/summary`, { headers });
  const summaryOk = check(summaryRes, {
    'summary: status 200': (r) => r.status === 200,
    'summary: has stats': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.stats !== undefined;
      } catch { return false; }
    },
  });
  errorRate.add(!summaryOk);

  sleep(1);

  // Test 3: Activity log (paginated)
  const activityRes = http.get(`${BASE_URL}/assets/activity?page=1&limit=20`, { headers });
  assetGetDuration.add(activityRes.timings.duration);
  check(activityRes, { 'activity log: status 200': (r) => r.status === 200 });

  sleep(1);
}
