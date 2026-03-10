/**
 * Program Detail Page — EDITORIAL layout. No emojis.
 */

'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { getProgramById } from '../../../../lib/programs';
import { EXERCISES } from '../../../../lib/exercises';
import ExerciseCard from '../../../../components/ExerciseCard';

export default function ProgramDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const program = getProgramById(id);

    if (!program) {
        return (
            <div className="max-w-5xl mx-auto p-6 text-center">
                <p className="text-white/40">Program not found.</p>
            </div>
        );
    }

    const totalExercises = program.weeks.reduce(
        (sum, w) => sum + w.days.reduce((s, d) => s + d.exercises.length, 0), 0
    );
    const totalDays = program.weeks.reduce((sum, w) => sum + w.days.length, 0);

    return (
        <div className="max-w-5xl mx-auto p-4 md:p-6">
            {/* ─── Back button ──────────────────────────────────────────────── */}
            <button
                onClick={() => router.push('/programs')}
                className="flex items-center gap-2 text-sm text-white/30 hover:text-white/60 transition-colors mb-4 cursor-pointer group"
            >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="group-hover:-translate-x-0.5 transition-transform">
                    <polyline points="15,18 9,12 15,6" />
                </svg>
                Back to Programs
            </button>

            {/* ─── Hero header ──────────────────────────────────────────────── */}
            <div className="relative border border-white/5 rounded-xl p-6 md:p-8 mb-6 overflow-hidden">
                {/* Background accent */}
                <div
                    className="absolute inset-0 opacity-[0.03]"
                    style={{ background: `linear-gradient(135deg, ${program.color}, transparent 50%)` }}
                />

                {/* Ghost code */}
                <div className="absolute top-4 right-6 pointer-events-none select-none">
                    <span
                        className="text-[120px] font-black leading-none text-white/[0.015]"
                        style={{ fontFamily: 'Orbitron, monospace' }}
                    >
                        {program.icon}
                    </span>
                </div>

                <div className="relative flex items-start gap-5">
                    {/* Code badge */}
                    <div
                        className="w-14 h-14 rounded-xl border-2 flex items-center justify-center flex-shrink-0"
                        style={{ borderColor: `${program.color}40` }}
                    >
                        <span
                            className="text-base font-black tracking-wider"
                            style={{ color: program.color, fontFamily: 'Orbitron, monospace' }}
                        >
                            {program.icon}
                        </span>
                    </div>

                    <div className="flex-1">
                        <h1 className="text-xl md:text-2xl font-bold text-white mb-1">{program.name}</h1>
                        <p className="text-white/25 text-sm mb-3">{program.description}</p>
                        <div className="flex items-center gap-3 text-[11px] text-white/20">
                            <span
                                className="px-2 py-0.5 rounded border font-bold uppercase tracking-widest text-[9px]"
                                style={{ borderColor: `${program.color}25`, color: program.color }}
                            >
                                {program.level}
                            </span>
                            <span>{program.durationWeeks} weeks</span>
                            <span className="w-0.5 h-0.5 bg-white/10 rounded-full" />
                            <span>{totalDays} days</span>
                            <span className="w-0.5 h-0.5 bg-white/10 rounded-full" />
                            <span>{totalExercises} exercises</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ─── Weeks ────────────────────────────────────────────────────── */}
            {program.weeks.map((week) => (
                <div key={week.weekNumber} className="mb-6">
                    <h2 className="text-xs font-bold text-white/20 tracking-widest uppercase mb-3">
                        Week {week.weekNumber}
                    </h2>

                    <div className="space-y-4">
                        {week.days.map((day, dayIdx) => (
                            <div key={dayIdx} className="border border-white/5 rounded-xl p-4">
                                <h3 className="text-sm font-semibold text-[#22c55e] tracking-wide mb-3">{day.name}</h3>
                                <div className="space-y-1.5">
                                    {day.exercises.map((ex, exIdx) => {
                                        const config = EXERCISES[ex.exerciseId];
                                        if (!config) return null;
                                        return (
                                            <ExerciseCard
                                                key={exIdx}
                                                exercise={config}
                                                targetSets={ex.targetSets}
                                                targetReps={ex.targetReps || undefined}
                                                targetHold={ex.targetHoldSeconds}
                                                compact
                                            />
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}

            {/* Start Workout */}
            <button
                onClick={() => router.push('/workout')}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-[#22c55e]/10 text-[#22c55e] font-bold text-sm border border-[#22c55e]/25 hover:bg-[#22c55e]/20 transition-all cursor-pointer"
            >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5,3 19,12 5,21" /></svg>
                Start Workout
            </button>
        </div>
    );
}
