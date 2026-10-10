import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import cors from 'cors';
import express from 'express';
import { buildContext } from './auth/context.js';
import { resolvers } from './graphql/resolvers/index.js';
import { typeDefs } from './graphql/typeDefs.js';
import { createRateLimitMiddleware } from './middleware/rateLimit.js';
import { formatError } from './utils/errors.js';

export const createApp = async ({ config, services }) => {
  const isProduction = config.nodeEnv === 'production';
  const app = express();

  app.use(cors({ origin: config.corsOrigin }));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  const apollo = new ApolloServer({
    typeDefs,
    resolvers,
    formatError: formatError(isProduction),
    includeStacktraceInErrorResponses: !isProduction,
  });

  await apollo.start();

  const rateLimitMiddleware = createRateLimitMiddleware({
    rateLimiter: services.rateLimiter,
    max: config.redis.rateLimitMax,
    windowSeconds: config.redis.rateLimitWindowSeconds,
  });

  app.use(
    '/graphql',
    rateLimitMiddleware,
    express.json(),
    expressMiddleware(apollo, {
      context: buildContext({ config, services }),
    }),
  );

  return { app, apollo };
};
