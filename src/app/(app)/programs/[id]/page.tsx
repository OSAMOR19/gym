/**
 * Program Detail Page — Duolingo-style winding daily pathway.
 * Days are arranged in a zigzag pattern connected by SVG curves.
 * Click a day node to expand and see its exercises.
 */

'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getProgramById } from '../../../../lib/programs';
import { EXERCISES } from '../../../../lib/exercises';
import DayNode from '../../../../components/DayNode';
import ExerciseCard from '../../../../components/ExerciseCard';

interface FlatDay {
    weekNumber: number;
    dayIndex: number;       // global index (0-based)
    dayName: string;
    exercises: { exerciseId: string; targetSets: number; targetReps: number; targetHoldSeconds?: number }[];
}

export default function ProgramDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const program = getProgramById(id);
    const [selectedDay, setSelectedDay] = useState<number | null>(null);

    if (!program) {
        return (
            <div className="max-w-5xl mx-auto p-6 text-center">
                <p className="text-white/40">Program not found.</p>
            </div>
        );
    }

    // Flatten all weeks/days into a single ordered list
    const flatDays: FlatDay[] = [];
    program.weeks.forEach((week) => {
        week.days.forEach((day) => {
            flatDays.push({
                weekNumber: week.weekNumber,
                dayIndex: flatDays.length,
                dayName: day.name,
                exercises: day.exercises,
            });
        });
    });

    const totalExercises = flatDays.reduce((sum, d) => sum + d.exercises.length, 0);

    // All days are unlocked so users can do multiple per day
    // First day pulses as "current", rest are "available" and tappable
    const getDayState = (idx: number): 'completed' | 'current' | 'available' | 'locked' => {
        if (idx === 0) return 'current';
        return 'available';
    };

    // Zigzag pattern: rows of 3 nodes, alternating left-to-right and right-to-left
    const NODES_PER_ROW = 3;
    const rows: FlatDay[][] = [];
    for (let i = 0; i < flatDays.length; i += NODES_PER_ROW) {
        rows.push(flatDays.slice(i, i + NODES_PER_ROW));
    }

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
            <div className="relative border border-white/5 rounded-xl p-6 md:p-8 mb-8 overflow-hidden">
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
                            <span>{flatDays.length} days</span>
                            <span className="w-0.5 h-0.5 bg-white/10 rounded-full" />
                            <span>{totalExercises} exercises</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ─── Pathway section label ────────────────────────────────────── */}
            <div className="flex items-center gap-3 mb-6">
                <div className="w-1 h-6 rounded-full" style={{ backgroundColor: program.color }} />
                <h2 className="text-xs font-bold text-white/30 tracking-widest uppercase">Your Pathway</h2>
            </div>

            {/* ─── Zigzag Pathway ──────────────────────────────────────────── */}
            <div className="relative mb-8">
                {rows.map((row, rowIdx) => {
                    const isReversed = rowIdx % 2 === 1;
                    const displayRow = isReversed ? [...row].reverse() : row;

                    return (
                        <div key={rowIdx}>
                            {/* Row of day nodes */}
                            <div
                                className={`flex items-center ${isReversed ? 'justify-end' : 'justify-start'} gap-6 md:gap-10 mb-2`}
                            >
                                {displayRow.map((day) => (
                                    <DayNode
                                        key={day.dayIndex}
                                        dayNumber={day.dayIndex + 1}
                                        dayName={day.dayName}
                                        exerciseCount={day.exercises.length}
                                        state={getDayState(day.dayIndex)}
                                        color={program.color}
                                        isSelected={selectedDay === day.dayIndex}
                                        onClick={() =>
                                            setSelectedDay(
                                                selectedDay === day.dayIndex ? null : day.dayIndex
                                            )
                                        }
                                    />
                                ))}
                            </div>

                            {/* Connector line between rows */}
                            {rowIdx < rows.length - 1 && (
                                <div className={`flex ${isReversed ? 'justify-start' : 'justify-end'} px-10 my-1`}>
                                    <svg width="40" height="40" viewBox="0 0 40 40" className="text-white/10">
                                        <path
                                            d={isReversed
                                                ? 'M30 0 C30 20, 10 20, 10 40'
                                                : 'M10 0 C10 20, 30 20, 30 40'
                                            }
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeDasharray="4 4"
                                            fill="none"
                                        />
                                    </svg>
                                </div>
                            )}

                            {/* Week separator */}
                            {rowIdx < rows.length - 1 && (() => {
                                const lastDayInRow = row[row.length - 1];
                                const firstDayInNextRow = rows[rowIdx + 1][0];
                                if (lastDayInRow && firstDayInNextRow && lastDayInRow.weekNumber !== firstDayInNextRow.weekNumber) {
                                    return (
                                        <div className="flex items-center gap-3 my-4 px-4">
                                            <div className="flex-1 h-px bg-white/5" />
                                            <span className="text-[9px] text-white/15 tracking-widest uppercase font-bold">
                                                Week {firstDayInNextRow.weekNumber}
                                            </span>
                                            <div className="flex-1 h-px bg-white/5" />
                                        </div>
                                    );
                                }
                                return null;
                            })()}
                        </div>
                    );
                })}
            </div>

            {/* ─── Selected day exercises (expandable panel) ───────────────── */}
            {selectedDay !== null && flatDays[selectedDay] && (
                <div className="animate-fade-in border border-white/5 rounded-xl p-5 mb-6" style={{ borderColor: `${program.color}20` }}>
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black"
                                style={{
                                    backgroundColor: `${program.color}15`,
                                    color: program.color,
                                    fontFamily: 'Orbitron, monospace',
                                }}
                            >
                                {selectedDay + 1}
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold" style={{ color: program.color }}>
                                    {flatDays[selectedDay].dayName}
                                </h3>
                                <p className="text-[10px] text-white/20">
                                    Week {flatDays[selectedDay].weekNumber} · {flatDays[selectedDay].exercises.length} exercises
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => setSelectedDay(null)}
                            className="w-7 h-7 rounded-full border border-white/10 flex items-center justify-center text-white/30 hover:text-white/60 hover:border-white/20 transition-all cursor-pointer"
                        >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                        </button>
                    </div>

                    <div className="space-y-1.5">
                        {flatDays[selectedDay].exercises.map((ex, exIdx) => {
                            const config = EXERCISES[ex.exerciseId as keyof typeof EXERCISES];
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

                    {/* Start this day's workout */}
                    <button
                        onClick={() => router.push('/workout')}
                        className="w-full flex items-center justify-center gap-2 py-3 mt-4 rounded-xl font-bold text-sm border transition-all cursor-pointer"
                        style={{
                            backgroundColor: `${program.color}10`,
                            borderColor: `${program.color}25`,
                            color: program.color,
                        }}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polygon points="5,3 19,12 5,21" />
                        </svg>
                        Start Day {selectedDay + 1}
                    </button>
                </div>
            )}

            {/* ─── Start Workout (global) ──────────────────────────────────── */}
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
