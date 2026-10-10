
import nodemailer from "nodemailer";

const DAY_MS = 24 * 60 * 60 * 1000;
const REMINDER_WINDOW_MS = DAY_MS + 60 * 1000;
const REMINDER_TIME_ZONE = "Asia/Kolkata";

const makeReminderKey = (task, type) =>
  `${task._id}:${new Date(task.dueDate).toISOString()}:${type}`;

// Returns a date as YYYY-MM-DD in the selected time zone.
const getDateInTimeZone = (date, timeZone = REMINDER_TIME_ZONE) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const values = Object.fromEntries(
    parts.map(({ type, value }) => [type, value]),
  );

  return `${values.year}-${values.month}-${values.day}`;
};

// Returns the next calendar day's date in YYYY-MM-DD format.
const getTomorrowDateInTimeZone = (
  current,
  timeZone = REMINDER_TIME_ZONE,
) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(current);

  const values = Object.fromEntries(
    parts.map(({ type, value }) => [type, Number(value)]),
  );

  // UTC is used only for calendar arithmetic, not for the user's time zone.
  const tomorrow = new Date(
    Date.UTC(values.year, values.month - 1, values.day + 1),
  );

  return [
    tomorrow.getUTCFullYear(),
    String(tomorrow.getUTCMonth() + 1).padStart(2, "0"),
    String(tomorrow.getUTCDate()).padStart(2, "0"),
  ].join("-");
};

const isDueSoon = (dueDate, current) => {
  if (dueDate == null) {
    return false;
  }

  const due = new Date(dueDate);
  const dueMs = due.getTime();
  const currentMs = current.getTime();

  if (!Number.isFinite(dueMs) || dueMs <= currentMs) {
    return false;
  }

  // Rule 1: due within the next 24 hours, plus a 1-minute allowance.
  const within24Hours = dueMs <= currentMs + REMINDER_WINDOW_MS;

  // Rule 2: due on the next calendar day in Asia/Kolkata.
  const dueTomorrow =
    getDateInTimeZone(due) === getTomorrowDateInTimeZone(current);

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
    const reminderKey = makeReminderKey(task, type);

    const title =
      type === "DUE_SOON" ? "Task due soon" : "Task overdue";

    const message =
      type === "DUE_SOON"
        ? `"${task.title}" is due within the next 24 hours or tomorrow.`
        : `"${task.title}" is overdue.`;

    // Upsert prevents duplicate reminders for the same task, due date and type.
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
      { upsert: true },
    );
  };

  const sendPendingEmails = async () => {
    const smtpConfigured = Boolean(
      emailConfig.host &&
        emailConfig.from &&
        emailConfig.user &&
        emailConfig.pass,
    );

    // In-app notifications still work without SMTP configuration.
    if (!smtpConfigured) {
      return;
    }

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

        if (!task || task.completed || !task.dueDate) {
          continue;
        }

        const dueMs = new Date(task.dueDate).getTime();

        if (!Number.isFinite(dueMs)) {
          continue;
        }

        const savedDueDate = new Date(task.dueDate).toISOString();

        // Do not send an old reminder if the task's due date has changed.
        if (!notification.reminderKey.includes(savedDueDate)) {
          continue;
        }

        const current = now();

        if (
          notification.type === "DUE_SOON" &&
          !isDueSoon(task.dueDate, current)
        ) {
          continue;
        }

        if (
          notification.type === "OVERDUE" &&
          dueMs > current.getTime()
        ) {
          continue;
        }

        const user = await UserModel.findById(task.userId).lean();

        if (!user?.email) {
          continue;
        }

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
          },
        );
      } catch (error) {
        logger.error("Failed to send task reminder email:", error);

        await NotificationModel.updateOne(
          { _id: notification._id },
          {
            $set: {
              emailLastError: error.message || "Email delivery failed.",
            },
          },
        );
      }
    }
  };

  const checkReminders = async () => {
    if (isChecking) {
      return;
    }

    isChecking = true;

    try {
      const current = now();

      // Search far enough ahead to include tomorrow's local calendar date.
      const reminderSearchEnd = new Date(
        current.getTime() + 48 * 60 * 60 * 1000,
      );

      const upcomingTasks = await TaskModel.find({
        completed: false,
        dueDate: {
          $gt: current,
          $lte: reminderSearchEnd,
        },
      })
        .select("_id userId title dueDate completed")
        .lean();

      logger.log("[reminders] current time:", current.toISOString());

      logger.log(
        "[reminders] upcoming tasks from MongoDB:",
        upcomingTasks.map((task) => ({
          title: task.title,
          dueDate: task.dueDate,
          completed: task.completed,
        })),
      );

      const dueSoonTasks = upcomingTasks.filter((task) =>
        isDueSoon(task.dueDate, current),
      );

      logger.log(
        "[reminders] due-soon tasks found:",
        dueSoonTasks.length,
      );

      for (const task of dueSoonTasks) {
        await createReminder(task, "DUE_SOON");
      }

      const overdueResults = await TaskModel.find({
        completed: false,
        dueDate: { $ne: null, $lte: current },
      })
        .select("_id userId title dueDate completed")
        .lean();

      const overdueTasks = overdueResults.filter((task) => {
        if (task.dueDate == null) {
          return false;
        }

        const dueMs = new Date(task.dueDate).getTime();

        return (
          Number.isFinite(dueMs) &&
          dueMs <= current.getTime()
        );
      });

      logger.log(
        "[reminders] overdue tasks found:",
        overdueTasks.length,
      );

      for (const task of overdueTasks) {
        await createReminder(task, "OVERDUE");
      }

      await sendPendingEmails();
    } catch (error) {
      logger.error("Reminder check failed:", error);
    } finally {
      isChecking = false;
    }
  };

  const start = (intervalMs = 60000) => {
    if (intervalId) {
      return;
    }

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
