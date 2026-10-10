
import { authResolvers } from './auth.js';
import { taskResolvers } from './task.js';
import { notificationResolvers } from './notification.js';

export const resolvers = {
  Notification: notificationResolvers.Notification,

  Query: {
    ...authResolvers.Query,
    ...taskResolvers.Query,
    ...notificationResolvers.Query,
  },

  Mutation: {
    ...authResolvers.Mutation,
    ...taskResolvers.Mutation,
    ...notificationResolvers.Mutation,
  },
};
