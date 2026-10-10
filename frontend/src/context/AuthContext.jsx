
import { useApolloClient } from '@apollo/client';
import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { LOGIN, ME, REGISTER } from '../graphql/operations';
import { AUTH_EXPIRED_EVENT } from '../services/apolloClient';
import { clearToken, getToken, saveToken } from '../services/tokenStorage';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const client = useApolloClient();
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(() => Boolean(getToken()));

  const clearSession = useCallback(() => {
    clearToken();
    setUser(null);
    client.clearStore().catch(() => {});
  }, [client]);

  useEffect(() => {
    if (!getToken()) {
      setInitializing(false);
      return;
    }

    client
      .query({ query: ME, fetchPolicy: 'network-only' })
      .then(({ data }) => setUser(data.me))
      .catch(() => {
        clearToken();
        setUser(null);
      })
      .finally(() => setInitializing(false));
  }, [client]);

  useEffect(() => {
    window.addEventListener(AUTH_EXPIRED_EVENT, clearSession);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, clearSession);
  }, [clearSession]);

  const startSession = useCallback(({ token, user: nextUser }) => {
    saveToken(token);
    setUser(nextUser);
  }, []);

  const login = useCallback(
    async (credentials) => {
      const { data } = await client.mutate({
        mutation: LOGIN,
        variables: credentials,
      });
      startSession(data.login);
    },
    [client, startSession]
  );

  const register = useCallback(
    async (details) => {
      const { data } = await client.mutate({
        mutation: REGISTER,
        variables: details,
      });
      startSession(data.register);
    },
    [client, startSession]
  );

  const updateUser = useCallback((updatedUser) => {
    setUser((currentUser) => ({
      ...currentUser,
      ...updatedUser,
    }));
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      initializing,
      login,
      register,
      updateUser,
      logout: clearSession,
    }),
    [user, initializing, login, register, updateUser, clearSession]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
