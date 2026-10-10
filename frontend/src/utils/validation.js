const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const validateTask = ({ title, description }) => {
  const errors = {};
  if (!title.trim()) errors.title = 'Enter a title.';
  else if (title.trim().length > 120) errors.title = 'Title must be 120 characters or fewer.';
  if (description.trim().length > 1000) errors.description = 'Description must be 1000 characters or fewer.';
  return errors;
};

export const validateLogin = ({ email, password }) => {
  const errors = {};
  if (!EMAIL_PATTERN.test(email.trim())) errors.email = 'Enter a valid email address.';
  if (!password) errors.password = 'Enter your password.';
  return errors;
};

export const validateRegister = ({ name, email, password }) => {
  const errors = {};
  if (!name.trim()) errors.name = 'Enter your name.';
  if (!EMAIL_PATTERN.test(email.trim())) errors.email = 'Enter a valid email address.';
  if (password.length < 8) errors.password = 'Password must be at least 8 characters.';
  return errors;
};
