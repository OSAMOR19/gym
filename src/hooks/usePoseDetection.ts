/**
 * usePoseDetection V2 — Updated to use RepEngine + AI Coach
 *
 * Changes from V1:
 *  - Uses RepEngine (supports 15 exercises, form correction, hold mode)
 *  - Integrates AI Coach for real-time tips
 *  - Uses ExerciseId instead of the old Exercise type
 *  - Returns form corrections and coach tips
 *  - MediaPipe loaded via CDN script tag (bypasses webpack bundling issues)
 */

'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import type { NormalizedLandmarkList } from '@mediapipe/pose';
import { RepEngine, RepEngineResult } from '../lib/repEngine';
import { ExerciseId, EXERCISES } from '../lib/exercises';
import { LandmarkSmoother } from '../utils/smoothing';
import { playBeep } from '../utils/audio';
import { getCoachTip, CoachTip, resetCoach } from '../lib/aiCoach';
import { FormCorrection } from '../lib/formCorrection';

/**
 * Load MediaPipe Pose via a CDN <script> tag instead of a dynamic import.
 * This avoids webpack bundling the native WASM files which break in production.
 */
let poseClassPromise: Promise<any> | null = null;

function loadMediaPipePose(): Promise<any> {
    if (poseClassPromise) return poseClassPromise;

    poseClassPromise = new Promise((resolve, reject) => {
        // Check if already loaded (e.g., from a previous call)
        if ((window as any).Pose) {
            resolve((window as any).Pose);
            return;
        }

        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js';
        script.crossOrigin = 'anonymous';
        script.onload = () => {
            const PoseClass = (window as any).Pose;
            if (PoseClass) {
                console.log('[PoseDetection] MediaPipe Pose class loaded from CDN');
                resolve(PoseClass);
            } else {
                reject(new Error('MediaPipe Pose script loaded but Pose class not found on window'));
            }
        };
        script.onerror = () => {
            poseClassPromise = null; // Allow retry
            reject(new Error('Failed to load MediaPipe Pose script from CDN'));
        };
        document.head.appendChild(script);
    });

    return poseClassPromise;
}


// Skeleton connections: pairs of landmark indices to draw lines between
export const SKELETON_CONNECTIONS: [number, number][] = [
    [11, 12], [11, 23], [12, 24], [23, 24],
    [11, 13], [13, 15], [12, 14], [14, 16],
    [23, 25], [25, 27], [24, 26], [26, 28],
];

export const KEY_JOINTS = [11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28];

export interface PoseState {
    repCount: number;
    currentAngle: number;
    formQuality: number;
    feedback: string;
    timeUnderTension: number;
    isDetecting: boolean;
    isLoading: boolean;          // True while model loads
    error: string | null;        // Camera error message (blocks the feed)
    modelError: string | null;   // AI model failed to load — camera still works
    exerciseId: ExerciseId;
    /**
     * Whether a body is currently detected. The landmarks themselves flow
     * through `landmarksRef` (not state) so the 30fps landmark stream doesn't
     * re-render the whole page on every camera frame.
     */
    hasBody: boolean;
    formCorrections: FormCorrection[];
    /** Live "turn side-on / face the camera" hint from the engine's facing check */
    positionHint: string | null;
    coachTip: CoachTip | null;
    holdTime: number;
    isHolding: boolean;
    workoutStartTime: number | null;
}

