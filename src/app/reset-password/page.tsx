/**
 * Reset Password Page — Handles the password reset link from email.
 * Supabase sends users here via /auth/callback?next=/reset-password
 * By the time they land here, their session is active from the token.
 */

'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '../../utils/supabase/client';
import { useToast } from '../../components/Toast';
import AuthLayout from '../../components/AuthLayout';

export default function ResetPasswordPage() {
    const router = useRouter();
    const { success, error: toastError } = useToast();
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');

        if (password !== confirm) {
            setError('Passwords do not match');
            return;
        }
        if (password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        setLoading(true);
        const supabase = createClient();
        const { error: updateError } = await supabase.auth.updateUser({ password });

        if (updateError) {
            setError(updateError.message);
            setLoading(false);
        } else {
            success('Password updated!', 'You are now signed in. Redirecting...');
            setTimeout(() => router.push('/dashboard'), 2000);
        }
    };

    return (
        <AuthLayout>
            <h2 className="text-2xl font-bold text-white mb-1">Set New Password</h2>
            <p className="text-white/30 text-sm mb-8">
                Choose a strong password for your IronTrack AI account.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="text-xs text-white/40 tracking-wider uppercase mb-1.5 block">New Password</label>
                    <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>
                        </span>
                        <input
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="w-full pl-11 pr-12 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/20 focus:outline-none focus:border-[#22c55e]/40 focus:shadow-[0_0_15px_rgba(34,197,94,0.1)] transition-all"
                            placeholder="Min 6 characters"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/40 transition-colors cursor-pointer"
                        >
                            {showPassword ? (
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                            ) : (
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                            )}
                        </button>
                    </div>
                </div>

                <div>
                    <label className="text-xs text-white/40 tracking-wider uppercase mb-1.5 block">Confirm Password</label>
                    <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>
                        </span>
                        <input
                            type="password"
                            value={confirm}
                            onChange={(e) => setConfirm(e.target.value)}
                            required
                            className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/20 focus:outline-none focus:border-[#22c55e]/40 transition-all"
                            placeholder="••••••"
                        />
                    </div>
                </div>

                {error && (
                    <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2">{error}</div>
                )}

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 rounded-xl bg-[#22c55e] text-black font-bold hover:bg-[#22c55e]/90 shadow-[0_0_25px_rgba(34,197,94,0.3)] transition-all cursor-pointer disabled:opacity-50"
                >
                    {loading ? 'Updating...' : 'Update Password'}
                </button>
            </form>

            <p className="mt-6 text-center text-sm text-white/20">
                <Link href="/login" className="text-[#38bdf8] font-medium hover:underline">← Back to login</Link>
            </p>
        </AuthLayout>
    );
}
