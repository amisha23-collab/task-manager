import nodemailer from 'nodemailer';

const DAY_MS = 24 * 60 * 60 * 1000;
const REMINDER_WINDOW_MS = DAY_MS + 60 * 1000;

const makeReminderKey = (task, type) =>
  `${task._id}:${new Date(task.dueDate).toISOString()}:${type}`;

const isDueSoon = (dueDate, current) => {
  if (dueDate == null) return false;

  const dueMs = new Date(dueDate).getTime();
  const currentMs = current.getTime();

  if (!Number.isFinite(dueMs) || dueMs <= currentMs) {
    return false;
  }

  const within24Hours =
    dueMs <= currentMs + REMINDER_WINDOW_MS;

  const tomorrowStart = Date.UTC(
    current.getUTCFullYear(),
    current.getUTCMonth(),
    current.getUTCDate() + 1
  );

  const dayAfterTomorrowStart = tomorrowStart + DAY_MS;

  const dueTomorrow =
    dueMs >= tomorrowStart &&
    dueMs < dayAfterTomorrowStart;

  return within24Hours || dueTomorrow;
};

export const createReminderService = ({
  TaskModel,
  UserModel,
  NotificationModel,
  emailConfig = {},
  logger = console,
  now = () => new Date(),
}) => {
  let intervalId = null;
  let isChecking = false;

  const createReminder = async (task, type) => {
    if (task.dueDate == null) return;

    const reminderKey = makeReminderKey(task, type);

    const title =
      type === 'DUE_SOON'
        ? 'Task due soon'
        : 'Task overdue';

    const message =
      type === 'DUE_SOON'
        ? `"${task.title}" is due within the next 24 hours or tomorrow.`
        : `"${task.title}" is overdue.`;

    await NotificationModel.updateOne(
      { userId: task.userId, reminderKey },
      {
        $setOnInsert: {
          userId: task.userId,
          taskId: task._id,
          reminderKey,
          type,
          title,
          message,
          readAt: null,
          emailSentAt: null,
          emailLastError: null,
        },
      },
      { upsert: true }
    );
  };

  const sendPendingEmails = async () => {
    const smtpConfigured = Boolean(
      emailConfig.host &&
      emailConfig.from &&
      emailConfig.user &&
      emailConfig.pass
    );

    if (!smtpConfigured) return;

    const transporter = nodemailer.createTransport({
      host: emailConfig.host,
      port: Number(emailConfig.port || 587),
      secure: Boolean(emailConfig.secure),
      auth: {
        user: emailConfig.user,
        pass: emailConfig.pass,
      },
    });

    const pending = await NotificationModel.find({
      emailSentAt: null,
      emailLastError: null,
    })
      .sort({ createdAt: 1 })
      .limit(50)
      .lean();

    for (const notification of pending) {
      try {
        const task = await TaskModel.findOne({
          _id: notification.taskId,
          userId: notification.userId,
        }).lean();

        if (!task || task.completed || task.dueDate == null) {
          continue;
        }

        const dueMs = new Date(task.dueDate).getTime();

        if (!Number.isFinite(dueMs)) continue;

        const savedDueDate = new Date(task.dueDate).toISOString();

        if (!notification.reminderKey.includes(savedDueDate)) {
          continue;
        }

        const current = now();

        if (
          notification.type === 'DUE_SOON' &&
          !isDueSoon(task.dueDate, current)
        ) {
          continue;
        }

        if (
          notification.type === 'OVERDUE' &&
          dueMs > current.getTime()
        ) {
          continue;
        }

        const user = await UserModel.findById(task.userId).lean();

        if (!user?.email) continue;

        await transporter.sendMail({
          from: emailConfig.from,
          to: user.email,
          subject: notification.title,
          text: notification.message,
        });

        await NotificationModel.updateOne(
          { _id: notification._id, emailSentAt: null },
          {
            $set: {
              emailSentAt: now(),
              emailLastError: null,
            },
          }
        );
      } catch (error) {
        logger.error(
          'Failed to send task reminder email:',
          error
        );

        await NotificationModel.updateOne(
          { _id: notification._id },
          {
            $set: {
              emailLastError:
                error.message || 'Email delivery failed.',
            },
          }
        );
      }
    }
  };

  const checkReminders = async () => {
    if (isChecking) return;

    isChecking = true;

    try {
      const current = now();

      const dayAfterTomorrowStart = Date.UTC(
        current.getUTCFullYear(),
        current.getUTCMonth(),
        current.getUTCDate() + 2
      );

      const upcomingTasks = await TaskModel.find({
        completed: false,
        dueDate: {
          $gt: current,
          $lt: new Date(dayAfterTomorrowStart),
        },
      })
        .select('_id userId title dueDate completed')
        .lean();

      const dueSoonTasks = upcomingTasks.filter((task) =>
        isDueSoon(task.dueDate, current)
      );

      logger.log?.(
        '[reminders] due-soon tasks found:',
        dueSoonTasks.length
      );

      for (const task of dueSoonTasks) {
        await createReminder(task, 'DUE_SOON');
      }

      const overdueResults = await TaskModel.find({
        completed: false,
        dueDate: { $ne: null, $lte: current },
      })
        .select('_id userId title dueDate completed')
        .lean();

      // Guard against null dates, including in test mocks.
      const overdueTasks = overdueResults.filter((task) => {
        if (task.dueDate == null) return false;

        const dueMs = new Date(task.dueDate).getTime();

        return (
          Number.isFinite(dueMs) &&
          dueMs <= current.getTime()
        );
      });

      logger.log?.(
        '[reminders] overdue tasks found:',
        overdueTasks.length
      );

      for (const task of overdueTasks) {
        await createReminder(task, 'OVERDUE');
      }

      await sendPendingEmails();
    } catch (error) {
      logger.error('Reminder check failed:', error);
    } finally {
      isChecking = false;
    }
  };

  const start = (intervalMs = 60000) => {
    if (intervalId) return;

    void checkReminders();

    intervalId = setInterval(() => {
      void checkReminders();
    }, intervalMs);

    intervalId.unref?.();
  };

  const stop = async () => {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  };

  return { checkReminders, start, stop };
};
