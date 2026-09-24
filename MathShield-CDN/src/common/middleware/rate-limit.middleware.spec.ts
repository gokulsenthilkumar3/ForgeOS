import { RateLimitMiddleware } from './rate-limit.middleware';
import express = require('express');
import request = require('supertest');

describe('rate-limit identity', () => {
  it('ignores forged leftmost forwarding headers behind one trusted proxy', async () => {
    const middleware = new RateLimitMiddleware({ get: (key: string) => key === 'RATE_LIMIT_MAX_REQUESTS' ? '1' : '60000' } as any);
    const app = express();
    app.set('trust proxy', 1);
    app.use((req, res, next) => middleware.use(req, res, next));
    app.get('/check', (req, res) => res.send(req.ip));
    const first = await request(app).get('/check').set('X-Forwarded-For', '1.1.1.1, 198.51.100.7');
    expect(first.status).toBe(200);
    expect(first.text).toBe('198.51.100.7');
    const second = await request(app).get('/check').set('X-Forwarded-For', '2.2.2.2, 198.51.100.7');
    expect(second.status).toBe(429);
  });
});
