/**
 * Dashboard — COCKPIT layout.
 * One dominant element (weekly completion ring) center stage.
 * Asymmetric column splits. No stat grid at top.
 */

'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../lib/auth';
import { loadStats, UserStats } from '../../../lib/gamification';
import { getProgressStats, ProgressStats } from '../../../lib/progressStore';
import { getCoachPlan, CoachPlan } from '../../../lib/coachIntake';
import { getProgramById, Program, PROGRAMS, LEVEL_LABELS } from '../../../lib/programs';
import { listStartedPrograms, StartedProgram } from '../../../lib/programProgress';
import { launchProgramDay } from '../../../lib/workoutBuilder';
import { getUserState, assessReadiness, Readiness } from '../../../lib/userState';
import { loadRecentSessions, RecentSession } from '../../../lib/recentSessions';
import { openCoachChat } from '../../../components/CoachChat';
import Skeleton from '../../../components/Skeleton';

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
    const [recent, setRecent] = useState<RecentSession[]>([]);
    const [launching, setLaunching] = useState(false);
    const [booting, setBooting] = useState(true);

    // Hero carousel: auto-drifts until the user interacts; the next card
    // peeks in from the right so swipeability is self-evident
    const trackRef = useRef<HTMLDivElement>(null);
    const pausedRef = useRef(false);

    useEffect(() => {
        async function fetchDashboardData() {
            setGameStats(await loadStats());
            setProgressStats(await getProgressStats());
        }
        setPlan(getCoachPlan());
        getUserState().then((s) => setReadiness(assessReadiness(s))).catch(() => {});
        // Hero data gates the skeleton — don't flash "find my plan" at a user
        // who has an active program that just hasn't loaded yet
        Promise.allSettled([
            fetchDashboardData(),
            listStartedPrograms().then(setStarted),
            loadRecentSessions().then(setRecent),
        ]).then(() => setBooting(false));
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

    // Other kinds of training for the carousel — each card keeps its own
    // program's accent color. Started programs already have their own shelf.
    const startedIds = new Set(started.map((s) => s.programId));
    const explore = PROGRAMS
        .filter((p) => !p.excludeFromIntake && p.id !== hero?.program.id && !startedIds.has(p.id))
        .slice(0, 4);
    const slideCount = 1 + explore.length;

    useEffect(() => {
        if (slideCount < 2) return;
        const timer = setInterval(() => {
            const el = trackRef.current;
            if (!el || pausedRef.current) return;
            // Positions from actual card offsets — slide width is fractional
            // (peek layout), so no fixed-step math
            const cards = Array.from(el.children) as HTMLElement[];
            const lefts = cards.map((c) => c.offsetLeft - cards[0].offsetLeft);
            const current = lefts.reduce(
                (best, left, i) => (Math.abs(left - el.scrollLeft) < Math.abs(lefts[best] - el.scrollLeft) ? i : best),
                0,
            );
            el.scrollTo({ left: lefts[(current + 1) % cards.length], behavior: 'smooth' });
        }, 6000);
        return () => clearInterval(timer);
    }, [slideCount]);

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
                    <p className="text-xs text-ink/20 tracking-widest uppercase mb-1">
                        {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                    </p>
                    <h1 className="text-2xl font-bold text-ink font-display">
                        {greeting()}, <span className="text-accent">{user?.name?.split(' ')[0]}</span>
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
                            <circle cx={24} cy={24} r={20} fill="none" stroke="currentColor" className="text-ink/[0.07]" strokeWidth={3.5} />
                            <circle
                                cx={24} cy={24} r={20} fill="none" stroke="currentColor" className="text-accent" strokeWidth={3.5}
                                strokeLinecap="round"
                                strokeDasharray={2 * Math.PI * 20}
                                strokeDashoffset={(2 * Math.PI * 20) * (1 - xpPct / 100)}
                                style={{ transition: 'stroke-dashoffset 0.8s ease', filter: 'drop-shadow(0 0 4px rgba(var(--accent-glow),0.35))' }}
                            />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-sm font-black text-ink leading-none" style={{ fontFamily: 'var(--font-orbitron), monospace' }}>
                                {gameStats.level}
                            </span>
                            <span className="text-[6px] text-ink/30 tracking-widest uppercase mt-0.5">Lvl</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Skeleton while hero data loads — no find-my-plan flash */}
            {booting && (
                <div className="mb-6 space-y-3">
                    <Skeleton className="h-56 rounded-2xl" />
                </div>
            )}

            {/* ─── Hero carousel: your plan first, then other ways to train.
                 Swipes natively (scroll-snap) and drifts on its own until the
                 user takes over. ──────────────────────────────────────────── */}
            {!booting && (
            <div className="mb-6">
                <div
                    ref={trackRef}
                    onPointerDown={() => { pausedRef.current = true; }}
                    onMouseEnter={() => { pausedRef.current = true; }}
                    onMouseLeave={() => { pausedRef.current = false; }}
                    className="flex gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-hide"
                >
                    {/* Lead slide: active/picked program, or the find-my-plan invitation.
                        ~86% wide so the next card peeks in — the "you can swipe" cue */}
                    <div className={`flex-shrink-0 snap-start ${slideCount > 1 ? 'w-[86%] sm:w-[88%]' : 'w-full'}`}>
                        {hero ? (
                            <div className="force-dark relative h-full rounded-2xl overflow-hidden border border-white/10">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={hero.program.image} alt="" className="absolute inset-0 w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/60 to-black/25" />
                                <div className="relative p-5 md:p-7 h-full flex flex-col">
                                    <p className="text-[9px] font-bold tracking-[0.25em] uppercase" style={{ color: hero.program.color }}>
                                        {hero.completedDays.length > 0 ? 'Jump back in' : 'Picked for you'}
                                    </p>
                                    <h2 className="text-xl md:text-2xl font-bold text-ink mt-1 font-display">{hero.program.name}</h2>
                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-[11px] text-ink/50">
                                        <span>{LEVEL_LABELS[hero.program.level]}</span>
                                        <span className="w-0.5 h-0.5 bg-ink/20 rounded-full" />
                                        <span>{hero.program.weeks[0]?.days.length ?? 3} days/week</span>
                                        <span className="w-0.5 h-0.5 bg-ink/20 rounded-full" />
                                        <span>Next up: {dayTitle(hero.program, hero.nextDayIndex)}</span>
                                    </div>
                                    {hero.completedDays.length > 0 && (
                                        <div className="mt-3 max-w-xs">
                                            <div className="h-1.5 bg-ink/10 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full rounded-full transition-all duration-700"
                                                    style={{
                                                        width: `${(hero.completedDays.length / hero.totalDays) * 100}%`,
                                                        backgroundColor: hero.program.color,
                                                    }}
                                                />
                                            </div>
                                            <p className="text-[10px] text-ink/35 mt-1">
                                                {hero.completedDays.length} of {hero.totalDays} days done
                                            </p>
                                        </div>
                                    )}
                                    <div className="mt-auto pt-4">
                                        <button
                                            onClick={() => startDay(hero)}
                                            disabled={launching}
                                            className="w-full sm:w-auto px-6 py-3 rounded-xl font-bold text-sm tracking-wide transition-all cursor-pointer disabled:opacity-60"
                                            style={{ backgroundColor: hero.program.color, color: '#000' }}
                                        >
                                            {launching ? 'Preparing…' : `Start Day ${hero.nextDayIndex + 1} →`}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <button
                                onClick={() => openCoachChat('intake')}
                                className="force-dark relative w-full h-full rounded-2xl overflow-hidden border border-white/10 text-left cursor-pointer group"
                            >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src="/programs/full-body.png" alt="" className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-700" />
                                <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/60 to-black/25" />
                                <div className="relative p-5 md:p-7">
                                    <p className="text-[9px] font-bold tracking-[0.25em] uppercase text-accent">Let&apos;s get you started</p>
                                    <h2 className="text-xl md:text-2xl font-bold text-ink mt-1 font-display">Find the plan that fits you</h2>
                                    <p className="text-xs text-ink/45 mt-1.5 max-w-sm leading-relaxed">
                                        Five quick questions — your goal, your gear, your schedule — and your coach picks the right program.
                                    </p>
                                    <span className="inline-block mt-4 px-6 py-3 rounded-xl bg-accent text-black font-bold text-sm">
                                        Find my plan →
                                    </span>
                                </div>
                            </button>
                        )}
                    </div>

                    {/* Other kinds of training — each in its program's own color */}
                    {explore.map((p) => {
                        const totalDays = p.weeks.reduce((n, w) => n + w.days.length, 0);
                        return (
                            <div key={p.id} className="w-[86%] sm:w-[88%] flex-shrink-0 snap-start">
                                <div className="force-dark relative h-full rounded-2xl overflow-hidden border border-white/10">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={p.image} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
                                    <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/60 to-black/25" />
                                    <div className="relative p-5 md:p-7 h-full flex flex-col">
                                        <p className="text-[9px] font-bold tracking-[0.25em] uppercase" style={{ color: p.color }}>
                                            Switch it up
                                        </p>
                                        <h2 className="text-xl md:text-2xl font-bold text-ink mt-1 font-display">{p.name}</h2>
                                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-[11px] text-ink/50">
                                            <span>{LEVEL_LABELS[p.level]}</span>
                                            <span className="w-0.5 h-0.5 bg-ink/20 rounded-full" />
                                            <span>{p.weeks[0]?.days.length ?? 3} days/week</span>
                                            <span className="w-0.5 h-0.5 bg-ink/20 rounded-full" />
                                            <span>{p.durationWeeks} weeks</span>
                                        </div>
                                        <p className="text-xs text-ink/45 mt-1.5 max-w-sm leading-relaxed">{p.description}</p>
                                        <div className="mt-auto pt-4 flex items-center gap-4">
                                            <button
                                                onClick={() => startDay({ program: p, completedDays: [], nextDayIndex: 0, totalDays })}
                                                disabled={launching}
                                                className="px-6 py-3 rounded-xl font-bold text-sm tracking-wide transition-all cursor-pointer disabled:opacity-60"
                                                style={{ backgroundColor: p.color, color: '#000' }}
                                            >
                                                {launching ? 'Preparing…' : 'Start Day 1 →'}
                                            </button>
                                            <Link
                                                href={`/programs/${p.id}`}
                                                className="text-xs font-semibold text-ink/40 hover:text-ink/80 transition-colors"
                                            >
                                                See program
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
            )}

            {/* ─── Jump back in: every other unfinished program ─────────────── */}
            {jumpBack.length > 0 && (
                <div className="mb-6">
                    <h3 className="text-[10px] text-ink/20 tracking-widest uppercase mb-3">Jump back in</h3>
                    <div className="flex gap-3 overflow-x-auto scrollbar-hide snap-x -mx-4 px-4">
                        {jumpBack.map((item) => (
                            <Link
                                key={item.program.id}
                                href={`/programs/${item.program.id}`}
                                className="flex-shrink-0 snap-start w-[58vw] sm:w-64 group"
                            >
                                <div className="force-dark relative h-24 rounded-xl overflow-hidden border border-white/5 group-hover:border-white/15 transition-all">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={item.program.image} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
                                    <div className="absolute bottom-2 left-3 right-3">
                                        <p className="text-[13px] font-semibold text-ink truncate">{item.program.name}</p>
                                        <div className="h-1 bg-ink/15 rounded-full overflow-hidden mt-1.5">
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
                                <p className="text-[10px] text-ink/25 mt-1.5">
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
                    old fixed height left a screen-filling void. The whole
                    card opens the training calendar. */}
                <Link
                    href="/calendar"
                    aria-label="Open your training calendar"
                    className="relative border border-ink/5 rounded-xl p-5 md:p-8 flex flex-col items-center justify-center md:min-h-[320px] group hover:border-ink/15 transition-all cursor-pointer"
                >
                    {/* Background ghost number */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden">
                        <span
                            className="text-[110px] md:text-[200px] font-black text-ink/[0.015] leading-none"
                            style={{ fontFamily: 'var(--font-orbitron), monospace' }}
                        >
                            {weeklyDone}
                        </span>
                    </div>

                    {/* Ring */}
                    <div className="relative">
                        <svg width={200} height={200} viewBox="0 0 200 200" className="w-[148px] h-[148px] md:w-[200px] md:h-[200px] transform -rotate-90">
                            <circle cx={100} cy={100} r={ringRadius} fill="none" stroke="currentColor" className="text-ink/[0.05]" strokeWidth={6} />
                            <circle
                                cx={100} cy={100} r={ringRadius} fill="none" stroke="currentColor" className="text-accent" strokeWidth={6}
                                strokeLinecap="round" strokeDasharray={ringCircumference} strokeDashoffset={ringOffset}
                                style={{ transition: 'stroke-dashoffset 1s ease', filter: 'drop-shadow(0 0 8px rgba(var(--accent-glow),0.3))' }}
                            />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-2xl md:text-4xl font-black text-ink" style={{ fontFamily: 'var(--font-orbitron), monospace' }}>
                                {weeklyDone}/{weeklyTarget}
                            </span>
                            {/* -mr cancels the trailing letter-space so the
                                tracked uppercase line is truly centered; the
                                max-w keeps it inside the ring on phones */}
                            <span className="block text-center leading-snug max-w-[96px] md:max-w-[150px] text-[9px] md:text-[10px] text-ink/25 tracking-widest uppercase mt-1 -mr-[0.1em]">
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
                                            ? 'bg-accent shadow-[0_0_6px_rgba(var(--accent-glow),0.4)]'
                                            : 'bg-ink/5'
                                        }`}
                                />
                                <span className="text-[9px] text-ink/15">{d.day}</span>
                            </div>
                        ))}
                    </div>

                    <span className="flex items-center gap-1 text-[10px] font-semibold text-ink/20 group-hover:text-accent transition-colors mt-3 md:mt-4">
                        View calendar
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9,18 15,12 9,6" /></svg>
                    </span>
                </Link>

                {/* Right: data panels — a compact 3-up row on phones (three
                    stacked full-width cards wasted a screen of scroll),
                    stacked again in the narrow desktop side column */}
                <div className="flex flex-col gap-3">
                    <div className="grid grid-cols-3 gap-2 md:flex md:flex-col md:gap-3">
                        {/* Streak */}
                        <div className="border border-ink/5 rounded-xl p-3 md:p-4">
                            <div className="flex items-center justify-between">
                                <span className="text-[9px] md:text-[10px] text-ink/20 tracking-widest uppercase">Streak</span>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="hidden md:block text-warm"><path d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 2.5z" /></svg>
                            </div>
                            <p className="text-xl md:text-3xl font-black text-warm mt-1" style={{ fontFamily: 'var(--font-orbitron), monospace' }}>
                                {gameStats?.currentStreak || 0}
                            </p>
                            <p className="text-[9px] md:text-[10px] text-ink/15 mt-0.5">days in a row</p>
                        </div>

                        {/* Total Reps */}
                        <div className="border border-ink/5 rounded-xl p-3 md:p-4">
                            <span className="text-[9px] md:text-[10px] text-ink/20 tracking-widest uppercase">Reps</span>
                            <p className="text-xl md:text-3xl font-black text-accent mt-1" style={{ fontFamily: 'var(--font-orbitron), monospace' }}>
                                {progressStats?.totalReps || 0}
                            </p>
                            <p className="text-[9px] md:text-[10px] text-ink/15 mt-0.5">lifetime</p>
                        </div>

                        {/* Avg Form */}
                        <div className="border border-ink/5 rounded-xl p-3 md:p-4">
                            <span className="text-[9px] md:text-[10px] text-ink/20 tracking-widest uppercase">Form</span>
                            <p className="text-xl md:text-3xl font-black text-violet mt-1" style={{ fontFamily: 'var(--font-orbitron), monospace' }}>
                                {progressStats?.averageFormQuality || 0}%
                            </p>
                            <p className="text-[9px] md:text-[10px] text-ink/15 mt-0.5">average</p>
                        </div>
                    </div>

                    {/* Quick actions — side by side on phones, stacked in the
                        narrow desktop column */}
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-1">
                        <Link
                            href="/workout"
                            className="flex items-center justify-center gap-2 py-3 px-2 rounded-xl bg-accent/10 border border-accent/25 text-accent font-bold text-[13px] md:text-sm hover:bg-accent/20 transition-all whitespace-nowrap"
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0"><polygon points="5,3 19,12 5,21" /></svg>
                            Start Workout
                        </Link>
                        <Link
                            href="/programs"
                            className="flex items-center justify-center gap-2 py-3 px-2 rounded-xl border border-ink/5 text-ink/40 font-medium text-[13px] md:text-sm hover:bg-ink/[0.02] hover:text-ink/60 transition-all whitespace-nowrap"
                        >
                            Browse Programs
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="flex-shrink-0"><polyline points="9,18 15,12 9,6" /></svg>
                        </Link>
                        <Link
                            href="/cardio"
                            className="flex items-center justify-center gap-2 py-3 px-2 rounded-xl border border-ink/5 text-ink/40 font-medium text-[13px] md:text-sm hover:bg-ink/[0.02] hover:text-ink/60 transition-all whitespace-nowrap"
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0"><path d="M20.4 12.6a5.5 5.5 0 00-8.4-7 5.5 5.5 0 00-8.4 7L12 21l4.2-4.2" /><polyline points="7,12 10,12 12,8 14,15 16,12 21,12" /></svg>
                            Cardio
                        </Link>
                        <Link
                            href="/replays"
                            className="flex items-center justify-center gap-2 py-3 px-2 rounded-xl border border-ink/5 text-ink/40 font-medium text-[13px] md:text-sm hover:bg-ink/[0.02] hover:text-ink/60 transition-all whitespace-nowrap"
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0"><polygon points="23,7 16,12 23,17" /><rect x="1" y="5" width="15" height="14" rx="2" /></svg>
                            My Replays
                        </Link>
                    </div>
                </div>
            </div>

            {/* ─── Recent activity strip — image cards with completion % ────── */}
            {recent.length > 0 ? (
                <div className="border-t border-ink/5 pt-6">
                    <h3 className="text-[10px] text-ink/20 tracking-widest uppercase mb-3">Recent</h3>
                    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 snap-x">
                        {recent.map((s) => (
                            <Link
                                key={s.id}
                                href={s.href}
                                className="flex-shrink-0 snap-start w-44 border border-ink/5 rounded-xl overflow-hidden hover:border-ink/15 transition-all group"
                            >
                                {/* Image: program photo (dark art) or exercise
                                    demo GIF (white canvas) */}
                                <div className={`relative h-24 ${s.imageKind === 'gif' ? 'bg-white' : 'force-dark bg-surface'}`}>
                                    {s.image ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={s.image} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
                                    ) : (
                                        <span className="absolute inset-0 flex items-center justify-center text-lg font-black text-accent/40 font-display">
                                            {s.icon ?? '—'}
                                        </span>
                                    )}
                                    {s.completionPct !== null && (
                                        <span className={`absolute top-1.5 right-1.5 text-[10px] font-black rounded-full px-2 py-0.5 bg-black/65 backdrop-blur-sm ${s.completionPct >= 100 ? 'text-[#4ade80]' : 'text-white'}`} style={{ fontFamily: 'var(--font-orbitron), monospace' }}>
                                            {s.completionPct}%
                                        </span>
                                    )}
                                </div>
                                <div className="p-3">
                                    <p className="text-xs font-semibold text-ink/80 truncate">{s.name}</p>
                                    <p className="text-[10px] text-ink/25 truncate mt-0.5">
                                        {s.detail ?? `${s.totalReps} reps`}
                                    </p>
                                    {/* Completion bar */}
                                    {s.completionPct !== null && (
                                        <div className="h-1 bg-ink/10 rounded-full overflow-hidden mt-2">
                                            <div
                                                className="h-full rounded-full bg-accent transition-all"
                                                style={{ width: `${s.completionPct}%` }}
                                            />
                                        </div>
                                    )}
                                    <div className="flex items-center gap-1.5 mt-2 text-[10px] text-ink/20">
                                        <span>{s.totalReps} reps</span>
                                        {s.formScore !== null && (
                                            <>
                                                <span className="w-0.5 h-0.5 bg-ink/10 rounded-full" />
                                                <span>form {s.formScore}%</span>
                                            </>
                                        )}
                                        <span className="w-0.5 h-0.5 bg-ink/10 rounded-full" />
                                        <span>{s.completedAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            ) : progressStats && progressStats.recentWorkouts.length > 0 ? (
                /* Legacy fallback: accounts whose history predates session rows */
                <div className="border-t border-ink/5 pt-6">
                    <h3 className="text-[10px] text-ink/20 tracking-widest uppercase mb-3">Recent</h3>
                    <div className="flex gap-3 overflow-x-auto pb-2">
                        {progressStats.recentWorkouts.slice(0, 6).map((w) => (
                            <div key={w.id} className="flex-shrink-0 border border-ink/5 rounded-lg px-4 py-3 min-w-[160px]">
                                <p className="text-xs font-medium text-ink/70 truncate">{w.exerciseName}</p>
                                <div className="flex items-baseline gap-2 mt-1">
                                    <span className="text-lg font-black text-accent" style={{ fontFamily: 'var(--font-orbitron), monospace' }}>
                                        {w.reps}
                                    </span>
                                    <span className="text-[10px] text-ink/20">reps</span>
                                </div>
                                <div className="flex items-center gap-2 mt-1 text-[10px] text-ink/15">
                                    <span>Form {w.formQuality}%</span>
                                    <span className="w-0.5 h-0.5 bg-ink/10 rounded-full" />
                                    <span>{new Date(w.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : null}
        </div>
    );
}
