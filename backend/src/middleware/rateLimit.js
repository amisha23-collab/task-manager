/**
 * Express middleware for Redis-backed API rate limiting.
 *
 * If Redis is unavailable, requests are allowed through so a Redis
 * outage does not make the entire API unavailable.
 */
export const createRateLimitMiddleware = ({
  rateLimiter,
  max,
  windowSeconds,
  logger = console,
}) => {
  let lastRedisWarningAt = 0;

  return async (req, res, next) => {
    res.setHeader('RateLimit-Limit', String(max));

    try {
      const allowed = await rateLimiter(req.ip || 'unknown');

      if (!allowed) {
        res.setHeader('Retry-After', String(windowSeconds));

        return res.status(429).json({
          errors: [
            {
              message: 'Too many requests. Please try again later.',
              extensions: {
                code: 'RATE_LIMITED',
              },
            },
          ],
        });
      }

      return next();
    } catch (err) {
      if (Date.now() - lastRedisWarningAt > 10_000) {
        lastRedisWarningAt = Date.now();
        logger.warn(
          `[rate-limit] Redis unavailable; allowing request: ${err.message}`
        );
      }

      return next();
    }
  };
};
