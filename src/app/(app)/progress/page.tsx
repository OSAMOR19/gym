/**
 * Progress Page — EDITORIAL + SPATIAL layout.
 * Leads with a big typographic statement (total reps or best form).
 * Charts are supporting. Vertical reading flow.
 */

'use client';

import { useEffect, useState } from 'react';
import { getProgressStats, ProgressStats, getAllWorkouts, WorkoutRecord } from '../../../lib/progressStore';
import ProgressChart from '../../../components/ProgressChart';
import Skeleton from '../../../components/Skeleton';

export default function ProgressPage() {
    const [stats, setStats] = useState<ProgressStats | null>(null);
    const [allWorkouts, setAllWorkouts] = useState<WorkoutRecord[]>([]);

    useEffect(() => {
        async function fetchProgress() {
            setStats(await getProgressStats());
            setAllWorkouts(await getAllWorkouts());
        }
        fetchProgress();
    }, []);

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        if (mins > 60) return `${Math.floor(mins / 60)}h ${mins % 60}m`;
        return `${mins}m`;
    };

    // Skeleton until the first stats load lands — no zeroed-out flash
    if (stats === null) {
        return (
            <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">
                <Skeleton className="h-44 rounded-xl" />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
                </div>
                <Skeleton className="h-64 rounded-xl" />
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto p-4 md:p-6">
            {/* ─── Hero statement ───────────────────────────────────────────── */}
            <div className="relative border border-ink/5 rounded-xl p-8 mb-6 overflow-hidden">
                {/* Background decoration */}
                <div className="absolute top-0 right-0 pointer-events-none select-none">
                    <span
                        className="text-[180px] font-black leading-none text-ink/[0.015] block -mt-8 -mr-4"
                        style={{ fontFamily: 'var(--font-orbitron), monospace' }}
                    >
                        {stats?.totalReps || 0}
                    </span>
                </div>

                <div className="relative">
                    <p className="text-[10px] text-ink/15 tracking-widest uppercase mb-2">Lifetime Reps</p>
                    <p className="text-5xl md:text-6xl font-black text-accent" style={{ fontFamily: 'var(--font-orbitron), monospace' }}>
                        {stats?.totalReps || 0}
                    </p>

                    {/* Secondary stats row */}
                    <div className="flex items-center gap-6 mt-6 text-sm">
                        <div>
                            <span className="text-[10px] text-ink/15 tracking-widest uppercase block">Workouts</span>
                            <span className="text-xl font-black text-info" style={{ fontFamily: 'var(--font-orbitron), monospace' }}>
                                {stats?.totalWorkouts || 0}
                            </span>
                        </div>
                        <div className="w-px h-8 bg-ink/5" />
                        <div>
                            <span className="text-[10px] text-ink/15 tracking-widest uppercase block">Best Form</span>
                            <span className="text-xl font-black text-violet" style={{ fontFamily: 'var(--font-orbitron), monospace' }}>
                                {stats?.bestFormQuality || 0}%
                            </span>
                        </div>
                        <div className="w-px h-8 bg-ink/5" />
                        <div>
                            <span className="text-[10px] text-ink/15 tracking-widest uppercase block">Total Time</span>
                            <span className="text-xl font-black text-warm" style={{ fontFamily: 'var(--font-orbitron), monospace' }}>
                                {formatDuration(stats?.totalDuration || 0)}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ─── Weekly Chart — supporting element ────────────────────────── */}
            {stats && <ProgressChart data={stats.weeklyActivity} />}

            {/* ─── Workout timeline ─────────────────────────────────────────── */}
            <div className="mt-6">
                <h3 className="text-[10px] text-ink/15 tracking-widest uppercase mb-4">History</h3>

                {allWorkouts.length === 0 ? (
                    <div className="border border-ink/5 rounded-xl py-12 text-center">
                        <p className="text-ink/15 text-sm">No workouts recorded yet</p>
                        <p className="text-ink/10 text-xs mt-1">Complete your first workout to see your history</p>
                    </div>
                ) : (
                    <div className="space-y-1">
                        {allWorkouts.map((w) => (
                            <div key={w.id} className="flex items-center gap-4 py-3 border-b border-ink/[0.03] last:border-0">
                                {/* Code badge */}
                                <div className="w-9 h-9 rounded-lg border border-accent/15 flex items-center justify-center flex-shrink-0">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-accent" strokeLinecap="round">
                                        <polyline points="22,12 18,12 15,21 9,3 6,12 2,12" />
                                    </svg>
                                </div>

                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-ink/60 truncate">{w.exerciseName}</p>
                                    <p className="text-[10px] text-ink/15">
                                        {new Date(w.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · Form {w.formQuality}%
                                    </p>
                                </div>

                                <div className="text-right flex-shrink-0">
                                    <span className="text-sm font-black text-accent" style={{ fontFamily: 'var(--font-orbitron), monospace' }}>
                                        {w.reps}
                                    </span>
                                    <span className="text-[10px] text-ink/15 ml-1">reps</span>
                                </div>

                                <span className="text-[10px] text-info/50 flex-shrink-0" style={{ fontFamily: 'var(--font-orbitron), monospace' }}>
                                    +{w.xpGained}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
