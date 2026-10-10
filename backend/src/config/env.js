import 'dotenv/config';

const REQUIRED = ['MONGODB_URI', 'JWT_SECRET'];

export const loadConfig = (env = process.env) => {
  const missing = REQUIRED.filter((name) => !env[name]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}. Copy .env.example to .env and fill them in.`
    );
  }

  if (env.JWT_SECRET.length < 16) {
    throw new Error('JWT_SECRET must be at least 16 characters long.');
  }

  const rateLimitMax = Number(env.RATE_LIMIT_MAX) || 100;
  const rateLimitWindowSeconds =
    Number(env.RATE_LIMIT_WINDOW_SECONDS) || 900;
  const reminderCheckIntervalMs =
    Number(env.REMINDER_CHECK_INTERVAL_MS) || 60000;

  const smtpPort = Number(env.SMTP_PORT) || 587;
  const smtpSecure = env.SMTP_SECURE === 'true';

  if (!Number.isInteger(rateLimitMax) || rateLimitMax < 1) {
    throw new Error('RATE_LIMIT_MAX must be a positive integer.');
  }

  if (
    !Number.isInteger(rateLimitWindowSeconds) ||
    rateLimitWindowSeconds < 1
  ) {
    throw new Error(
      'RATE_LIMIT_WINDOW_SECONDS must be a positive integer.'
    );
  }

  if (
    !Number.isInteger(reminderCheckIntervalMs) ||
    reminderCheckIntervalMs < 1000
  ) {
    throw new Error(
      'REMINDER_CHECK_INTERVAL_MS must be an integer of at least 1000.'
    );
  }

  if (!Number.isInteger(smtpPort) || smtpPort < 1 || smtpPort > 65535) {
    throw new Error('SMTP_PORT must be a valid port number.');
  }

  return {
    nodeEnv: env.NODE_ENV || 'development',
    port: Number(env.PORT) || 4000,
    corsOrigin: env.CORS_ORIGIN || 'http://localhost:5173',
    mongoUri: env.MONGODB_URI,
    jwt: {
      secret: env.JWT_SECRET,
      expiresIn: env.JWT_EXPIRES_IN || '7d',
    },
    redis: {
      url: env.REDIS_URL || 'redis://localhost:6379',
      tasksTtlSeconds: Number(env.REDIS_TASKS_TTL_SECONDS) || 600,
      rateLimitMax,
      rateLimitWindowSeconds,
    },
    elasticsearch: {
      url: env.ELASTICSEARCH_URL || 'http://localhost:9200',
      tasksIndex: env.ELASTICSEARCH_TASKS_INDEX || 'tasks',
    },
    reminders: {
      checkIntervalMs: reminderCheckIntervalMs,
    },
    email: {
      host: env.SMTP_HOST || '',
      port: smtpPort,
      secure: smtpSecure,
      user: env.SMTP_USER || '',
      pass: env.SMTP_PASS || '',
      from: env.EMAIL_FROM || env.SMTP_USER || '',
    },
  };
};