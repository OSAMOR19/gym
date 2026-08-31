/**
 * Admin › Exercises — the live/off switchboard + detection-quality board.
 *
 * Toggling an exercise off removes it from the app's exercise picker within
 * minutes (clients cache flags briefly). The 30-day columns surface broken
 * CV configs: a high form-issue count with a low average form score usually
 * means the detection thresholds are wrong, not the users.
 */

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Skeleton from '../../../components/Skeleton';

interface AdminExercise {
    id: string;
    name: string;
    category: string;
    repMode: string;
    enabled: boolean;
    sets30d: number;
    avgForm30d: number | null;
    formIssues30d: number;
}

export default function AdminExercisesPage() {
    const [exercises, setExercises] = useState<AdminExercise[] | null>(null);
    const [busy, setBusy] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetch('/api/admin/exercises')
            .then(async (res) => {
                const body = await res.json();
                if (!res.ok) throw new Error(body.error ?? 'Failed to load');
                setExercises(body.exercises);
            })
            .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'));
    }, []);

    const toggle = useCallback(async (exercise: AdminExercise) => {
        setBusy(exercise.id);
        const res = await fetch('/api/admin/exercises', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ exerciseId: exercise.id, enabled: !exercise.enabled }),
        });
        if (res.ok) {
            setExercises((prev) => (prev ?? []).map((e) =>
                e.id === exercise.id ? { ...e, enabled: !exercise.enabled } : e));
        }
        setBusy(null);
    }, []);

    const groups = useMemo(() => {
        const byCategory = new Map<string, AdminExercise[]>();
        for (const e of exercises ?? []) {
            const list = byCategory.get(e.category) ?? [];
            list.push(e);
            byCategory.set(e.category, list);
        }
        return [...byCategory.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    }, [exercises]);

    const liveCount = (exercises ?? []).filter((e) => e.enabled).length;

    return (
        <>
            <h1 className="text-xl font-bold text-ink mb-1 font-display">Exercises</h1>
            <p className="text-xs text-ink/30 mb-6">
                {exercises ? `${liveCount} of ${exercises.length} live` : 'Loading…'} — toggling off hides an
                exercise from the picker; existing program plans keep their days.
            </p>

            {error && <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">{error}</p>}
            {exercises === null && !error && (
                <div className="space-y-2">{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
            )}

            {groups.map(([category, list]) => (
                <div key={category} className="mb-6">
                    <h2 className="text-[10px] text-ink/25 tracking-widest uppercase mb-2">{category}</h2>
                    <div className="border border-ink/5 rounded-xl divide-y divide-ink/5">
                        {list.map((e) => (
                            <div key={e.id} className={`flex items-center gap-3 px-4 py-3 ${e.enabled ? '' : 'opacity-50'}`}>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-ink/80 truncate">{e.name}</p>
                                    <p className="text-[10px] text-ink/25">
                                        {e.sets30d} sets · 30d
                                        {e.avgForm30d !== null && (
                                            <span className={e.avgForm30d < 60 ? ' text-red-400' : e.avgForm30d < 80 ? ' text-amber-400' : ' text-accent'}>
                                                {' '}· form {e.avgForm30d}%
                                            </span>
                                        )}
                                        {e.formIssues30d > 0 && (
                                            <span className={e.formIssues30d > 50 ? 'text-red-400' : ''}> · {e.formIssues30d} form issues</span>
                                        )}
                                    </p>
                                </div>
                                <span className={`text-[10px] font-bold uppercase tracking-wider ${e.enabled ? 'text-accent' : 'text-ink/30'}`}>
                                    {e.enabled ? 'Live' : 'Off'}
                                </span>
                                <button
                                    onClick={() => toggle(e)}
                                    disabled={busy === e.id}
                                    aria-label={`${e.enabled ? 'Disable' : 'Enable'} ${e.name}`}
                                    className="relative w-10 h-6 rounded-full transition-colors cursor-pointer disabled:opacity-40 flex-shrink-0"
                                    style={{ backgroundColor: e.enabled ? 'var(--accent)' : 'rgba(128,128,128,0.3)' }}
                                >
                                    <span
                                        className="absolute top-1 w-4 h-4 rounded-full bg-black transition-all"
                                        style={{ left: e.enabled ? '20px' : '4px' }}
                                    />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </>
    );
}
