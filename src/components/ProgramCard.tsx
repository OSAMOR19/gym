/**
 * ProgramCard — Card component for displaying workout programs.
 */

'use client';

import Link from 'next/link';
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
            <div className="glass-panel rounded-2xl p-6 hover:bg-white/[0.06] transition-all duration-300 cursor-pointer group h-full">
                {/* Icon + Level badge */}
                <div className="flex items-start justify-between mb-4">
                    <div
                        className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl"
                        style={{ backgroundColor: `${program.color}15`, boxShadow: `0 0 20px ${program.color}15` }}
                    >
                        {program.icon}
                    </div>
                    <span
                        className="text-[10px] font-semibold tracking-widest uppercase px-3 py-1 rounded-full"
                        style={{ backgroundColor: `${program.color}15`, color: program.color }}
                    >
                        {program.level}
                    </span>
                </div>

                {/* Name + Description */}
                <h3 className="text-lg font-bold text-white mb-1 group-hover:text-[#22c55e] transition-colors">
                    {program.name}
                </h3>
                <p className="text-white/40 text-sm mb-4 line-clamp-2">{program.description}</p>

                {/* Stats row */}
                <div className="flex items-center gap-4 text-xs text-white/30">
                    <span>{program.durationWeeks} weeks</span>
                    <span className="w-1 h-1 bg-white/20 rounded-full" />
                    <span>{totalDays} days</span>
                    <span className="w-1 h-1 bg-white/20 rounded-full" />
                    <span>{totalExercises} exercises</span>
                </div>
            </div>
        </Link>
    );
}
