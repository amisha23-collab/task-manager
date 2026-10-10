
import { useState } from 'react';
import { getErrorMessage } from '../utils/errors';
import { validateTask } from '../utils/validation';
import Alert from './Alert';
import Spinner from './Spinner';

const DEFAULT_VALUES = {
  title: '',
  description: '',
  priority: 'MEDIUM',
  dueDate: '',
};

/**
 * Format a date for an HTML date input (YYYY-MM-DD).
 * Date-only strings stay unchanged so they aren't shifted by UTC conversion.
 */
const toDateInputValue = (value) => {
  if (!value) return '';

  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
};

/** One form for both adding and editing tasks. */
export default function TaskForm({
  initialValues = DEFAULT_VALUES,
  submitLabel,
  onSubmit,
  onCancel,
  disabled,
}) {
  const [values, setValues] = useState(() => ({
    ...DEFAULT_VALUES,
    ...initialValues,
    priority: initialValues.priority || 'MEDIUM',
    dueDate: toDateInputValue(initialValues.dueDate),
  }));

  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setValues((current) => ({
      ...current,
      [name]: value,
    }));

    setErrors((current) => ({
      ...current,
      [name]: undefined,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const found = validateTask(values);
    setErrors(found);

    if (Object.keys(found).length > 0) return;

    setSubmitting(true);
    setSubmitError('');

    try {
      await onSubmit({
        title: values.title.trim(),
        description: values.description.trim(),
        priority: values.priority,
        // Preserve the date-only value. The backend must interpret it consistently.
        dueDate: values.dueDate || null,
      });

      if (!onCancel) {
        setValues({ ...DEFAULT_VALUES });
        setErrors({});
      }
    } catch (error) {
      setSubmitError(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-3">
      <div>
        <label
          htmlFor="title"
          className="mb-1 block text-sm font-medium"
        >
          Title
        </label>

        <input
          id="title"
          name="title"
          value={values.title}
          onChange={handleChange}
          placeholder="What needs to be done?"
          className={`field ${errors.title ? 'field-error' : ''}`}
          aria-invalid={Boolean(errors.title)}
          aria-describedby={errors.title ? 'title-error' : undefined}
        />

        {errors.title && (
          <p id="title-error" className="mt-1 text-sm text-red-600">
            {errors.title}
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="description"
          className="mb-1 block text-sm font-medium"
        >
          Description{' '}
          <span className="font-normal text-slate-500">(optional)</span>
        </label>

        <textarea
          id="description"
          name="description"
          rows={3}
          value={values.description}
          onChange={handleChange}
          placeholder="Add any details"
          className={`field ${errors.description ? 'field-error' : ''}`}
          aria-invalid={Boolean(errors.description)}
        />

        {errors.description && (
          <p className="mt-1 text-sm text-red-600">
            {errors.description}
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="priority"
          className="mb-1 block text-sm font-medium"
        >
          Priority
        </label>

        <select
          id="priority"
          name="priority"
          value={values.priority}
          onChange={handleChange}
          className="field"
        >
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </select>

        <p className="mt-1 text-xs text-slate-500">
          Choose how important this task is.
        </p>
      </div>

      <div>
        <label
          htmlFor="dueDate"
          className="mb-1 block text-sm font-medium"
        >
          Due date{' '}
          <span className="font-normal text-slate-500">(optional)</span>
        </label>

        <input
          id="dueDate"
          name="dueDate"
          type="date"
          value={values.dueDate}
          onChange={handleChange}
          className={`field ${errors.dueDate ? 'field-error' : ''}`}
          aria-invalid={Boolean(errors.dueDate)}
          aria-describedby={errors.dueDate ? 'dueDate-error' : undefined}
        />

        {errors.dueDate && (
          <p id="dueDate-error" className="mt-1 text-sm text-red-600">
            {errors.dueDate}
          </p>
        )}
      </div>

      <Alert type="error">{submitError}</Alert>

      <div className="flex justify-end gap-3">
        {onCancel && (
          <button
            type="button"
            className="btn-secondary"
            onClick={onCancel}
            disabled={submitting}
          >
            Cancel
          </button>
        )}

        <button
          type="submit"
          className="btn-primary"
          disabled={submitting || disabled}
        >
          {submitting && <Spinner className="h-4 w-4" />}
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
