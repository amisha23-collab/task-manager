import { useState } from 'react';
import ConfirmDialog from './ConfirmDialog';
import TaskForm from './TaskForm';

const formatDate = (iso) =>
  new Date(iso).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

const PRIORITY_STYLES = {
  HIGH: 'bg-red-100 text-red-700',
  MEDIUM: 'bg-amber-100 text-amber-700',
  LOW: 'bg-emerald-100 text-emerald-700',
};

const PRIORITY_LABELS = {
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low',
};

const isOverdue = (dueDate, completed) => {
  if (!dueDate || completed) return false;

  const deadline = new Date(dueDate);
  if (Number.isNaN(deadline.getTime())) return false;

  // Compare calendar dates, not the current time of day.
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  deadline.setHours(0, 0, 0, 0);

  return deadline < today;
};

export default function TaskItem({ task, actions, onNotify }) {
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const priority = task.priority || 'MEDIUM';
  const overdue = isOverdue(task.dueDate, task.completed);

  const toggleCompleted = async () => {
    try {
      await actions.updateTask(task.id, {
        completed: !task.completed,
      });
    } catch (error) {
      onNotify('error', error);
    }
  };

  const saveEdits = async (values) => {
    await actions.updateTask(task.id, values);
    setEditing(false);
    onNotify('success', 'Task updated.');
  };

  const confirmDelete = async () => {
    try {
      await actions.deleteTask(task.id);
      onNotify('success', 'Task deleted.');
    } catch (error) {
      setConfirmingDelete(false);
      onNotify('error', error);
    }
  };

  if (editing) {
    return (
      <li className="rounded-lg border border-brand-600 bg-white p-4">
        <TaskForm
          initialValues={{
            title: task.title,
            description: task.description,
            priority,
            dueDate: task.dueDate,
          }}
          submitLabel="Save changes"
          onSubmit={saveEdits}
          onCancel={() => setEditing(false)}
        />
      </li>
    );
  }

  return (
    <li className="flex gap-3 rounded-lg border border-slate-200 bg-white p-4">
      <input
        type="checkbox"
        checked={task.completed}
        onChange={toggleCompleted}
        disabled={actions.busy}
        aria-label={
          task.completed
            ? `Mark "${task.title}" as not done`
            : `Mark "${task.title}" as done`
        }
        className="mt-1 h-5 w-5 shrink-0 cursor-pointer rounded border-slate-300 accent-brand-600"
      />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3
            className={`break-words font-semibold ${
              task.completed
                ? 'text-slate-400 line-through'
                : 'text-slate-900'
            }`}
          >
            {task.title}
          </h3>

          <span
            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
              PRIORITY_STYLES[priority] || PRIORITY_STYLES.MEDIUM
            }`}
          >
            {PRIORITY_LABELS[priority] || 'Medium'} Priority
          </span>
        </div>

        {task.description && (
          <p className="mt-1 whitespace-pre-line break-words text-sm text-slate-600">
            {task.description}
          </p>
        )}

        {task.dueDate && (
          <p
            className={`mt-2 text-sm ${
              overdue
                ? 'font-semibold text-red-600'
                : 'text-slate-600'
            }`}
          >
            <span>{overdue ? 'Overdue · ' : 'Due · '}</span>
            {formatDate(task.dueDate)}
          </p>
        )}

        <p className="mt-2 text-xs text-slate-500">
          Created {formatDate(task.createdAt)}
        </p>

        <div className="mt-3 flex gap-3 text-sm font-semibold">
          <button
            type="button"
            className="text-brand-700 hover:underline"
            onClick={() => setEditing(true)}
          >
            Edit
          </button>

          <button
            type="button"
            className="text-red-600 hover:underline"
            onClick={() => setConfirmingDelete(true)}
          >
            Delete
          </button>
        </div>
      </div>

      {confirmingDelete && (
        <ConfirmDialog
          title="Delete this task?"
          message={`"${task.title}" will be permanently deleted.`}
          confirmLabel="Delete task"
          loading={actions.busy}
          onConfirm={confirmDelete}
          onCancel={() => setConfirmingDelete(false)}
        />
      )}
    </li>
  );
}
