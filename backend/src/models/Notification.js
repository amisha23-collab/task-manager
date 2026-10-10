import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
      required: true,
    },
    // Including the due date in the key allows a changed deadline
    // to start a new reminder cycle.
    reminderKey: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['DUE_SOON', 'OVERDUE'],
      required: true,
    },
    title: {
      type: String,
      required: true,
      maxlength: 160,
    },
    message: {
      type: String,
      required: true,
      maxlength: 500,
    },
    readAt: {
      type: Date,
      default: null,
    },
    emailSentAt: {
      type: Date,
      default: null,
    },
    emailLastError: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

// A task and reminder type can only be created once for a given deadline.
notificationSchema.index(
  { userId: 1, reminderKey: 1 },
  { unique: true }
);

notificationSchema.index({ userId: 1, readAt: 1, createdAt: -1 });

export const Notification = mongoose.model(
  'Notification',
  notificationSchema
);