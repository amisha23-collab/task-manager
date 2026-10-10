
import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import {
  GET_NOTIFICATIONS,
  MARK_NOTIFICATION_READ,
} from '../graphql/operations';

const formatDate = (value) => {
  if (!value) return '';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '';

  return date.toLocaleString([], {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
};

export default function NotificationInbox() {
  const [isOpen, setIsOpen] = useState(false);

  const { data, loading, error, refetch } = useQuery(GET_NOTIFICATIONS, {
    variables: { unreadOnly: false },
    pollInterval: 60000,
    fetchPolicy: 'cache-and-network',
    skip: false,
  });

  const [markRead, { loading: markingRead }] = useMutation(
    MARK_NOTIFICATION_READ,
    {
      onCompleted: () => refetch(),
    }
  );

  const notifications = data?.notifications ?? [];
  const unreadCount = notifications.filter(
    (notification) => !notification.readAt
  ).length;

  useEffect(() => {
    if (isOpen) {
      refetch();
    }
  }, [isOpen, refetch]);

  const handleMarkRead = async (id) => {
    try {
      await markRead({ variables: { id } });
    } catch {
      // Apollo exposes the error through the mutation result.
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        className="relative rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        aria-label={
          unreadCount > 0
            ? `Notifications, ${unreadCount} unread`
            : 'Notifications'
        }
      >
        <span aria-hidden="true">🔔</span>
        <span className="ml-2">Notifications</span>

        {unreadCount > 0 && (
          <span className="ml-2 inline-flex min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 py-0.5 text-xs font-bold text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-2 w-[min(90vw,24rem)] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <div>
              <h2 className="font-semibold text-slate-900">
                Notifications
              </h2>
              <p className="text-xs text-slate-500">
                {unreadCount} unread
              </p>
            </div>

            <button
              type="button"
              className="text-sm text-brand-700 hover:underline"
              onClick={() => refetch()}
            >
              Refresh
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading && !data && (
              <p className="px-4 py-6 text-sm text-slate-500">
                Loading notifications...
              </p>
            )}

            {error && (
              <p className="px-4 py-4 text-sm text-red-600">
                Could not load notifications. Check that the backend is running.
              </p>
            )}

            {!loading && !error && notifications.length === 0 && (
              <p className="px-4 py-8 text-center text-sm text-slate-500">
                You’re all caught up. No notifications yet.
              </p>
            )}

            {notifications.map((notification) => {
              const isUnread = !notification.readAt;
              const isOverdue = notification.type === 'OVERDUE';

              return (
                <article
                  key={notification.id}
                  className={`border-b border-slate-100 px-4 py-4 last:border-b-0 ${
                    isUnread ? 'bg-brand-50/60' : 'bg-white'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${
                        isOverdue ? 'bg-red-500' : 'bg-amber-500'
                      }`}
                      aria-hidden="true"
                    />

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-semibold text-slate-900">
                          {notification.title}
                        </h3>

                        {isUnread && (
                          <span className="rounded bg-brand-100 px-1.5 py-0.5 text-xs text-brand-700">
                            New
                          </span>
                        )}
                      </div>

                      <p className="mt-1 break-words text-sm text-slate-600">
                        {notification.message}
                      </p>

                      <p className="mt-2 text-xs text-slate-400">
                        {formatDate(notification.createdAt)}
                      </p>

                      {isUnread && (
                        <button
                          type="button"
                          className="mt-2 text-sm font-medium text-brand-700 hover:underline disabled:opacity-50"
                          disabled={markingRead}
                          onClick={() => handleMarkRead(notification.id)}
                        >
                          Mark as read
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
