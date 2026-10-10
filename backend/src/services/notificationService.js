import mongoose from 'mongoose';

export const createNotificationService = ({ NotificationModel }) => ({
  async getNotifications(userId, { unreadOnly = false } = {}) {
    const filter = { userId };

    if (unreadOnly) {
      filter.readAt = null;
    }

    return NotificationModel.find(filter)
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
  },

  async markNotificationRead(userId, notificationId) {
    if (!mongoose.isValidObjectId(notificationId)) {
      throw new Error('Invalid notification id.');
    }

    const notification = await NotificationModel.findOneAndUpdate(
      { _id: notificationId, userId },
      { $set: { readAt: new Date() } },
      { new: true }
    ).lean();

    if (!notification) {
      throw new Error('Notification not found.');
    }

    return notification;
  },
});