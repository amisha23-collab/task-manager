
import { notFound, serviceUnavailable } from '../utils/errors.js';
import { toTaskDTO } from '../utils/mappers.js';
import {
  assertValidObjectId,
  validateTaskInput,
} from '../utils/validators.js';

export const createTaskService = ({
  TaskModel,
  cache,
  search,
  logger = console,
}) => {
  const bestEffort = async (label, action) => {
    try {
      return await action();
    } catch (err) {
      logger.warn(`[${label}] ${err.message}`);
      return undefined;
    }
  };

  const ownedBy = (userId, id) => {
    assertValidObjectId(id);
    return { _id: id, userId };
  };

  return {
    async createTask(userId, input) {
      const data = validateTaskInput(input);
      const doc = await TaskModel.create({ ...data, userId });
      const task = toTaskDTO(doc);

      await bestEffort('elasticsearch:index', () => search.index(task));
      await bestEffort('redis:invalidate', () => cache.invalidate(userId));

      return task;
    },

    async getTasks(
      userId,
      {
        page = 1,
        limit = 10,
        status = 'all',
        sort = 'newest',
      } = {}
    ) {
      const safePage = Math.max(1, Math.floor(Number(page) || 1));
      const safeLimit = Math.min(
        50,
        Math.max(1, Math.floor(Number(limit) || 10))
      );

      const allowedStatuses = ['all', 'active', 'completed'];
      const allowedSorts = ['newest', 'oldest', 'title'];

      const safeStatus = allowedStatuses.includes(status)
        ? status
        : 'all';

      const safeSort = allowedSorts.includes(sort)
        ? sort
        : 'newest';

      const userFilter = { userId };
      const filter = { ...userFilter };

      if (safeStatus === 'active') {
        filter.completed = false;
      } else if (safeStatus === 'completed') {
        filter.completed = true;
      }

      const sortOptions = {
        newest: { createdAt: -1 },
        oldest: { createdAt: 1 },
        title: { title: 1, _id: 1 },
      };

      const cacheOptions = {
        page: safePage,
        limit: safeLimit,
        status: safeStatus,
        sort: safeSort,
      };

      const cached = await bestEffort(
        'redis:get',
        () => cache.get(userId, cacheOptions)
      );

      if (cached !== null && cached !== undefined) {
        return cached;
      }

      // Count all tasks and both completion states across every page.
      const [all, active, completed, total] = await Promise.all([
        TaskModel.countDocuments(userFilter),
        TaskModel.countDocuments({
          ...userFilter,
          completed: false,
        }),
        TaskModel.countDocuments({
          ...userFilter,
          completed: true,
        }),
        TaskModel.countDocuments(filter),
      ]);

      const totalPages = Math.max(
        1,
        Math.ceil(total / safeLimit)
      );

      const currentPage = Math.min(safePage, totalPages);
      const skip = (currentPage - 1) * safeLimit;

      const docs = await TaskModel.find(filter)
        .sort(sortOptions[safeSort])
        .skip(skip)
        .limit(safeLimit)
        .lean();

      const result = {
        tasks: docs.map(toTaskDTO),
        pagination: {
          page: currentPage,
          limit: safeLimit,
          total,
          totalPages,
          hasNextPage: currentPage < totalPages,
          hasPreviousPage: currentPage > 1,
        },
        counts: {
          all,
          active,
          completed,
        },
      };

      await bestEffort(
        'redis:set',
        () => cache.set(
          userId,
          {
            ...cacheOptions,
            page: currentPage,
          },
          result
        )
      );

      return result;
    },

    async updateTask(userId, id, input) {
      const changes = validateTaskInput(input, { partial: true });
      const filter = ownedBy(userId, id);

      const doc = await TaskModel.findOneAndUpdate(
        filter,
        { $set: changes },
        { new: true, runValidators: true }
      ).lean();

      if (!doc) throw notFound('Task not found.');

      const task = toTaskDTO(doc);

      await bestEffort('elasticsearch:index', () => search.index(task));
      await bestEffort('redis:invalidate', () => cache.invalidate(userId));

      return task;
    },

    async deleteTask(userId, id) {
      const filter = ownedBy(userId, id);

      const doc = await TaskModel.findOneAndDelete(filter).lean();

      if (!doc) throw notFound('Task not found.');

      const task = toTaskDTO(doc);

      await bestEffort('elasticsearch:remove', () => search.remove(task.id));
      await bestEffort('redis:invalidate', () => cache.invalidate(userId));

      return task;
    },

    async searchTasks(userId, query) {
      const term = (query || '').trim();

      if (!term) return [];

      try {
        return await search.search(userId, term);
      } catch (err) {
        logger.error(`[elasticsearch:search] ${err.message}`);

        throw serviceUnavailable(
          'Search is temporarily unavailable. Please try again shortly.'
        );
      }
    },
  };
};
