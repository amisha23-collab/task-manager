
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createRateLimitMiddleware } from '../src/middleware/rateLimit.js';

const createResponse = () => ({
  headers: {},
  statusCode: 200,
  body: null,
  setHeader(name, value) {
    this.headers[name] = value;
  },
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(body) {
    this.body = body;
    return this;
  },
});

describe('createRateLimitMiddleware', () => {
  it('continues when the request is allowed', async () => {
    let nextCalled = false;

    const middleware = createRateLimitMiddleware({
      rateLimiter: async () => true,
      max: 10,
      windowSeconds: 60,
    });

    const res = createResponse();

    await middleware({ ip: '127.0.0.1' }, res, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, true);
    assert.equal(res.headers['RateLimit-Limit'], '10');
  });

  it('returns HTTP 429 when the limit is exceeded', async () => {
    let nextCalled = false;

    const middleware = createRateLimitMiddleware({
      rateLimiter: async () => false,
      max: 2,
      windowSeconds: 60,
    });

    const res = createResponse();

    await middleware({ ip: '127.0.0.1' }, res, () => {
      nextCalled = true;
    });

    assert.equal(res.statusCode, 429);
    assert.equal(res.headers['Retry-After'], '60');
    assert.equal(res.body.errors[0].extensions.code, 'RATE_LIMITED');
    assert.equal(nextCalled, false);
  });

  it('allows the request through when Redis fails', async () => {
    let nextCalled = false;
    const warnings = [];

    const middleware = createRateLimitMiddleware({
      rateLimiter: async () => {
        throw new Error('Redis unavailable');
      },
      max: 10,
      windowSeconds: 60,
      logger: { warn: (message) => warnings.push(message) },
    });

    const res = createResponse();

    await middleware({ ip: '127.0.0.1' }, res, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, true);
    assert.equal(warnings.length, 1);
  });
});
