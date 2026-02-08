import { FormEvent, useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import type { AppUser } from '../types.js';

interface Department {
  depHead: string;
  deptName: string;
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

interface Props {
  onAuthenticated: (user: AppUser, tokens: AuthTokens) => void;
  onForgotPassword: () => void;
}

type Mode = 'login' | 'register';

export const AuthModal = ({ onAuthenticated, onForgotPassword }: Props) => {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [selectedDepHead, setSelectedDepHead] = useState('');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    const loadDepartments = async () => {
      try {
        const { data } = await api.get('/auth/departments');
        setDepartments(data.departments || []);
      } catch (error) {
        console.error('Failed to load departments:', error);
      }
    };
    loadDepartments();
  }, []);

  const handleLogin = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setStatus(null);
    try {
      const { data } = await api.post('/auth/login', { email, password });
      // Store tokens in localStorage for persistence
      localStorage.setItem('authTokens', JSON.stringify(data.tokens));
      onAuthenticated(data.user, data.tokens);
    } catch (error) {
      setStatus('Unable to sign in. Check credentials.');
    } finally {
      setBusy(false);
    }
  };

  const register = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedDepHead) {
      setStatus('Please select a department.');
      return;
    }
    setBusy(true);
    setStatus(null);
    try {
      const selectedDept = departments.find((d) => d.depHead === selectedDepHead);
      const { data } = await api.post('/auth/register', {
        email,
        password,
        fullName,
        departmentHead: selectedDepHead,
        department: selectedDept?.deptName || '',
      });
      setStatus(data.message ?? 'Registration submitted for approval.');
      setMode('login');
      // Reset form
      setEmail('');
      setPassword('');
      setFullName('');
      setSelectedDepHead('');
    } catch (error) {
      setStatus('Registration failed (user may already exist).');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8">
      <div className="absolute inset-0 bg-slate-900/20" />
      <div className="absolute -top-10 left-6 auth-orb teal" />
      <div className="absolute -bottom-12 right-8 auth-orb gold" />
      <div className="relative w-full max-w-4xl auth-shell rounded-3xl overflow-hidden">
        <div className="grid gap-0 lg:grid-cols-[1.05fr_1fr]">
          <section className="px-8 py-10 sm:px-12 sm:py-12 bg-white/80">
            <div className="flex items-center gap-4 mb-6">
              <div className="h-14 w-14 rounded-2xl bg-white shadow-md border border-slate-200 flex items-center justify-center">
                <img src="/logo.png" alt="Logo" className="h-10 w-auto" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-emerald-700 font-semibold">Nauru Government</p>
                <h1 className="font-display text-3xl sm:text-4xl text-slate-900">
                  Travel Application Desk
                </h1>
              </div>
            </div>
            <p className="text-sm sm:text-base text-slate-600 mb-8">
              {mode === 'login'
                ? 'Secure access for staff and reviewers. Sign in to continue your workflow.'
                : 'Request access for your department and submit travel applications for review.'}
            </p>

            <div className="rounded-2xl bg-slate-900 text-white p-6 shadow-lg">
              <p className="text-xs uppercase tracking-[0.3em] text-emerald-200 font-semibold mb-3">Today</p>
              <p className="text-2xl font-display">Faster approvals, clearer oversight.</p>
              <p className="text-sm text-slate-300 mt-3">
                Centralize applications, track reviews, and keep travel compliant with policy.
              </p>
            </div>
          </section>

          <section className="px-8 py-10 sm:px-12 sm:py-12 bg-white">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-semibold text-slate-900">
                  {mode === 'login' ? 'Sign in' : 'Create account'}
                </h2>
                <p className="text-sm text-slate-500">
                  {mode === 'login' ? 'Use your staff credentials.' : 'Submit a request for access.'}
                </p>
              </div>
              <span className="text-xs uppercase tracking-[0.3em] text-slate-400">
                {mode === 'login' ? 'Access' : 'Register'}
              </span>
            </div>

        {mode === 'login' ? (
          <form className="space-y-4" onSubmit={handleLogin}>
            <label className="block text-sm font-medium text-slate-700">
              Email address
              <input
                type="email"
                className="form-input mt-2"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@naurugov.nr"
              />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Password
              <input
                type="password"
                className="form-input mt-2"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
              />
            </label>
            <div className="flex justify-end">
              <button
                type="button"
                className="text-sm text-emerald-700 hover:text-emerald-900"
                onClick={(e) => {
                  e.preventDefault();
                  onForgotPassword();
                }}
              >
                Forgot Password?
              </button>
            </div>
            <button
              type="submit"
              disabled={busy}
              className="w-full py-3 bg-emerald-600 text-white font-semibold rounded-2xl hover:bg-emerald-700 transition disabled:opacity-60"
            >
              {busy ? 'Signing in…' : 'Sign In'}
            </button>
            <p className="text-sm text-center text-slate-600">
              No account?{' '}
              <button type="button" className="text-emerald-700 font-semibold" onClick={() => setMode('register')}>
                Create one
              </button>
            </p>
          </form>
        ) : (
          <form className="space-y-3" onSubmit={register}>
            <label className="block text-sm font-medium text-slate-700">
              Email address
              <input
                type="email"
                className="form-input mt-2"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@naurugov.nr"
                required
              />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Password
              <input
                type="password"
                className="form-input mt-2"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                required
              />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Full Name
              <input
                className="form-input mt-2"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                placeholder="Your name"
                required
              />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Department
              <select
                className="form-input mt-2"
                value={selectedDepHead}
                onChange={(event) => setSelectedDepHead(event.target.value)}
                required
              >
                <option value="">Select Department</option>
                {departments.map((dept) => (
                  <option key={dept.depHead} value={dept.depHead}>
                    {dept.depHead ? `[${dept.depHead}] ${dept.deptName}` : dept.deptName}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-500 mt-1">Select your department from the list.</p>
            </label>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={busy}
                className="flex-1 py-3 bg-slate-900 text-white font-semibold rounded-2xl hover:bg-slate-800 transition disabled:opacity-60"
              >
                {busy ? 'Creating…' : 'Create Account'}
              </button>
              <button
                type="button"
                className="flex-1 py-3 border border-slate-200 text-slate-700 font-semibold rounded-2xl hover:bg-slate-50"
                onClick={() => setMode('login')}
                disabled={busy}
              >
                Back to Login
              </button>
            </div>
          </form>
        )}

        {status && <p className="mt-5 text-sm text-center text-rose-600">{status}</p>}
          </section>
        </div>
      </div>
    </div>
  );
};
