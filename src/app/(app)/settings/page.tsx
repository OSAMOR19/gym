/**
 * Settings — profile, appearance, preferences, progress, account.
 * The profile lives here as the first section (/profile redirects in).
 * Badges as horizontal rows. Zero emojis.
 */

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
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
import { useTheme, ACCENTS } from '../../../lib/theme';

export default function SettingsPage() {
    const { user, logout } = useAuth();
    const { mode, accent, setMode, setAccent } = useTheme();
    const [stats, setStats] = useState<UserStats | null>(null);
    const [plan, setPlan] = useState<CoachPlan | null>(null);
    const [editing, setEditing] = useState(false);
    // Workout replays preference — same key the workout screen reads.
    // Lazy initializer keeps this SSR-safe and avoids setState-in-effect.
    const [replaysOn, setReplaysOn] = useState(() => {
        try { return localStorage.getItem('irontrack_replay_off') !== '1'; } catch { return true; }
    });
    const toggleReplays = () => {
        setReplaysOn((prev) => {
            try { localStorage.setItem('irontrack_replay_off', prev ? '1' : '0'); } catch { /* private mode */ }
            return !prev;
        });
    };

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
            <div className="hidden md:block mb-6">
                <h1 className="text-2xl font-bold text-ink font-display">Settings</h1>
                <p className="text-xs text-ink/30 mt-1">Your profile, how the app looks, and how it behaves.</p>
            </div>

            {/* ─── Profile ──────────────────────────────────────────────────── */}
            <h2 className="text-[10px] font-bold text-ink/30 tracking-widest uppercase mb-2.5">Profile</h2>
            <div className="relative border border-ink/5 rounded-xl p-6 md:p-8 mb-6 overflow-hidden">
                {/* Ghost level */}
                <div className="absolute top-2 right-6 pointer-events-none select-none">
                    <span
                        className="text-[160px] font-black leading-none text-ink/[0.015]"
                        style={{ fontFamily: 'var(--font-orbitron), monospace' }}
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
                                className="w-16 h-16 rounded-full object-cover border border-ink/10 group-hover:border-accent/40 transition-colors"
                            />
                        ) : (
                            <span className="w-16 h-16 rounded-full bg-accent flex items-center justify-center shadow-[0_0_20px_rgba(var(--accent-glow),0.15)]">
                                <span className="text-black text-xl font-black" style={{ fontFamily: 'var(--font-orbitron), monospace' }}>
                                    {user?.name?.charAt(0).toUpperCase()}
                                </span>
                            </span>
                        )}
                        {/* Camera chip — the edit affordance */}
                        <span className="absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full bg-app border border-ink/15 flex items-center justify-center text-ink/40 group-hover:text-accent group-hover:border-accent/40 transition-colors">
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                                <circle cx="12" cy="13" r="4" />
                            </svg>
                        </span>
                    </button>

                    <div className="flex-1">
                        <h1 className="text-xl font-bold text-ink">{user?.name}</h1>
                        <p className="text-xs text-ink/25">{user?.email}</p>
                        <p className="text-[10px] text-ink/10 mt-0.5">
                            Member since {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'today'}
                        </p>
                    </div>

                    {/* Training plan */}
                    <button
                        onClick={() => openCoachChat('intake')}
                        className="hidden sm:block text-right flex-shrink-0 rounded-lg border border-ink/8 hover:border-accent/40 px-3.5 py-2 transition-all cursor-pointer"
                    >
                        <p className="text-[9px] text-ink/25 tracking-widest uppercase">Training plan</p>
                        <p className="text-xs font-semibold text-accent">
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
                                <circle cx={32} cy={32} r={28} fill="none" stroke="currentColor" className="text-ink/[0.08]" strokeWidth={4.5} />
                                <circle
                                    cx={32} cy={32} r={28} fill="none" stroke="currentColor" className="text-accent" strokeWidth={4.5}
                                    strokeLinecap="round"
                                    strokeDasharray={2 * Math.PI * 28}
                                    strokeDashoffset={(2 * Math.PI * 28) * (1 - xpPct / 100)}
                                    style={{ transition: 'stroke-dashoffset 0.8s ease', filter: 'drop-shadow(0 0 5px rgba(var(--accent-glow),0.35))' }}
                                />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-lg font-black text-ink leading-none" style={{ fontFamily: 'var(--font-orbitron), monospace' }}>
                                    {stats.level}
                                </span>
                                <span className="text-[7px] text-ink/30 tracking-widest uppercase mt-0.5">Lvl</span>
                            </div>
                        </div>
                        <div>
                            <p className="text-sm font-bold text-ink">Level {stats.level}</p>
                            <p className="text-[11px] text-ink/30 mt-0.5">{xpInfo.current} / {xpInfo.required} XP</p>
                            <p className="text-[10px] text-ink/15 mt-0.5">
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
                    <div className="border border-ink/5 rounded-xl p-4">
                        <span className="text-[10px] text-ink/15 tracking-widest uppercase block">Total XP</span>
                        <span className="text-2xl font-black text-accent" style={{ fontFamily: 'var(--font-orbitron), monospace' }}>
                            {stats.totalXP}
                        </span>
                    </div>
                    <div className="border border-ink/5 rounded-xl p-4">
                        <span className="text-[10px] text-ink/15 tracking-widest uppercase block">Workouts</span>
                        <span className="text-2xl font-black text-info" style={{ fontFamily: 'var(--font-orbitron), monospace' }}>
                            {stats.totalWorkouts}
                        </span>
                    </div>
                    <div className="border border-ink/5 rounded-xl p-4">
                        <span className="text-[10px] text-ink/15 tracking-widest uppercase block">Total Reps</span>
                        <span className="text-2xl font-black text-violet" style={{ fontFamily: 'var(--font-orbitron), monospace' }}>
                            {stats.totalReps}
                        </span>
                    </div>
                    <div className="border border-ink/5 rounded-xl p-4">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] text-ink/15 tracking-widest uppercase">Streak</span>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-warm" strokeWidth="1.5"><path d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 2.5z" /></svg>
                        </div>
                        <span className="text-2xl font-black text-warm" style={{ fontFamily: 'var(--font-orbitron), monospace' }}>
                            {stats.currentStreak}
                        </span>
                    </div>
                </div>
            )}

            {/* ─── Appearance — theme mode + accent color ───────────────────── */}
            <div className="border border-ink/5 rounded-xl p-4 md:p-5 mb-6">
                <h2 className="text-[10px] text-ink/15 tracking-widest uppercase mb-3">Appearance</h2>
                <div className="grid grid-cols-2 gap-2 mb-4">
                    {(['dark', 'light'] as const).map((m) => (
                        <button
                            key={m}
                            onClick={() => setMode(m)}
                            aria-pressed={mode === m}
                            className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${mode === m
                                ? 'border-accent/40 bg-accent/10 text-accent'
                                : 'border-ink/10 text-ink/40 hover:text-ink/70 hover:border-ink/20'}`}
                        >
                            {m === 'dark' ? (
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
                                </svg>
                            ) : (
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="4" /><line x1="12" y1="2" x2="12" y2="4" /><line x1="12" y1="20" x2="12" y2="22" /><line x1="4.5" y1="4.5" x2="5.9" y2="5.9" /><line x1="18.1" y1="18.1" x2="19.5" y2="19.5" /><line x1="2" y1="12" x2="4" y2="12" /><line x1="20" y1="12" x2="22" y2="12" /><line x1="4.5" y1="19.5" x2="5.9" y2="18.1" /><line x1="18.1" y1="5.9" x2="19.5" y2="4.5" />
                                </svg>
                            )}
                            {m === 'dark' ? 'Dark' : 'Light'}
                        </button>
                    ))}
                </div>
                <p className="text-[10px] text-ink/25 tracking-wide uppercase mb-2.5">Accent color</p>
                <div className="flex items-center gap-2.5 flex-wrap">
                    {ACCENTS.map((a) => (
                        <button
                            key={a.id}
                            onClick={() => setAccent(a.id)}
                            aria-label={`${a.label} accent`}
                            aria-pressed={accent === a.id}
                            title={a.label}
                            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer ${accent === a.id
                                ? 'ring-2 ring-offset-2 ring-ink/60 ring-offset-app scale-105'
                                : 'hover:scale-110'}`}
                            style={{ backgroundColor: mode === 'light' ? a.light : a.dark }}
                        >
                            {accent === a.id && (
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="20,6 9,17 4,12" />
                                </svg>
                            )}
                        </button>
                    ))}
                </div>
                <p className="text-[10px] text-ink/20 mt-3 leading-relaxed">
                    The workout and cardio camera screens always keep the dark look — the overlays sit on live video.
                </p>
            </div>

            {/* ─── Preferences — how the app behaves ────────────────────────── */}
            <div className="border border-ink/5 rounded-xl p-4 md:p-5 mb-6">
                <h2 className="text-[10px] text-ink/15 tracking-widest uppercase mb-3">Preferences</h2>

                {/* Workout replays */}
                <div className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                        <p className="text-sm font-semibold text-ink/85">Workout replays</p>
                        <p className="text-[11px] text-ink/30 mt-0.5">Auto-create a shareable highlight reel after each workout</p>
                    </div>
                    <button
                        role="switch"
                        aria-checked={replaysOn}
                        onClick={toggleReplays}
                        className={`relative w-11 h-6 rounded-full flex-shrink-0 transition-colors cursor-pointer ${replaysOn ? 'bg-accent' : 'bg-ink/15'}`}
                    >
                        <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${replaysOn ? 'left-[22px]' : 'left-0.5'}`} />
                    </button>
                </div>

                <div className="border-t border-ink/5" />

                {/* Notifications entry */}
                <Link href="/notifications" className="flex items-center justify-between gap-3 py-2.5 group">
                    <div className="min-w-0">
                        <p className="text-sm font-semibold text-ink/85 group-hover:text-ink transition-colors">Notifications</p>
                        <p className="text-[11px] text-ink/30 mt-0.5">Milestones, completed days, and coach updates</p>
                    </div>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-ink/20 group-hover:text-accent transition-colors flex-shrink-0">
                        <polyline points="9,18 15,12 9,6" />
                    </svg>
                </Link>

                {/* Install-the-app nudge (hidden once installed or dismissed) */}
                <InstallPrompt />
            </div>

            {/* ─── Achievements as horizontal list ──────────────────────────── */}
            <div className="mb-6">
                <h2 className="text-[10px] text-ink/15 tracking-widest uppercase mb-3">
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

            {/* ─── Account ──────────────────────────────────────────────────── */}
            <h2 className="text-[10px] font-bold text-ink/30 tracking-widest uppercase mb-2.5">Account</h2>
            <button
                onClick={logout}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-ink/5 text-ink/20 font-medium text-sm hover:border-red-500/20 hover:text-red-400 transition-all cursor-pointer"
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
