/**
 * Program Detail Page — View weekly schedule and exercises for a program.
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
            <div className="max-w-4xl mx-auto p-6 text-center">
                <p className="text-white/40">Program not found.</p>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-6">
            {/* Header */}
            <div className="flex items-start gap-4">
                <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0"
                    style={{ backgroundColor: `${program.color}15`, boxShadow: `0 0 25px ${program.color}15` }}
                >
                    {program.icon}
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-white">{program.name}</h1>
                    <p className="text-white/30 text-sm mt-1">{program.description}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-white/20">
                        <span
                            className="px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider"
                            style={{ backgroundColor: `${program.color}15`, color: program.color }}
                        >
                            {program.level}
                        </span>
                        <span>{program.durationWeeks} weeks</span>
                    </div>
                </div>
            </div>

            {/* Weeks */}
            {program.weeks.map((week) => (
                <div key={week.weekNumber} className="space-y-4">
                    <h2 className="text-lg font-bold text-white/80">
                        Week {week.weekNumber}
                    </h2>

                    {week.days.map((day, dayIdx) => (
                        <div key={dayIdx} className="glass-panel rounded-2xl p-5 space-y-3">
                            <h3 className="text-sm font-semibold text-[#22c55e] tracking-wide">{day.name}</h3>
                            <div className="space-y-2">
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
            ))}

            {/* Start Workout button */}
            <button
                onClick={() => router.push('/workout')}
                className="w-full py-4 rounded-xl bg-[#22c55e]/15 text-[#22c55e] font-bold text-lg border border-[#22c55e]/30 hover:bg-[#22c55e]/25 shadow-[0_0_25px_rgba(34,197,94,0.15)] transition-all cursor-pointer"
            >
                Start Workout 🚀
            </button>
        </div>
    );
}
