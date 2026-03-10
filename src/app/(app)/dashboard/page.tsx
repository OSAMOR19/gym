/**
 * Dashboard — COCKPIT layout.
 * One dominant element (weekly completion ring) center stage.
 * Asymmetric column splits. No stat grid at top.
 */

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../../lib/auth';
import { loadStats, UserStats } from '../../../lib/gamification';
import { getProgressStats, ProgressStats } from '../../../lib/progressStore';

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

    const weeklyTarget = 5; // target workouts per week
    const weeklyDone = progressStats?.weeklyActivity.filter(d => d.reps > 0).length || 0;
    const weeklyPct = Math.min((weeklyDone / weeklyTarget) * 100, 100);
    const ringRadius = 80;
    const ringCircumference = 2 * Math.PI * ringRadius;
    const ringOffset = ringCircumference - (weeklyPct / 100) * ringCircumference;

    const xpCurrent = gameStats ? gameStats.totalXP % 500 : 0;
    const xpRequired = 500;
    const xpPct = (xpCurrent / xpRequired) * 100;

    return (
        <div className="max-w-5xl mx-auto p-4 md:p-6">
            {/* ─── Header row: greeting + level ─────────────────────────────── */}
            <div className="flex items-end justify-between mb-8">
                <div>
                    <p className="text-xs text-white/20 tracking-widest uppercase mb-1">
                        {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                    </p>
                    <h1 className="text-2xl font-bold text-white">
                        {greeting()}, <span className="text-[#22c55e]">{user?.name?.split(' ')[0]}</span>
                    </h1>
                </div>
                {gameStats && (
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#22c55e] to-[#38bdf8] flex items-center justify-center">
                            <span className="text-black text-xs font-black" style={{ fontFamily: 'Orbitron, monospace' }}>
                                {gameStats.level}
                            </span>
                        </div>
                        <div>
                            <p className="text-[10px] text-white/25 tracking-wider uppercase">Level</p>
                            <div className="w-20 h-1.5 bg-white/5 rounded-full overflow-hidden">
                                <div
                                    className="h-full rounded-full bg-gradient-to-r from-[#22c55e] to-[#38bdf8]"
                                    style={{ width: `${xpPct}%` }}
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* ─── Main cockpit: 60/40 split ────────────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-[1fr_320px] gap-6 mb-6">
                {/* Left: dominant weekly ring */}
                <div className="relative border border-white/5 rounded-xl p-8 flex flex-col items-center justify-center min-h-[320px]">
                    {/* Background ghost number */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden">
                        <span
                            className="text-[200px] font-black text-white/[0.015] leading-none"
                            style={{ fontFamily: 'Orbitron, monospace' }}
                        >
                            {weeklyDone}
                        </span>
                    </div>

                    {/* Ring */}
                    <div className="relative">
                        <svg width={200} height={200} className="transform -rotate-90">
                            <circle cx={100} cy={100} r={ringRadius} fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth={6} />
                            <circle
                                cx={100} cy={100} r={ringRadius} fill="none" stroke="#22c55e" strokeWidth={6}
                                strokeLinecap="round" strokeDasharray={ringCircumference} strokeDashoffset={ringOffset}
                                style={{ transition: 'stroke-dashoffset 1s ease', filter: 'drop-shadow(0 0 8px rgba(34,197,94,0.3))' }}
                            />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-4xl font-black text-white" style={{ fontFamily: 'Orbitron, monospace' }}>
                                {weeklyDone}/{weeklyTarget}
                            </span>
                            <span className="text-[10px] text-white/25 tracking-widest uppercase mt-1">
                                Workouts this week
                            </span>
                        </div>
                    </div>

                    {/* Weekly activity dots */}
                    <div className="flex items-center gap-3 mt-6">
                        {(progressStats?.weeklyActivity || []).map((d, i) => (
                            <div key={i} className="flex flex-col items-center gap-1.5">
                                <div
                                    className={`w-2.5 h-2.5 rounded-full transition-all ${d.reps > 0
                                            ? 'bg-[#22c55e] shadow-[0_0_6px_rgba(34,197,94,0.4)]'
                                            : 'bg-white/5'
                                        }`}
                                />
                                <span className="text-[9px] text-white/15">{d.day}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right: stacked data panels */}
                <div className="flex flex-col gap-3">
                    {/* Streak */}
                    <div className="border border-white/5 rounded-xl p-4">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] text-white/20 tracking-widest uppercase">Streak</span>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="1.5"><path d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 2.5z" /></svg>
                        </div>
                        <p className="text-3xl font-black text-[#f59e0b] mt-1" style={{ fontFamily: 'Orbitron, monospace' }}>
                            {gameStats?.currentStreak || 0}
                        </p>
                        <p className="text-[10px] text-white/15 mt-0.5">consecutive days</p>
                    </div>

                    {/* Total Reps */}
                    <div className="border border-white/5 rounded-xl p-4">
                        <span className="text-[10px] text-white/20 tracking-widest uppercase">Total Reps</span>
                        <p className="text-3xl font-black text-[#22c55e] mt-1" style={{ fontFamily: 'Orbitron, monospace' }}>
                            {progressStats?.totalReps || 0}
                        </p>
                    </div>

                    {/* Avg Form */}
                    <div className="border border-white/5 rounded-xl p-4">
                        <span className="text-[10px] text-white/20 tracking-widest uppercase">Avg Form Score</span>
                        <p className="text-3xl font-black text-[#a855f7] mt-1" style={{ fontFamily: 'Orbitron, monospace' }}>
                            {progressStats?.averageFormQuality || 0}%
                        </p>
                    </div>

                    {/* Quick actions */}
                    <Link
                        href="/workout"
                        className="flex items-center justify-center gap-2 py-3 rounded-xl bg-[#22c55e]/10 border border-[#22c55e]/25 text-[#22c55e] font-bold text-sm hover:bg-[#22c55e]/20 transition-all"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5,3 19,12 5,21" /></svg>
                        Start Workout
                    </Link>
                    <Link
                        href="/programs"
                        className="flex items-center justify-center gap-2 py-3 rounded-xl border border-white/5 text-white/40 font-medium text-sm hover:bg-white/[0.02] hover:text-white/60 transition-all"
                    >
                        Browse Programs
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="9,18 15,12 9,6" /></svg>
                    </Link>
                </div>
            </div>

            {/* ─── Recent activity strip ────────────────────────────────────── */}
            {progressStats && progressStats.recentWorkouts.length > 0 && (
                <div className="border-t border-white/5 pt-6">
                    <h3 className="text-[10px] text-white/20 tracking-widest uppercase mb-3">Recent</h3>
                    <div className="flex gap-3 overflow-x-auto pb-2">
                        {progressStats.recentWorkouts.slice(0, 6).map((w) => (
                            <div key={w.id} className="flex-shrink-0 border border-white/5 rounded-lg px-4 py-3 min-w-[160px]">
                                <p className="text-xs font-medium text-white/70 truncate">{w.exerciseName}</p>
                                <div className="flex items-baseline gap-2 mt-1">
                                    <span className="text-lg font-black text-[#22c55e]" style={{ fontFamily: 'Orbitron, monospace' }}>
                                        {w.reps}
                                    </span>
                                    <span className="text-[10px] text-white/20">reps</span>
                                </div>
                                <div className="flex items-center gap-2 mt-1 text-[10px] text-white/15">
                                    <span>Form {w.formQuality}%</span>
                                    <span className="w-0.5 h-0.5 bg-white/10 rounded-full" />
                                    <span>{new Date(w.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
