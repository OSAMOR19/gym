/**
 * Dashboard — COCKPIT layout.
 * One dominant element (weekly completion ring) center stage.
 * Asymmetric column splits. No stat grid at top.
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../lib/auth';
import { loadStats, UserStats } from '../../../lib/gamification';
import { getProgressStats, ProgressStats } from '../../../lib/progressStore';
import { getCoachPlan, CoachPlan } from '../../../lib/coachIntake';
import { getProgramById, Program, LEVEL_LABELS } from '../../../lib/programs';
import { listStartedPrograms, StartedProgram } from '../../../lib/programProgress';
import { launchProgramDay } from '../../../lib/workoutBuilder';
import { getUserState, assessReadiness, Readiness } from '../../../lib/userState';
import { openCoachChat } from '../../../components/CoachChat';

/** A started-but-unfinished program, resolved against the catalog. */
interface ActiveProgram {
    program: Program;
    completedDays: number[];
    nextDayIndex: number;
    totalDays: number;
}

function toActive(s: StartedProgram): ActiveProgram | null {
    const program = getProgramById(s.programId);
    if (!program) return null;
    const totalDays = program.weeks.reduce((n, w) => n + w.days.length, 0);
    let nextDayIndex = -1;
    for (let i = 0; i < totalDays; i++) {
        if (!s.completedDays.includes(i)) { nextDayIndex = i; break; }
    }
    if (nextDayIndex < 0) return null; // program finished
    return { program, completedDays: s.completedDays, nextDayIndex, totalDays };
}

/** "Day 3: Upper Body" → "Upper Body" */
const dayTitle = (p: Program, idx: number) =>
    p.weeks.flatMap((w) => w.days)[idx]?.name.replace(/^Day \d+:\s*/i, '') ?? '';

