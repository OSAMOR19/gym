/**
 * Workout Page — Camera-dominant layout with completion tracking & voice coaching.
 * Features: 3-2-1-GO countdown, reset button, set complete modal, voice coach.
 * Exercise guide, muscles, and stats visible BEFORE camera starts.
 */

'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { usePoseDetection } from '../../../hooks/usePoseDetection';
import { useSpeechCoach } from '../../../hooks/useSpeechCoach';
import { EXERCISES } from '../../../lib/exercises';
import { generateWorkoutSummary, resetCoach } from '../../../lib/aiCoach';
import { loadStats, applyWorkout } from '../../../lib/gamification';
import { beginSession, isSessionActive, recordSet, abandonSession, completeSession, setLastSetRpe } from '../../../lib/workoutSession';
import { logEvent } from '../../../lib/events';
import { getWorkoutQueue, clearWorkoutQueue, markDayCompleted, WorkoutQueue } from '../../../lib/workoutQueue';
import { getCameraGuide } from '../../../lib/cameraGuide';
import { NOT_IN_FRAME_FEEDBACK } from '../../../lib/repEngine';
import { HighlightRecorder, HighlightClip } from '../../../lib/replay/highlightRecorder';
import { ReplayStats } from '../../../lib/replay/replayComposer';
import ReplayPanel from '../../../components/ReplayPanel';
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
import ExercisePickerModal from '../../../components/ExercisePickerModal';
import { useToast } from '../../../components/Toast';
import type { WorkoutSummary } from '../../../lib/aiCoach';
import type { Badge } from '../../../lib/gamification';

/** Reps at or above this form quality count as "good" in per-set records. */
const GOOD_FORM_THRESHOLD = 70;

