/**
 * Profile Page — User info, XP, level, badges, and settings.
 */

'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '../../../lib/auth';
import { loadStats, UserStats, BADGES } from '../../../lib/gamification';
import LevelProgress from '../../../components/LevelProgress';
import AchievementBadge from '../../../components/AchievementBadge';

export default function ProfilePage() {
    const { user, logout } = useAuth();
    const [stats, setStats] = useState<UserStats | null>(null);

    useEffect(() => {
        setStats(loadStats());
    }, []);

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-6">
            {/* Profile Header */}
            <div className="glass-panel rounded-2xl p-6 flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#22c55e] to-[#38bdf8] flex items-center justify-center shadow-[0_0_25px_rgba(34,197,94,0.2)]">
                    <span className="text-black text-2xl font-black" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                        {user?.name?.charAt(0).toUpperCase()}
                    </span>
                </div>
                <div>
                    <h1 className="text-xl font-bold text-white">{user?.name}</h1>
                    <p className="text-sm text-white/30">{user?.email}</p>
                    <p className="text-xs text-white/20 mt-1">
                        Member since {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'today'}
                    </p>
                </div>
            </div>

            {/* Level Progress */}
            {stats && <LevelProgress stats={stats} />}

            {/* Stats Overview */}
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                        { label: 'Total XP', value: stats.totalXP, color: '#22c55e' },
                        { label: 'Workouts', value: stats.totalWorkouts, color: '#38bdf8' },
                        { label: 'Total Reps', value: stats.totalReps, color: '#a855f7' },
                        { label: 'Streak', value: `${stats.currentStreak}🔥`, color: '#f59e0b' },
                    ].map((s) => (
                        <div key={s.label} className="glass-panel rounded-xl p-4 text-center">
                            <p className="text-[10px] text-white/30 tracking-widest uppercase mb-1">{s.label}</p>
                            <p className="text-xl font-bold" style={{ color: s.color, fontFamily: 'Orbitron, sans-serif' }}>
                                {s.value}
                            </p>
                        </div>
                    ))}
                </div>
            )}

            {/* Achievements */}
            <div>
                <h2 className="text-sm font-semibold text-white/60 tracking-wider uppercase mb-4">
                    Achievements ({stats?.earnedBadges.length || 0}/{BADGES.length})
                </h2>
                <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                    {BADGES.map((badge) => (
                        <AchievementBadge
                            key={badge.id}
                            badge={badge}
                            earned={stats?.earnedBadges.includes(badge.id) || false}
                        />
                    ))}
                </div>
            </div>

            {/* Sign Out */}
            <button
                onClick={logout}
                className="w-full py-3 rounded-xl bg-red-500/10 text-red-400 font-medium border border-red-500/20 hover:bg-red-500/20 transition-all cursor-pointer"
            >
                Sign Out
            </button>
        </div>
    );
}
