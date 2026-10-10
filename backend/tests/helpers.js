
import mongoose from 'mongoose';

export const silentLogger = {
  log() {},
  warn() {},
  error() {},
};

export const makeTaskModel = () => {
  const store = [];

  const matches = (doc, filter) =>
    Object.entries(filter).every(
      ([key, value]) => String(doc[key]) === String(value)
    );

 
const chain = (items) => {
  let result = [...items];

  return {
    sort(sortSpec) {
      const [field, direction] = Object.entries(sortSpec)[0];

      result.sort((a, b) => {
        const first = a[field];
        const second = b[field];

        if (first < second) return -direction;
        if (first > second) return direction;

        // Deterministic ordering when timestamps are identical.
        return String(b._id).localeCompare(String(a._id));
      });

      return chain(result);
    },


      skip(amount) {
        result = result.slice(amount);
        return chain(result);
      },

      limit(amount) {
        result = result.slice(0, amount);
        return chain(result);
      },

      lean: async () => result,
    };
  };

  return {
    store,

    async create(data) {
      const now = new Date();

      const doc = {
        _id: new mongoose.Types.ObjectId(),
        createdAt: now,
        updatedAt: now,
        completed: false,
        description: '',
        ...data,
      };

      store.push(doc);
      return doc;
    },

    countDocuments(filter) {
      return Promise.resolve(
        store.filter((doc) => matches(doc, filter)).length
      );
    },

    find(filter) {
      return chain(store.filter((doc) => matches(doc, filter)));
    },

    findOneAndUpdate(filter, update) {
      const doc = store.find((item) => matches(item, filter));

      if (doc) {
        Object.assign(doc, update.$set, { updatedAt: new Date() });
      }

      return {
        lean: async () => doc ?? null,
      };
    },

    findOneAndDelete(filter) {
      const index = store.findIndex((item) => matches(item, filter));
      const [doc] = index >= 0 ? store.splice(index, 1) : [];

      return {
        lean: async () => doc ?? null,
      };
    },
  };
};


export const makeCache = ({ failing = false } = {}) => {
  const data = new Map();
  const calls = { get: 0, set: 0, invalidate: 0 };

  const guard = () => {
    if (failing) throw new Error('redis down');
  };

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
    const base = `${userId}:page:${normalized.page}:limit:${normalized.limit}`;

    if (
      normalized.status === 'all' &&
      normalized.sort === 'newest'
    ) {
      return base;
    }

    return `${base}:status:${normalized.status}:sort:${normalized.sort}`;
  };

  return {
    data,
    calls,
    keyFor,

    async get(userId, options = {}, limit) {
      calls.get += 1;
      guard();

      return data.get(keyFor(userId, options, limit)) ?? null;
    },

    async set(userId, options, limitOrResult, legacyResult) {
      calls.set += 1;
      guard();

      if (typeof options === 'number') {
        data.set(
          keyFor(userId, options, limitOrResult),
          legacyResult
        );
      } else {
        data.set(
          keyFor(userId, options),
          limitOrResult
        );
      }
    },

    async invalidate(userId) {
      calls.invalidate += 1;
      guard();

      for (const key of data.keys()) {
        if (key.startsWith(`${userId}:page:`)) {
          data.delete(key);
        }
      }
    },
  };
};


export const makeSearch = ({ failing = false } = {}) => {
  const docs = new Map();
  const calls = { index: 0, remove: 0, search: 0 };

  const guard = () => {
    if (failing) throw new Error('elasticsearch down');
  };

  return {
    docs,
    calls,

    async index(task) {
      calls.index += 1;
      guard();
      docs.set(task.id, task);
    },

    async remove(id) {
      calls.remove += 1;
      guard();
      docs.delete(id);
    },

    async search(userId, query) {
      calls.search += 1;
      guard();

      const q = query.toLowerCase();

      return [...docs.values()].filter(
        (task) =>
          task.userId === userId &&
          (
            task.title.toLowerCase().includes(q) ||
            task.description.toLowerCase().includes(q)
          )
      );
    },
  };
};
