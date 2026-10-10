
import { useEffect, useState } from 'react';
import { useMutation } from '@apollo/client';
import Navbar from '../components/Navbar';
import Spinner from '../components/Spinner';
import { useAuth } from '../hooks/useAuth';
import {
  CHANGE_PASSWORD,
  UPDATE_PROFILE,
} from '../graphql/operations';
import { getErrorMessage } from '../utils/errors';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ProfilePage() {
  const { user, updateUser } = useAuth();

  const [profile, setProfile] = useState({
    name: user?.name || '',
    email: user?.email || '',
  });

  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [profileMessage, setProfileMessage] = useState(null);
  const [passwordMessage, setPasswordMessage] = useState(null);
  const [profileErrors, setProfileErrors] = useState({});

  const [updateProfile, profileMutation] = useMutation(UPDATE_PROFILE);
  const [changePassword, passwordMutation] = useMutation(CHANGE_PASSWORD);

  useEffect(() => {
    setProfile({
      name: user?.name || '',
      email: user?.email || '',
    });
  }, [user?.name, user?.email]);

  const handleProfileChange = (event) => {
    const { name, value } = event.target;

    setProfile((current) => ({ ...current, [name]: value }));
    setProfileErrors((current) => ({ ...current, [name]: '' }));
    setProfileMessage(null);
  };

  const handlePasswordChange = (event) => {
    const { name, value } = event.target;

    setPasswords((current) => ({ ...current, [name]: value }));
    setPasswordMessage(null);
  };

  const handleProfileSubmit = async (event) => {
    event.preventDefault();

    const errors = {};
    const name = profile.name.trim();
    const email = profile.email.trim().toLowerCase();

    if (!name) errors.name = 'Name is required.';
    else if (name.length > 80) {
      errors.name = 'Name must be 80 characters or fewer.';
    }

    if (!emailPattern.test(email)) {
      errors.email = 'Enter a valid email address.';
    }

    setProfileErrors(errors);
    setProfileMessage(null);

    if (Object.keys(errors).length > 0) return;

    const input = {};
    if (name !== user?.name) input.name = name;
    if (email !== user?.email) input.email = email;

    if (Object.keys(input).length === 0) {
      setProfileMessage({
        type: 'success',
        text: 'Your profile is already up to date.',
      });
      return;
    }

    try {
      const { data } = await updateProfile({ variables: { input } });
      updateUser(data.updateProfile);

      setProfileMessage({
        type: 'success',
        text: 'Your profile was updated successfully.',
      });
    } catch (error) {
      setProfileMessage({
        type: 'error',
        text: getErrorMessage(error),
      });
    }
  };

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();
    setPasswordMessage(null);

    if (!passwords.currentPassword) {
      setPasswordMessage({
        type: 'error',
        text: 'Enter your current password.',
      });
      return;
    }

    if (passwords.newPassword.length < 8) {
      setPasswordMessage({
        type: 'error',
        text: 'Your new password must be at least 8 characters.',
      });
      return;
    }

    if (passwords.newPassword.length > 72) {
      setPasswordMessage({
        type: 'error',
        text: 'Your new password must be 72 characters or fewer.',
      });
      return;
    }

    if (passwords.newPassword !== passwords.confirmPassword) {
      setPasswordMessage({
        type: 'error',
        text: 'The new passwords do not match.',
      });
      return;
    }

    try {
      await changePassword({
        variables: {
          currentPassword: passwords.currentPassword,
          newPassword: passwords.newPassword,
        },
      });

      setPasswords({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });

      setPasswordMessage({
        type: 'success',
        text: 'Your password was changed successfully.',
      });
    } catch (error) {
      setPasswordMessage({
        type: 'error',
        text: getErrorMessage(error),
      });
    }
  };

  const messageClass = (message) =>
    message?.type === 'success'
      ? 'border-green-200 bg-green-50 text-green-800'
      : 'border-red-200 bg-red-50 text-red-700';

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <main className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:py-10">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-700">
            Account
          </p>
          <h1 className="mt-1 text-3xl font-bold text-slate-900">
            Profile settings
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Manage your personal information and keep your account secure.
          </p>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-slate-900">
              Personal information
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Update the name and email associated with your account.
            </p>
          </div>

          <form onSubmit={handleProfileSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="profile-name"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                Full name
              </label>
              <input
                id="profile-name"
                name="name"
                value={profile.name}
                onChange={handleProfileChange}
                autoComplete="name"
                maxLength={80}
                className={`field w-full ${profileErrors.name ? 'field-error' : ''}`}
                required
              />
              {profileErrors.name && (
                <p className="mt-1 text-sm text-red-600">
                  {profileErrors.name}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="profile-email"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                Email address
              </label>
              <input
                id="profile-email"
                name="email"
                type="email"
                value={profile.email}
                onChange={handleProfileChange}
                autoComplete="email"
                className={`field w-full ${profileErrors.email ? 'field-error' : ''}`}
                required
              />
              {profileErrors.email && (
                <p className="mt-1 text-sm text-red-600">
                  {profileErrors.email}
                </p>
              )}
            </div>

            {profileMessage && (
              <p
                role="status"
                className={`rounded-lg border p-3 text-sm ${messageClass(profileMessage)}`}
              >
                {profileMessage.text}
              </p>
            )}

            <button
              type="submit"
              className="btn-primary"
              disabled={profileMutation.loading}
            >
              {profileMutation.loading && (
                <Spinner className="mr-2 inline-block h-4 w-4" />
              )}
              Save profile
            </button>
          </form>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-slate-900">
              Change password
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Enter your current password before choosing a new one.
            </p>
          </div>

          <form onSubmit={handlePasswordSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="current-password"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                Current password
              </label>
              <input
                id="current-password"
                name="currentPassword"
                type="password"
                value={passwords.currentPassword}
                onChange={handlePasswordChange}
                autoComplete="current-password"
                className="field w-full"
                required
              />
            </div>

            <div>
              <label
                htmlFor="new-password"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                New password
              </label>
              <input
                id="new-password"
                name="newPassword"
                type="password"
                value={passwords.newPassword}
                onChange={handlePasswordChange}
                autoComplete="new-password"
                minLength={8}
                maxLength={72}
                className="field w-full"
                required
              />
              <p className="mt-1 text-xs text-slate-500">
                Use at least 8 characters.
              </p>
            </div>

            <div>
              <label
                htmlFor="confirm-password"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                Confirm new password
              </label>
              <input
                id="confirm-password"
                name="confirmPassword"
                type="password"
                value={passwords.confirmPassword}
                onChange={handlePasswordChange}
                autoComplete="new-password"
                minLength={8}
                maxLength={72}
                className="field w-full"
                required
              />
            </div>

            {passwordMessage && (
              <p
                role="status"
                className={`rounded-lg border p-3 text-sm ${messageClass(passwordMessage)}`}
              >
                {passwordMessage.text}
              </p>
            )}

            <button
              type="submit"
              className="btn-primary"
              disabled={passwordMutation.loading}
            >
              {passwordMutation.loading && (
                <Spinner className="mr-2 inline-block h-4 w-4" />
              )}
              Change password
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}