export default function DashboardPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [gameStats, setGameStats] = useState<UserStats | null>(null);
    const [progressStats, setProgressStats] = useState<ProgressStats | null>(null);
    const [started, setStarted] = useState<StartedProgram[]>([]);
    const [plan, setPlan] = useState<CoachPlan | null>(null);
    const [readiness, setReadiness] = useState<Readiness | null>(null);
    const [launching, setLaunching] = useState(false);

    useEffect(() => {
        async function fetchDashboardData() {
            setGameStats(await loadStats());
            setProgressStats(await getProgressStats());
        }
        fetchDashboardData();
        setPlan(getCoachPlan());
        listStartedPrograms().then(setStarted).catch(() => {});
        getUserState().then((s) => setReadiness(assessReadiness(s))).catch(() => {});
        const onPlanSaved = () => setPlan(getCoachPlan());
        window.addEventListener('irontrack-plan-saved', onPlanSaved);
        return () => window.removeEventListener('irontrack-plan-saved', onPlanSaved);
    }, []);

    // Hero: the most recently active unfinished program; else the chosen plan
    // from day one; else the find-my-plan invitation.
    const active = started.map(toActive).filter((a): a is ActiveProgram => a !== null);
    const planProgram = plan ? getProgramById(plan.programId) : null;
    const hero: ActiveProgram | null = active[0]
        ?? (planProgram ? {
            program: planProgram,
            completedDays: [],
            nextDayIndex: 0,
            totalDays: planProgram.weeks.reduce((n, w) => n + w.days.length, 0),
        } : null);
    const jumpBack = active.filter((a) => a.program.id !== hero?.program.id);

    const startDay = useCallback(async (item: ActiveProgram) => {
        if (launching) return;
        setLaunching(true);
        try {
            const ok = await launchProgramDay(item.program, item.nextDayIndex, readiness);
            if (ok) router.push('/workout');
        } finally {
            setLaunching(false);
        }
    }, [launching, readiness, router]);

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
                    // Level as a compact progress ring — the XP toward the next
                    // level is the arc around the number
                    <div
                        className="relative w-12 h-12 flex-shrink-0"
                        title={`Level ${gameStats.level} — ${xpCurrent}/${xpRequired} XP to the next level`}
                        aria-label={`Level ${gameStats.level}, ${xpCurrent} of ${xpRequired} XP`}
                    >
                        <svg viewBox="0 0 48 48" className="w-12 h-12 -rotate-90">
                            <circle cx={24} cy={24} r={20} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={3.5} />
                            <circle
                                cx={24} cy={24} r={20} fill="none" stroke="#22c55e" strokeWidth={3.5}
                                strokeLinecap="round"
                                strokeDasharray={2 * Math.PI * 20}
                                strokeDashoffset={(2 * Math.PI * 20) * (1 - xpPct / 100)}
                                style={{ transition: 'stroke-dashoffset 0.8s ease', filter: 'drop-shadow(0 0 4px rgba(34,197,94,0.35))' }}
                            />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-sm font-black text-white leading-none" style={{ fontFamily: 'Orbitron, monospace' }}>
                                {gameStats.level}
                            </span>
                            <span className="text-[6px] text-white/30 tracking-widest uppercase mt-0.5">Lvl</span>
                        </div>
                    </div>
                )}
            </div>

            {/* ─── Hero: continue the journey (or start it) ─────────────────── */}
            {hero ? (
                <div className="relative rounded-2xl overflow-hidden border border-white/10 mb-6">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={hero.program.image} alt="" className="absolute inset-0 w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/60 to-black/25" />
                    <div className="relative p-5 md:p-7">
                        <p className="text-[9px] font-bold tracking-[0.25em] uppercase" style={{ color: hero.program.color }}>
                            {hero.completedDays.length > 0 ? 'Jump back in' : 'Picked for you'}
                        </p>
                        <h2 className="text-xl md:text-2xl font-bold text-white mt-1">{hero.program.name}</h2>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-[11px] text-white/50">
                            <span>{LEVEL_LABELS[hero.program.level]}</span>
                            <span className="w-0.5 h-0.5 bg-white/20 rounded-full" />
                            <span>{hero.program.weeks[0]?.days.length ?? 3} days/week</span>
                            <span className="w-0.5 h-0.5 bg-white/20 rounded-full" />
                            <span>Next up: {dayTitle(hero.program, hero.nextDayIndex)}</span>
                        </div>
                        {hero.completedDays.length > 0 && (
                            <div className="mt-3 max-w-xs">
                                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                                    <div
                                        className="h-full rounded-full transition-all duration-700"
                                        style={{
                                            width: `${(hero.completedDays.length / hero.totalDays) * 100}%`,
                                            backgroundColor: hero.program.color,
                                        }}
                                    />
                                </div>
                                <p className="text-[10px] text-white/35 mt-1">
                                    {hero.completedDays.length} of {hero.totalDays} days done
                                </p>
                            </div>
                        )}
                        <button
                            onClick={() => startDay(hero)}
                            disabled={launching}
                            className="mt-4 w-full sm:w-auto px-6 py-3 rounded-xl font-bold text-sm tracking-wide transition-all cursor-pointer disabled:opacity-60"
                            style={{ backgroundColor: hero.program.color, color: '#000' }}
                        >
                            {launching ? 'Preparing…' : `Start Day ${hero.nextDayIndex + 1} →`}
                        </button>
                    </div>
                </div>
            ) : (
                <button
                    onClick={() => openCoachChat('intake')}
                    className="relative w-full rounded-2xl overflow-hidden border border-white/10 mb-6 text-left cursor-pointer group"
                >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/programs/full-body.png" alt="" className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-700" />
                    <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/60 to-black/25" />
                    <div className="relative p-5 md:p-7">
                        <p className="text-[9px] font-bold tracking-[0.25em] uppercase text-[#22c55e]">Let&apos;s get you started</p>
                        <h2 className="text-xl md:text-2xl font-bold text-white mt-1">Find the plan that fits you</h2>
                        <p className="text-xs text-white/45 mt-1.5 max-w-sm leading-relaxed">
                            Five quick questions — your goal, your gear, your schedule — and your coach picks the right program.
                        </p>
                        <span className="inline-block mt-4 px-6 py-3 rounded-xl bg-[#22c55e] text-black font-bold text-sm">
                            Find my plan →
                        </span>
                    </div>
                </button>
            )}

            {/* ─── Jump back in: every other unfinished program ─────────────── */}
            {jumpBack.length > 0 && (
                <div className="mb-6">
                    <h3 className="text-[10px] text-white/20 tracking-widest uppercase mb-3">Jump back in</h3>
                    <div className="flex gap-3 overflow-x-auto scrollbar-hide snap-x -mx-4 px-4">
                        {jumpBack.map((item) => (
                            <Link
                                key={item.program.id}
                                href={`/programs/${item.program.id}`}
                                className="flex-shrink-0 snap-start w-[58vw] sm:w-64 group"
                            >
                                <div className="relative h-24 rounded-xl overflow-hidden border border-white/5 group-hover:border-white/15 transition-all">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={item.program.image} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
                                    <div className="absolute bottom-2 left-3 right-3">
                                        <p className="text-[13px] font-semibold text-white truncate">{item.program.name}</p>
                                        <div className="h-1 bg-white/15 rounded-full overflow-hidden mt-1.5">
                                            <div
                                                className="h-full rounded-full"
                                                style={{
                                                    width: `${(item.completedDays.length / item.totalDays) * 100}%`,
                                                    backgroundColor: item.program.color,
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <p className="text-[10px] text-white/25 mt-1.5">
                                    {item.completedDays.length}/{item.totalDays} days · next: Day {item.nextDayIndex + 1}
                                </p>
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            {/* ─── Main cockpit: 60/40 split ────────────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-[1fr_320px] gap-6 mb-6">
                {/* Left: dominant weekly ring — compact on phones, where the
                    old fixed height left a screen-filling void */}
                <div className="relative border border-white/5 rounded-xl p-5 md:p-8 flex flex-col items-center justify-center md:min-h-[320px]">
                    {/* Background ghost number */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden">
                        <span
                            className="text-[110px] md:text-[200px] font-black text-white/[0.015] leading-none"
                            style={{ fontFamily: 'Orbitron, monospace' }}
                        >
                            {weeklyDone}
                        </span>
                    </div>

                    {/* Ring */}
                    <div className="relative">
                        <svg width={200} height={200} viewBox="0 0 200 200" className="w-[148px] h-[148px] md:w-[200px] md:h-[200px] transform -rotate-90">
                            <circle cx={100} cy={100} r={ringRadius} fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth={6} />
                            <circle
                                cx={100} cy={100} r={ringRadius} fill="none" stroke="#22c55e" strokeWidth={6}
                                strokeLinecap="round" strokeDasharray={ringCircumference} strokeDashoffset={ringOffset}
                                style={{ transition: 'stroke-dashoffset 1s ease', filter: 'drop-shadow(0 0 8px rgba(34,197,94,0.3))' }}
                            />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-2xl md:text-4xl font-black text-white" style={{ fontFamily: 'Orbitron, monospace' }}>
                                {weeklyDone}/{weeklyTarget}
                            </span>
                            <span className="text-[9px] md:text-[10px] text-white/25 tracking-widest uppercase mt-1">
                                Workouts this week
                            </span>
                        </div>
                    </div>

                    {/* Weekly activity dots */}
                    <div className="flex items-center gap-3 mt-4 md:mt-6">
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

                {/* Right: data panels — a compact 3-up row on phones (three
                    stacked full-width cards wasted a screen of scroll),
                    stacked again in the narrow desktop side column */}
                <div className="flex flex-col gap-3">
                    <div className="grid grid-cols-3 gap-2 md:flex md:flex-col md:gap-3">
                        {/* Streak */}
                        <div className="border border-white/5 rounded-xl p-3 md:p-4">
                            <div className="flex items-center justify-between">
                                <span className="text-[9px] md:text-[10px] text-white/20 tracking-widest uppercase">Streak</span>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="1.5" className="hidden md:block"><path d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 2.5z" /></svg>
                            </div>
                            <p className="text-xl md:text-3xl font-black text-[#f59e0b] mt-1" style={{ fontFamily: 'Orbitron, monospace' }}>
                                {gameStats?.currentStreak || 0}
                            </p>
                            <p className="text-[9px] md:text-[10px] text-white/15 mt-0.5">days in a row</p>
                        </div>

                        {/* Total Reps */}
                        <div className="border border-white/5 rounded-xl p-3 md:p-4">
                            <span className="text-[9px] md:text-[10px] text-white/20 tracking-widest uppercase">Reps</span>
                            <p className="text-xl md:text-3xl font-black text-[#22c55e] mt-1" style={{ fontFamily: 'Orbitron, monospace' }}>
                                {progressStats?.totalReps || 0}
                            </p>
                            <p className="text-[9px] md:text-[10px] text-white/15 mt-0.5">lifetime</p>
                        </div>

                        {/* Avg Form */}
                        <div className="border border-white/5 rounded-xl p-3 md:p-4">
                            <span className="text-[9px] md:text-[10px] text-white/20 tracking-widest uppercase">Form</span>
                            <p className="text-xl md:text-3xl font-black text-[#a855f7] mt-1" style={{ fontFamily: 'Orbitron, monospace' }}>
                                {progressStats?.averageFormQuality || 0}%
                            </p>
                            <p className="text-[9px] md:text-[10px] text-white/15 mt-0.5">average</p>
                        </div>
                    </div>

                    {/* Quick actions — side by side on phones, stacked in the
                        narrow desktop column */}
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-1">
                        <Link
                            href="/workout"
                            className="flex items-center justify-center gap-2 py-3 px-2 rounded-xl bg-[#22c55e]/10 border border-[#22c55e]/25 text-[#22c55e] font-bold text-[13px] md:text-sm hover:bg-[#22c55e]/20 transition-all whitespace-nowrap"
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0"><polygon points="5,3 19,12 5,21" /></svg>
                            Start Workout
                        </Link>
                        <Link
                            href="/programs"
                            className="flex items-center justify-center gap-2 py-3 px-2 rounded-xl border border-white/5 text-white/40 font-medium text-[13px] md:text-sm hover:bg-white/[0.02] hover:text-white/60 transition-all whitespace-nowrap"
                        >
                            Browse Programs
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="flex-shrink-0"><polyline points="9,18 15,12 9,6" /></svg>
                        </Link>
                    </div>
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
