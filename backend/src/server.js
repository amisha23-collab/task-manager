import { createApp } from './app.js';
import { connectMongo, disconnectMongo } from './config/db.js';
import { loadConfig } from './config/env.js';
import { createContainer } from './container.js';

const start = async () => {
  const config = loadConfig();

  await connectMongo(config.mongoUri);

  const container = createContainer(config);

  try {
    await container.search.ensureIndex();
    console.log('[elasticsearch] index ready');
  } catch (err) {
    console.warn(
      `[elasticsearch] unavailable at startup: ${err.message}. Search will retry on demand.`
    );
  }

  const { app, apollo } = await createApp({
    config,
    services: container.services,
  });

  const httpServer = app.listen(config.port, () => {
    console.log(
      `[server] GraphQL ready at http://localhost:${config.port}/graphql`
    );
  });

  // Start automatic task reminders after the server is initialized.
  container.services.reminders.start(config.reminders.checkIntervalMs);

  let shuttingDown = false;

  const shutdown = async (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;

    console.log(`[server] ${signal} received, shutting down`);

    await new Promise((resolve) => httpServer.close(resolve));
    await apollo.stop();
    await container.shutdown();
    await disconnectMongo();

    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
};

start().catch((err) => {
  console.error('[server] failed to start:', err.message);
  process.exit(1);
});