import { useQuery } from '@apollo/client';
import { useEffect, useState } from 'react';
import Alert from '../components/Alert';
import Navbar from '../components/Navbar';
import Spinner from '../components/Spinner';
import TaskForm from '../components/TaskForm';
import TaskItem from '../components/TaskItem';
import TaskToolbar from '../components/TaskToolbar';
import { GET_TASKS, SEARCH_TASKS } from '../graphql/operations';
import { useDebounce } from '../hooks/useDebounce';
import { useTaskActions } from '../hooks/useTaskActions';
import { getErrorMessage } from '../utils/errors';

const PAGE_SIZE_OPTIONS = [5, 10, 15, 20];

export default function DashboardPage() {
  const [searchInput, setSearchInput] = useState('');
  const [status, setStatus] = useState('all');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [feedback, setFeedback] = useState(null);

  const searchTerm = useDebounce(searchInput, 400).trim();
  const isSearching = searchTerm.length > 0;

  const tasksQuery = useQuery(GET_TASKS, {
    variables: {
      page,
      limit: pageSize,
      status,
      sort,
    },
    fetchPolicy: 'cache-and-network',
    notifyOnNetworkStatusChange: true,
  });

  const searchQuery = useQuery(SEARCH_TASKS, {
    variables: { query: searchTerm },
    skip: !isSearching,
    fetchPolicy: 'cache-and-network',
  });

  const activeQuery = isSearching ? searchQuery : tasksQuery;

  const tasks = isSearching
    ? searchQuery.data?.searchTasks
    : tasksQuery.data?.getTasks?.tasks;

  const pagination = isSearching
    ? null
    : tasksQuery.data?.getTasks?.pagination;

  const globalCounts = tasksQuery.data?.getTasks?.counts;

  const counts = isSearching
    ? {
        all: (tasks ?? []).length,
        active: (tasks ?? []).filter((task) => !task.completed).length,
        completed: (tasks ?? []).filter((task) => task.completed).length,
      }
    : {
        all: globalCounts?.all ?? 0,
        active: globalCounts?.active ?? 0,
        completed: globalCounts?.completed ?? 0,
      };

  const actions = useTaskActions({ isSearching });

  useEffect(() => {
    setPage(1);
  }, [searchTerm, status, sort, pageSize]);

  useEffect(() => {
    if (!feedback) return undefined;

    const timer = setTimeout(() => setFeedback(null), 4000);
    return () => clearTimeout(timer);
  }, [feedback]);

  const notify = (type, messageOrError) => {
    setFeedback({
      type,
      message:
        type === 'error'
          ? getErrorMessage(messageOrError)
          : messageOrError,
    });
  };

  const handleCreate = async (values) => {
    try {
      await actions.createTask(values);

      setPage(1);

      await tasksQuery.refetch({
        page: 1,
        limit: pageSize,
        status,
        sort,
      });

      notify('success', 'Task added.');
    } catch (error) {
      notify('error', error);
    }
  };

  const changePage = (nextPage) => {
    if (nextPage < 1) return;
    if (pagination && nextPage > pagination.totalPages) return;

    setPage(nextPage);
  };

  const handlePageSizeChange = (event) => {
    setPageSize(Number(event.target.value));
    setPage(1);
  };

  const renderList = () => {
    if (activeQuery.loading && !tasks) {
      return (
        <div className="flex justify-center py-12 text-brand-600">
          <Spinner className="h-8 w-8" label="Loading tasks" />
        </div>
      );
    }

    if (activeQuery.error && !tasks) {
      return (
        <div className="space-y-3">
          <Alert type="error">
            {getErrorMessage(activeQuery.error)}
          </Alert>

          <button
            type="button"
            className="btn-secondary"
            onClick={() => activeQuery.refetch()}
          >
            Try again
          </button>
        </div>
      );
    }

    if ((tasks ?? []).length === 0) {
      let message = 'No tasks yet. Add your first task above.';

      if (isSearching) {
        message = `No tasks match "${searchTerm}".`;
      } else if (status === 'active') {
        message = 'No tasks to do.';
      } else if (status === 'completed') {
        message = 'No completed tasks yet.';
      }

      return (
        <p className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-10 text-center text-sm text-slate-600">
          {message}
        </p>
      );
    }

    return (
      <ul className="space-y-3">
        {tasks.map((task) => (
          <TaskItem
            key={task.id}
            task={task}
            actions={actions}
            onNotify={notify}
          />
        ))}
      </ul>
    );
  };

  return (
    <>
      <Navbar />

      <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        <section
          aria-labelledby="add-task-heading"
          className="rounded-lg border border-slate-200 bg-white p-4 sm:p-6"
        >
          <h2
            id="add-task-heading"
            className="mb-4 text-lg font-semibold"
          >
            Add a task
          </h2>

          <TaskForm
            submitLabel="Add task"
            onSubmit={handleCreate}
          />
        </section>

        <section
          aria-labelledby="tasks-heading"
          className="space-y-4"
        >
          <h2 id="tasks-heading" className="text-lg font-semibold">
            Your tasks
          </h2>

          <TaskToolbar
            search={searchInput}
            onSearch={setSearchInput}
            status={status}
            onStatus={setStatus}
            sort={sort}
            onSort={setSort}
            counts={counts}
          />

          {feedback && (
            <Alert
              type={feedback.type}
              onDismiss={() => setFeedback(null)}
            >
              {feedback.message}
            </Alert>
          )}

          {activeQuery.error && tasks && (
            <Alert type="error">
              {getErrorMessage(activeQuery.error)}
            </Alert>
          )}

          {renderList()}

          {!isSearching && pagination && pagination.total > 0 && (
            <nav
              aria-label="Task pagination"
              className="flex flex-col items-center justify-between gap-3 border-t border-slate-200 pt-4 sm:flex-row"
            >
              <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
                <label htmlFor="page-size">Tasks per page</label>

                <select
                  id="page-size"
                  className="field w-auto"
                  value={pageSize}
                  onChange={handlePageSizeChange}
                >
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>

                <span>
                  Page {pagination.page} of {pagination.totalPages}
                  {' · '}
                  {pagination.total} matching tasks
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={
                    !pagination.hasPreviousPage ||
                    tasksQuery.loading
                  }
                  onClick={() => changePage(pagination.page - 1)}
                >
                  Previous
                </button>

                <button
                  type="button"
                  className="btn-secondary"
                  disabled={
                    !pagination.hasNextPage ||
                    tasksQuery.loading
                  }
                  onClick={() => changePage(pagination.page + 1)}
                >
                  Next
                </button>
              </div>
            </nav>
          )}
        </section>
      </main>
    </>
  );
}
