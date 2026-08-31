/**
 * Forgot Password Page — Split layout with carousel.
 */

'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { useAuth } from '../../lib/auth';
import { useToast } from '../../components/Toast';
import AuthLayout from '../../components/AuthLayout';

export default function ForgotPasswordPage() {
    const { resetPassword } = useAuth();
    const { success, error: toastError } = useToast();
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const result = await resetPassword(email);
        if (result.error) {
            setError(result.error);
        } else if (result.message) {
            success('Email sent!', result.message);
            setEmail('');
        }
        setLoading(false);
    };

    return (
        <AuthLayout>
            <h2 className="text-2xl font-bold text-ink mb-1 font-display">Reset Password</h2>
            <p className="text-ink/30 text-sm mb-8">
                Enter your email and we&apos;ll reset your password.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="text-xs text-ink/40 tracking-wider uppercase mb-1.5 block">Email</label>
                    <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-ink/20">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
                        </span>
                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                            className="w-full pl-11 pr-4 py-3 rounded-xl bg-ink/5 border border-ink/10 text-ink placeholder-ink/20 focus:outline-none focus:border-accent/40 transition-all"
                            placeholder="you@example.com" />
                    </div>
                </div>

                {error && (
                    <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2">{error}</div>
                )}

                <button type="submit" disabled={loading}
                    className="w-full py-3 rounded-xl bg-accent text-black font-bold hover:bg-accent/90 shadow-[0_0_25px_rgba(var(--accent-glow),0.3)] transition-all cursor-pointer disabled:opacity-50">
                    {loading ? 'Resetting...' : 'Reset Password'}
                </button>
            </form>

            <p className="mt-6 text-center text-sm text-ink/20">
                <Link href="/login" className="text-info font-medium hover:underline">← Back to login</Link>
            </p>
        </AuthLayout>
    );
}
