import { GraphQLError } from 'graphql';

const createError = (message, code, extra = {}) =>
  new GraphQLError(message, { extensions: { code, ...extra } });

export const unauthenticated = (message = 'Authentication required. Please log in.') =>
  createError(message, 'UNAUTHENTICATED');

export const forbidden = (message = 'You are not allowed to do this.') =>
  createError(message, 'FORBIDDEN');

export const notFound = (message = 'Resource not found.') => createError(message, 'NOT_FOUND');

export const badUserInput = (message, fields = {}) =>
  createError(message, 'BAD_USER_INPUT', { fields });

export const serviceUnavailable = (message) => createError(message, 'SERVICE_UNAVAILABLE');

/** Hides internal error details from clients in production. */
export const formatError = (isProduction) => (formattedError) => {
  if (isProduction && formattedError.extensions?.code === 'INTERNAL_SERVER_ERROR') {
    return { ...formattedError, message: 'Something went wrong on the server.' };
  }
  return formattedError;
};
