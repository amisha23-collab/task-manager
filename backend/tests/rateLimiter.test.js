
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createRateLimiter } from '../src/redis/rateLimiter.js';

describe('createRateLimiter', () => {
  it('allows requests up to the configured limit', async () => {
    let count = 0;
    const client = {
      incr: async () => ++count,
      expire: async () => 1,
    };

    const rateLimiter = createRateLimiter({
      client,
      max: 3,
      windowSeconds: 60,
    });

    assert.equal(await rateLimiter('127.0.0.1'), true);
    assert.equal(await rateLimiter('127.0.0.1'), true);
    assert.equal(await rateLimiter('127.0.0.1'), true);
  });

  it('blocks requests after the configured limit', async () => {
    let count = 0;
    const client = {
      incr: async () => ++count,
      expire: async () => 1,
    };

    const rateLimiter = createRateLimiter({
      client,
      max: 2,
      windowSeconds: 60,
    });

    assert.equal(await rateLimiter('127.0.0.1'), true);
    assert.equal(await rateLimiter('127.0.0.1'), true);
    assert.equal(await rateLimiter('127.0.0.1'), false);
  });

  it('sets the expiry when a counter is first created', async () => {
    let expireCalls = 0;

    const client = {
      incr: async () => 1,
      expire: async (key, seconds) => {
        expireCalls += 1;
        assert.equal(key, 'rate-limit:127.0.0.1');
        assert.equal(seconds, 60);
        return 1;
      },
    };

    const rateLimiter = createRateLimiter({
      client,
      max: 5,
      windowSeconds: 60,
    });

    assert.equal(await rateLimiter('127.0.0.1'), true);
    assert.equal(expireCalls, 1);
  });
});
