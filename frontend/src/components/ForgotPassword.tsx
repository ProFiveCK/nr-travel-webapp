import { useState } from 'react';
import { api } from '../lib/api.js';

interface Props {
    onBack: () => void;
}

export const ForgotPassword = ({ onBack }: Props) => {
    const [email, setEmail] = useState('');
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setBusy(true);
        setMessage(null);

        try {
            const { data } = await api.post('/auth/forgot-password', { email });
            setMessage(data.message);
        } catch (error) {
            setMessage('If an account exists, a reset link has been sent.');
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-slate-50/90 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-2xl border border-slate-200">
                <h2 className="text-2xl font-bold text-slate-800 mb-2">Reset Password</h2>
                <p className="text-slate-600 mb-6">Enter your email address and we'll send you a link to reset your password.</p>

                {!message ? (
                    <form onSubmit={handleSubmit} className="space-y-4">
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

                        <div className="flex gap-3 pt-2">
                            <button
                                type="button"
                                onClick={onBack}
                                className="flex-1 py-2.5 border border-slate-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 transition"
                            >
                                Back
                            </button>
                            <button
                                type="submit"
                                disabled={busy}
                                className="flex-1 py-2.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                            >
                                {busy ? 'Sending...' : 'Send Link'}
                            </button>
                        </div>
                    </form>
                ) : (
                    <div className="text-center">
                        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <p className="text-slate-800 font-medium mb-6">{message}</p>
                        <button
                            onClick={onBack}
                            className="w-full py-2.5 bg-slate-100 text-slate-700 font-semibold rounded-lg hover:bg-slate-200 transition"
                        >
                            Back to Login
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
