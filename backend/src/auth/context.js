import { verifyToken } from './jwt.js';

/**
 * Builds the per-request GraphQL context.
 * A missing or invalid token does not fail here: `user` is simply null,
 * and protected resolvers reject the request with UNAUTHENTICATED.
 */
export const buildContext = ({ config, services }) => async ({ req }) => {
  const [scheme, token] = (req.headers.authorization || '').split(' ');
  let user = null;

  if (scheme === 'Bearer' && token) {
    try {
      const payload = verifyToken(token, config.jwt.secret);
      user = { id: payload.sub };
    } catch {
      user = null;
    }
  }
  return { user, services };
};
