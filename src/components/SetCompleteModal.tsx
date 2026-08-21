/**
 * SetCompleteModal — Full-screen modal shown when a set is complete.
 * Shows set results, feedback, and option to continue to next set or end workout.
 * Optionally captures RPE (1–10) — a single tap, always skippable.
 */

'use client';

import { useState } from 'react';

interface SetCompleteModalProps {
    currentSet: number;
    totalSets: number;
    repsCompleted: number;
    targetReps: number;
    formQuality: number;
    /** 'hold' shows the count as seconds held instead of reps */
    mode?: 'reps' | 'hold';
    /** When set, the last set advances to this exercise instead of ending (program days) */
    nextExerciseName?: string;
    /** When set, shows the optional "how hard was that?" 1–10 row */
    onRpe?: (rpe: number) => void;
    onNextSet: () => void;
    onEndWorkout: () => void;
}

export default function SetCompleteModal({
    currentSet,
    totalSets,
    repsCompleted,
    targetReps,
    formQuality,
    mode = 'reps',
    nextExerciseName,
    onRpe,
    onNextSet,
    onEndWorkout,
}: SetCompleteModalProps) {
    // Local only — the modal unmounts between sets, so this resets itself
    const [rpe, setRpe] = useState<number | null>(null);
    const isLastSet = currentSet >= totalSets;
    const hasNextExercise = isLastSet && !!nextExerciseName;
    const formLabel = formQuality >= 80 ? 'Excellent' : formQuality >= 60 ? 'Good' : 'Needs Work';
    const formColor = formQuality >= 80 ? '#22c55e' : formQuality >= 60 ? '#f59e0b' : '#ef4444';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md animate-fade-in">
            <div className="bg-[#111]/95 border border-white/10 rounded-2xl p-8 max-w-sm w-[90%] text-center shadow-2xl">
                {/* Status icon */}
                <div
                    className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
                    style={{ backgroundColor: `${formColor}15`, border: `2px solid ${formColor}40` }}
                >
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={formColor} strokeWidth="2.5" strokeLinecap="round">
                        <polyline points="20,6 9,17 4,12" />
                    </svg>
                </div>

                {/* Title */}
                <h2 className="text-xl font-bold text-white mb-1" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                    Set {currentSet} Complete
                </h2>
                <p className="text-sm text-white/30 mb-6">
                    {hasNextExercise
                        ? `Exercise done — next up: ${nextExerciseName}`
                        : isLastSet
                            ? 'Final set — great workout!'
                            : `${totalSets - currentSet} set${totalSets - currentSet > 1 ? 's' : ''} remaining`}
                </p>

                {/* Stats row */}
                <div className="flex justify-center gap-6 mb-6">
                    <div className="text-center">
                        <p className="text-2xl font-black text-white" style={{ fontFamily: 'Orbitron, monospace' }}>
                            {repsCompleted}
                        </p>
                        <p className="text-[9px] text-white/25 tracking-widest uppercase mt-0.5">{mode === 'hold' ? 'Seconds Held' : 'Reps'}</p>
                    </div>
                    <div className="w-px bg-white/10" />
                    <div className="text-center">
                        <p className="text-2xl font-black" style={{ fontFamily: 'Orbitron, monospace', color: formColor }}>
                            {formQuality}%
                        </p>
                        <p className="text-[9px] tracking-widest uppercase mt-0.5" style={{ color: `${formColor}80` }}>
                            {formLabel}
                        </p>
                    </div>
                </div>

                {/* Optional RPE — one tap, never required */}
                {onRpe && (
                    <div className="mb-6">
                        <p className="text-[9px] text-white/25 tracking-widest uppercase mb-2">
                            How hard was that set?
                        </p>
                        <div className="flex justify-center gap-1">
                            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                                <button
                                    key={n}
                                    onClick={() => { setRpe(n); onRpe(n); }}
                                    className={`
                                        w-7 h-8 rounded-md text-[11px] font-bold transition-all cursor-pointer
                                        ${rpe === n
                                            ? 'bg-[#22c55e] text-black'
                                            : 'bg-white/5 text-white/30 border border-white/5 hover:bg-white/10 hover:text-white/60'}
                                    `}
                                    style={{ fontFamily: 'Orbitron, monospace' }}
                                >
                                    {n}
                                </button>
                            ))}
                        </div>
                        <div className="flex justify-between px-1 mt-1">
                            <span className="text-[8px] text-white/15 tracking-wider uppercase">Easy</span>
                            <span className="text-[8px] text-white/15 tracking-wider uppercase">Max effort</span>
                        </div>
                    </div>
                )}

                {/* Action buttons */}
                <div className="flex flex-col gap-2.5">
                    {(!isLastSet || hasNextExercise) && (
                        <button
                            onClick={onNextSet}
                            className="w-full py-3 rounded-xl font-bold text-sm tracking-wider uppercase bg-[#22c55e] text-black hover:bg-[#16a34a] transition-all cursor-pointer shadow-[0_0_25px_rgba(34,197,94,0.25)]"
                        >
                            {hasNextExercise ? `Next: ${nextExerciseName} →` : 'Next Set →'}
                        </button>
                    )}
                    <button
                        onClick={onEndWorkout}
                        className={`
                            w-full py-3 rounded-xl font-bold text-sm tracking-wider uppercase transition-all cursor-pointer
                            ${isLastSet && !hasNextExercise
                                ? 'bg-[#22c55e] text-black hover:bg-[#16a34a] shadow-[0_0_25px_rgba(34,197,94,0.25)]'
                                : 'bg-white/5 text-white/40 border border-white/10 hover:bg-white/10 hover:text-white/60'
                            }
                        `}
                    >
                        {isLastSet && !hasNextExercise ? 'View Summary' : 'End Workout'}
                    </button>
                </div>
            </div>
        </div>
    );
}
