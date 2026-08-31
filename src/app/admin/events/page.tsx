/**
 * Admin › Events — live feed of everything happening in the app.
 * Polls the append-only events stream every 10 seconds.
 */

'use client';

import { useState, useEffect } from 'react';
import Skeleton from '../../../components/Skeleton';

interface AdminEvent {
    id: number;
    email: string;
    event_type: string;
    exercise_id: string | null;
    metadata: Record<string, unknown>;
    created_at: string;
}

const TYPE_FILTERS = [
    '', 'WORKOUT_COMPLETED', 'WORKOUT_STARTED', 'CARDIO_COMPLETED', 'SET_COMPLETED',
    'FORM_ISSUE_DETECTED', 'PR_RECORDED', 'PROGRAM_DAY_COMPLETED', 'INTAKE_COMPLETED', 'REPLAY_CREATED',
];

const TYPE_COLORS: Record<string, string> = {
    WORKOUT_COMPLETED: 'text-accent',
    CARDIO_COMPLETED: 'text-[#06b6d4]',
    PR_RECORDED: 'text-[#eab308]',
    FORM_ISSUE_DETECTED: 'text-amber-400',
    WORKOUT_SKIPPED: 'text-red-400',
    REPLAY_CREATED: 'text-violet',
};

export default function AdminEventsPage() {
    const [events, setEvents] = useState<AdminEvent[] | null>(null);
    const [type, setType] = useState('');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        const load = () => {
            fetch(`/api/admin/events${type ? `?type=${type}` : ''}`)
                .then(async (res) => {
                    const body = await res.json();
                    if (!res.ok) throw new Error(body.error ?? 'Failed to load');
                    if (!cancelled) setEvents(body.events);
                })
                .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load'); });
        };
        load();
        const timer = setInterval(load, 10_000);
        return () => { cancelled = true; clearInterval(timer); };
    }, [type]);

    return (
        <>
            <h1 className="text-xl font-bold text-ink mb-1 font-display">Events</h1>
            <p className="text-xs text-ink/30 mb-4">Latest 100 — refreshes every 10 seconds.</p>

            <div className="flex gap-1.5 overflow-x-auto scrollbar-hide mb-4 -mx-1 px-1">
                {TYPE_FILTERS.map((t) => (
                    <button
                        key={t || 'all'}
                        onClick={() => { setEvents(null); setType(t); }}
                        className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider whitespace-nowrap transition-all cursor-pointer ${type === t
                            ? 'bg-accent/15 text-accent border border-accent/30'
                            : 'text-ink/30 border border-ink/10 hover:text-ink/60'}`}
                    >
                        {t ? t.replaceAll('_', ' ') : 'All'}
                    </button>
                ))}
            </div>

            {error && <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">{error}</p>}
            {events === null && !error && (
                <div className="space-y-2">{[0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-12 rounded-xl" />)}</div>
            )}

            {events !== null && (
                <div className="border border-ink/5 rounded-xl divide-y divide-ink/5">
                    {events.map((e) => (
                        <div key={e.id} className="flex items-baseline gap-3 px-4 py-2.5 text-xs">
                            <span className="text-ink/20 flex-shrink-0 w-16" style={{ fontFamily: 'var(--font-orbitron), monospace' }}>
                                {new Date(e.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                            </span>
                            <span className={`font-bold uppercase tracking-wider flex-shrink-0 ${TYPE_COLORS[e.event_type] ?? 'text-ink/50'}`}>
                                {e.event_type.replaceAll('_', ' ')}
                            </span>
                            {e.exercise_id && <span className="text-ink/40 flex-shrink-0">{e.exercise_id}</span>}
                            <span className="text-ink/25 truncate ml-auto">{e.email}</span>
                        </div>
                    ))}
                    {events.length === 0 && (
                        <p className="px-4 py-8 text-center text-ink/25 text-xs">No events yet.</p>
                    )}
                </div>
            )}
        </>
    );
}
