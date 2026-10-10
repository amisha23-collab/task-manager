import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Spinner from './Spinner';

/** Wraps pages that need a logged-in user; everyone else is sent to /login. */
export default function ProtectedRoute({ children }) {
  const { isAuthenticated, initializing } = useAuth();
  if (initializing) {
    return <div className="flex min-h-screen items-center justify-center text-brand-600"><Spinner className="h-8 w-8" /></div>;
  }
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}
