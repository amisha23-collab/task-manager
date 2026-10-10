import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import Alert from '../components/Alert';
import Spinner from '../components/Spinner';
import { useAuth } from '../hooks/useAuth';
import { getErrorMessage } from '../utils/errors';
import { validateRegister } from '../utils/validation';
import AuthLayout from './AuthLayout';

export default function RegisterPage() {
  const { isAuthenticated, register } = useAuth();
  const [values, setValues] = useState({ name: '', email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (isAuthenticated) return <Navigate to="/" replace />;

  const handleChange = (event) => {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const found = validateRegister(values);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSubmitting(true);
    setSubmitError('');
    try {
      await register({ name: values.name.trim(), email: values.email.trim(), password: values.password });
    } catch (error) {
      setSubmitError(getErrorMessage(error));
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle="It takes a minute. Then you can start adding tasks."
      footer={<>Already have an account? <Link to="/login" className="font-semibold text-brand-700 hover:underline">Log in</Link></>}
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <div>
          <label htmlFor="name" className="mb-1 block text-sm font-medium">Name</label>
          <input id="name" name="name" autoComplete="name" value={values.name} onChange={handleChange} className={`field ${errors.name ? 'field-error' : ''}`} />
          {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
        </div>
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium">Email</label>
          <input id="email" name="email" type="email" autoComplete="email" value={values.email} onChange={handleChange} className={`field ${errors.email ? 'field-error' : ''}`} />
          {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
        </div>
        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium">Password</label>
          <input id="password" name="password" type="password" autoComplete="new-password" value={values.password} onChange={handleChange} className={`field ${errors.password ? 'field-error' : ''}`} />
          {errors.password ? <p className="mt-1 text-sm text-red-600">{errors.password}</p> : <p className="mt-1 text-xs text-slate-500">At least 8 characters.</p>}
        </div>
        <Alert type="error">{submitError}</Alert>
        <button type="submit" className="btn-primary w-full" disabled={submitting}>
          {submitting && <Spinner className="h-4 w-4" />}
          Create account
        </button>
      </form>
    </AuthLayout>
  );
}
