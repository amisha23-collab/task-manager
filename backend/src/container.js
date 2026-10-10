
  import { createElasticClient } from './elasticsearch/client.js';
  import { createTaskSearch } from './elasticsearch/taskSearch.js';
  import { Notification } from './models/Notification.js';
  import { Task } from './models/Task.js';
  import { User } from './models/User.js';
  import { createRedisClient } from './redis/client.js';
  import { createRateLimiter } from './redis/rateLimiter.js';
  import { createTaskCache } from './redis/taskCache.js';
  import { createAuthService } from './services/authService.js';
  import { createNotificationService } from './services/notificationService.js';
  import { createReminderService } from './services/reminderService.js';
  import { createTaskService } from './services/taskService.js';

  export const createContainer = (config) => {
    const redisClient = createRedisClient(config.redis.url);
    const elasticClient = createElasticClient(config.elasticsearch.url);

    const cache = createTaskCache({
      client: redisClient,
      ttlSeconds: config.redis.tasksTtlSeconds,
    });

    const search = createTaskSearch({
      client: elasticClient,
      index: config.elasticsearch.tasksIndex,
    });

    const rateLimiter = createRateLimiter({
      client: redisClient,
      max: config.redis.rateLimitMax,
      windowSeconds: config.redis.rateLimitWindowSeconds,
    });

    const notifications = createNotificationService({
      NotificationModel: Notification,
    });

    const reminders = createReminderService({
      TaskModel: Task,
      UserModel: User,
      NotificationModel: Notification,
      emailConfig: config.email,
    });

    const services = {
      auth: createAuthService({
        UserModel: User,
        jwtConfig: config.jwt,
      }),
      tasks: createTaskService({
        TaskModel: Task,
        cache,
        search,
      }),
      notifications,
      reminders,
      rateLimiter,
    };

    const shutdown = async () => {
      await reminders.stop();
      await Promise.allSettled([
        redisClient.quit(),
        elasticClient.close(),
      ]);
    };

    return { services, search, shutdown };
  };
