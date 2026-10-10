
import { NavLink } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import NotificationInbox from './NotificationInbox';

export default function Navbar() {
  const { user, logout } = useAuth();

  const linkClass = ({ isActive }) =>
    `rounded-lg px-3 py-2 text-sm font-medium ${
      isActive
        ? 'bg-brand-50 text-brand-700'
        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
    }`;

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <NavLink to="/" className="text-lg font-bold text-brand-700">
          Taskboard
        </NavLink>

        <div className="flex flex-wrap items-center gap-2">
          <NavLink to="/" end className={linkClass}>
            Dashboard
          </NavLink>

          <NavLink to="/profile" className={linkClass}>
            Profile
          </NavLink>

          <NotificationInbox />

          <span className="hidden max-w-40 truncate text-sm text-slate-600 sm:inline">
            {user?.name}
          </span>

          <button
            type="button"
            className="btn-secondary"
            onClick={logout}
          >
            Log out
          </button>
        </div>
      </div>
    </header>
  );
}
