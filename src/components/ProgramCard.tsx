/**
 * ProgramCard — Grid card with fitness image. Cinematic hover effects.
 */

'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Program } from '../lib/programs';

interface ProgramCardProps {
    program: Program;
}

export default function ProgramCard({ program }: ProgramCardProps) {
    const totalExercises = program.weeks.reduce(
        (sum, w) => sum + w.days.reduce((s, d) => s + d.exercises.length, 0),
        0
    );
    const totalDays = program.weeks.reduce((sum, w) => sum + w.days.length, 0);

    return (
        <Link href={`/programs/${program.id}`}>
            <div className="group relative rounded-xl overflow-hidden border border-white/5 hover:border-white/15 transition-all duration-500 cursor-pointer">
                {/* Image */}
                <div className="relative aspect-[4/5] overflow-hidden">
                    <Image
                        src={program.image}
                        alt={program.name}
                        fill
                        sizes="(max-width: 768px) 50vw, 33vw"
                        className="object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    {/* Gradient overlays */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                    <div
                        className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-500"
                        style={{ background: `linear-gradient(135deg, ${program.color}, transparent)` }}
                    />

                    {/* Level badge — top right */}
                    <span
                        className="absolute top-3 right-3 text-[9px] font-bold tracking-widest uppercase px-2.5 py-1 rounded-full border backdrop-blur-sm"
                        style={{ borderColor: `${program.color}50`, color: program.color, backgroundColor: 'rgba(0,0,0,0.5)' }}
                    >
                        {program.level}
                    </span>
                </div>

                {/* Content overlay — pinned to bottom */}
                <div className="absolute bottom-0 left-0 right-0 p-4">
                    <h3 className="text-base font-bold text-white mb-1 group-hover:text-[#22c55e] transition-colors duration-300">
                        {program.name}
                    </h3>
                    <p className="text-xs text-white/40 mb-3 line-clamp-2 leading-relaxed">{program.description}</p>

                    {/* Meta row */}
                    <div className="flex items-center gap-3 text-[10px] text-white/25 font-medium">
                        <span className="flex items-center gap-1">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                            {program.durationWeeks}W
                        </span>
                        <span className="w-0.5 h-0.5 bg-white/10 rounded-full" />
                        <span>{totalDays} days</span>
                        <span className="w-0.5 h-0.5 bg-white/10 rounded-full" />
                        <span>{totalExercises} ex.</span>
                    </div>
                </div>
            </div>
        </Link>
    );
}
