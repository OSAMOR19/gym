/**
 * Programs Page — Spotify-style browsing: horizontal shelves of compact
 * program tiles ("Picked for you" ranked by the user's own intake answers,
 * then "More to explore"), each row swipeable, several tiles in view at once.
 * The first shelf drifts forward on its own; any touch pauses it.
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { PROGRAMS, getProgramById, Program, LEVEL_LABELS } from '../../../lib/programs';
import { getCoachPlan, CoachPlan, scorePrograms } from '../../../lib/coachIntake';
import { syncCoachPlan } from '../../../lib/userProfile';
import { openCoachChat } from '../../../components/CoachChat';

type Filter = 'all' | 'beginner' | 'intermediate' | 'senior';

// ─── Compact tile — small enough that a row shows 2–3 at once ────────────────

function ProgramTile({ program }: { program: Program }) {
    const daysPerWeek = program.weeks[0]?.days.length ?? 3;
    return (
        <Link href={`/programs/${program.id}`} className="flex-shrink-0 snap-start w-[44vw] sm:w-52 group">
            <div className="relative h-28 sm:h-32 rounded-xl overflow-hidden border border-ink/5 group-hover:border-ink/15 transition-all">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={program.image} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                <span
                    className="absolute top-2 right-2 text-[8px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full border backdrop-blur-sm"
                    style={{ borderColor: `${program.color}50`, color: program.color, backgroundColor: 'rgba(0,0,0,0.5)' }}
                >
                    {LEVEL_LABELS[program.level]}
                </span>
            </div>
            <p className="text-[13px] font-semibold text-ink/85 mt-2 truncate">{program.name}</p>
            <p className="text-[10px] text-ink/25 mt-0.5">
                {program.weeks.length} wk · {daysPerWeek} days/week
            </p>
        </Link>
    );
}

// ─── Shelf — a titled, swipeable row that can drift on its own ───────────────
// Each auto-playing shelf runs its own clock (staggered so rows don't march
// in sync); any touch pauses it, hidden tabs stop it, reduced-motion disables.

function ProgramShelf({
    title,
    programs,
    autoPlay = false,
    autoPlayStaggerMs = 0,
}: {
    title: string;
    programs: Program[];
    autoPlay?: boolean;
    autoPlayStaggerMs?: number;
}) {
    const rowRef = useRef<HTMLDivElement>(null);
    const pauseUntilRef = useRef(0);
    const pause = useCallback(() => {
        pauseUntilRef.current = Date.now() + 8000;
    }, []);

    useEffect(() => {
        if (!autoPlay || programs.length < 2) return;
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        let intervalId: ReturnType<typeof setInterval> | undefined;
        const timeoutId = setTimeout(() => {
            intervalId = setInterval(() => {
                const el = rowRef.current;
                if (!el || document.hidden || Date.now() < pauseUntilRef.current) return;
                const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 8;
                if (atEnd) el.scrollTo({ left: 0, behavior: 'smooth' });
                else el.scrollBy({ left: el.clientWidth * 0.5, behavior: 'smooth' });
            }, 4500);
        }, autoPlayStaggerMs);
        return () => { clearTimeout(timeoutId); if (intervalId) clearInterval(intervalId); };
    }, [autoPlay, autoPlayStaggerMs, programs.length]);

    if (programs.length === 0) return null;
    return (
        <div className="mb-7">
            <div className="flex items-baseline justify-between mb-3">
                <h2 className="text-sm font-bold text-ink/80">{title}</h2>
                <span className="text-[10px] text-ink/20">{programs.length}</span>
            </div>
            <div
                ref={rowRef}
                onTouchStart={pause}
                onPointerDown={pause}
                onWheel={pause}
                className="flex gap-3 overflow-x-auto snap-x scrollbar-hide -mx-4 px-4"
            >
                {programs.map((p) => <ProgramTile key={p.id} program={p} />)}
            </div>
        </div>
    );
}

export default function ProgramsPage() {
    const [filter, setFilter] = useState<Filter>('all');
    const [plan, setPlan] = useState<CoachPlan | null>(null);

    // Local cache renders instantly; the server copy (which follows the user
    // across devices) reconciles in the background. The intake runs in the
    // coach chat and announces 'irontrack-plan-saved' when done.
    useEffect(() => {
        setPlan(getCoachPlan());
        syncCoachPlan().then(setPlan);
        const onPlanSaved = () => setPlan(getCoachPlan());
        window.addEventListener('irontrack-plan-saved', onPlanSaved);
        return () => window.removeEventListener('irontrack-plan-saved', onPlanSaved);
    }, []);

    const planProgram = plan ? getProgramById(plan.programId) : null;

    // Three shelves, no overlaps:
    //  1. "Picked for you" — the user's own intake answers rank the catalog
    //     (their chosen plan leads); easiest ways in when no intake yet.
    //  2. "Quick starts" — short programs (≤ 2 weeks) from what's left.
    //  3. "More to explore" — everything else.
    let picked: Program[];
    if (plan) {
        const ranked = scorePrograms(plan.answers).map((s) => s.program);
        picked = [
            ...(planProgram ? [planProgram] : []),
            ...ranked.filter((p) => p.id !== plan.programId),
        ].slice(0, 5);
    } else {
        picked = PROGRAMS.filter((p) => p.level === 'beginner' || p.level === 'senior').slice(0, 5);
    }
    const pickedIds = new Set(picked.map((p) => p.id));
    const remaining = PROGRAMS.filter((p) => !pickedIds.has(p.id));
    const quick = remaining.filter((p) => p.weeks.length <= 2);
    const quickIds = new Set(quick.map((p) => p.id));
    const explore = remaining.filter((p) => !quickIds.has(p.id));

    const filteredOnly = PROGRAMS.filter((p) => p.level === filter);

    const filters: { key: Filter; label: string }[] = [
        { key: 'all', label: 'All Programs' },
        { key: 'beginner', label: 'Beginner' },
        { key: 'intermediate', label: 'Intermediate' },
        { key: 'senior', label: 'Gentle' },
    ];

    return (
        <div className="max-w-6xl mx-auto p-4 md:p-6">
            {/* Header — title and filters stack on mobile; the filters are a
                swipeable chip row, and a segmented control on desktop */}
            <div className="mb-6">
                <div className="md:flex md:items-end md:justify-between">
                    <div className="mb-4 md:mb-0">
                        <p className="text-[10px] text-ink/15 tracking-widest uppercase mb-1">{PROGRAMS.length} available</p>
                        <h1 className="text-2xl font-bold text-ink">Programs</h1>
                    </div>

                    {/* Mobile: scrollable filter chips */}
                    <div className="flex md:hidden items-center gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4">
                        {filters.map((f) => (
                            <button
                                key={f.key}
                                onClick={() => setFilter(f.key)}
                                className={`
                                    flex-shrink-0 px-3.5 py-2 rounded-full text-[11px] font-bold tracking-wider uppercase border transition-all cursor-pointer
                                    ${filter === f.key
                                        ? 'bg-accent/10 text-accent border-accent/30'
                                        : 'text-ink/25 border-ink/8 hover:text-ink/40'
                                    }
                                `}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>

                    {/* Desktop: segmented control */}
                    <div className="hidden md:flex items-center border border-ink/5 rounded-lg overflow-hidden">
                        {filters.map((f) => (
                            <button
                                key={f.key}
                                onClick={() => setFilter(f.key)}
                                className={`
                                    px-4 py-2 text-[11px] font-bold tracking-wider uppercase transition-all cursor-pointer
                                    ${filter === f.key
                                        ? 'bg-accent/10 text-accent'
                                        : 'text-ink/20 hover:text-ink/40 hover:bg-ink/[0.02]'
                                    }
                                `}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Coach entry — the answer to "which one?" lives on the page that asks it */}
            {planProgram ? (
                <div
                    className="flex items-center justify-between gap-3 rounded-xl border px-4 py-3.5 mb-6"
                    style={{ borderColor: `${planProgram.color}30`, backgroundColor: `${planProgram.color}08` }}
                >
                    <div className="min-w-0">
                        <p className="text-[9px] font-bold tracking-widest uppercase mb-0.5" style={{ color: planProgram.color }}>
                            Your plan
                        </p>
                        <p className="text-sm font-semibold text-ink truncate">{planProgram.name}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                            onClick={() => openCoachChat('intake')}
                            className="text-[11px] text-ink/30 hover:text-ink/60 transition-colors cursor-pointer px-2 py-2"
                        >
                            Retake
                        </button>
                        <Link
                            href={`/programs/${planProgram.id}`}
                            className="text-xs font-bold px-4 py-2 rounded-lg transition-all"
                            style={{ backgroundColor: planProgram.color, color: '#000' }}
                        >
                            Continue →
                        </Link>
                    </div>
                </div>
            ) : (
                <button
                    onClick={() => openCoachChat('intake')}
                    className="w-full flex items-center justify-between gap-3 rounded-xl border border-accent/25 bg-accent/[0.06] hover:bg-accent/10 px-4 py-4 mb-6 transition-all cursor-pointer text-left"
                >
                    <div>
                        <p className="text-sm font-semibold text-ink mb-0.5">Not sure where to start?</p>
                        <p className="text-[11px] text-ink/35">Answer five quick questions and get a plan matched to your goal, gear, and schedule.</p>
                    </div>
                    <span className="flex-shrink-0 text-xs font-bold px-4 py-2 rounded-lg bg-accent text-black">
                        Find my plan
                    </span>
                </button>
            )}

            {/* Shelves — all three drift on their own, staggered */}
            {filter === 'all' ? (
                <>
                    <ProgramShelf title="Picked for you" programs={picked} autoPlay />
                    <ProgramShelf title="Quick starts" programs={quick} autoPlay autoPlayStaggerMs={1600} />
                    <ProgramShelf title="More to explore" programs={explore} autoPlay autoPlayStaggerMs={3200} />
                </>
            ) : (
                <ProgramShelf
                    title={filters.find((f) => f.key === filter)?.label ?? ''}
                    programs={filteredOnly}
                />
            )}
        </div>
    );
}
