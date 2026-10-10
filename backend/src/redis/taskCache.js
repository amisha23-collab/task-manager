
/**
 * Redis cache for a user's task lists.
 * Supports pagination, status filtering, and sorting.
 */
export const createTaskCache = ({ client, ttlSeconds }) => {
  const normalizeOptions = (options = {}, limit) => {
    if (typeof options === 'number') {
      return {
        page: options,
        limit: typeof limit === 'number' ? limit : 10,
        status: 'all',
        sort: 'newest',
      };
    }

    return {
      page: options.page ?? 1,
      limit: options.limit ?? 10,
      status: options.status ?? 'all',
      sort: options.sort ?? 'newest',
    };
  };

  const keyFor = (userId, options = {}, limit) => {
    const normalized = normalizeOptions(options, limit);
    const base = `tasks:user:${userId}:page:${normalized.page}:limit:${normalized.limit}`;

    // Preserve the original key for the default filter and sort.
    if (
      normalized.status === 'all' &&
      normalized.sort === 'newest'
    ) {
      return base;
    }

    return `${base}:status:${normalized.status}:sort:${normalized.sort}`;
  };

  return {
    keyFor,

    async get(userId, options = {}, limit) {
      const normalized = normalizeOptions(options, limit);
      const raw = await client.get(keyFor(userId, normalized));

      return raw === null ? null : JSON.parse(raw);
    },

    async set(userId, options, limitOrData, legacyData) {
      let normalized;
      let data;

      if (typeof options === 'number') {
        normalized = normalizeOptions(options, limitOrData);
        data = legacyData;
      } else {
        normalized = normalizeOptions(options);
        data = limitOrData;
      }

      await client.set(
        keyFor(userId, normalized),
        JSON.stringify(data),
        'EX',
        ttlSeconds
      );
    },

    async invalidate(userId) {
      const pattern = `tasks:user:${userId}:*`;
      const keys = await client.keys(pattern);

      if (keys.length > 0) {
        await client.del(keys);
      }
    },
  };
};
