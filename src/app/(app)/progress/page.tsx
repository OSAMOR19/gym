/**
 * Progress Page — Stats charts, workout history, and personal bests.
 */

'use client';

import { useEffect, useState } from 'react';
import { getProgressStats, ProgressStats, getAllWorkouts, WorkoutRecord } from '../../../lib/progressStore';
import ProgressChart from '../../../components/ProgressChart';

export default function ProgressPage() {
    const [stats, setStats] = useState<ProgressStats | null>(null);
    const [allWorkouts, setAllWorkouts] = useState<WorkoutRecord[]>([]);

    useEffect(() => {
        setStats(getProgressStats());
        setAllWorkouts(getAllWorkouts());
    }, []);

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        if (mins > 60) return `${Math.floor(mins / 60)}h ${mins % 60}m`;
        return `${mins}m ${secs}s`;
    };

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-white">Your Progress</h1>
                <p className="text-white/30 text-sm mt-1">Track your workout journey</p>
            </div>

            {/* Overview stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Total Reps', value: stats?.totalReps || 0, color: '#22c55e' },
                    { label: 'Workouts', value: stats?.totalWorkouts || 0, color: '#38bdf8' },
                    { label: 'Best Form', value: `${stats?.bestFormQuality || 0}%`, color: '#a855f7' },
                    { label: 'Total Time', value: formatDuration(stats?.totalDuration || 0), color: '#f59e0b' },
                ].map((s) => (
                    <div key={s.label} className="glass-panel rounded-2xl p-4 text-center">
                        <p className="text-[10px] text-white/30 tracking-widest uppercase mb-2">{s.label}</p>
                        <p className="text-2xl font-bold" style={{ color: s.color, fontFamily: 'Orbitron, sans-serif' }}>
                            {s.value}
                        </p>
                    </div>
                ))}
            </div>

            {/* Weekly Chart */}
            {stats && <ProgressChart data={stats.weeklyActivity} />}

            {/* Workout History */}
            <div className="glass-panel rounded-2xl p-6">
                <h3 className="text-sm font-semibold text-white/60 tracking-wider uppercase mb-4">Workout History</h3>

                {allWorkouts.length === 0 ? (
                    <p className="text-white/20 text-center py-8">No workouts yet. Start your first workout!</p>
                ) : (
                    <div className="space-y-2">
                        {allWorkouts.map((w) => (
                            <div key={w.id} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-[#22c55e]/10 flex items-center justify-center text-lg">
                                        🏋️
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-white">{w.exerciseName}</p>
                                        <p className="text-xs text-white/30">
                                            {new Date(w.date).toLocaleDateString()} · {new Date(w.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-bold text-[#22c55e]">{w.reps} reps</p>
                                    <div className="flex items-center gap-2 text-xs text-white/30">
                                        <span>Form: {w.formQuality}%</span>
                                        <span className="text-[#38bdf8]">+{w.xpGained} XP</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
