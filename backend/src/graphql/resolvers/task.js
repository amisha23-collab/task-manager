
import { requireAuth } from '../../auth/guard.js';

export const taskResolvers = {
  Query: {
    getTasks: (_parent, { page, limit, status, sort }, context) => {
      const user = requireAuth(context);

      return context.services.tasks.getTasks(user.id, {
        page,
        limit,
        status,
        sort,
      });
    },

    searchTasks: (_parent, { query }, context) => {
      const user = requireAuth(context);
      return context.services.tasks.searchTasks(user.id, query);
    },
  },

  Mutation: {
    createTask: (_parent, { input }, context) => {
      const user = requireAuth(context);
      return context.services.tasks.createTask(user.id, input);
    },

    updateTask: (_parent, { id, input }, context) => {
      const user = requireAuth(context);
      return context.services.tasks.updateTask(user.id, id, input);
    },

    deleteTask: (_parent, { id }, context) => {
      const user = requireAuth(context);
      return context.services.tasks.deleteTask(user.id, id);
    },
  },
};
