/**
 * Programs Page — Horizontal scroll carousel with full-viewport cards.
 * Filter tabs at top.
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { PROGRAMS, getProgramById } from '../../../lib/programs';
import { getCoachPlan, CoachPlan } from '../../../lib/coachIntake';
import { syncCoachPlan } from '../../../lib/userProfile';
import ProgramCard from '../../../components/ProgramCard';
import { openCoachChat } from '../../../components/CoachChat';

type Filter = 'all' | 'beginner' | 'intermediate' | 'senior';

export default function ProgramsPage() {
    const [filter, setFilter] = useState<Filter>('all');
    const [plan, setPlan] = useState<CoachPlan | null>(null);
    const [slide, setSlide] = useState(0);
    const carouselRef = useRef<HTMLDivElement>(null);

    // Local cache renders instantly; the server copy (which follows the user
    // across devices) reconciles in the background. The intake now runs in
    // the coach chat — it announces 'irontrack-plan-saved' when done.
    useEffect(() => {
        setPlan(getCoachPlan());
        syncCoachPlan().then(setPlan);
        const onPlanSaved = () => setPlan(getCoachPlan());
        window.addEventListener('irontrack-plan-saved', onPlanSaved);
        return () => window.removeEventListener('irontrack-plan-saved', onPlanSaved);
    }, []);

    const planProgram = plan ? getProgramById(plan.programId) : null;

    const filtered = filter === 'all'
        ? PROGRAMS
        : PROGRAMS.filter(p => p.level === filter);

    // Track which card is in view for the slideshow dots
    const onCarouselScroll = useCallback(() => {
        const el = carouselRef.current;
        if (!el || filtered.length === 0) return;
        const cardSpan = el.scrollWidth / filtered.length;
        setSlide(Math.min(filtered.length - 1, Math.round(el.scrollLeft / cardSpan)));
    }, [filtered.length]);

    const filters: { key: Filter; label: string }[] = [
        { key: 'all', label: 'All Programs' },
        { key: 'beginner', label: 'Beginner' },
        { key: 'intermediate', label: 'Intermediate' },
        { key: 'senior', label: 'Gentle' },
    ];

    return (
        <div className="max-w-6xl mx-auto p-4 md:p-6">
            {/* Header — title and filters stack on mobile (side by side they
                clipped the tabs and squeezed the title); the filters become a
                swipeable chip row, and stay a segmented control on desktop */}
            <div className="mb-6">
                <div className="md:flex md:items-end md:justify-between">
                    <div className="mb-4 md:mb-0">
                        <p className="text-[10px] text-white/15 tracking-widest uppercase mb-1">{filtered.length} available</p>
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

            {/* Slideshow carousel — one card at a time, the next one peeking in
                from the right so new users know there's more to swipe */}
            <div
                ref={carouselRef}
                onScroll={onCarouselScroll}
                className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-4 scrollbar-hide -mx-4 px-4"
            >
                {filtered.map((program) => (
                    <ProgramCard key={program.id} program={program} />
                ))}
            </div>

            {/* Slide dots */}
            <div className="flex items-center justify-center gap-1.5 mt-1">
                {filtered.map((program, i) => (
                    <span
                        key={program.id}
                        aria-hidden="true"
                        className="rounded-full transition-all duration-300"
                        style={{
                            width: i === slide ? 18 : 6,
                            height: 6,
                            backgroundColor: i === slide ? program.color : 'rgba(255,255,255,0.12)',
                        }}
                    />
                ))}
            </div>
        </div>
    );
}
