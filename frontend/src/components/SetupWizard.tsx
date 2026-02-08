import { useState } from 'react';
import { api } from '../lib/api.js';

interface Props {
    onComplete: () => void;
}

export const SetupWizard = ({ onComplete }: Props) => {
    const [step, setStep] = useState(1);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setBusy(true);
        setError(null);

        try {
            await api.post('/setup', {
                email,
                password,
                firstName,
                lastName,
                department: 'Administration'
            });
            onComplete();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Setup failed');
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-xl shadow-xl overflow-hidden">
                <div className="bg-blue-600 p-6 text-center">
                    <h1 className="text-2xl font-bold text-white">System Setup</h1>
                    <p className="text-blue-100 mt-2">Welcome to the Travel Application</p>
                </div>

                <div className="p-8">
                    <div className="mb-6">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-slate-500">Step {step} of 1</span>
                            <span className="text-sm font-medium text-blue-600">Administrator Account</span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-600 w-full transition-all duration-500"></div>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">First Name</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    value={firstName}
                                    onChange={(e) => setFirstName(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Last Name</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    value={lastName}
                                    onChange={(e) => setLastName(e.target.value)}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                            <input
                                type="email"
                                required
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                            <input
                                type="password"
                                required
                                minLength={8}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                            <p className="text-xs text-slate-500 mt-1">Must be at least 8 characters</p>
                        </div>

                        {error && (
                            <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={busy}
                            className="w-full py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                        >
                            {busy ? 'Setting up...' : 'Complete Setup'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};
