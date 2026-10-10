import { ApolloClient, HttpLink, InMemoryCache, from } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';
import { clearToken, getToken } from './tokenStorage';

export const AUTH_EXPIRED_EVENT = 'taskboard:auth-expired';

const httpLink = new HttpLink({
  uri: import.meta.env.VITE_GRAPHQL_URL || 'http://localhost:4000/graphql',
});

// Adds "Authorization: Bearer <token>" to every request when logged in.
const authLink = setContext((_operation, { headers }) => {
  const token = getToken();
  return { headers: { ...headers, ...(token ? { authorization: `Bearer ${token}` } : {}) } };
});

// If the server says the token is invalid or expired, drop it and tell the app to log out.
const errorLink = onError(({ graphQLErrors }) => {
  const expired = graphQLErrors?.some((error) => error.extensions?.code === 'UNAUTHENTICATED');
  if (expired && getToken()) {
    clearToken();
    window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
  }
});

export const apolloClient = new ApolloClient({
  link: from([errorLink, authLink, httpLink]),
  cache: new InMemoryCache(),
});
