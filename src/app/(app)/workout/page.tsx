/**
 * Workout Page — Camera-dominant layout with completion tracking & voice coaching.
 * Features: 3-2-1-GO countdown, reset button, set complete modal, voice coach.
 * Exercise guide, muscles, and stats visible BEFORE camera starts.
 */

'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { usePoseDetection } from '../../../hooks/usePoseDetection';
import { useSpeechCoach } from '../../../hooks/useSpeechCoach';
import { ExerciseId, EXERCISES, getExercisesByCategory } from '../../../lib/exercises';
import { generateWorkoutSummary, resetCoach } from '../../../lib/aiCoach';
import { recordWorkout } from '../../../lib/gamification';
import { saveWorkout } from '../../../lib/progressStore';
import CameraFeed from '../../../components/CameraFeed';
import RepCounterDisplay from '../../../components/RepCounter';
import SetTracker from '../../../components/SetTracker';
import FormFeedback from '../../../components/FormFeedback';
import CoachMessage from '../../../components/CoachMessage';
import ExerciseGuide from '../../../components/ExerciseGuide';
import MuscleIndicator from '../../../components/MuscleIndicator';
import SetCompleteModal from '../../../components/SetCompleteModal';
import CountdownOverlay from '../../../components/CountdownOverlay';
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
    const [selectorOpen, setSelectorOpen] = useState(false);

    // Set/rep tracking
    const [targetReps, setTargetReps] = useState(10);
    const [targetSets, setTargetSets] = useState(3);
    const [currentSet, setCurrentSet] = useState(1);
    const [showSetComplete, setShowSetComplete] = useState(false);
    const [setFormQuality, setSetFormQuality] = useState(0);
    const [totalRepsThisWorkout, setTotalRepsThisWorkout] = useState(0);

    // Countdown
    const [showCountdown, setShowCountdown] = useState(false);

    // Voice coach
    const [voiceEnabled, setVoiceEnabled] = useState(true);
    const speechCoach = useSpeechCoach({
        enabled: voiceEnabled,
        targetReps,
        currentSet,
        totalSets: targetSets,
    });

    const currentExercise = EXERCISES[exerciseId];
    const prevRepCountRef = useRef(repCount);
    const setCompleteTriggeredRef = useRef(false);

    // When reps reach target → stop detection and show modal
    useEffect(() => {
        if (repCount > prevRepCountRef.current) {
            speechCoach.onRepChange(repCount);

            if (repCount >= targetReps && !setCompleteTriggeredRef.current) {
                setCompleteTriggeredRef.current = true;
                setSetFormQuality(formQuality);
                setTotalRepsThisWorkout(prev => prev + repCount);

                setTimeout(() => {
                    stopDetection();
                    setShowSetComplete(true);
                    speechCoach.onSetComplete();
                }, 600);
            }
        }
        prevRepCountRef.current = repCount;
    }, [repCount, targetReps, formQuality, speechCoach, stopDetection]);

    // Feed coach tips to speech coach
    useEffect(() => {
        if (coachTip) {
            speechCoach.onCoachTip(coachTip);
        }
    }, [coachTip, speechCoach]);

    // Start with countdown
    const handleStart = useCallback(() => {
        setShowCountdown(true);
    }, []);

    // Called when countdown finishes
    const handleCountdownComplete = useCallback(() => {
        setShowCountdown(false);
        startDetection();
    }, [startDetection]);

    // Reset current set (stops detection, resets rep count)
    const handleReset = useCallback(() => {
        stopDetection();
        setCompleteTriggeredRef.current = false;
        speechCoach.reset();
        // Brief pause then restart with countdown
        setTimeout(() => {
            setShowCountdown(true);
        }, 300);
    }, [stopDetection, speechCoach]);

    // Handle "Next Set" from the modal
    const handleNextSet = useCallback(() => {
        setShowSetComplete(false);
        setCurrentSet(prev => prev + 1);
        setCompleteTriggeredRef.current = false;
        // Start countdown for next set
        setTimeout(() => {
            setShowCountdown(true);
        }, 300);
    }, []);

    // Handle "End Workout" (from modal or manual stop)
    const handleEndWorkout = useCallback(() => {
        setShowSetComplete(false);
        stopDetection();

        const totalReps = totalRepsThisWorkout > 0 ? totalRepsThisWorkout : repCount;

        if (totalReps > 0) {
            const duration = workoutStartTime ? Math.round((Date.now() - workoutStartTime) / 1000) : 0;
            const ws = generateWorkoutSummary(totalReps, formQuality, timeUnderTension, duration, currentExercise.name);
            setSummary(ws);

            const perfectReps = formQuality >= 90 ? Math.round(totalReps * 0.3) : 0;
            const result = recordWorkout(totalReps, formQuality, perfectReps);
            setXpGained(result.xpGained);
            setNewBadges(result.newBadges);

            saveWorkout({
                exerciseId,
                exerciseName: currentExercise.name,
                reps: totalReps,
                formQuality,
                timeUnderTension,
                duration,
                xpGained: result.xpGained,
            });

            setShowSummary(true);
            speechCoach.speakSummary(ws.coachNotes);
        }

        resetCoach();
        speechCoach.reset();
        setCurrentSet(1);
        setTotalRepsThisWorkout(0);
        setCompleteTriggeredRef.current = false;
    }, [stopDetection, totalRepsThisWorkout, repCount, formQuality, timeUnderTension, currentExercise, exerciseId, workoutStartTime, speechCoach]);

    // Manual stop
    const handleManualStop = useCallback(() => {
        if (repCount > 0) {
            setTotalRepsThisWorkout(prev => prev + repCount);
        }
        handleEndWorkout();
    }, [repCount, handleEndWorkout]);

    const categories = [
        { key: 'upper' as const, label: 'UPPER', color: '#38bdf8' },
        { key: 'lower' as const, label: 'LOWER', color: '#22c55e' },
        { key: 'core' as const, label: 'CORE', color: '#f59e0b' },
    ];

    return (
        <div className="h-screen flex flex-col overflow-hidden">
            {/* ─── Top bar ────────────────────────────────────────────── */}
            <div className="flex-none bg-[#0a0a0a] border-b border-white/5 z-20 relative">
                <div className="flex items-center justify-between px-4 py-2.5">
                    {/* Current exercise (clickable to toggle selector) */}
                    <button
                        onClick={() => !isDetecting && setSelectorOpen(!selectorOpen)}
                        disabled={isDetecting}
                        className={`
                            flex items-center gap-3 cursor-pointer transition-all
                            ${isDetecting ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-80'}
                        `}
                    >
                        <span
                            className="text-[10px] font-black tracking-wider bg-[#22c55e]/10 text-[#22c55e] border border-[#22c55e]/20 rounded-md px-2 py-1"
                            style={{ fontFamily: 'Orbitron, monospace' }}
                        >
                            {currentExercise.icon}
                        </span>
                        <span className="text-sm font-semibold text-white">{currentExercise.name}</span>
                        {!isDetecting && (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                                className={`text-white/20 transition-transform ${selectorOpen ? 'rotate-180' : ''}`}>
                                <polyline points="6,9 12,15 18,9" />
                            </svg>
                        )}
                    </button>

                    {/* Controls */}
                    <div className="flex items-center gap-2">
                        {/* Voice toggle */}
                        <button
                            onClick={() => setVoiceEnabled(!voiceEnabled)}
                            className={`
                                p-2 rounded-lg transition-all cursor-pointer
                                ${voiceEnabled
                                    ? 'bg-[#38bdf8]/10 text-[#38bdf8] border border-[#38bdf8]/20'
                                    : 'bg-white/5 text-white/20 border border-white/5'}
                            `}
                            title={voiceEnabled ? 'Voice coaching ON' : 'Voice coaching OFF'}
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                {voiceEnabled ? (
                                    <>
                                        <polygon points="11,5 6,9 2,9 2,15 6,15 11,19" />
                                        <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                                        <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                                    </>
                                ) : (
                                    <>
                                        <polygon points="11,5 6,9 2,9 2,15 6,15 11,19" />
                                        <line x1="23" y1="9" x2="17" y2="15" />
                                        <line x1="17" y1="9" x2="23" y2="15" />
                                    </>
                                )}
                            </svg>
                        </button>

                        {/* Reset button — only during detection */}
                        {isDetecting && (
                            <button
                                onClick={handleReset}
                                className="p-2 rounded-lg transition-all cursor-pointer bg-white/5 text-white/30 border border-white/5 hover:bg-amber-500/10 hover:text-amber-400 hover:border-amber-500/20"
                                title="Reset current set"
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                    <polyline points="1,4 1,10 7,10" />
                                    <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                                </svg>
                            </button>
                        )}

                        {/* Target reps config (only when not detecting) */}
                        {!isDetecting && (
                            <div className="flex items-center gap-1 bg-white/5 rounded-lg border border-white/5 px-2 py-1">
                                <span className="text-[8px] text-white/25 tracking-wider uppercase mr-1">Target</span>
                                <button onClick={() => setTargetReps(Math.max(1, targetReps - 1))}
                                    className="text-white/30 hover:text-white/60 w-5 h-5 flex items-center justify-center cursor-pointer">-</button>
                                <span className="text-[11px] font-bold text-[#22c55e] w-6 text-center" style={{ fontFamily: 'Orbitron, monospace' }}>{targetReps}</span>
                                <button onClick={() => setTargetReps(targetReps + 1)}
                                    className="text-white/30 hover:text-white/60 w-5 h-5 flex items-center justify-center cursor-pointer">+</button>
                                <span className="text-[8px] text-white/15 mx-1">×</span>
                                <button onClick={() => setTargetSets(Math.max(1, targetSets - 1))}
                                    className="text-white/30 hover:text-white/60 w-5 h-5 flex items-center justify-center cursor-pointer">-</button>
                                <span className="text-[11px] font-bold text-[#38bdf8] w-4 text-center" style={{ fontFamily: 'Orbitron, monospace' }}>{targetSets}</span>
                                <button onClick={() => setTargetSets(targetSets + 1)}
                                    className="text-white/30 hover:text-white/60 w-5 h-5 flex items-center justify-center cursor-pointer">+</button>
                                <span className="text-[8px] text-white/25 tracking-wider uppercase ml-1">sets</span>
                            </div>
                        )}

                        {/* Start/Stop */}
                        <button
                            onClick={isDetecting ? handleManualStop : handleStart}
                            className={`
                                px-5 py-2 rounded-lg font-bold text-xs tracking-wider uppercase transition-all cursor-pointer
                                ${isDetecting
                                    ? 'bg-red-500/15 text-red-400 border border-red-500/25 hover:bg-red-500/25'
                                    : 'bg-[#22c55e] text-black hover:bg-[#16a34a] shadow-[0_0_25px_rgba(34,197,94,0.3)]'}
                            `}
                        >
                            {isDetecting ? (
                                <span className="flex items-center gap-2">
                                    <span className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />Stop
                                </span>
                            ) : (
                                <span className="flex items-center gap-2">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21" /></svg>
                                    Start
                                </span>
                            )}
                        </button>
                    </div>
                </div>

                {/* Exercise selector dropdown */}
                {selectorOpen && !isDetecting && (
                    <div className="absolute top-full left-0 right-0 bg-[#0a0a0a]/98 backdrop-blur-xl border-b border-white/5 px-4 py-3 z-30 max-h-[40vh] overflow-y-auto">
                        {categories.map((cat) => (
                            <div key={cat.key} className="mb-3 last:mb-0">
                                <p className="text-[8px] font-bold tracking-[0.25em] uppercase mb-1.5" style={{ color: `${cat.color}60` }}>
                                    {cat.label}
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                    {getExercisesByCategory(cat.key).map((ex) => {
                                        const isActive = exerciseId === ex.id;
                                        return (
                                            <button
                                                key={ex.id}
                                                onClick={() => {
                                                    setExercise(ex.id);
                                                    setSelectorOpen(false);
                                                    speechCoach.reset();
                                                    setCurrentSet(1);
                                                    setTotalRepsThisWorkout(0);
                                                    setCompleteTriggeredRef.current = false;
                                                }}
                                                className={`
                                                    flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-all cursor-pointer
                                                    ${isActive
                                                        ? 'bg-[#22c55e]/10 text-[#22c55e] border border-[#22c55e]/30'
                                                        : 'text-white/30 border border-white/5 hover:border-white/15 hover:text-white/50'}
                                                `}
                                            >
                                                <span className="text-[8px] font-black tracking-wider opacity-50" style={{ fontFamily: 'Orbitron, monospace' }}>
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
                )}
            </div>

            {/* ─── Camera feed ────────────────────────────────────────── */}
            <div className="flex-1 relative overflow-hidden bg-black">
                <CameraFeed
                    videoRef={videoRef}
                    canvasRef={canvasRef}
                    landmarks={landmarks}
                    currentAngle={currentAngle}
                    exercise={exerciseId}
                    isDetecting={isDetecting}
                />
                <RepCounterDisplay count={repCount} isDetecting={isDetecting} targetReps={targetReps} />

                {/* Set tracker */}
                <SetTracker
                    currentSet={currentSet}
                    totalSets={targetSets}
                    targetReps={targetReps}
                    currentReps={repCount}
                    isDetecting={isDetecting}
                />

                {/* Feedback overlays */}
                {isDetecting && (
                    <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
                        <FormFeedback feedback={feedback} isDetecting={isDetecting} />
                        <CoachMessage tip={coachTip} />
                    </div>
                )}

                {/* Form quality warning */}
                {isDetecting && formQuality < 40 && repCount > 0 && (
                    <div className="absolute top-14 left-1/2 -translate-x-1/2 z-20 animate-pulse">
                        <div className="bg-red-500/20 backdrop-blur-sm border border-red-500/30 rounded-lg px-4 py-2 flex items-center gap-2">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round">
                                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                                <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                            </svg>
                            <span className="text-xs font-bold text-red-400">Check your form — reps may not count</span>
                        </div>
                    </div>
                )}

                {/* Exercise guide — always visible */}
                <div className="absolute right-3 z-10" style={{ top: isDetecting ? '80px' : '12px' }}>
                    <ExerciseGuide exerciseId={exerciseId} isDetecting={isDetecting} />
                </div>

                {/* Muscle indicator — always visible */}
                <div className="absolute bottom-4 right-3 z-10">
                    <MuscleIndicator exerciseId={exerciseId} isDetecting={isDetecting} />
                </div>

                {/* Hold timer */}
                {currentExercise.repMode === 'hold' && isDetecting && (
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/70 backdrop-blur-sm rounded-full px-6 py-2.5 border border-white/10">
                        <span className="font-bold text-xl flex items-center gap-2" style={{ fontFamily: 'Orbitron, monospace' }}>
                            <span className={`w-2.5 h-2.5 rounded-full ${isHolding ? 'bg-[#22c55e] shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-red-400'}`} />
                            <span className={isHolding ? 'text-[#22c55e]' : 'text-red-400'}>{holdTime.toFixed(1)}s</span>
                        </span>
                    </div>
                )}

                {/* Form corrections */}
                {formCorrections.length > 0 && isDetecting && (
                    <div className="absolute bottom-4 left-4 space-y-1.5 max-w-sm">
                        {formCorrections.map((fc) => (
                            <div key={fc.ruleId} className="flex items-center gap-2 bg-black/70 backdrop-blur-sm border border-amber-500/20 rounded-lg px-3 py-1.5 text-xs text-amber-400/80">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="flex-shrink-0">
                                    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                                    <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                                </svg>
                                {fc.message}
                            </div>
                        ))}
                    </div>
                )}

                {/* Live stats */}
                {isDetecting && (
                    <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-sm rounded-lg border border-white/5 px-3 py-2 space-y-1">
                        <div className="flex items-center gap-2 text-[10px]">
                            <span className="text-white/25 uppercase tracking-wider">Form</span>
                            <span className={`font-bold ${formQuality >= 80 ? 'text-[#22c55e]' : formQuality >= 60 ? 'text-amber-400' : 'text-red-400'}`}
                                style={{ fontFamily: 'Orbitron, monospace' }}>
                                {formQuality}%
                            </span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px]">
                            <span className="text-white/25 uppercase tracking-wider">TUT</span>
                            <span className="text-white/60 font-bold" style={{ fontFamily: 'Orbitron, monospace' }}>
                                {timeUnderTension}s
                            </span>
                        </div>
                    </div>
                )}

                {/* Pre-camera stats */}
                {!isDetecting && !showSetComplete && !showSummary && (
                    <div className="absolute top-3 left-3 bg-black/50 backdrop-blur-sm rounded-lg border border-white/5 px-3 py-2 z-10">
                        <div className="flex items-center gap-2 text-[10px]">
                            <span className="text-white/25 uppercase tracking-wider">Set</span>
                            <span className="text-[#38bdf8] font-bold" style={{ fontFamily: 'Orbitron, monospace' }}>
                                {currentSet} / {targetSets}
                            </span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] mt-1">
                            <span className="text-white/25 uppercase tracking-wider">Target</span>
                            <span className="text-[#22c55e] font-bold" style={{ fontFamily: 'Orbitron, monospace' }}>
                                {targetReps} reps
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {/* ─── Countdown Overlay ──────────────────────────────────── */}
            {showCountdown && (
                <CountdownOverlay
                    onComplete={handleCountdownComplete}
                    voiceEnabled={voiceEnabled}
                />
            )}

            {/* ─── Set Complete Modal ─────────────────────────────────── */}
            {showSetComplete && (
                <SetCompleteModal
                    currentSet={currentSet}
                    totalSets={targetSets}
                    repsCompleted={repCount}
                    targetReps={targetReps}
                    formQuality={setFormQuality}
                    onNextSet={handleNextSet}
                    onEndWorkout={handleEndWorkout}
                />
            )}

            {/* ─── Workout Summary Modal ──────────────────────────────── */}
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
