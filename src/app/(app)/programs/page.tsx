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
            <div className="relative h-28 sm:h-32 rounded-xl overflow-hidden border border-white/5 group-hover:border-white/15 transition-all">
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
            <p className="text-[13px] font-semibold text-white/85 mt-2 truncate">{program.name}</p>
            <p className="text-[10px] text-white/25 mt-0.5">
                {program.weeks.length} wk · {daysPerWeek} days/week
            </p>
        </Link>
    );
}

// ─── Shelf — a titled, swipeable row ─────────────────────────────────────────

function ProgramShelf({
    title,
    programs,
    rowRef,
    onInteract,
}: {
    title: string;
    programs: Program[];
    rowRef?: React.RefObject<HTMLDivElement | null>;
    onInteract?: () => void;
}) {
    if (programs.length === 0) return null;
    return (
        <div className="mb-7">
            <div className="flex items-baseline justify-between mb-3">
                <h2 className="text-sm font-bold text-white/80">{title}</h2>
                <span className="text-[10px] text-white/20">{programs.length}</span>
            </div>
            <div
                ref={rowRef}
                onTouchStart={onInteract}
                onPointerDown={onInteract}
                onWheel={onInteract}
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
    const pickedRowRef = useRef<HTMLDivElement>(null);

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

    // "Picked for you": the user's own intake answers rank the catalog (their
    // chosen plan always leads). Without an intake yet, lead with the
    // easiest ways in. Everything else lands in the explore shelf.
    let picked: Program[];
    if (plan) {
        const ranked = scorePrograms(plan.answers).map((s) => s.program);
        picked = [
            ...(planProgram ? [planProgram] : []),
            ...ranked.filter((p) => p.id !== plan.programId),
        ].slice(0, 7);
    } else {
        picked = PROGRAMS.filter((p) => p.level === 'beginner' || p.level === 'senior').slice(0, 7);
    }
    const pickedIds = new Set(picked.map((p) => p.id));
    const explore = PROGRAMS.filter((p) => !pickedIds.has(p.id));

    const filteredOnly = PROGRAMS.filter((p) => p.level === filter);

    // The picked shelf drifts one tile forward every few seconds; user input
    // pauses it, hidden tabs stop it, reduced-motion disables it.
    const pauseUntilRef = useRef(0);
    const pauseAutoPlay = useCallback(() => {
        pauseUntilRef.current = Date.now() + 8000;
    }, []);

    useEffect(() => {
        if (filter !== 'all') return;
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        const id = setInterval(() => {
            const el = pickedRowRef.current;
            if (!el || document.hidden || Date.now() < pauseUntilRef.current) return;
            const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 8;
            if (atEnd) el.scrollTo({ left: 0, behavior: 'smooth' });
            else el.scrollBy({ left: el.clientWidth * 0.5, behavior: 'smooth' });
        }, 4500);
        return () => clearInterval(id);
    }, [filter]);

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
                        <p className="text-[10px] text-white/15 tracking-widest uppercase mb-1">{PROGRAMS.length} available</p>
                        <h1 className="text-2xl font-bold text-white">Programs</h1>
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
                                        ? 'bg-[#22c55e]/10 text-[#22c55e] border-[#22c55e]/30'
                                        : 'text-white/25 border-white/8 hover:text-white/40'
                                    }
                                `}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>

                    {/* Desktop: segmented control */}
                    <div className="hidden md:flex items-center border border-white/5 rounded-lg overflow-hidden">
                        {filters.map((f) => (
                            <button
                                key={f.key}
                                onClick={() => setFilter(f.key)}
                                className={`
                                    px-4 py-2 text-[11px] font-bold tracking-wider uppercase transition-all cursor-pointer
                                    ${filter === f.key
                                        ? 'bg-[#22c55e]/10 text-[#22c55e]'
                                        : 'text-white/20 hover:text-white/40 hover:bg-white/[0.02]'
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
                        <p className="text-sm font-semibold text-white truncate">{planProgram.name}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                            onClick={() => openCoachChat('intake')}
                            className="text-[11px] text-white/30 hover:text-white/60 transition-colors cursor-pointer px-2 py-2"
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
                    className="w-full flex items-center justify-between gap-3 rounded-xl border border-[#22c55e]/25 bg-[#22c55e]/[0.06] hover:bg-[#22c55e]/10 px-4 py-4 mb-6 transition-all cursor-pointer text-left"
                >
                    <div>
                        <p className="text-sm font-semibold text-white mb-0.5">Not sure where to start?</p>
                        <p className="text-[11px] text-white/35">Answer five quick questions and get a plan matched to your goal, gear, and schedule.</p>
                    </div>
                    <span className="flex-shrink-0 text-xs font-bold px-4 py-2 rounded-lg bg-[#22c55e] text-black">
                        Find my plan
                    </span>
                </button>
            )}

            {/* Shelves */}
            {filter === 'all' ? (
                <>
                    <ProgramShelf
                        title="Picked for you"
                        programs={picked}
                        rowRef={pickedRowRef}
                        onInteract={pauseAutoPlay}
                    />
                    <ProgramShelf title="More to explore" programs={explore} />
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
