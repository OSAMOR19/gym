/**
 * Dashboard — Home page after login.
 * Shows quick stats, level progress, streak, recent activity, and quick-start buttons.
 */

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../../lib/auth';
import { loadStats, UserStats } from '../../../lib/gamification';
import { getProgressStats, ProgressStats } from '../../../lib/progressStore';
import LevelProgress from '../../../components/LevelProgress';
import ProgressChart from '../../../components/ProgressChart';

export default function DashboardPage() {
    const { user } = useAuth();
    const [gameStats, setGameStats] = useState<UserStats | null>(null);
    const [progressStats, setProgressStats] = useState<ProgressStats | null>(null);

    useEffect(() => {
        setGameStats(loadStats());
        setProgressStats(getProgressStats());
    }, []);

    const greeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good morning';
        if (hour < 17) return 'Good afternoon';
        return 'Good evening';
    };

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-6">
            {/* Greeting */}
            <div>
                <h1 className="text-2xl font-bold text-white">
                    {greeting()}, <span className="text-[#22c55e]">{user?.name?.split(' ')[0]}</span> 👋
                </h1>
                <p className="text-white/30 text-sm mt-1">Ready to crush your workout today?</p>
            </div>

            {/* Level Progress */}
            {gameStats && <LevelProgress stats={gameStats} />}

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Total Workouts', value: progressStats?.totalWorkouts || 0, icon: '🏋️', color: '#22c55e' },
                    { label: 'Total Reps', value: progressStats?.totalReps || 0, icon: '🔄', color: '#38bdf8' },
                    { label: 'Avg Form', value: `${progressStats?.averageFormQuality || 0}%`, icon: '✨', color: '#a855f7' },
                    { label: 'Streak', value: `${gameStats?.currentStreak || 0} days`, icon: '🔥', color: '#f59e0b' },
                ].map((stat) => (
                    <div key={stat.label} className="glass-panel rounded-2xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-lg">{stat.icon}</span>
                            <span className="text-[10px] text-white/30 tracking-wider uppercase">{stat.label}</span>
                        </div>
                        <p className="text-2xl font-bold" style={{ color: stat.color, fontFamily: 'Orbitron, sans-serif' }}>
                            {stat.value}
                        </p>
                    </div>
                ))}
            </div>

            {/* Weekly Activity Chart */}
            {progressStats && <ProgressChart data={progressStats.weeklyActivity} />}

            {/* Quick Start */}
            <div className="glass-panel rounded-2xl p-6">
                <h3 className="text-sm font-semibold text-white/60 tracking-wider uppercase mb-4">Quick Start</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <Link href="/workout" className="glass-panel rounded-xl p-4 text-center hover:bg-white/[0.06] transition-all group">
                        <span className="text-3xl block mb-2">🏋️</span>
                        <span className="text-sm font-medium text-white/60 group-hover:text-[#22c55e] transition-colors">Free Workout</span>
                    </Link>
                    <Link href="/programs" className="glass-panel rounded-xl p-4 text-center hover:bg-white/[0.06] transition-all group">
                        <span className="text-3xl block mb-2">📋</span>
                        <span className="text-sm font-medium text-white/60 group-hover:text-[#22c55e] transition-colors">Programs</span>
                    </Link>
                    <Link href="/progress" className="glass-panel rounded-xl p-4 text-center hover:bg-white/[0.06] transition-all group">
                        <span className="text-3xl block mb-2">📈</span>
                        <span className="text-sm font-medium text-white/60 group-hover:text-[#22c55e] transition-colors">Progress</span>
                    </Link>
                </div>
            </div>

            {/* Recent Workouts */}
            {progressStats && progressStats.recentWorkouts.length > 0 && (
                <div className="glass-panel rounded-2xl p-6">
                    <h3 className="text-sm font-semibold text-white/60 tracking-wider uppercase mb-4">Recent Workouts</h3>
                    <div className="space-y-2">
                        {progressStats.recentWorkouts.slice(0, 5).map((w) => (
                            <div key={w.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                                <div>
                                    <p className="text-sm font-medium text-white">{w.exerciseName}</p>
                                    <p className="text-xs text-white/30">{new Date(w.date).toLocaleDateString()}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-bold text-[#22c55e]">{w.reps} reps</p>
                                    <p className="text-xs text-white/30">Form: {w.formQuality}%</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Motivational message */}
            <div className="text-center py-4">
                <p className="text-white/10 text-xs italic">
                    &quot;The only bad workout is the one that didn&apos;t happen.&quot;
                </p>
            </div>
        </div>
    );
}
