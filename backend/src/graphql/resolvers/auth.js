
import { requireAuth } from '../../auth/guard.js';

export const authResolvers = {
  Query: {
    me: (_parent, _args, context) => {
      const user = requireAuth(context);
      return context.services.auth.getUserById(user.id);
    },
  },

  Mutation: {
    register: (_parent, args, { services }) =>
      services.auth.register(args),

    login: (_parent, args, { services }) =>
      services.auth.login(args),

    updateProfile: (_parent, { input }, context) => {
      const user = requireAuth(context);
      return context.services.auth.updateProfile(user.id, input);
    },

    changePassword: (_parent, args, context) => {
      const user = requireAuth(context);
      return context.services.auth.changePassword(user.id, args);
    },
  },
};
