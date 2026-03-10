/**
 * usePoseDetection — Custom React Hook
 *
 * Wraps camera access, MediaPipe Pose initialisation, and the RepCounter
 * state machine into a single hook that components can consume.
 *
 * Returns refs for the video/canvas elements and reactive state for
 * rep count, angles, form quality, etc.
 */

'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { NormalizedLandmarkList } from '@mediapipe/pose';
import { RepCounter, Exercise, RepResult } from '../lib/repCounter';
import { LandmarkSmoother } from '../utils/smoothing';
import { playBeep } from '../utils/audio';

// Skeleton connections: pairs of landmark indices to draw lines between
export const SKELETON_CONNECTIONS: [number, number][] = [
    // Torso
    [11, 12], [11, 23], [12, 24], [23, 24],
    // Left arm
    [11, 13], [13, 15],
    // Right arm
    [12, 14], [14, 16],
    // Left leg
    [23, 25], [25, 27],
    // Right leg
    [24, 26], [26, 28],
];

// Landmark indices for drawing larger dots at key joints
export const KEY_JOINTS = [11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28];

export interface PoseState {
    repCount: number;
    currentAngle: number;
    formQuality: number;
    feedback: string;
    timeUnderTension: number;
    isDetecting: boolean;
    exercise: Exercise;
    landmarks: NormalizedLandmarkList | null;
}

export function usePoseDetection() {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const repCounterRef = useRef<RepCounter>(new RepCounter('curl'));
    const smootherRef = useRef<LandmarkSmoother>(new LandmarkSmoother(0.4));
    const prevRepCount = useRef<number>(0);
    const animFrameRef = useRef<number>(0);
    const isRunningRef = useRef<boolean>(false);

    const [state, setState] = useState<PoseState>({
        repCount: 0,
        currentAngle: 0,
        formQuality: 0,
        feedback: 'Good Form',
        timeUnderTension: 0,
        isDetecting: false,
        exercise: 'curl',
        landmarks: null,
    });

    const setExercise = useCallback((exercise: Exercise) => {
        repCounterRef.current.setExercise(exercise);
        smootherRef.current.reset();
        prevRepCount.current = 0;
        setState((prev) => ({
            ...prev,
            exercise,
            repCount: 0,
            currentAngle: 0,
            formQuality: 0,
            feedback: 'Good Form',
            timeUnderTension: 0,
            landmarks: null,
        }));
    }, []);

    const processLandmarks = useCallback((landmarks: NormalizedLandmarkList) => {
        // Smooth the landmarks to reduce jitter
        const smoothed = smootherRef.current.smooth(
            landmarks.map((l) => ({ x: l.x, y: l.y }))
        );

        // Process through rep counter
        const result: RepResult = repCounterRef.current.processFrame(smoothed);

        // Play beep if rep count increased
        if (result.repCount > prevRepCount.current) {
            playBeep();
            prevRepCount.current = result.repCount;
        }

        setState((prev) => ({
            ...prev,
            repCount: result.repCount,
            currentAngle: result.currentAngle,
            formQuality: result.formQuality,
            feedback: result.feedback,
            timeUnderTension: result.timeUnderTension,
            isDetecting: true,
            landmarks: landmarks,
        }));
    }, []);

    const startDetection = useCallback(async () => {
        const video = videoRef.current;
        if (!video) return;

        try {
            // Request camera access
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    facingMode: 'user',
                },
            });
            video.srcObject = stream;
            await video.play();

            isRunningRef.current = true;

            // Dynamically import MediaPipe to avoid SSR issues
            const { Pose } = await import('@mediapipe/pose');

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

            pose.onResults((results) => {
                if (results.poseLandmarks) {
                    processLandmarks(results.poseLandmarks);
                }
            });

            // Process frames in a loop
            const processFrame = async () => {
                if (!isRunningRef.current) return;
                if (video.readyState >= 2) {
                    await pose.send({ image: video });
                }
                animFrameRef.current = requestAnimationFrame(processFrame);
            };

            processFrame();

            setState((prev) => ({ ...prev, isDetecting: true }));
        } catch (err) {
            console.error('Failed to start pose detection:', err);
        }
    }, [processLandmarks]);

    const stopDetection = useCallback(() => {
        isRunningRef.current = false;
        if (animFrameRef.current) {
            cancelAnimationFrame(animFrameRef.current);
        }
        const video = videoRef.current;
        if (video && video.srcObject) {
            const stream = video.srcObject as MediaStream;
            stream.getTracks().forEach((track) => track.stop());
            video.srcObject = null;
        }
        setState((prev) => ({ ...prev, isDetecting: false, landmarks: null }));
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopDetection();
        };
    }, [stopDetection]);

    return {
        videoRef,
        canvasRef,
        ...state,
        setExercise,
        startDetection,
        stopDetection,
    };
}