export function usePoseDetection() {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const repEngineRef = useRef<RepEngine>(new RepEngine('bicep_curl'));
    // α=0.65: MediaPipe already smooths landmarks internally; heavier EMA on
    // top made the tracked angle lag enough to miss fast reps entirely.
    const smootherRef = useRef<LandmarkSmoother>(new LandmarkSmoother(0.65));
    const prevRepCount = useRef<number>(0);
    const lastTipAtRef = useRef<number>(0);
    const animFrameRef = useRef<number>(0);
    // Per-frame data consumed by the canvas overlay directly — deliberately
    // NOT React state (see PoseState.hasBody)
    const landmarksRef = useRef<NormalizedLandmarkList | null>(null);
    const angleRef = useRef<number>(0);
    const lastStateUpdateRef = useRef<number>(0);
    const isRunningRef = useRef<boolean>(false);
    const poseRef = useRef<any>(null);

    const [state, setState] = useState<PoseState>({
        repCount: 0,
        currentAngle: 0,
        formQuality: 0,
        feedback: 'Good Form',
        timeUnderTension: 0,
        isDetecting: false,
        isLoading: false,
        error: null,
        modelError: null,
        exerciseId: 'bicep_curl',
        hasBody: false,
        formCorrections: [],
        positionHint: null,
        coachTip: null,
        holdTime: 0,
        isHolding: false,
        workoutStartTime: null,
    });

    const setExercise = useCallback((exerciseId: ExerciseId) => {
        repEngineRef.current.setExercise(exerciseId);
        smootherRef.current.reset();
        resetCoach();
        prevRepCount.current = 0;
        setState((prev) => ({
            ...prev,
            exerciseId,
            repCount: 0,
            currentAngle: 0,
            formQuality: 0,
            feedback: 'Good Form',
            timeUnderTension: 0,
            hasBody: false,
            formCorrections: [],
            positionHint: null,
            coachTip: null,
            holdTime: 0,
            isHolding: false,
            error: null,
        }));
    }, []);

    const processLandmarks = useCallback((landmarks: NormalizedLandmarkList) => {
        const smoothed = smootherRef.current.smooth(
            landmarks.map((l) => ({ x: l.x, y: l.y }))
        );
        // Visibility scores let the engine ignore occluded (hallucinated) joints
        const visibility = landmarks.map((l) => l.visibility ?? 1);

        const result: RepEngineResult = repEngineRef.current.processFrame(smoothed, visibility);

        // Play beep if rep count increased
        if (result.repCount > prevRepCount.current) {
            playBeep();
            prevRepCount.current = result.repCount;
        }

        // Get coach tip — remember when we last got one so stale tips expire
        // instead of sticking on screen (and re-triggering speech) forever
        const exerciseConfig = EXERCISES[repEngineRef.current.getExerciseId()];
        const tip = getCoachTip(result, exerciseConfig);
        const now = Date.now();
        if (tip) lastTipAtRef.current = now;
        const keepPrevTip = now - lastTipAtRef.current < 4000;

        // Per-frame data goes to refs (read by the canvas overlay's own rAF
        // loop) — React state only updates on meaningful changes or at 4Hz,
        // instead of re-rendering the entire page 30×/sec.
        landmarksRef.current = landmarks;
        angleRef.current = result.currentAngle;

        setState((prev) => {
            const significant =
                result.repCount !== prev.repCount ||
                result.feedback !== prev.feedback ||
                result.isHolding !== prev.isHolding ||
                result.formCorrections.length !== prev.formCorrections.length ||
                result.positionHint !== prev.positionHint ||
                (tip !== null && tip !== prev.coachTip) ||
                !prev.hasBody;
            if (!significant && now - lastStateUpdateRef.current < 250) {
                return prev;
            }
            lastStateUpdateRef.current = now;
            return {
                ...prev,
                repCount: result.repCount,
                currentAngle: result.currentAngle,
                formQuality: result.formQuality,
                feedback: result.feedback,
                timeUnderTension: result.timeUnderTension,
                isDetecting: true,
                hasBody: true,
                formCorrections: result.formCorrections,
                positionHint: result.positionHint,
                coachTip: tip ?? (keepPrevTip ? prev.coachTip : null),
                holdTime: result.holdTime,
                isHolding: result.isHolding,
            };
        });
    }, []);

    /**
     * Start (or resume, if the pose instance survived a previous set) the
     * frame-processing loop for the given video element.
     */
    const startFrameLoop = useCallback((video: HTMLVideoElement) => {
        const pose = poseRef.current;
        if (!pose || !isRunningRef.current) return;
        const processFrame = async () => {
            if (!isRunningRef.current) return;
            if (video.readyState >= 2) {
                try { await pose.send({ image: video }); } catch {}
            }
            animFrameRef.current = requestAnimationFrame(processFrame);
        };
        processFrame();
    }, []);

    /** Load the model (once) and attach it. Safe to call again as a retry. */
    const loadModel = useCallback((video: HTMLVideoElement) => {
        setState(prev => ({ ...prev, modelError: null }));

        loadMediaPipePose().then(Pose => {
            // Reuse the existing instance across sets — each Pose is a WASM
            // graph holding tens of MB, so recreating it per set leaks badly.
            if (!poseRef.current) {
                const pose = new Pose({
                    locateFile: (file: string) =>
                        `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
                });
                pose.setOptions({
                    modelComplexity: 1,
                    smoothLandmarks: true,
                    enableSegmentation: false,
                    minDetectionConfidence: 0.6,
                    minTrackingConfidence: 0.5,
                });
                pose.onResults((results: any) => {
                    if (results.poseLandmarks) {
                        processLandmarks(results.poseLandmarks);
                    }
                });
                poseRef.current = pose;
            }
            startFrameLoop(video);
            resetCoach();
        }).catch(() => {
            // Camera stays on, but the user must know reps won't count.
            setState(prev => ({
                ...prev,
                modelError: 'Motion tracking failed to load. Check your connection and retry — reps are not being counted.',
            }));
        });
    }, [processLandmarks, startFrameLoop]);

    /** Retry loading the AI model after a failure (camera keeps running). */
    const retryModel = useCallback(() => {
        const video = videoRef.current;
        if (video && isRunningRef.current) loadModel(video);
    }, [loadModel]);

    const startDetection = useCallback(async () => {
        const video = videoRef.current;
        if (!video || isRunningRef.current) return;

        // Fresh set: clear all per-set rep state. Without this, set 2 resumed
        // from set 1's count and "completed" after a single rep.
        repEngineRef.current.reset();
        smootherRef.current.reset();
        prevRepCount.current = 0;

        setState(prev => ({
            ...prev,
            isLoading: true,
            error: null,
            repCount: 0,
            currentAngle: 0,
            formQuality: 0,
            feedback: 'Good Form',
            timeUnderTension: 0,
            holdTime: 0,
            isHolding: false,
            formCorrections: [],
            coachTip: null,
        }));

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
            });
            video.srcObject = stream;
            await video.play();
            isRunningRef.current = true;

            // Camera is live. Keep the workout clock from the first set —
            // resetting it here made "duration" measure only the last set.
            setState(prev => ({
                ...prev,
                isDetecting: true,
                isLoading: false,
                workoutStartTime: prev.workoutStartTime ?? Date.now(),
            }));

            // Load AI model in background (non-blocking); resume loop if the
            // model is already alive from a previous set.
            if (poseRef.current) {
                startFrameLoop(video);
            } else {
                loadModel(video);
            }
        } catch (err: any) {
            let errorMsg = 'Camera access failed. Please allow camera permission.';
            if (err?.name === 'NotAllowedError') {
                errorMsg = 'Camera permission denied. Allow camera access in browser settings.';
            } else if (err?.name === 'NotFoundError') {
                errorMsg = 'No camera found. Please connect a camera.';
            } else if (err?.name === 'NotReadableError' || err?.name === 'AbortError') {
                errorMsg = 'Camera busy. Close other tabs using the camera.';
            }
            setState(prev => ({ ...prev, isLoading: false, isDetecting: false, error: errorMsg }));
        }
    }, [loadModel, startFrameLoop]);

    const stopDetection = useCallback(() => {
        isRunningRef.current = false;
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        const video = videoRef.current;
        if (video && video.srcObject) {
            const stream = video.srcObject as MediaStream;
            stream.getTracks().forEach((track) => track.stop());
            video.srcObject = null;
        }
        // Keep repCount/formQuality in state so the set-complete modal can
        // show them; startDetection clears them for the next set.
        landmarksRef.current = null;
        setState((prev) => ({ ...prev, isDetecting: false, isLoading: false, hasBody: false, error: null }));
    }, []);

    /**
     * End the whole workout (not just a set): stops the camera and clears the
     * workout clock so the next workout starts a fresh duration.
     */
    const endSession = useCallback(() => {
        stopDetection();
        setState((prev) => ({ ...prev, workoutStartTime: null }));
    }, [stopDetection]);

    useEffect(() => {
        return () => {
            stopDetection();
            // Release the WASM graph — without this every visit to the
            // workout page leaked a full Pose instance.
            poseRef.current?.close?.();
            poseRef.current = null;
        };
    }, [stopDetection]);

    return {
        videoRef,
        canvasRef,
        landmarksRef,
        angleRef,
        ...state,
        setExercise,
        startDetection,
        stopDetection,
        endSession,
        retryModel,
    };
}
