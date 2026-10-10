
import { requireAuth } from '../../auth/guard.js';

export const notificationResolvers = {
  Notification: {
    id: (notification) => String(notification._id),
    createdAt: (notification) =>
      new Date(notification.createdAt).toISOString(),
    readAt: (notification) =>
      notification.readAt
        ? new Date(notification.readAt).toISOString()
        : null,
  },

  Query: {
    notifications: (_parent, { unreadOnly }, context) => {
      const user = requireAuth(context);

      return context.services.notifications.getNotifications(user.id, {
        unreadOnly,
      });
    },
  },

  Mutation: {
    markNotificationRead: (_parent, { id }, context) => {
      const user = requireAuth(context);

      return context.services.notifications.markNotificationRead(
        user.id,
        id
      );
    },
  },
};
