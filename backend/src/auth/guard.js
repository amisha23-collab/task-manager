import { unauthenticated } from '../utils/errors.js';

/** Used at the top of every protected resolver. Returns the logged-in user. */
export const requireAuth = (context) => {
  if (!context.user) throw unauthenticated();
  return context.user;
};
