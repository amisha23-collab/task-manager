/**
 * Redis-backed fixed-window rate limiter.
 *
 * Returns true when the request is allowed and false when
 * the client has exceeded the configured limit.
 *
 * Redis errors are handled by the Express middleware, which
 * can fail open to preserve application availability.
 */
export const createRateLimiter = ({ client, max, windowSeconds }) => {
  return async (key) => {
    const redisKey = `rate-limit:${key}`;

    const count = await client.incr(redisKey);

    if (count === 1) {
      await client.expire(redisKey, windowSeconds);
    }

    return count <= max;
  };
};
