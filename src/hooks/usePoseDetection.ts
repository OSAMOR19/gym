/**
 * usePoseDetection V2 — Updated to use RepEngine + AI Coach
 *
 * Changes from V1:
 *  - Uses RepEngine (supports 15 exercises, form correction, hold mode)
 *  - Integrates AI Coach for real-time tips
 *  - Uses ExerciseId instead of the old Exercise type
 *  - Returns form corrections and coach tips
 */

'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { NormalizedLandmarkList } from '@mediapipe/pose';
import { RepEngine, RepEngineResult } from '../lib/repEngine';
import { ExerciseId, EXERCISES } from '../lib/exercises';
import { LandmarkSmoother } from '../utils/smoothing';
import { playBeep } from '../utils/audio';
import { getCoachTip, CoachTip, resetCoach } from '../lib/aiCoach';
import { FormCorrection } from '../lib/formCorrection';

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
    exerciseId: ExerciseId;
    landmarks: NormalizedLandmarkList | null;
    formCorrections: FormCorrection[];
    coachTip: CoachTip | null;
    holdTime: number;
    isHolding: boolean;
    workoutStartTime: number | null;
}

export function usePoseDetection() {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const repEngineRef = useRef<RepEngine>(new RepEngine('bicep_curl'));
    const smootherRef = useRef<LandmarkSmoother>(new LandmarkSmoother(0.4));
    const prevRepCount = useRef<number>(0);
    const animFrameRef = useRef<number>(0);
    const isRunningRef = useRef<boolean>(false);
    const poseRef = useRef<any>(null);

    const [state, setState] = useState<PoseState>({
        repCount: 0,
        currentAngle: 0,
        formQuality: 0,
        feedback: 'Good Form',
        timeUnderTension: 0,
        isDetecting: false,
        exerciseId: 'bicep_curl',
        landmarks: null,
        formCorrections: [],
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
            landmarks: null,
            formCorrections: [],
            coachTip: null,
            holdTime: 0,
            isHolding: false,
        }));
    }, []);

    const processLandmarks = useCallback((landmarks: NormalizedLandmarkList) => {
        const smoothed = smootherRef.current.smooth(
            landmarks.map((l) => ({ x: l.x, y: l.y }))
        );

        const result: RepEngineResult = repEngineRef.current.processFrame(smoothed);

        // Play beep if rep count increased
        if (result.repCount > prevRepCount.current) {
            playBeep();
            prevRepCount.current = result.repCount;
        }

        // Get coach tip
        const exerciseConfig = EXERCISES[repEngineRef.current.getExerciseId()];
        const tip = getCoachTip(result, exerciseConfig);

        setState((prev) => ({
            ...prev,
            repCount: result.repCount,
            currentAngle: result.currentAngle,
            formQuality: result.formQuality,
            feedback: result.feedback,
            timeUnderTension: result.timeUnderTension,
            isDetecting: true,
            landmarks,
            formCorrections: result.formCorrections,
            coachTip: tip ?? prev.coachTip,
            holdTime: result.holdTime,
            isHolding: result.isHolding,
        }));
    }, []);

    const startDetection = useCallback(async () => {
        const video = videoRef.current;
        if (!video) return;

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
            });
            video.srcObject = stream;
            await video.play();
            isRunningRef.current = true;

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

            pose.onResults((results: any) => {
                if (results.poseLandmarks) {
                    processLandmarks(results.poseLandmarks);
                }
            });

            poseRef.current = pose;

            const processFrame = async () => {
                if (!isRunningRef.current) return;
                if (video.readyState >= 2) {
                    await pose.send({ image: video });
                }
                animFrameRef.current = requestAnimationFrame(processFrame);
            };

            processFrame();
            resetCoach();
            setState((prev) => ({ ...prev, isDetecting: true, workoutStartTime: Date.now() }));
        } catch (err) {
            console.error('Failed to start pose detection:', err);
        }
    }, [processLandmarks]);

    const stopDetection = useCallback(() => {
        isRunningRef.current = false;
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        const video = videoRef.current;
        if (video && video.srcObject) {
            const stream = video.srcObject as MediaStream;
            stream.getTracks().forEach((track) => track.stop());
            video.srcObject = null;
        }
        setState((prev) => ({ ...prev, isDetecting: false, landmarks: null }));
    }, []);

    useEffect(() => {
        return () => { stopDetection(); };
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