export default function WorkoutPage() {
    const {
        videoRef, canvasRef, landmarksRef, angleRef, repCount, formQuality,
        feedback, timeUnderTension, isDetecting, isLoading, error, modelError, exerciseId,
        hasBody, formCorrections, positionHint, coachTip, holdTime, isHolding,
        setExercise, startDetection, stopDetection, endSession, retryModel, workoutStartTime,
    } = usePoseDetection();

    const toast = useToast();
    const router = useRouter();

    const [showSummary, setShowSummary] = useState(false);
    const [summary, setSummary] = useState<WorkoutSummary | null>(null);
    const [xpGained, setXpGained] = useState(0);
    const [newBadges, setNewBadges] = useState<Badge[]>([]);
    const [selectorOpen, setSelectorOpen] = useState(false);

    // Workout Replay: highlight clips recorded locally (only pinned moments
    // survive; raw footage never persists — see lib/replay/highlightRecorder)
    const recorderRef = useRef<HighlightRecorder | null>(null);
    const bestFormRef = useRef(0);
    const setsDoneRef = useRef(0);
    const [replayEnabled, setReplayEnabled] = useState(true);
    const [replayData, setReplayData] = useState<{
        clips: HighlightClip[]; stats: ReplayStats; workoutId: string | null;
    } | null>(null);

    useEffect(() => {
        setReplayEnabled(localStorage.getItem('irontrack_replay_off') !== '1' && HighlightRecorder.supported());
    }, []);
    const toggleReplay = useCallback(() => {
        setReplayEnabled((prev) => {
            localStorage.setItem('irontrack_replay_off', prev ? '1' : '0');
            return !prev;
        });
    }, []);

    // Set/rep tracking
    const [targetReps, setTargetReps] = useState(10);
    const [targetSets, setTargetSets] = useState(3);
    const [targetHoldSeconds, setTargetHoldSeconds] = useState(30);
    const [currentSet, setCurrentSet] = useState(1);
    const [showSetComplete, setShowSetComplete] = useState(false);
    const [setFormQuality, setSetFormQuality] = useState(0);
    const [totalRepsThisWorkout, setTotalRepsThisWorkout] = useState(0);

    // Program-day queue (set by "Start Day N" on a program page)
    const [queue, setQueue] = useState<WorkoutQueue | null>(null);
    const [queueIndex, setQueueIndex] = useState(0);

    // Consume a pending program day on mount
    useEffect(() => {
        const pending = getWorkoutQueue();
        if (!pending) return;
        setQueue(pending);
        setQueueIndex(0);
        const first = pending.items[0];
        setExercise(first.exerciseId);
        setTargetSets(first.targetSets);
        if (first.targetReps > 0) setTargetReps(first.targetReps);
        if (first.targetHoldSeconds) setTargetHoldSeconds(first.targetHoldSeconds);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const nextQueueItem = queue?.items[queueIndex + 1] ?? null;

    // Countdown
    const [showCountdown, setShowCountdown] = useState(false);

    // Video preview modal — shown when exercise first loads or changes
    const [showVideoModal, setShowVideoModal] = useState(true);
    const prevExerciseRef = useRef(exerciseId);

    // Reset modal when exercise changes
    useEffect(() => {
        if (exerciseId !== prevExerciseRef.current) {
            prevExerciseRef.current = exerciseId;
            setShowVideoModal(true);
        }
    }, [exerciseId]);

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

    // Per-set observation buffers for persistence (workout_sets). These only
    // AGGREGATE what the CV pipeline already reports — detection is untouched.
    const goodRepsRef = useRef(0);
    const poorRepsRef = useRef(0);
    const setIssuesRef = useRef<Set<string>>(new Set());
    const setStartRef = useRef<number | null>(null);
    const lastSetEndRef = useRef<number | null>(null);
    const restBeforeSetRef = useRef<number | undefined>(undefined);

    /** Called whenever detection (re)starts — marks set timing and, on the
     *  first set, opens the persistent workout session. */
    const markDetectionStart = useCallback(() => {
        const now = Date.now();
        restBeforeSetRef.current = lastSetEndRef.current
            ? Math.round((now - lastSetEndRef.current) / 1000)
            : undefined;
        setStartRef.current = now;

        // Fresh observation buffers — also covers the mid-set Reset button,
        // which discards the aborted attempt's rep classifications
        goodRepsRef.current = 0;
        poorRepsRef.current = 0;
        setIssuesRef.current = new Set();

        if (!isSessionActive()) {
            beginSession(
                queue ? 'program' : 'free',
                queue ? { programId: queue.programId, dayIndex: queue.dayIndex, dayName: queue.dayName } : undefined,
            );
            logEvent('WORKOUT_STARTED', {
                exerciseId,
                metadata: queue
                    ? { source: 'program', program_id: queue.programId, day_name: queue.dayName }
                    : { source: 'free' },
            });
            logEvent('EXERCISE_STARTED', { exerciseId });
        }
    }, [queue, exerciseId]);

    /** Persist one finished (or manually cut short) set into the session
     *  draft, and emit its events. */
    const captureSet = useCallback((completedReps: number, holdSeconds?: number) => {
        const now = Date.now();
        const isHold = holdSeconds !== undefined;
        const durationSeconds = setStartRef.current
            ? Math.round((now - setStartRef.current) / 1000)
            : undefined;
        const issues = [...setIssuesRef.current];

        recordSet({
            exerciseId,
            setNumber: currentSet,
            targetReps: isHold ? 0 : targetReps,
            completedReps,
            formScore: formQuality,
            goodReps: isHold ? undefined : goodRepsRef.current,
            poorReps: isHold ? undefined : poorRepsRef.current,
            holdSeconds,
            durationSeconds,
            restSeconds: restBeforeSetRef.current,
        });
        logEvent('SET_COMPLETED', {
            exerciseId,
            metadata: {
                set_number: currentSet,
                completed_reps: completedReps,
                target_reps: isHold ? undefined : targetReps,
                form_score: formQuality,
                good_reps: isHold ? undefined : goodRepsRef.current,
                poor_reps: isHold ? undefined : poorRepsRef.current,
                hold_seconds: holdSeconds,
            },
        });
        if (issues.length > 0 || poorRepsRef.current > 0) {
            logEvent('FORM_ISSUE_DETECTED', {
                exerciseId,
                metadata: {
                    set_number: currentSet,
                    issues,
                    good_reps: goodRepsRef.current,
                    poor_reps: poorRepsRef.current,
                    form_score: formQuality,
                },
            });
        }

        lastSetEndRef.current = now;
        goodRepsRef.current = 0;
        poorRepsRef.current = 0;
        setIssuesRef.current = new Set();
    }, [exerciseId, currentSet, targetReps, formQuality]);

    // Remember which form corrections fired during the current set
    useEffect(() => {
        if (!isDetecting) return;
        for (const fc of formCorrections) setIssuesRef.current.add(fc.ruleId);
    }, [formCorrections, isDetecting]);

    // When reps reach target → stop detection and show modal
    useEffect(() => {
        if (repCount > prevRepCountRef.current) {
            speechCoach.onRepChange(repCount);

            // Classify the rep for the set record using the live form score
            if (formQuality >= GOOD_FORM_THRESHOLD) goodRepsRef.current += 1;
            else poorRepsRef.current += 1;

            if (repCount >= targetReps && !setCompleteTriggeredRef.current) {
                setCompleteTriggeredRef.current = true;
                setSetFormQuality(formQuality);
                setTotalRepsThisWorkout(prev => prev + repCount);
                captureSet(repCount);

                // Pin this moment for the replay (marks land in the segment
                // being recorded right now, before the camera stops)
                setsDoneRef.current += 1;
                const isBest = formQuality > bestFormRef.current && formQuality >= 80;
                if (isBest) bestFormRef.current = formQuality;
                recorderRef.current?.mark(
                    isBest ? 'best_form' : 'set_complete',
                    `${currentExercise.name} · Form ${formQuality}%`,
                );

                setTimeout(() => {
                    stopDetection();
                    setShowSetComplete(true);
                    speechCoach.onSetComplete();
                }, 600);
            }
        }
        prevRepCountRef.current = repCount;
    }, [repCount, targetReps, formQuality, speechCoach, stopDetection, captureSet, currentExercise.name]);

    // Hold exercises: complete the set when the hold target is reached.
    // Previously hold sets had no finish condition at all — the only way out
    // was the manual Stop button.
    const isHoldExercise = currentExercise.repMode === 'hold';
    useEffect(() => {
        if (!isHoldExercise || !isDetecting) return;
        if (holdTime >= targetHoldSeconds && !setCompleteTriggeredRef.current) {
            setCompleteTriggeredRef.current = true;
            setSetFormQuality(formQuality);
            // Credit 1 rep-equivalent per 3s held so holds earn XP consistently
            setTotalRepsThisWorkout(prev => prev + Math.max(1, Math.round(holdTime / 3)));
            captureSet(Math.max(1, Math.round(holdTime / 3)), holdTime);

            setsDoneRef.current += 1;
            recorderRef.current?.mark('set_complete', `${currentExercise.name} · ${Math.round(holdTime)}s hold`);

            setTimeout(() => {
                stopDetection();
                setShowSetComplete(true);
                speechCoach.onSetComplete();
            }, 400);
        }
    }, [isHoldExercise, isDetecting, holdTime, targetHoldSeconds, formQuality, speechCoach, stopDetection, captureSet, currentExercise.name]);

    // Feed coach tips to speech coach
    useEffect(() => {
        if (coachTip) {
            speechCoach.onCoachTip(coachTip);
        }
    }, [coachTip, speechCoach]);

    // Replay recorder follows the camera: record while detecting, pause
    // between sets, clips accumulate across the whole workout
    useEffect(() => {
        if (!isDetecting) {
            recorderRef.current?.stop();
            return;
        }
        if (!replayEnabled) return;
        const stream = videoRef.current?.srcObject as MediaStream | undefined;
        if (!stream) return;
        const isFirstSet = !recorderRef.current;
        if (isFirstSet) recorderRef.current = new HighlightRecorder();
        if (recorderRef.current!.start(stream) && isFirstSet) {
            setTimeout(() => recorderRef.current?.mark('start', 'WARM-UP'), 1500);
        }
    }, [isDetecting, replayEnabled, videoRef]);

    // Abandoned page → footage never leaves the device
    useEffect(() => () => {
        recorderRef.current?.discard();
        recorderRef.current = null;
    }, []);

    // Start with countdown
    const handleStart = useCallback(() => {
        // Warm up speech synthesis with a silent call (Chrome fix)
        if (typeof window !== 'undefined' && window.speechSynthesis) {
            window.speechSynthesis.cancel();
        }
        setShowCountdown(true);
    }, []);

    // Called when countdown finishes
    const handleCountdownComplete = useCallback(() => {
        setShowCountdown(false);
        speechCoach.announceExercise(currentExercise.name, getCameraGuide(exerciseId).speech);
        markDetectionStart();
        startDetection();
    }, [startDetection, speechCoach, currentExercise.name, exerciseId, markDetectionStart]);

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

    // Handle "Next Set" from the modal — or, when the exercise's sets are all
    // done and a program day is loaded, advance to the day's next exercise
    const handleNextSet = useCallback(() => {
        setShowSetComplete(false);
        setCompleteTriggeredRef.current = false;
        speechCoach.reset();

        if (currentSet >= targetSets && queue && nextQueueItem) {
            // Advance to the next exercise in the program day
            const next = nextQueueItem;
            logEvent('EXERCISE_COMPLETED', { exerciseId, metadata: { sets: targetSets } });
            logEvent('EXERCISE_STARTED', { exerciseId: next.exerciseId });
            setQueueIndex(prev => prev + 1);
            setExercise(next.exerciseId);
            setTargetSets(next.targetSets);
            if (next.targetReps > 0) setTargetReps(next.targetReps);
            if (next.targetHoldSeconds) setTargetHoldSeconds(next.targetHoldSeconds);
            setCurrentSet(1);
            setShowVideoModal(true); // show the new exercise's demo before starting
            return;
        }

        setCurrentSet(prev => prev + 1);
        // Start countdown for next set
        setTimeout(() => {
            setShowCountdown(true);
        }, 300);
    }, [speechCoach, currentSet, targetSets, queue, nextQueueItem, setExercise, exerciseId]);

    // Guard against double invocation (modal button + manual stop both route
    // here) — without it a workout could be recorded and XP granted twice.
    const endingRef = useRef(false);

    /**
     * Handle "End Workout" (from modal or manual stop).
     * `finalTotal` is passed by callers that just added reps to the total —
     * reading `totalRepsThisWorkout` here would see the pre-update value.
     */
    const handleEndWorkout = useCallback(async (finalTotal?: number) => {
        if (endingRef.current) return;
        endingRef.current = true;

        // Pin the closing moment and flush the in-flight segment BEFORE the
        // camera stops — a MediaRecorder on a dead stream can drop its data
        recorderRef.current?.mark('finish', 'FINAL PUSH');
        await recorderRef.current?.stop();

        setShowSetComplete(false);
        endSession();

        const isHold = currentExercise.repMode === 'hold';
        // Contribution of the current (possibly unfinished) set. Hold sets
        // credit 1 rep-equivalent per 3s held so they earn XP consistently.
        // Completed sets are already accumulated in totalRepsThisWorkout.
        const currentContribution = setCompleteTriggeredRef.current
            ? 0
            : isHold ? Math.round(holdTime / 3) : repCount;
        const effectiveReps = finalTotal
            ?? (totalRepsThisWorkout > 0 ? totalRepsThisWorkout : currentContribution);

        const dayCompleted = queue && !nextQueueItem && currentSet >= targetSets
            ? { programId: queue.programId, dayIndex: queue.dayIndex }
            : null;

        if (effectiveReps > 0) {
            const duration = workoutStartTime ? Math.round((Date.now() - workoutStartTime) / 1000) : 0;
            // Program days are recorded under the day's name; free workouts
            // under the exercise name
            const recordName = queue ? `${queue.programName} — ${queue.dayName}` : currentExercise.name;
            const ws = generateWorkoutSummary(effectiveReps, formQuality, timeUnderTension, duration, recordName);
            setSummary(ws);

            const perfectReps = formQuality >= 90 ? Math.round(effectiveReps * 0.3) : 0;
            const current = await loadStats();
            const { stats, xpGained: xp, newBadges: badges } = applyWorkout(current, effectiveReps, formQuality, perfectReps);
            setXpGained(xp);
            setNewBadges(badges);

            // One atomic save: session + per-set CV results + workout record
            // + events + program progress (falls back pre-migration)
            const result = await completeSession({
                exerciseId,
                recordName,
                totalReps: effectiveReps,
                avgFormScore: formQuality,
                timeUnderTension: isHold ? holdTime : timeUnderTension,
                durationSeconds: duration,
                xpGained: xp,
                stats,
                programDayCompleted: dayCompleted,
            });

            if (!result.saved || !result.statsSaved) {
                toast.error('Workout not saved', 'Could not reach the server — your progress may be missing.');
            }

            // Workout is saved — replay is a fully independent afterthought.
            // Collect the pinned clips (works even if zero: stats-only recap).
            const clips = recorderRef.current ? await recorderRef.current.finalize() : [];
            recorderRef.current = null;
            setReplayData({
                clips,
                stats: {
                    title: recordName,
                    workoutType: 'strength',
                    durationSeconds: duration,
                    dateISO: new Date().toISOString(),
                    lines: [
                        { value: String(Math.max(setsDoneRef.current, 1)), label: 'sets' },
                        { value: String(effectiveReps), label: 'reps' },
                        { value: `${formQuality}%`, label: 'avg form' },
                        ...(xp > 0 ? [{ value: `+${xp}`, label: 'xp' }] : []),
                    ],
                },
                workoutId: result.sessionId,
            });
            setsDoneRef.current = 0;
            bestFormRef.current = 0;

            setShowSummary(true);
            speechCoach.speakSummary(ws.coachNotes);
        } else {
            recorderRef.current?.discard();
            recorderRef.current = null;
            setsDoneRef.current = 0;
            bestFormRef.current = 0;
            abandonSession();
        }

        // Program day finished (last exercise, all sets) → mark it on the
        // pathway. localStorage is the device cache; the server copy was
        // written by completeSession above.
        if (dayCompleted) {
            markDayCompleted(dayCompleted.programId, dayCompleted.dayIndex);
        }
        clearWorkoutQueue();
        setQueue(null);
        setQueueIndex(0);

        resetCoach();
        speechCoach.reset();
        setCurrentSet(1);
        setTotalRepsThisWorkout(0);
        setCompleteTriggeredRef.current = false;
        endingRef.current = false;
    }, [endSession, totalRepsThisWorkout, repCount, holdTime, formQuality, timeUnderTension, currentExercise, exerciseId, workoutStartTime, speechCoach, toast, queue, nextQueueItem, currentSet, targetSets]);

    // Manual stop — include the in-progress set's contribution in the total
    const handleManualStop = useCallback(() => {
        const isHold = currentExercise.repMode === 'hold';
        const currentContribution = isHold ? Math.round(holdTime / 3) : repCount;
        const total = totalRepsThisWorkout + currentContribution;
        if (currentContribution > 0) {
            setTotalRepsThisWorkout(total);
            // Preserve the cut-short set's data too
            if (!setCompleteTriggeredRef.current) {
                captureSet(currentContribution, isHold ? holdTime : undefined);
            }
        }
        handleEndWorkout(total > 0 ? total : undefined);
    }, [repCount, holdTime, currentExercise, totalRepsThisWorkout, handleEndWorkout, captureSet]);

    // ─── Top-bar controls — extracted so mobile and desktop can arrange
    //     them differently without duplicating markup ─────────────────────────
    const voiceButton = (
        <button
            onClick={() => setVoiceEnabled(!voiceEnabled)}
            className={`
                p-2 rounded-lg transition-all cursor-pointer flex-shrink-0
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
    );

    const resetButton = isDetecting ? (
        <button
            onClick={handleReset}
            className="p-2 rounded-lg transition-all cursor-pointer flex-shrink-0 bg-white/5 text-white/30 border border-white/5 hover:bg-amber-500/10 hover:text-amber-400 hover:border-amber-500/20"
            title="Reset current set"
        >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <polyline points="1,4 1,10 7,10" />
                <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
            </svg>
        </button>
    ) : null;

    const targetConfig = !isDetecting ? (
        <div className="flex items-center gap-1 bg-white/5 rounded-lg border border-white/5 px-2 py-1">
            <span className="text-[8px] text-white/25 tracking-wider uppercase mr-1">Target</span>
            <button onClick={() => setTargetReps(Math.max(1, targetReps - 1))}
                className="text-white/30 hover:text-white/60 w-6 h-6 sm:w-5 sm:h-5 flex items-center justify-center cursor-pointer">-</button>
            <span className="text-[11px] font-bold text-[#22c55e] w-6 text-center" style={{ fontFamily: 'Orbitron, monospace' }}>{targetReps}</span>
            <button onClick={() => setTargetReps(targetReps + 1)}
                className="text-white/30 hover:text-white/60 w-6 h-6 sm:w-5 sm:h-5 flex items-center justify-center cursor-pointer">+</button>
            <span className="text-[8px] text-white/15 mx-1">×</span>
            <button onClick={() => setTargetSets(Math.max(1, targetSets - 1))}
                className="text-white/30 hover:text-white/60 w-6 h-6 sm:w-5 sm:h-5 flex items-center justify-center cursor-pointer">-</button>
            <span className="text-[11px] font-bold text-[#38bdf8] w-4 text-center" style={{ fontFamily: 'Orbitron, monospace' }}>{targetSets}</span>
            <button onClick={() => setTargetSets(targetSets + 1)}
                className="text-white/30 hover:text-white/60 w-6 h-6 sm:w-5 sm:h-5 flex items-center justify-center cursor-pointer">+</button>
            <span className="text-[8px] text-white/25 tracking-wider uppercase ml-1">sets</span>
        </div>
    ) : null;

    const startButton = (
        <button
            onClick={isDetecting ? handleManualStop : handleStart}
            className={`
                px-5 py-2 rounded-lg font-bold text-xs tracking-wider uppercase transition-all cursor-pointer flex-shrink-0
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
    );

    return (
        // 100dvh (not vh): on mobile browsers 100vh includes the collapsed
        // address bar, pushing the bottom controls off-screen
        <div className="h-[100dvh] flex flex-col overflow-hidden">
            {/* ─── Top bar — two rows on phones so Start is never pushed
                 off-screen: row 1 = back / exercise / actions, row 2 = the
                 target stepper (inline again from sm up) ─────────────────── */}
            <div className="flex-none bg-[#0a0a0a] border-b border-white/5 z-20 relative">
                <div className="px-3 sm:px-4 py-2.5 space-y-2">
                    <div className="flex items-center gap-2">
                        {/* Back — the bottom nav is hidden on this immersive screen */}
                        {!isDetecting && (
                            <button
                                onClick={() => router.back()}
                                aria-label="Go back"
                                className="md:hidden -ml-1 w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-lg text-white/40 hover:text-white/70 hover:bg-white/5 transition-all cursor-pointer"
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="15,18 9,12 15,6" />
                                </svg>
                            </button>
                        )}

                        {/* Current exercise (clickable to toggle selector) */}
                        <button
                            onClick={() => !isDetecting && setSelectorOpen(!selectorOpen)}
                            disabled={isDetecting}
                            className={`
                                flex items-center gap-2 sm:gap-3 min-w-0 cursor-pointer transition-all
                                ${isDetecting ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-80'}
                            `}
                        >
                            <span
                                className="text-[10px] font-black tracking-wider bg-[#22c55e]/10 text-[#22c55e] border border-[#22c55e]/20 rounded-md px-2 py-1 flex-shrink-0"
                                style={{ fontFamily: 'Orbitron, monospace' }}
                            >
                                {currentExercise.icon}
                            </span>
                            <span className="text-sm font-semibold text-white truncate min-w-0">{currentExercise.name}</span>
                            {!isDetecting && (
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                                    className={`flex-shrink-0 text-white/20 transition-transform ${selectorOpen ? 'rotate-180' : ''}`}>
                                    <polyline points="6,9 12,15 18,9" />
                                </svg>
                            )}
                        </button>

                        {/* Actions — always on this row, so Start stays visible */}
                        <div className="ml-auto flex items-center gap-2 flex-shrink-0">
                            {voiceButton}
                            {resetButton}
                            {targetConfig && <div className="hidden sm:block">{targetConfig}</div>}
                            {startButton}
                        </div>
                    </div>

                    {/* Target stepper gets its own row on phones */}
                    {targetConfig && (
                        <div className="sm:hidden flex justify-center">{targetConfig}</div>
                    )}
                </div>
            </div>

            {/* Exercise picker — swipeable card modal */}
            <ExercisePickerModal
                open={selectorOpen && !isDetecting}
                activeExerciseId={exerciseId}
                onClose={() => setSelectorOpen(false)}
                onSelect={(id) => {
                    setExercise(id);
                    speechCoach.reset();
                    setCurrentSet(1);
                    setTotalRepsThisWorkout(0);
                    setCompleteTriggeredRef.current = false;
                    // Picking an exercise manually abandons the program day
                    if (queue) {
                        logEvent('WORKOUT_MODIFIED', {
                            exerciseId: id,
                            metadata: {
                                reason: 'manual_exercise_change',
                                abandoned_program_id: queue.programId,
                                abandoned_day_name: queue.dayName,
                            },
                        });
                    }
                    clearWorkoutQueue();
                    setQueue(null);
                    setQueueIndex(0);
                }}
            />

            {/* ─── Camera feed ────────────────────────────────────────── */}
            <div className="flex-1 relative overflow-hidden bg-black">
                <CameraFeed
                    videoRef={videoRef}
                    canvasRef={canvasRef}
                    landmarksRef={landmarksRef}
                    angleRef={angleRef}
                    hasBody={hasBody}
                    exercise={exerciseId}
                    isDetecting={isDetecting}
                    isLoading={isLoading}
                    error={error}
                />
                <RepCounterDisplay count={repCount} isDetecting={isDetecting} targetReps={targetReps} />

                {/* AI model failed to load — camera works but reps aren't counted */}
                {isDetecting && modelError && (
                    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 bg-red-500/15 backdrop-blur-sm border border-red-500/30 rounded-lg px-4 py-2 max-w-[90%]">
                        <span className="text-xs font-medium text-red-300">{modelError}</span>
                        <button
                            onClick={retryModel}
                            className="text-xs font-bold uppercase tracking-wider text-red-100 bg-red-500/30 hover:bg-red-500/50 rounded-md px-3 py-1 transition-all cursor-pointer flex-shrink-0"
                        >
                            Retry
                        </button>
                    </div>
                )}

                {/* Set tracker */}
                <SetTracker
                    currentSet={currentSet}
                    totalSets={targetSets}
                    targetReps={targetReps}
                    currentReps={repCount}
                    isDetecting={isDetecting}
                />

                {/* Feedback overlays — the not-in-frame message gets its own
                    LARGE centered banner (the user is across the room and
                    can't read the small pill); everything else stays compact */}
                {isDetecting && feedback !== NOT_IN_FRAME_FEEDBACK && (
                    <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
                        <FormFeedback feedback={feedback} isDetecting={isDetecting} />
                        <CoachMessage tip={coachTip} />
                    </div>
                )}
                {isDetecting && feedback === NOT_IN_FRAME_FEEDBACK && (
                    <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 z-20 flex justify-center pointer-events-none">
                        <div className="bg-black/70 backdrop-blur-md border border-white/15 rounded-2xl px-6 py-5 text-center max-w-sm animate-fade-in">
                            <svg className="w-10 h-10 mx-auto mb-3 text-[#22c55e] animate-pulse" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="5" r="3" />
                                <path d="M12 8v6m0 0l-4 6m4-6l4 6M5 11l7-2 7 2" />
                            </svg>
                            <p className="text-xl md:text-2xl font-black text-white leading-tight">
                                Step back
                            </p>
                            <p className="text-sm text-white/70 mt-1.5 leading-snug">
                                Make sure your whole body is visible in the frame
                            </p>
                        </div>
                    </div>
                )}

                {/* Wrong camera orientation — reps are being missed */}
                {isDetecting && positionHint && (
                    <div className="absolute top-14 left-1/2 -translate-x-1/2 z-20">
                        <div className="bg-amber-500/15 backdrop-blur-sm border border-amber-500/30 rounded-lg px-4 py-2 flex items-center gap-2 animate-fade-in">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round">
                                <path d="M23 7l-7 5 7 5V7z" /><rect x="1" y="5" width="15" height="14" rx="2" />
                            </svg>
                            <span className="text-xs font-bold text-amber-400">{positionHint}</span>
                        </div>
                    </div>
                )}

                {/* Form quality warning */}
                {isDetecting && !positionHint && formQuality < 40 && repCount > 0 && (
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

                {/* Exercise guide — always visible; shows modal pre-workout */}
                <div className="absolute right-3 z-10" style={{ top: isDetecting ? '80px' : '12px' }}>
                    <ExerciseGuide
                        exerciseId={exerciseId}
                        isDetecting={isDetecting}
                        showModal={showVideoModal && !isDetecting && !showCountdown}
                        onModalDismiss={() => {
                            setShowVideoModal(false);
                            markDetectionStart();
                            startDetection();
                        }}
                    />
                </div>

                {/* Muscle indicator — always visible */}
                <div className="absolute bottom-4 right-3 z-10">
                    <MuscleIndicator exerciseId={exerciseId} isDetecting={isDetecting} />
                </div>

                {/* Hold timer — lifted on mobile so it clears the muscle
                    indicator (and the program banner, when one is shown) */}
                {currentExercise.repMode === 'hold' && isDetecting && (
                    <div className={`absolute ${queue ? 'bottom-[8.25rem]' : 'bottom-20'} md:bottom-6 left-1/2 -translate-x-1/2 bg-black/70 backdrop-blur-sm rounded-full px-6 py-2.5 border border-white/10`}>
                        <span className="font-bold text-xl flex items-center gap-2" style={{ fontFamily: 'Orbitron, monospace' }}>
                            <span className={`w-2.5 h-2.5 rounded-full ${isHolding ? 'bg-[#22c55e] shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-red-400'}`} />
                            <span className={isHolding ? 'text-[#22c55e]' : 'text-red-400'}>{holdTime.toFixed(1)}s</span>
                            <span className="text-white/25 text-sm">/ {targetHoldSeconds}s</span>
                        </span>
                    </div>
                )}

                {/* Form corrections — width-capped on mobile so they don't run
                    under the muscle indicator */}
                {formCorrections.length > 0 && isDetecting && (
                    <div className="absolute bottom-4 left-4 space-y-1.5 max-w-[62vw] md:max-w-sm">
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

                {/* Program-day banner — lifted on mobile to clear the muscle
                    indicator */}
                {queue && (
                    <div className="absolute bottom-20 md:bottom-4 left-1/2 -translate-x-1/2 z-10 bg-black/60 backdrop-blur-sm rounded-full border border-[#38bdf8]/20 px-4 py-1.5 flex items-center gap-2 pointer-events-none max-w-[85vw]">
                        <span className="text-[9px] font-bold tracking-widest uppercase text-[#38bdf8]">
                            {queue.dayName}
                        </span>
                        <span className="text-[9px] text-white/30">
                            Exercise {queueIndex + 1}/{queue.items.length}
                        </span>
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
                        {/* Replay opt-out — footage stays on-device either way */}
                        {HighlightRecorder.supported() && (
                            <button
                                onClick={toggleReplay}
                                className="flex items-center gap-1.5 mt-2 text-[10px] cursor-pointer"
                                aria-pressed={replayEnabled}
                            >
                                <span className={`w-6 h-3.5 rounded-full transition-colors relative ${replayEnabled ? 'bg-[#22c55e]' : 'bg-white/15'}`}>
                                    <span className={`absolute top-0.5 w-2.5 h-2.5 rounded-full bg-black transition-all ${replayEnabled ? 'left-3' : 'left-0.5'}`} />
                                </span>
                                <span className="text-white/40 uppercase tracking-wider">Replay</span>
                            </button>
                        )}
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
                    repsCompleted={isHoldExercise ? Math.round(holdTime) : repCount}
                    targetReps={targetReps}
                    formQuality={setFormQuality}
                    mode={isHoldExercise ? 'hold' : 'reps'}
                    nextExerciseName={nextQueueItem ? EXERCISES[nextQueueItem.exerciseId].name : undefined}
                    onRpe={(rpe) => {
                        setLastSetRpe(rpe);
                        logEvent('RPE_RECORDED', { exerciseId, metadata: { set_number: currentSet, rpe } });
                    }}
                    onNextSet={handleNextSet}
                    onEndWorkout={() => handleEndWorkout()}
                />
            )}

            {/* ─── Workout Summary Modal ──────────────────────────────── */}
            {showSummary && summary && (
                <WorkoutSummaryDisplay
                    summary={summary}
                    xpGained={xpGained}
                    newBadges={newBadges}
                    onClose={() => setShowSummary(false)}
                    replaySlot={replayData ? (
                        <ReplayPanel
                            clips={replayData.clips}
                            stats={replayData.stats}
                            links={{ workoutId: replayData.workoutId }}
                        />
                    ) : undefined}
                />
            )}
        </div>
    );
}
