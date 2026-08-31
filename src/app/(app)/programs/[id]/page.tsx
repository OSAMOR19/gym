/**
 * Program Detail Page — Duolingo-style winding daily pathway.
 * Days are arranged in a zigzag pattern connected by SVG curves.
 * Click a day node to expand and see its exercises.
 */

'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getProgramById, LEVEL_LABELS } from '../../../../lib/programs';
import { EXERCISES } from '../../../../lib/exercises';
import { getCompletedDays } from '../../../../lib/workoutQueue';
import { syncProgramProgress } from '../../../../lib/programProgress';
import { launchProgramDay } from '../../../../lib/workoutBuilder';
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
                <p className="text-ink/40">Program not found.</p>
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

    /** Stage the selected day as the pending workout and go there.
     *  launchProgramDay personalizes the template on the way: substitutions,
     *  progression from the last session, and readiness volume trims. */
    const startDay = async (dayIndex: number) => {
        if (!program) return;
        const ok = await launchProgramDay(program, dayIndex, readiness);
        if (ok) router.push('/workout');
    };

    /** "Day 3: Upper Body" → "Upper Body" (the cell already shows the number) */
    const dayTitle = (name: string) => name.replace(/^Day \d+:\s*/i, '');

    return (
        <div className="max-w-5xl mx-auto p-4 md:p-6">
            {/* ─── Back button ──────────────────────────────────────────────── */}
            <button
                onClick={() => router.push('/programs')}
                className="flex items-center gap-2 text-sm text-ink/30 hover:text-ink/60 transition-colors mb-4 cursor-pointer group"
            >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="group-hover:-translate-x-0.5 transition-transform">
                    <polyline points="15,18 9,12 15,6" />
                </svg>
                Back to Programs
            </button>

            {/* ─── Hero header ──────────────────────────────────────────────── */}
            <div className="relative border border-ink/5 rounded-xl p-6 md:p-8 mb-8 overflow-hidden">
                {/* Background accent */}
                <div
                    className="absolute inset-0 opacity-[0.03]"
                    style={{ background: program.color }}
                />

                {/* Ghost code */}
                <div className="absolute top-4 right-6 pointer-events-none select-none">
                    <span
                        className="text-[120px] font-black leading-none text-ink/[0.015]"
                        style={{ fontFamily: 'var(--font-orbitron), monospace' }}
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
                            style={{ color: program.color, fontFamily: 'var(--font-orbitron), monospace' }}
                        >
                            {program.icon}
                        </span>
                    </div>

                    <div className="flex-1">
                        <h1 className="text-xl md:text-2xl font-bold text-ink mb-1">{program.name}</h1>
                        <p className="text-ink/25 text-sm mb-3">{program.description}</p>
                        <div className="flex items-center gap-3 text-[11px] text-ink/20">
                            <span
                                className="px-2 py-0.5 rounded border font-bold uppercase tracking-widest text-[9px]"
                                style={{ borderColor: `${program.color}25`, color: program.color }}
                            >
                                {LEVEL_LABELS[program.level]}
                            </span>
                            {/* Derived from actual data — durationWeeks was often wrong */}
                            <span>{program.weeks.length} week{program.weeks.length > 1 ? 's' : ''}</span>
                            <span className="w-0.5 h-0.5 bg-ink/10 rounded-full" />
                            <span>{flatDays.length} days</span>
                            <span className="w-0.5 h-0.5 bg-ink/10 rounded-full" />
                            <span>{totalExercises} exercises</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ─── Readiness banner — shown after a training break ──────────── */}
            {readiness && readiness.level !== 'ready' && readiness.message && (
                <div className="flex items-start gap-3 border border-amber-500/20 bg-amber-500/5 rounded-xl px-4 py-3 mb-6">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="flex-shrink-0 mt-0.5 text-warm">
                        <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    <div>
                        <p className="text-xs font-bold text-amber-400 tracking-wider uppercase mb-0.5">Easing back in</p>
                        <p className="text-xs text-ink/40 leading-relaxed">{readiness.message}</p>
                    </div>
                </div>
            )}

            {/* ─── Pathway section label ────────────────────────────────────── */}
            <div className="flex items-center gap-3 mb-6">
                <div className="w-1 h-6 rounded-full" style={{ backgroundColor: program.color }} />
                <h2 className="text-xs font-bold text-ink/30 tracking-widest uppercase">Your Pathway</h2>
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
                                <div className="flex-1 h-px bg-ink/5" />
                                <span className="text-[9px] text-ink/20 tracking-wider uppercase">
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
                                                    : 'border-ink/8 hover:border-ink/20 hover:bg-ink/[0.02]'}
                                            `}
                                            style={cellStyle}
                                        >
                                            {/* Day number + status */}
                                            <div className="flex items-start justify-between mb-2">
                                                <span
                                                    className="text-2xl font-black leading-none"
                                                    style={{
                                                        fontFamily: 'var(--font-orbitron), monospace',
                                                        color: state === 'completed' ? program.color : 'var(--foreground)',
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

                                            <p className="text-[11px] font-semibold text-ink/70 leading-tight mb-1.5 line-clamp-2 min-h-[2em]">
                                                {dayTitle(day.dayName)}
                                            </p>
                                            <p className="text-[9px] text-ink/25 tracking-wider uppercase">
                                                {day.exercises.length} exercise{day.exercises.length > 1 ? 's' : ''}
                                            </p>

                                            {/* Hover preview (desktop) — rendered only while hovered
                                                so its GIF isn't fetched for every tile up-front */}
                                            {hoveredDay === day.dayIndex && (
                                                <div className="hidden md:block absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-60 z-30 pointer-events-none">
                                                    <div className="bg-surface border border-ink/10 rounded-xl p-2.5 shadow-2xl animate-fade-in">
                                                        {previewGif && (
                                                            <img
                                                                src={previewGif}
                                                                alt={firstConfig?.name ?? ''}
                                                                className="w-full h-28 object-cover rounded-lg mb-2 bg-surface"
                                                            />
                                                        )}
                                                        <div className="space-y-1">
                                                            {day.exercises.slice(0, 3).map((ex, i) => {
                                                                const cfg = EXERCISES[ex.exerciseId as keyof typeof EXERCISES];
                                                                if (!cfg) return null;
                                                                return (
                                                                    <div key={i} className="flex items-center justify-between text-[10px]">
                                                                        <span className="text-ink/70 truncate">{cfg.name}</span>
                                                                        <span className="text-ink/30 font-bold ml-2 flex-shrink-0" style={{ fontFamily: 'var(--font-orbitron), monospace' }}>
                                                                            {ex.targetHoldSeconds ? `${ex.targetHoldSeconds}s` : `${ex.targetSets}×${ex.targetReps}`}
                                                                        </span>
                                                                    </div>
                                                                );
                                                            })}
                                                            {day.exercises.length > 3 && (
                                                                <p className="text-[9px] text-ink/25">+{day.exercises.length - 3} more</p>
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
                <div className="animate-fade-in border border-ink/5 rounded-xl p-5 mb-6" style={{ borderColor: `${program.color}20` }}>
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black"
                                style={{
                                    backgroundColor: `${program.color}15`,
                                    color: program.color,
                                    fontFamily: 'var(--font-orbitron), monospace',
                                }}
                            >
                                {selectedDay + 1}
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold" style={{ color: program.color }}>
                                    {flatDays[selectedDay].dayName}
                                </h3>
                                <p className="text-[10px] text-ink/20">
                                    Week {flatDays[selectedDay].weekNumber} · {flatDays[selectedDay].exercises.length} exercises
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => setSelectedDay(null)}
                            className="w-7 h-7 rounded-full border border-ink/10 flex items-center justify-center text-ink/30 hover:text-ink/60 hover:border-ink/20 transition-all cursor-pointer"
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
                                    <div className="relative h-32 rounded-lg overflow-hidden bg-surface border border-ink/5 flex items-center justify-center">
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
                                                style={{ color: program.color, fontFamily: 'var(--font-orbitron), monospace' }}
                                            >
                                                {config.icon}
                                            </span>
                                        )}
                                        <span
                                            className="absolute bottom-1.5 right-1.5 text-[9px] font-bold rounded-md px-1.5 py-0.5 bg-black/70 backdrop-blur-sm"
                                            style={{ color: program.color, fontFamily: 'var(--font-orbitron), monospace' }}
                                        >
                                            {ex.targetHoldSeconds ? `${ex.targetHoldSeconds}s` : `${ex.targetSets}×${ex.targetReps}`}
                                        </span>
                                    </div>
                                    <p className="text-[11px] font-medium text-ink/70 mt-1.5 leading-tight truncate">
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
                className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-accent/10 text-accent font-bold text-sm border border-accent/25 hover:bg-accent/20 transition-all cursor-pointer"
            >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5,3 19,12 5,21" /></svg>
                Start Workout
            </button>
        </div>
    );
}
