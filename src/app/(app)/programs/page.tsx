/**
 * Programs Page — Horizontal scroll carousel with full-viewport cards.
 * Filter tabs at top.
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { PROGRAMS, getProgramById } from '../../../lib/programs';
import { getCoachPlan, CoachPlan } from '../../../lib/coachIntake';
import ProgramCard from '../../../components/ProgramCard';
import CoachIntakeModal from '../../../components/CoachIntakeModal';

type Filter = 'all' | 'beginner' | 'intermediate' | 'senior';

export default function ProgramsPage() {
    const [filter, setFilter] = useState<Filter>('all');
    const [coachOpen, setCoachOpen] = useState(false);
    const [plan, setPlan] = useState<CoachPlan | null>(null);

    // localStorage is client-only — read after mount
    useEffect(() => {
        setPlan(getCoachPlan());
    }, [coachOpen]);

    const planProgram = plan ? getProgramById(plan.programId) : null;

    const filtered = filter === 'all'
        ? PROGRAMS
        : PROGRAMS.filter(p => p.level === filter);

    const filters: { key: Filter; label: string }[] = [
        { key: 'all', label: 'All Programs' },
        { key: 'beginner', label: 'Beginner' },
        { key: 'intermediate', label: 'Intermediate' },
        { key: 'senior', label: 'Senior' },
    ];

    return (
        <div className="max-w-6xl mx-auto p-4 md:p-6">
            {/* Header */}
            <div className="flex items-end justify-between mb-6">
                <div>
                    <p className="text-[10px] text-white/15 tracking-widest uppercase mb-1">{filtered.length} available</p>
                    <h1 className="text-2xl font-bold text-white">Programs</h1>
                </div>

                {/* Filter tabs */}
                <div className="flex items-center border border-white/5 rounded-lg overflow-hidden">
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
                            onClick={() => setCoachOpen(true)}
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
                    onClick={() => setCoachOpen(true)}
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

            {/* Horizontal scroll carousel — full viewport cards */}
            <div className="flex gap-5 overflow-x-auto snap-x snap-mandatory pb-4 scrollbar-hide -mx-4 px-4">
                {filtered.map((program) => (
                    <ProgramCard key={program.id} program={program} />
                ))}
            </div>

            <CoachIntakeModal open={coachOpen} onClose={() => setCoachOpen(false)} />
        </div>
    );
}
