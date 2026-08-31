/** Admin › Overview — the app's vital signs at a glance. */

'use client';

import { useState, useEffect } from 'react';
import Skeleton from '../../components/Skeleton';

interface Overview {
    totalUsers: number;
    activeUsers7d: number;
    workouts7d: number;
    strengthWorkouts7d: number;
    cardioSessions7d: number;
    completionRate30d: number | null;
    replays: number;
    chatMessages7d: number;
}

export default function AdminOverviewPage() {
    const [data, setData] = useState<Overview | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetch('/api/admin/overview')
            .then(async (res) => {
                const body = await res.json();
                if (!res.ok) throw new Error(body.error ?? 'Failed to load');
                setData(body);
            })
            .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'));
    }, []);

    if (error) {
        return <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">{error}</p>;
    }

    const tiles: Array<{ label: string; value: string; hint?: string }> = data ? [
        { label: 'Total users', value: String(data.totalUsers) },
        { label: 'Active this week', value: String(data.activeUsers7d) },
        {
            label: 'Workouts · 7d',
            value: String(data.workouts7d),
            hint: `${data.strengthWorkouts7d} strength · ${data.cardioSessions7d} cardio`,
        },
        {
            label: 'Completion rate · 30d',
            value: data.completionRate30d !== null ? `${data.completionRate30d}%` : '—',
            hint: 'started → finished',
        },
        { label: 'Replays created', value: String(data.replays) },
        { label: 'Coach messages · 7d', value: String(data.chatMessages7d) },
    ] : [];

    return (
        <>
            <h1 className="text-xl font-bold text-ink mb-1 font-display">Overview</h1>
            <p className="text-xs text-ink/30 mb-6">Live from the events stream and app tables.</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {data === null
                    ? [0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)
                    : tiles.map((t) => (
                        <div key={t.label} className="border border-ink/5 rounded-xl p-4">
                            <p className="text-[10px] text-ink/25 tracking-widest uppercase">{t.label}</p>
                            <p className="text-3xl font-black text-accent mt-2" style={{ fontFamily: 'var(--font-orbitron), monospace' }}>
                                {t.value}
                            </p>
                            {t.hint && <p className="text-[10px] text-ink/25 mt-1">{t.hint}</p>}
                        </div>
                    ))}
            </div>
        </>
    );
}
