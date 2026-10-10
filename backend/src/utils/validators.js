
import mongoose from 'mongoose';
import { badUserInput } from './errors.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TASK_PRIORITIES = ['HIGH', 'MEDIUM', 'LOW'];

const throwIfErrors = (errors) => {
  const messages = Object.values(errors);

  if (messages.length > 0) {
    throw badUserInput(messages.join(' '), errors);
  }
};

export const validateRegisterInput = ({ name, email, password }) => {
  const errors = {};

  if (!name || !name.trim()) {
    errors.name = 'Name is required.';
  } else if (name.trim().length > 80) {
    errors.name = 'Name must be 80 characters or fewer.';
  }

  if (!email || !EMAIL_PATTERN.test(email.trim())) {
    errors.email = 'A valid email is required.';
  }

  if (!password || password.length < 8) {
    errors.password = 'Password must be at least 8 characters.';
  } else if (password.length > 72) {
    errors.password = 'Password must be 72 characters or fewer.';
  }

  throwIfErrors(errors);

  return {
    name: name.trim(),
    email: email.trim().toLowerCase(),
    password,
  };
};

export const validateLoginInput = ({ email, password }) => {
  const errors = {};

  if (!email || !EMAIL_PATTERN.test(email.trim())) {
    errors.email = 'A valid email is required.';
  }

  if (!password) {
    errors.password = 'Password is required.';
  }

  throwIfErrors(errors);

  return { email: email.trim().toLowerCase(), password };
};

export const validateProfileInput = (input = {}) => {
  const errors = {};
  const clean = {};

  if (input.name !== undefined && input.name !== null) {
    if (typeof input.name !== 'string' || !input.name.trim()) {
      errors.name = 'Name cannot be empty.';
    } else if (input.name.trim().length > 80) {
      errors.name = 'Name must be 80 characters or fewer.';
    } else {
      clean.name = input.name.trim();
    }
  }

  if (input.email !== undefined && input.email !== null) {
    if (
      typeof input.email !== 'string' ||
      !EMAIL_PATTERN.test(input.email.trim())
    ) {
      errors.email = 'A valid email is required.';
    } else {
      clean.email = input.email.trim().toLowerCase();
    }
  }

  throwIfErrors(errors);

  if (Object.keys(clean).length === 0) {
    throw badUserInput('Provide a name or email to update.');
  }

  return clean;
};

export const validateChangePasswordInput = ({
  currentPassword,
  newPassword,
} = {}) => {
  const errors = {};

  if (!currentPassword) {
    errors.currentPassword = 'Current password is required.';
  }

  if (!newPassword || newPassword.length < 8) {
    errors.newPassword = 'New password must be at least 8 characters.';
  } else if (newPassword.length > 72) {
    errors.newPassword = 'New password must be 72 characters or fewer.';
  }

  if (currentPassword && newPassword && currentPassword === newPassword) {
    errors.newPassword =
      'New password must be different from your current password.';
  }

  throwIfErrors(errors);

  return { currentPassword, newPassword };
};

const isValidDateOnly = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
};

const isValidIsoDateTime = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}T/.test(value)) {
    return false;
  }

  return !Number.isNaN(Date.parse(value));
};

export const validateTaskInput = (input = {}, { partial = false } = {}) => {
  const errors = {};
  const clean = {};

  if (input.title !== undefined && input.title !== null) {
    if (typeof input.title !== 'string') {
      errors.title = 'Title must be text.';
    } else {
      const title = input.title.trim();

      if (!title) {
        errors.title = 'Title cannot be empty.';
      } else if (title.length > 120) {
        errors.title = 'Title must be 120 characters or fewer.';
      } else {
        clean.title = title;
      }
    }
  } else if (!partial) {
    errors.title = 'Title is required.';
  }

  if (input.description !== undefined && input.description !== null) {
    if (typeof input.description !== 'string') {
      errors.description = 'Description must be text.';
    } else {
      const description = input.description.trim();

      if (description.length > 1000) {
        errors.description =
          'Description must be 1000 characters or fewer.';
      } else {
        clean.description = description;
      }
    }
  }

  if (input.completed !== undefined && input.completed !== null) {
    if (typeof input.completed !== 'boolean') {
      errors.completed = 'Completed must be true or false.';
    } else {
      clean.completed = input.completed;
    }
  }

  if (input.priority !== undefined && input.priority !== null) {
    if (!TASK_PRIORITIES.includes(input.priority)) {
      errors.priority = 'Priority must be HIGH, MEDIUM, or LOW.';
    } else {
      clean.priority = input.priority;
    }
  }

  if (input.dueDate !== undefined) {
    if (input.dueDate === null || input.dueDate === '') {
      clean.dueDate = null;
    } else if (
      typeof input.dueDate !== 'string' ||
      (!isValidDateOnly(input.dueDate) &&
        !isValidIsoDateTime(input.dueDate))
    ) {
      errors.dueDate = 'Due date must be a valid date.';
    } else if (isValidDateOnly(input.dueDate)) {
      // Keep date-only values consistent across time zones.
      clean.dueDate = new Date(`${input.dueDate}T00:00:00.000Z`);
    } else {
      clean.dueDate = new Date(input.dueDate);
    }
  }

  throwIfErrors(errors);

  if (partial && Object.keys(clean).length === 0) {
    throw badUserInput('Provide at least one field to update.');
  }

  return clean;
};

export const assertValidObjectId = (id) => {
  if (!mongoose.isValidObjectId(id)) {
    throw badUserInput('Invalid task id.', {
      id: 'Invalid task id.',
    });
  }
};
