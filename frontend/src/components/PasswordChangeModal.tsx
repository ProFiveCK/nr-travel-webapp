import { FormEvent, useState } from 'react';
import { api } from '../lib/api.js';

interface Props {
  onPasswordChanged: () => void;
  onCancel?: () => void;
}

export const PasswordChangeModal = ({ onPasswordChanged, onCancel }: Props) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    setBusy(true);
    try {
      await api.post('/auth/change-password', {
        currentPassword: currentPassword || undefined, // Can be empty if forced change
        newPassword,
      });
      onPasswordChanged();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to change password');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="rounded-2xl p-6 app-panel max-w-md w-full reveal">
        <h3 className="text-lg font-bold mb-2 text-gray-800">Change Password Required</h3>
        <p className="text-sm text-gray-600 mb-4">
          You must change your password before continuing.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block text-sm font-medium text-slate-700">
            New Password
            <input
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter new password (min 8 characters)"
              minLength={8}
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Confirm New Password
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Confirm new password"
              minLength={8}
            />
          </label>
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <div className="flex justify-end gap-2">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="btn btn-outline btn-sm"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={busy}
              className="btn btn-primary btn-sm disabled:opacity-50"
            >
              {busy ? 'Changing...' : 'Change Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
