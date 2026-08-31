/**
 * Admin › Users — directory with activity and plan control.
 * The free/pro switch is manual for now; when payments land, Stripe webhooks
 * will write the same `user_profiles.plan` field and this becomes read-mostly.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import Skeleton from '../../../components/Skeleton';

interface AdminUser {
    id: string;
    email: string;
    name: string;
    createdAt: string;
    lastSignIn: string | null;
    plan: 'free' | 'pro';
    hasIntake: boolean;
    workouts: number;
    lastWorkout: string | null;
}

const fmtDate = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—';

export default function AdminUsersPage() {
    const [users, setUsers] = useState<AdminUser[] | null>(null);
    const [q, setQ] = useState('');
    const [busy, setBusy] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetch('/api/admin/users')
            .then(async (res) => {
                const body = await res.json();
                if (!res.ok) throw new Error(body.error ?? 'Failed to load');
                setUsers(body.users);
            })
            .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'));
    }, []);

    const setPlan = useCallback(async (user: AdminUser, plan: 'free' | 'pro') => {
        setBusy(user.id);
        const res = await fetch('/api/admin/users', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user.id, plan }),
        });
        if (res.ok) {
            setUsers((prev) => (prev ?? []).map((u) => (u.id === user.id ? { ...u, plan } : u)));
        }
        setBusy(null);
    }, []);

    const filtered = (users ?? []).filter((u) =>
        !q.trim() || `${u.email} ${u.name}`.toLowerCase().includes(q.trim().toLowerCase()),
    );

    return (
        <>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                <div>
                    <h1 className="text-xl font-bold text-ink mb-1 font-display">Users</h1>
                    <p className="text-xs text-ink/30">{users ? `${users.length} accounts` : 'Loading…'}</p>
                </div>
                <input
                    type="search"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search name or email…"
                    className="w-full sm:w-64 bg-ink/5 border border-ink/10 rounded-xl px-3.5 py-2 text-sm text-ink/90 placeholder:text-ink/20 focus:outline-none focus:border-accent/40"
                />
            </div>

            {error && <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">{error}</p>}
            {users === null && !error && (
                <div className="space-y-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
            )}

            {users !== null && (
                <div className="border border-ink/5 rounded-xl overflow-x-auto">
                    <table className="w-full text-left text-sm min-w-[640px]">
                        <thead>
                            <tr className="text-[10px] text-ink/25 uppercase tracking-widest border-b border-ink/5">
                                <th className="px-4 py-3 font-medium">User</th>
                                <th className="px-4 py-3 font-medium">Plan</th>
                                <th className="px-4 py-3 font-medium">Workouts</th>
                                <th className="px-4 py-3 font-medium">Last workout</th>
                                <th className="px-4 py-3 font-medium">Joined</th>
                                <th className="px-4 py-3 font-medium text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((u) => (
                                <tr key={u.id} className="border-b border-ink/5 last:border-0 hover:bg-ink/[0.02]">
                                    <td className="px-4 py-3">
                                        <p className="text-ink/80 font-medium">{u.name}</p>
                                        <p className="text-[11px] text-ink/30">{u.email}</p>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${u.plan === 'pro'
                                            ? 'bg-accent/15 text-accent border border-accent/25'
                                            : 'bg-ink/5 text-ink/40 border border-ink/10'}`}>
                                            {u.plan}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-ink/60" style={{ fontFamily: 'var(--font-orbitron), monospace' }}>{u.workouts}</td>
                                    <td className="px-4 py-3 text-ink/40 text-xs">{fmtDate(u.lastWorkout)}</td>
                                    <td className="px-4 py-3 text-ink/40 text-xs">{fmtDate(u.createdAt)}</td>
                                    <td className="px-4 py-3 text-right">
                                        <button
                                            onClick={() => setPlan(u, u.plan === 'pro' ? 'free' : 'pro')}
                                            disabled={busy === u.id}
                                            className="text-[11px] font-semibold text-ink/40 hover:text-accent border border-ink/10 hover:border-accent/40 rounded-lg px-3 py-1.5 transition-all cursor-pointer disabled:opacity-40"
                                        >
                                            {busy === u.id ? '…' : u.plan === 'pro' ? 'Set free' : 'Set pro'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {filtered.length === 0 && (
                                <tr><td colSpan={6} className="px-4 py-8 text-center text-ink/25 text-xs">No users match.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </>
    );
}
