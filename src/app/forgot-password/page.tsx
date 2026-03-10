/**
 * Forgot Password Page — Split layout with carousel.
 */

'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { useAuth } from '../../lib/auth';
import AuthLayout from '../../components/AuthLayout';

export default function ForgotPasswordPage() {
    const { resetPassword } = useAuth();
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);

        const result = await resetPassword(email);
        if (result.error) {
            setError(result.error);
        } else if (result.message) {
            setSuccess(result.message);
        }
        setLoading(false);
    };

    return (
        <AuthLayout>
            <h2 className="text-2xl font-bold text-white mb-1">Reset Password</h2>
            <p className="text-white/30 text-sm mb-8">
                Enter your email and we&apos;ll reset your password.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="text-xs text-white/40 tracking-wider uppercase mb-1.5 block">Email</label>
                    <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
                        </span>
                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                            className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/20 focus:outline-none focus:border-[#22c55e]/40 transition-all"
                            placeholder="you@example.com" />
                    </div>
                </div>

                {error && (
                    <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2">{error}</div>
                )}
                {success && (
                    <div className="text-[#22c55e] text-sm bg-[#22c55e]/10 border border-[#22c55e]/20 rounded-xl px-4 py-2">{success}</div>
                )}

                <button type="submit" disabled={loading}
                    className="w-full py-3 rounded-xl bg-[#22c55e] text-black font-bold hover:bg-[#22c55e]/90 shadow-[0_0_25px_rgba(34,197,94,0.3)] transition-all cursor-pointer disabled:opacity-50">
                    {loading ? 'Resetting...' : 'Reset Password'}
                </button>
            </form>

            <p className="mt-6 text-center text-sm text-white/20">
                <Link href="/login" className="text-[#38bdf8] font-medium hover:underline">← Back to login</Link>
            </p>
        </AuthLayout>
    );
}
