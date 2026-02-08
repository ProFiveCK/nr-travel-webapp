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
    <div className="fixed inset-0 z-50 bg-slate-50/90 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-2xl border border-slate-200">
        <div className="flex justify-center mb-6">
          <img src="/logo.png" alt="Logo" className="h-32 w-auto" />
        </div>
        <h1 className="text-3xl font-bold text-blue-700 text-center mb-6">Nauru Travel Application</h1>
        <p className="text-center text-sm text-slate-500 mb-6">
          {mode === 'login' ? 'Please log in to access the application.' : 'Create your account to submit travel requests.'}
        </p>

        {mode === 'login' ? (
          <form className="space-y-4" onSubmit={handleLogin}>
            <label className="block text-sm font-medium text-slate-700">
              Email
              <input
                type="email"
                className="form-input mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@example.nr"
              />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Password
              <input
                type="password"
                className="form-input mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
              />
            </label>
            <div className="flex justify-end">
              <button
                type="button"
                className="text-sm text-blue-600 hover:text-blue-800"
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
              className="w-full py-2.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition disabled:opacity-60"
            >
              {busy ? 'Signing in…' : 'Sign In'}
            </button>
            <p className="text-sm text-center text-slate-600">
              No account?{' '}
              <button type="button" className="text-blue-700 font-semibold" onClick={() => setMode('register')}>
                Create one
              </button>
            </p>
          </form>
        ) : (
          <form className="space-y-3" onSubmit={register}>
            <label className="block text-sm font-medium text-slate-700">
              Email
              <input
                type="email"
                className="form-input mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@example.nr"
                required
              />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Password
              <input
                type="password"
                className="form-input mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                required
              />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Full Name
              <input
                className="form-input mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                placeholder="Your name"
                required
              />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Department
              <select
                className="form-input mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
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
                className="flex-1 py-2.5 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700 transition disabled:opacity-60"
              >
                {busy ? 'Creating…' : 'Create Account'}
              </button>
              <button
                type="button"
                className="flex-1 py-2.5 border border-slate-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-50"
                onClick={() => setMode('login')}
                disabled={busy}
              >
                Back to Login
              </button>
            </div>
          </form>
        )}

        {status && <p className="mt-4 text-sm text-center text-rose-600">{status}</p>}
      </div>
    </div>
  );
};
