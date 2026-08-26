/**
 * useCardioTracking — camera + MediaPipe + CardioEngine, for the cardio page.
 *
 * A lean sibling of usePoseDetection: same camera lifecycle and the same
 * shared Pose WASM singleton, but the frame loop feeds the CardioEngine
 * (steps/cadence/posture) instead of the rep engine. Per-frame landmarks are
 * consumed and discarded — only rolling aggregates live in memory.
 */

'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import type { NormalizedLandmarkList } from '@mediapipe/pose';
import { loadMediaPipePose } from './usePoseDetection';
import { CardioEngine, CardioActivity, CardioFrameResult } from '../lib/cardio/cardioEngine';

interface RawLandmark { x: number; y: number; visibility?: number }
interface PoseInstance {
    setOptions(options: Record<string, unknown>): void;
    onResults(cb: (results: { poseLandmarks?: RawLandmark[] }) => void): void;
    send(input: { image: HTMLVideoElement }): Promise<void>;
    close?(): void;
}

export interface CardioTrackingState {
    isTracking: boolean;
    isLoading: boolean;
    error: string | null;
    modelError: string | null;
    startedAt: number | null;
    result: CardioFrameResult | null;
}

export function useCardioTracking(activity: CardioActivity) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    // Per-frame landmark stream for the skeleton overlay — a ref, not state,
    // so the 30fps stream never re-renders React (same pattern as the
    // strength workout's usePoseDetection)
    const landmarksRef = useRef<NormalizedLandmarkList | null>(null);
    const angleRef = useRef<number>(0); // cardio tracks no joint angle
    const engineRef = useRef<CardioEngine>(new CardioEngine(activity));
    const poseRef = useRef<PoseInstance | null>(null);
    const runningRef = useRef(false);
    const rafRef = useRef(0);
    const lastPushRef = useRef(0);

    const [state, setState] = useState<CardioTrackingState>({
        isTracking: false,
        isLoading: false,
        error: null,
        modelError: null,
        startedAt: null,
        result: null,
    });

    // Activity switch (before start) → fresh engine
    useEffect(() => {
        engineRef.current = new CardioEngine(activity);
    }, [activity]);

    const onLandmarks = useCallback((landmarks: RawLandmark[]) => {
        landmarksRef.current = landmarks as NormalizedLandmarkList;
        const result = engineRef.current.processFrame(
            landmarks.map((l) => ({ x: l.x, y: l.y })),
            landmarks.map((l) => l.visibility ?? 1),
        );
        // Push to React at 2Hz, or immediately when visibility/feedback flips
        const now = Date.now();
        setState((prev) => {
            const flip = prev.result?.bodyVisible !== result.bodyVisible
                || prev.result?.feedback !== result.feedback;
            if (!flip && now - lastPushRef.current < 500) return prev;
            lastPushRef.current = now;
            return { ...prev, result };
        });
    }, []);

    const start = useCallback(async () => {
        const video = videoRef.current;
        if (!video || runningRef.current) return;
        engineRef.current.reset();
        setState((prev) => ({ ...prev, isLoading: true, error: null, result: null }));

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
            });
            video.srcObject = stream;
            await video.play();
            runningRef.current = true;
            setState((prev) => ({ ...prev, isTracking: true, isLoading: false, startedAt: Date.now() }));

            try {
                const Pose = await loadMediaPipePose();
                if (!poseRef.current) {
                    const pose = new Pose({
                        locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
                    });
                    pose.setOptions({
                        modelComplexity: 1,
                        smoothLandmarks: true,
                        enableSegmentation: false,
                        minDetectionConfidence: 0.6,
                        minTrackingConfidence: 0.5,
                    });
                    pose.onResults((results: { poseLandmarks?: RawLandmark[] }) => {
                        if (results.poseLandmarks) onLandmarks(results.poseLandmarks);
                    });
                    poseRef.current = pose as PoseInstance;
                }
                const loop = async () => {
                    if (!runningRef.current || !poseRef.current) return;
                    if (video.readyState >= 2) {
                        try { await poseRef.current.send({ image: video }); } catch {}
                    }
                    rafRef.current = requestAnimationFrame(loop);
                };
                loop();
            } catch {
                setState((prev) => ({
                    ...prev,
                    modelError: 'Motion tracking failed to load — time still counts, but steps are not being tracked.',
                }));
            }
        } catch (err: unknown) {
            const name = (err as { name?: string })?.name;
            const error = name === 'NotAllowedError'
                ? 'Camera permission denied. Allow camera access in browser settings.'
                : name === 'NotFoundError'
                    ? 'No camera found. Please connect a camera.'
                    : name === 'NotReadableError' || name === 'AbortError'
                        ? 'Camera busy. Close other tabs using the camera.'
                        : 'Camera access failed. Please allow camera permission.';
            setState((prev) => ({ ...prev, isLoading: false, isTracking: false, error }));
        }
    }, [onLandmarks]);

    /** Stop the camera; returns the final engine snapshot for saving. */
    const stop = useCallback((): CardioFrameResult | null => {
        runningRef.current = false;
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        const video = videoRef.current;
        if (video?.srcObject) {
            (video.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
            video.srcObject = null;
        }
        landmarksRef.current = null;
        setState((prev) => ({ ...prev, isTracking: false }));
        return stateSnapshot(engineRef.current);
    }, []);

    useEffect(() => {
        const video = videoRef.current;
        return () => {
            runningRef.current = false;
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            if (video?.srcObject) {
                (video.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
            }
            poseRef.current?.close?.();
            poseRef.current = null;
        };
    }, []);

    return { videoRef, canvasRef, landmarksRef, angleRef, ...state, start, stop };
}

/** Read the engine's current totals without feeding it a frame. */
function stateSnapshot(engine: CardioEngine): CardioFrameResult {
    // An empty frame is rejected by the visibility gate, so it can't corrupt
    // counters — it just returns the current aggregate numbers.
    return engine.processFrame([], []);
}
