/**
 * Live Workout Page — Camera tracking with the full V2 UI.
 * Reuses CameraFeed, StatsPanel, and adds exercise selector + coach + form corrections.
 */

'use client';

import { useState, useCallback } from 'react';
import { usePoseDetection } from '../../../hooks/usePoseDetection';
import { ExerciseId, EXERCISES, ALL_EXERCISE_IDS, getExercisesByCategory } from '../../../lib/exercises';
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

            // Generate summary
            const ws = generateWorkoutSummary(repCount, formQuality, timeUnderTension, duration, currentExercise.name);
            setSummary(ws);

            // Record gamification
            const perfectReps = formQuality >= 90 ? Math.round(repCount * 0.3) : 0;
            const result = recordWorkout(repCount, formQuality, perfectReps);
            setXpGained(result.xpGained);
            setNewBadges(result.newBadges);

            // Save to progress history
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
        { key: 'upper' as const, label: 'Upper Body', color: '#38bdf8' },
        { key: 'lower' as const, label: 'Lower Body', color: '#22c55e' },
        { key: 'core' as const, label: 'Core', color: '#f59e0b' },
    ];

    return (
        <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-4">
            {/* Exercise Selector */}
            <div className="space-y-3">
                {categories.map((cat) => (
                    <div key={cat.key}>
                        <p className="text-[10px] font-medium tracking-widest uppercase mb-2" style={{ color: `${cat.color}80` }}>
                            {cat.label}
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {getExercisesByCategory(cat.key).map((ex) => {
                                const isActive = exerciseId === ex.id;
                                return (
                                    <button
                                        key={ex.id}
                                        onClick={() => !isDetecting && setExercise(ex.id)}
                                        disabled={isDetecting}
                                        className={`
                      px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer
                      ${isActive
                                                ? 'bg-[#22c55e]/15 text-[#22c55e] border border-[#22c55e]/40 shadow-[0_0_15px_rgba(34,197,94,0.15)]'
                                                : 'bg-white/5 text-white/40 border border-white/5 hover:bg-white/10'
                                            }
                      ${isDetecting && !isActive ? 'opacity-30 cursor-not-allowed' : ''}
                    `}
                                    >
                                        {ex.icon} {ex.name}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>

            {/* Camera Feed + Overlays */}
            <div className="relative">
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
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 glass-panel rounded-full px-4 py-2">
                        <span className="text-[#38bdf8] font-bold text-lg" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                            {isHolding ? '🟢' : '🔴'} {holdTime.toFixed(1)}s
                        </span>
                    </div>
                )}
            </div>

            {/* Controls row */}
            <div className="flex items-center justify-center gap-4 flex-wrap">
                <FormFeedback feedback={feedback} isDetecting={isDetecting} />
                <CoachMessage tip={coachTip} />

                <button
                    onClick={isDetecting ? handleStopWorkout : startDetection}
                    className={`
            px-8 py-3 rounded-xl font-semibold text-sm tracking-wide transition-all cursor-pointer
            ${isDetecting
                            ? 'bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500/25'
                            : 'bg-[#22c55e]/15 text-[#22c55e] border border-[#22c55e]/40 hover:bg-[#22c55e]/25 shadow-[0_0_20px_rgba(34,197,94,0.2)]'
                        }
          `}
                >
                    {isDetecting ? (
                        <span className="flex items-center gap-2">
                            <span className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />
                            Finish Workout
                        </span>
                    ) : (
                        <span className="flex items-center gap-2">▶ Start Workout</span>
                    )}
                </button>
            </div>

            {/* Form corrections */}
            {formCorrections.length > 0 && isDetecting && (
                <div className="space-y-2">
                    {formCorrections.map((fc) => (
                        <div key={fc.ruleId} className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-2 text-sm text-amber-400 animate-fade-in">
                            ⚠️ {fc.message}
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
