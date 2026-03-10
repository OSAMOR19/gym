/**
 * Workout Page — COCKPIT/CINEMATIC layout.
 * Camera feed is HERO element. Large typographic counters. Minimal controls.
 * Zero emojis.
 */

'use client';

import { useState, useCallback } from 'react';
import { usePoseDetection } from '../../../hooks/usePoseDetection';
import { ExerciseId, EXERCISES, getExercisesByCategory } from '../../../lib/exercises';
import { generateWorkoutSummary, resetCoach } from '../../../lib/aiCoach';
import { recordWorkout } from '../../../lib/gamification';
import { saveWorkout } from '../../../lib/progressStore';
import CameraFeed from '../../../components/CameraFeed';
import RepCounterDisplay from '../../../components/RepCounter';
import StatsPanel from '../../../components/StatsPanel';
import FormFeedback from '../../../components/FormFeedback';
import CoachMessage from '../../../components/CoachMessage';
import WorkoutSummaryDisplay from '../../../components/WorkoutSummary';
import type { WorkoutSummary } from '../../../lib/aiCoach';
import type { Badge } from '../../../lib/gamification';

export default function WorkoutPage() {
    const {
        videoRef, canvasRef, repCount, currentAngle, formQuality,
        feedback, timeUnderTension, isDetecting, exerciseId,
        landmarks, formCorrections, coachTip, holdTime, isHolding,
        setExercise, startDetection, stopDetection, workoutStartTime,
    } = usePoseDetection();

    const [showSummary, setShowSummary] = useState(false);
    const [summary, setSummary] = useState<WorkoutSummary | null>(null);
    const [xpGained, setXpGained] = useState(0);
    const [newBadges, setNewBadges] = useState<Badge[]>([]);

    const currentExercise = EXERCISES[exerciseId];

    const handleStopWorkout = useCallback(() => {
        stopDetection();

        if (repCount > 0) {
            const duration = workoutStartTime ? Math.round((Date.now() - workoutStartTime) / 1000) : 0;
            const ws = generateWorkoutSummary(repCount, formQuality, timeUnderTension, duration, currentExercise.name);
            setSummary(ws);

            const perfectReps = formQuality >= 90 ? Math.round(repCount * 0.3) : 0;
            const result = recordWorkout(repCount, formQuality, perfectReps);
            setXpGained(result.xpGained);
            setNewBadges(result.newBadges);

            saveWorkout({
                exerciseId,
                exerciseName: currentExercise.name,
                reps: repCount,
                formQuality,
                timeUnderTension,
                duration,
                xpGained: result.xpGained,
            });

            setShowSummary(true);
        }

        resetCoach();
    }, [stopDetection, repCount, formQuality, timeUnderTension, currentExercise, exerciseId, workoutStartTime]);

    const categories = [
        { key: 'upper' as const, label: 'UPPER', color: '#38bdf8' },
        { key: 'lower' as const, label: 'LOWER', color: '#22c55e' },
        { key: 'core' as const, label: 'CORE', color: '#f59e0b' },
    ];

    return (
        <div className="max-w-5xl mx-auto p-4 md:p-6">
            {/* ─── Exercise selector — horizontal scroll ────────────────────── */}
            <div className="mb-4 space-y-3">
                {categories.map((cat) => (
                    <div key={cat.key}>
                        <p
                            className="text-[9px] font-bold tracking-[0.2em] uppercase mb-2"
                            style={{ color: `${cat.color}60` }}
                        >
                            {cat.label}
                        </p>
                        <div className="flex gap-2 overflow-x-auto pb-1">
                            {getExercisesByCategory(cat.key).map((ex) => {
                                const isActive = exerciseId === ex.id;
                                return (
                                    <button
                                        key={ex.id}
                                        onClick={() => !isDetecting && setExercise(ex.id)}
                                        disabled={isDetecting}
                                        className={`
                                            flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap flex-shrink-0
                                            ${isActive
                                                ? 'bg-[#22c55e]/10 text-[#22c55e] border border-[#22c55e]/30'
                                                : 'bg-transparent text-white/30 border border-white/5 hover:border-white/10 hover:text-white/50'
                                            }
                                            ${isDetecting && !isActive ? 'opacity-20 cursor-not-allowed' : ''}
                                        `}
                                    >
                                        <span
                                            className="text-[9px] font-black tracking-wider opacity-60"
                                            style={{ fontFamily: 'Orbitron, monospace' }}
                                        >
                                            {ex.icon}
                                        </span>
                                        {ex.name}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>

            {/* ─── Camera feed: HERO element ────────────────────────────────── */}
            <div className="relative rounded-xl overflow-hidden border border-white/5 mb-4">
                <CameraFeed
                    videoRef={videoRef}
                    canvasRef={canvasRef}
                    landmarks={landmarks}
                    currentAngle={currentAngle}
                    exercise={exerciseId}
                    isDetecting={isDetecting}
                />
                <RepCounterDisplay count={repCount} isDetecting={isDetecting} />

                {/* Hold timer for plank-style exercises */}
                {currentExercise.repMode === 'hold' && isDetecting && (
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-sm rounded-full px-5 py-2 border border-white/10">
                        <span className="font-bold text-lg flex items-center gap-2" style={{ fontFamily: 'Orbitron, monospace' }}>
                            <span className={`w-2 h-2 rounded-full ${isHolding ? 'bg-[#22c55e]' : 'bg-red-400'}`} />
                            <span className={isHolding ? 'text-[#22c55e]' : 'text-red-400'}>{holdTime.toFixed(1)}s</span>
                        </span>
                    </div>
                )}
            </div>

            {/* ─── Controls: minimal and centered ───────────────────────────── */}
            <div className="flex items-center justify-center gap-4 mb-4">
                <FormFeedback feedback={feedback} isDetecting={isDetecting} />
                <CoachMessage tip={coachTip} />

                <button
                    onClick={isDetecting ? handleStopWorkout : startDetection}
                    className={`
                        px-8 py-3 rounded-xl font-semibold text-sm tracking-wide transition-all cursor-pointer
                        ${isDetecting
                            ? 'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20'
                            : 'bg-[#22c55e]/10 text-[#22c55e] border border-[#22c55e]/30 hover:bg-[#22c55e]/20 shadow-[0_0_20px_rgba(34,197,94,0.15)]'
                        }
                    `}
                >
                    {isDetecting ? (
                        <span className="flex items-center gap-2">
                            <span className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />
                            Finish
                        </span>
                    ) : (
                        <span className="flex items-center gap-2">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5,3 19,12 5,21" /></svg>
                            Start
                        </span>
                    )}
                </button>
            </div>

            {/* Form corrections */}
            {formCorrections.length > 0 && isDetecting && (
                <div className="space-y-1.5 mb-4">
                    {formCorrections.map((fc) => (
                        <div key={fc.ruleId} className="flex items-center gap-2 bg-amber-500/5 border border-amber-500/15 rounded-lg px-4 py-2 text-sm text-amber-400/80">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="flex-shrink-0">
                                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                            </svg>
                            {fc.message}
                        </div>
                    ))}
                </div>
            )}

            {/* Stats Panel */}
            <StatsPanel reps={repCount} timeUnderTension={timeUnderTension} formQuality={formQuality} />

            {/* Workout Summary Modal */}
            {showSummary && summary && (
                <WorkoutSummaryDisplay
                    summary={summary}
                    xpGained={xpGained}
                    newBadges={newBadges}
                    onClose={() => setShowSummary(false)}
                />
            )}
        </div>
    );
}
