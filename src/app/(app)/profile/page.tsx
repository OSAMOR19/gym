/**
 * Profile Page — SPATIAL layout.
 * Content at different visual depths. Badges as horizontal rows.
 * Zero emojis.
 */

'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '../../../lib/auth';
import { loadStats, UserStats, BADGES, getXPForCurrentLevel } from '../../../lib/gamification';
import AchievementBadge from '../../../components/AchievementBadge';

export default function ProfilePage() {
    const { user, logout } = useAuth();
    const [stats, setStats] = useState<UserStats | null>(null);

    useEffect(() => {
        setStats(loadStats());
    }, []);

    const xpInfo = stats ? getXPForCurrentLevel(stats.totalXP) : { current: 0, required: 500 };
    const xpPct = (xpInfo.current / xpInfo.required) * 100;

    return (
        <div className="max-w-5xl mx-auto p-4 md:p-6">
            {/* ─── Profile header ───────────────────────────────────────────── */}
            <div className="relative border border-white/5 rounded-xl p-6 md:p-8 mb-6 overflow-hidden">
                {/* Ghost level */}
                <div className="absolute top-2 right-6 pointer-events-none select-none">
                    <span
                        className="text-[160px] font-black leading-none text-white/[0.015]"
                        style={{ fontFamily: 'Orbitron, monospace' }}
                    >
                        {stats?.level || 1}
                    </span>
                </div>

                <div className="relative flex items-center gap-5">
                    {/* Avatar */}
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#22c55e] to-[#38bdf8] flex items-center justify-center shadow-[0_0_20px_rgba(34,197,94,0.15)] flex-shrink-0">
                        <span className="text-black text-xl font-black" style={{ fontFamily: 'Orbitron, monospace' }}>
                            {user?.name?.charAt(0).toUpperCase()}
                        </span>
                    </div>

                    <div className="flex-1">
                        <h1 className="text-xl font-bold text-white">{user?.name}</h1>
                        <p className="text-xs text-white/25">{user?.email}</p>
                        <p className="text-[10px] text-white/10 mt-0.5">
                            Member since {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'today'}
                        </p>
                    </div>
                </div>

                {/* Level + XP bar */}
                {stats && (
                    <div className="relative mt-6 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#22c55e] to-[#38bdf8] flex items-center justify-center">
                            <span className="text-black text-sm font-black" style={{ fontFamily: 'Orbitron, monospace' }}>
                                {stats.level}
                            </span>
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-medium text-white/40">Level {stats.level}</span>
                                <span className="text-[10px] text-white/15">{xpInfo.current} / {xpInfo.required} XP</span>
                            </div>
                            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                                <div
                                    className="h-full rounded-full bg-gradient-to-r from-[#22c55e] to-[#38bdf8] transition-all duration-700"
                                    style={{ width: `${xpPct}%`, boxShadow: '0 0 8px rgba(34,197,94,0.3)' }}
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* ─── Stats: asymmetric columns ────────────────────────────────── */}
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                    <div className="border border-white/5 rounded-xl p-4">
                        <span className="text-[10px] text-white/15 tracking-widest uppercase block">Total XP</span>
                        <span className="text-2xl font-black text-[#22c55e]" style={{ fontFamily: 'Orbitron, monospace' }}>
                            {stats.totalXP}
                        </span>
                    </div>
                    <div className="border border-white/5 rounded-xl p-4">
                        <span className="text-[10px] text-white/15 tracking-widest uppercase block">Workouts</span>
                        <span className="text-2xl font-black text-[#38bdf8]" style={{ fontFamily: 'Orbitron, monospace' }}>
                            {stats.totalWorkouts}
                        </span>
                    </div>
                    <div className="border border-white/5 rounded-xl p-4">
                        <span className="text-[10px] text-white/15 tracking-widest uppercase block">Total Reps</span>
                        <span className="text-2xl font-black text-[#a855f7]" style={{ fontFamily: 'Orbitron, monospace' }}>
                            {stats.totalReps}
                        </span>
                    </div>
                    <div className="border border-white/5 rounded-xl p-4">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] text-white/15 tracking-widest uppercase">Streak</span>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="1.5"><path d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 2.5z" /></svg>
                        </div>
                        <span className="text-2xl font-black text-[#f59e0b]" style={{ fontFamily: 'Orbitron, monospace' }}>
                            {stats.currentStreak}
                        </span>
                    </div>
                </div>
            )}

            {/* ─── Achievements as horizontal list ──────────────────────────── */}
            <div className="mb-6">
                <h2 className="text-[10px] text-white/15 tracking-widest uppercase mb-3">
                    Achievements — {stats?.earnedBadges.length || 0}/{BADGES.length}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
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
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-white/5 text-white/20 font-medium text-sm hover:border-red-500/20 hover:text-red-400 transition-all cursor-pointer"
            >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><polyline points="16,17 21,12 16,7" /><line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                Sign Out
            </button>
        </div>
    );
}
