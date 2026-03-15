/**
 * Programs Page — Horizontal scroll carousel with full-viewport cards.
 * Filter tabs at top.
 */

'use client';

import { useState } from 'react';
import { PROGRAMS } from '../../../lib/programs';
import ProgramCard from '../../../components/ProgramCard';

type Filter = 'all' | 'beginner' | 'intermediate' | 'senior';

export default function ProgramsPage() {
    const [filter, setFilter] = useState<Filter>('all');

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

            {/* Horizontal scroll carousel — full viewport cards */}
            <div className="flex gap-5 overflow-x-auto snap-x snap-mandatory pb-4 scrollbar-hide -mx-4 px-4">
                {filtered.map((program) => (
                    <ProgramCard key={program.id} program={program} />
                ))}
            </div>
        </div>
    );
}
