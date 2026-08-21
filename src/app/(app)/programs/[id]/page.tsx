/**
 * Program Detail Page — Duolingo-style winding daily pathway.
 * Days are arranged in a zigzag pattern connected by SVG curves.
 * Click a day node to expand and see its exercises.
 */

'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getProgramById, ProgramExercise } from '../../../../lib/programs';
import { EXERCISES } from '../../../../lib/exercises';
import { setWorkoutQueue, getCompletedDays } from '../../../../lib/workoutQueue';
import { syncProgramProgress } from '../../../../lib/programProgress';
import { buildDayItems } from '../../../../lib/workoutBuilder';
import { getUserState, assessReadiness, Readiness } from '../../../../lib/userState';
import { EXERCISE_VIDEOS } from '../../../../components/ExerciseGuide';

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
    const [hoveredDay, setHoveredDay] = useState<number | null>(null);
    const [completedDays, setCompletedDays] = useState<number[]>([]);
    const [readiness, setReadiness] = useState<Readiness | null>(null);

    // Local cache renders instantly; server progress (the source of truth)
    // reconciles in the background and picks up other devices' sessions
    useEffect(() => {
        setCompletedDays(getCompletedDays(id));
        syncProgramProgress(id).then(setCompletedDays);
    }, [id]);

    // Resume intelligence: after a break, the banner explains and startDay
    // trims volume instead of blindly continuing
    useEffect(() => {
        getUserState().then((s) => setReadiness(assessReadiness(s))).catch(() => {});
    }, []);

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

    // All days stay unlocked so users can do multiple per day; completed days
    // are marked, and the first uncompleted day pulses as "current"
    const firstUncompleted = flatDays.findIndex((d) => !completedDays.includes(d.dayIndex));
    const getDayState = (idx: number): 'completed' | 'current' | 'available' | 'locked' => {
        if (completedDays.includes(idx)) return 'completed';
        if (idx === firstUncompleted) return 'current';
        return 'available';
    };

    /** Hand the selected day's exercises to the workout page and go there.
     *  buildDayItems personalizes the template: substitutes exercises the
     *  user can't/shouldn't do, applies progression from the last session,
     *  and trims volume after a break. */
    const startDay = async (dayIndex: number) => {
        const day = flatDays[dayIndex];
        if (!day || !program) return;
        const built = await buildDayItems(
            program.id,
            { name: day.dayName, exercises: day.exercises as ProgramExercise[] },
            readiness,
        );
        setWorkoutQueue({
            programId: program.id,
            programName: program.name,
            dayIndex,
            dayName: day.dayName,
            items: built.items,
        });
        router.push('/workout');
    };

    /** "Day 3: Upper Body" → "Upper Body" (the cell already shows the number) */
    const dayTitle = (name: string) => name.replace(/^Day \d+:\s*/i, '');

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
                    style={{ background: program.color }}
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
                            {/* Derived from actual data — durationWeeks was often wrong */}
                            <span>{program.weeks.length} week{program.weeks.length > 1 ? 's' : ''}</span>
                            <span className="w-0.5 h-0.5 bg-white/10 rounded-full" />
                            <span>{flatDays.length} days</span>
                            <span className="w-0.5 h-0.5 bg-white/10 rounded-full" />
                            <span>{totalExercises} exercises</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ─── Readiness banner — shown after a training break ──────────── */}
            {readiness && readiness.level !== 'ready' && readiness.message && (
                <div className="flex items-start gap-3 border border-amber-500/20 bg-amber-500/5 rounded-xl px-4 py-3 mb-6">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" className="flex-shrink-0 mt-0.5">
                        <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    <div>
                        <p className="text-xs font-bold text-amber-400 tracking-wider uppercase mb-0.5">Easing back in</p>
                        <p className="text-xs text-white/40 leading-relaxed">{readiness.message}</p>
                    </div>
                </div>
            )}

            {/* ─── Pathway section label ────────────────────────────────────── */}
            <div className="flex items-center gap-3 mb-6">
                <div className="w-1 h-6 rounded-full" style={{ backgroundColor: program.color }} />
                <h2 className="text-xs font-bold text-white/30 tracking-widest uppercase">Your Pathway</h2>
            </div>

            {/* ─── Calendar pathway — one section per week, day tiles in a grid.
                 Hover a tile (desktop) for a quick exercise preview; tap to
                 open the full day panel below. ─────────────────────────────── */}
            <div className="space-y-7 mb-8">
                {program.weeks.map((week) => {
                    const weekDays = flatDays.filter((d) => d.weekNumber === week.weekNumber);
                    const doneInWeek = weekDays.filter((d) => completedDays.includes(d.dayIndex)).length;
                    return (
                        <div key={week.weekNumber}>
                            {/* Week header */}
                            <div className="flex items-center gap-3 mb-3">
                                <span className="text-[10px] font-bold tracking-widest uppercase" style={{ color: `${program.color}90` }}>
                                    Week {week.weekNumber}
                                </span>
                                <div className="flex-1 h-px bg-white/5" />
                                <span className="text-[9px] text-white/20 tracking-wider uppercase">
                                    {doneInWeek}/{weekDays.length} done
                                </span>
                            </div>

                            {/* Day tiles */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                                {weekDays.map((day) => {
                                    const state = getDayState(day.dayIndex);
                                    const isSelected = selectedDay === day.dayIndex;
                                    const firstConfig = EXERCISES[day.exercises[0]?.exerciseId as keyof typeof EXERCISES];
                                    const previewGif = firstConfig ? EXERCISE_VIDEOS[firstConfig.id] ?? null : null;

                                    const cellStyle: React.CSSProperties = isSelected
                                        ? { borderColor: program.color, backgroundColor: `${program.color}10` }
                                        : state === 'completed'
                                            ? { borderColor: `${program.color}35`, backgroundColor: `${program.color}08` }
                                            : state === 'current'
                                                ? { borderColor: `${program.color}50` }
                                                : {};

                                    return (
                                        <button
                                            key={day.dayIndex}
                                            onClick={() => setSelectedDay(isSelected ? null : day.dayIndex)}
                                            onMouseEnter={() => setHoveredDay(day.dayIndex)}
                                            onMouseLeave={() => setHoveredDay(null)}
                                            className={`
                                                relative text-left rounded-xl border p-3.5 transition-all cursor-pointer
                                                ${isSelected || state === 'completed' || state === 'current'
                                                    ? ''
                                                    : 'border-white/8 hover:border-white/20 hover:bg-white/[0.02]'}
                                            `}
                                            style={cellStyle}
                                        >
                                            {/* Day number + status */}
                                            <div className="flex items-start justify-between mb-2">
                                                <span
                                                    className="text-2xl font-black leading-none"
                                                    style={{
                                                        fontFamily: 'Orbitron, monospace',
                                                        color: state === 'completed' ? program.color : 'rgba(255,255,255,0.85)',
                                                    }}
                                                >
                                                    {String(day.dayIndex + 1).padStart(2, '0')}
                                                </span>
                                                {state === 'completed' && (
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={program.color} strokeWidth="2.5" strokeLinecap="round">
                                                        <polyline points="20,6 9,17 4,12" />
                                                    </svg>
                                                )}
                                                {state === 'current' && (
                                                    <span
                                                        className="w-2.5 h-2.5 rounded-full animate-pulse"
                                                        style={{ backgroundColor: program.color, boxShadow: `0 0 8px ${program.color}80` }}
                                                    />
                                                )}
                                            </div>

                                            <p className="text-[11px] font-semibold text-white/70 leading-tight mb-1.5 line-clamp-2 min-h-[2em]">
                                                {dayTitle(day.dayName)}
                                            </p>
                                            <p className="text-[9px] text-white/25 tracking-wider uppercase">
                                                {day.exercises.length} exercise{day.exercises.length > 1 ? 's' : ''}
                                            </p>

                                            {/* Hover preview (desktop) — rendered only while hovered
                                                so its GIF isn't fetched for every tile up-front */}
                                            {hoveredDay === day.dayIndex && (
                                                <div className="hidden md:block absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-60 z-30 pointer-events-none">
                                                    <div className="bg-[#101010] border border-white/10 rounded-xl p-2.5 shadow-2xl animate-fade-in">
                                                        {previewGif && (
                                                            <img
                                                                src={previewGif}
                                                                alt={firstConfig?.name ?? ''}
                                                                className="w-full h-28 object-cover rounded-lg mb-2 bg-[#161616]"
                                                            />
                                                        )}
                                                        <div className="space-y-1">
                                                            {day.exercises.slice(0, 3).map((ex, i) => {
                                                                const cfg = EXERCISES[ex.exerciseId as keyof typeof EXERCISES];
                                                                if (!cfg) return null;
                                                                return (
                                                                    <div key={i} className="flex items-center justify-between text-[10px]">
                                                                        <span className="text-white/70 truncate">{cfg.name}</span>
                                                                        <span className="text-white/30 font-bold ml-2 flex-shrink-0" style={{ fontFamily: 'Orbitron, monospace' }}>
                                                                            {ex.targetHoldSeconds ? `${ex.targetHoldSeconds}s` : `${ex.targetSets}×${ex.targetReps}`}
                                                                        </span>
                                                                    </div>
                                                                );
                                                            })}
                                                            {day.exercises.length > 3 && (
                                                                <p className="text-[9px] text-white/25">+{day.exercises.length - 3} more</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
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

                    {/* Swipeable demo previews — see what you'll do before starting */}
                    <div className="flex gap-3 overflow-x-auto snap-x pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                        {flatDays[selectedDay].exercises.map((ex, exIdx) => {
                            const config = EXERCISES[ex.exerciseId as keyof typeof EXERCISES];
                            if (!config) return null;
                            const gif = EXERCISE_VIDEOS[config.id] ?? null;
                            return (
                                <div key={exIdx} className="snap-start flex-shrink-0 w-44">
                                    <div className="relative h-32 rounded-lg overflow-hidden bg-[#161616] border border-white/5 flex items-center justify-center">
                                        {gif ? (
                                            <img
                                                src={gif}
                                                alt={config.name}
                                                loading="lazy"
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <span
                                                className="text-xl font-black tracking-wider opacity-25"
                                                style={{ color: program.color, fontFamily: 'Orbitron, monospace' }}
                                            >
                                                {config.icon}
                                            </span>
                                        )}
                                        <span
                                            className="absolute bottom-1.5 right-1.5 text-[9px] font-bold rounded-md px-1.5 py-0.5 bg-black/70 backdrop-blur-sm"
                                            style={{ color: program.color, fontFamily: 'Orbitron, monospace' }}
                                        >
                                            {ex.targetHoldSeconds ? `${ex.targetHoldSeconds}s` : `${ex.targetSets}×${ex.targetReps}`}
                                        </span>
                                    </div>
                                    <p className="text-[11px] font-medium text-white/70 mt-1.5 leading-tight truncate">
                                        {exIdx + 1}. {config.name}
                                    </p>
                                </div>
                            );
                        })}
                    </div>

                    {/* Start this day's workout */}
                    <button
                        onClick={() => startDay(selectedDay)}
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

            {/* ─── Start Workout (global) — continues at the next uncompleted day */}
            <button
                onClick={() => startDay(firstUncompleted >= 0 ? firstUncompleted : 0)}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-[#22c55e]/10 text-[#22c55e] font-bold text-sm border border-[#22c55e]/25 hover:bg-[#22c55e]/20 transition-all cursor-pointer"
            >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5,3 19,12 5,21" /></svg>
                Start Workout
            </button>
        </div>
    );
}
