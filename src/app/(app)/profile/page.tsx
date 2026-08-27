/**
 * Profile Page — SPATIAL layout.
 * Content at different visual depths. Badges as horizontal rows.
 * Zero emojis.
 */

'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '../../../lib/auth';
import { loadStats, UserStats, BADGES, getXPForCurrentLevel } from '../../../lib/gamification';
import { getCoachPlan, CoachPlan } from '../../../lib/coachIntake';
import { syncCoachPlan } from '../../../lib/userProfile';
import { getProgramById } from '../../../lib/programs';
import AchievementBadge from '../../../components/AchievementBadge';
import EditProfileModal from '../../../components/EditProfileModal';
import InstallPrompt from '../../../components/InstallPrompt';
import Skeleton from '../../../components/Skeleton';
import { openCoachChat } from '../../../components/CoachChat';

export default function ProfilePage() {
    const { user, logout } = useAuth();
    const [stats, setStats] = useState<UserStats | null>(null);
    const [plan, setPlan] = useState<CoachPlan | null>(null);
    const [editing, setEditing] = useState(false);

    useEffect(() => {
        async function fetchStats() {
            setStats(await loadStats());
        }
        fetchStats();
    }, []);

    // The intake runs in the coach chat now; it announces when a plan is saved
    useEffect(() => {
        setPlan(getCoachPlan());
        syncCoachPlan().then(setPlan);
        const onPlanSaved = () => setPlan(getCoachPlan());
        window.addEventListener('irontrack-plan-saved', onPlanSaved);
        return () => window.removeEventListener('irontrack-plan-saved', onPlanSaved);
    }, []);

    const planProgram = plan ? getProgramById(plan.programId) : null;

    const xpInfo = stats ? getXPForCurrentLevel(stats.totalXP) : { current: 0, required: 500 };
    const xpPct = (xpInfo.current / xpInfo.required) * 100;

    return (
        <div className="max-w-5xl mx-auto p-4 md:p-6">
            {/* Install-the-app nudge (hidden once installed or dismissed) */}
            <InstallPrompt />

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
                    {/* Avatar — circular, tap to edit profile (photo, name, stats) */}
                    <button
                        onClick={() => setEditing(true)}
                        aria-label="Edit profile"
                        title="Edit profile"
                        className="relative w-16 h-16 flex-shrink-0 rounded-full group cursor-pointer"
                    >
                        {user?.avatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={user.avatarUrl}
                                alt=""
                                className="w-16 h-16 rounded-full object-cover border border-white/10 group-hover:border-[#22c55e]/40 transition-colors"
                            />
                        ) : (
                            <span className="w-16 h-16 rounded-full bg-[#22c55e] flex items-center justify-center shadow-[0_0_20px_rgba(34,197,94,0.15)]">
                                <span className="text-black text-xl font-black" style={{ fontFamily: 'Orbitron, monospace' }}>
                                    {user?.name?.charAt(0).toUpperCase()}
                                </span>
                            </span>
                        )}
                        {/* Camera chip — the edit affordance */}
                        <span className="absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full bg-[#0f0f0f] border border-white/15 flex items-center justify-center text-white/40 group-hover:text-[#22c55e] group-hover:border-[#22c55e]/40 transition-colors">
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                                <circle cx="12" cy="13" r="4" />
                            </svg>
                        </span>
                    </button>

                    <div className="flex-1">
                        <h1 className="text-xl font-bold text-white">{user?.name}</h1>
                        <p className="text-xs text-white/25">{user?.email}</p>
                        <p className="text-[10px] text-white/10 mt-0.5">
                            Member since {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'today'}
                        </p>
                    </div>

                    {/* Training plan */}
                    <button
                        onClick={() => openCoachChat('intake')}
                        className="hidden sm:block text-right flex-shrink-0 rounded-lg border border-white/8 hover:border-[#22c55e]/40 px-3.5 py-2 transition-all cursor-pointer"
                    >
                        <p className="text-[9px] text-white/25 tracking-widest uppercase">Training plan</p>
                        <p className="text-xs font-semibold text-[#22c55e]">
                            {planProgram ? planProgram.name : 'Find my plan'}
                        </p>
                    </button>
                </div>

                {/* Level as a progress ring — same language as the home page,
                    the XP toward the next level is the arc around the number */}
                {stats && (
                    <div className="relative mt-6 flex items-center gap-4">
                        <div
                            className="relative w-16 h-16 flex-shrink-0"
                            aria-label={`Level ${stats.level}, ${xpInfo.current} of ${xpInfo.required} XP`}
                        >
                            <svg viewBox="0 0 64 64" className="w-16 h-16 -rotate-90">
                                <circle cx={32} cy={32} r={28} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={4.5} />
                                <circle
                                    cx={32} cy={32} r={28} fill="none" stroke="#22c55e" strokeWidth={4.5}
                                    strokeLinecap="round"
                                    strokeDasharray={2 * Math.PI * 28}
                                    strokeDashoffset={(2 * Math.PI * 28) * (1 - xpPct / 100)}
                                    style={{ transition: 'stroke-dashoffset 0.8s ease', filter: 'drop-shadow(0 0 5px rgba(34,197,94,0.35))' }}
                                />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-lg font-black text-white leading-none" style={{ fontFamily: 'Orbitron, monospace' }}>
                                    {stats.level}
                                </span>
                                <span className="text-[7px] text-white/30 tracking-widest uppercase mt-0.5">Lvl</span>
                            </div>
                        </div>
                        <div>
                            <p className="text-sm font-bold text-white">Level {stats.level}</p>
                            <p className="text-[11px] text-white/30 mt-0.5">{xpInfo.current} / {xpInfo.required} XP</p>
                            <p className="text-[10px] text-white/15 mt-0.5">
                                {xpInfo.required - xpInfo.current} XP to Level {stats.level + 1}
                            </p>
                        </div>
                    </div>
                )}
                {!stats && (
                    <div className="relative mt-6 flex items-center gap-4">
                        <Skeleton className="w-16 h-16 rounded-full" />
                        <div className="space-y-2">
                            <Skeleton className="h-3.5 w-24 rounded" />
                            <Skeleton className="h-3 w-32 rounded" />
                        </div>
                    </div>
                )}
            </div>

            {/* Stats skeleton while gamification data loads */}
            {!stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                    {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-[88px] rounded-xl" />)}
                </div>
            )}

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

            {editing && <EditProfileModal onClose={() => setEditing(false)} />}
        </div>
    );
}
