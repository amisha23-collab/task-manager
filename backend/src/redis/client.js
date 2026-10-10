import Redis from 'ioredis';

/**
 * Creates a Redis client that never crashes the app.
 * - `enableOfflineQueue: false` makes commands fail immediately while Redis is down
 *   (instead of waiting forever), so requests fall back to MongoDB quickly.
 * - The client keeps retrying the connection in the background.
 * - The 'error' listener is required: without it Node would throw on connection errors.
 */
export const createRedisClient = (url, logger = console) => {
  let lastLoggedAt = 0;
  const client = new Redis(url, {
    enableOfflineQueue: false,
    maxRetriesPerRequest: 1,
    retryStrategy: (attempt) => Math.min(attempt * 500, 5000),
  });

  client.on('ready', () => logger.log('[redis] connected'));
  client.on('error', (err) => {
    // Log at most once every 10 seconds to avoid flooding the console.
    if (Date.now() - lastLoggedAt > 10_000) {
      lastLoggedAt = Date.now();
      logger.warn(`[redis] unavailable: ${err.message}. Falling back to MongoDB.`);
    }
  });

  return client;
};
