/**
 * CameraFeed — Renders the video + canvas overlay with neon skeleton.
 *
 * The video element captures the camera stream (hidden behind the canvas).
 * The canvas draws:
 *   1. The mirrored video frame as background
 *   2. Neon green/blue skeleton lines connecting key joints
 *   3. Glowing dots at each joint
 *   4. Current joint angle text near the relevant joint
 */

'use client';

import { useEffect, useRef, useCallback } from 'react';
import { NormalizedLandmarkList } from '@mediapipe/pose';
import { SKELETON_CONNECTIONS, KEY_JOINTS } from '../hooks/usePoseDetection';
import { ExerciseId, EXERCISES } from '../lib/exercises';

interface CameraFeedProps {
    videoRef: React.RefObject<HTMLVideoElement | null>;
    canvasRef: React.RefObject<HTMLCanvasElement | null>;
    landmarks: NormalizedLandmarkList | null;
    currentAngle: number;
    exercise: ExerciseId;
    isDetecting: boolean;
}

export default function CameraFeed({
    videoRef,
    canvasRef,
    landmarks,
    currentAngle,
    exercise,
    isDetecting,
}: CameraFeedProps) {
    const animRef = useRef<number>(0);

    /**
     * Get the landmark index where the angle label should appear.
     * Uses the exercise config's vertex joint (index [1] of landmarkIndices).
     */
    const getAngleLandmarkIndex = useCallback((): number => {
        const config = EXERCISES[exercise];
        return config ? config.landmarkIndices[1] : 13; // vertex joint
    }, [exercise]);

    /**
     * Draw the skeleton overlay on the canvas each frame.
     */
    const drawFrame = useCallback(() => {
        const canvas = canvasRef.current;
        const video = videoRef.current;
        if (!canvas || !video) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Match canvas size to its display size
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;

        const w = canvas.width;
        const h = canvas.height;

        // Clear the canvas
        ctx.clearRect(0, 0, w, h);

        // Draw the mirrored video frame — "object-fit: cover" behavior
        // preserves natural aspect ratio so people don't look squished
        const vw = video.videoWidth || w;
        const vh = video.videoHeight || h;
        const canvasAspect = w / h;
        const videoAspect = vw / vh;

        let sx = 0, sy = 0, sw = vw, sh = vh;
        if (videoAspect > canvasAspect) {
            // Video is wider than canvas — crop sides
            sw = vh * canvasAspect;
            sx = (vw - sw) / 2;
        } else {
            // Video is taller than canvas — crop top/bottom
            sh = vw / canvasAspect;
            sy = (vh - sh) / 2;
        }

        ctx.save();
        ctx.translate(w, 0);
        ctx.scale(-1, 1); // Mirror horizontally for a natural selfie view
        ctx.drawImage(video, sx, sy, sw, sh, 0, 0, w, h);
        ctx.restore();

        // If we have landmarks, draw the skeleton
        if (landmarks && landmarks.length > 0) {
            // ─── Draw connection lines ───────────────────────────────────────
            ctx.save();
            SKELETON_CONNECTIONS.forEach(([startIdx, endIdx]) => {
                const start = landmarks[startIdx];
                const end = landmarks[endIdx];
                if (!start || !end) return;

                // Mirror x coordinates to match the flipped video
                const x1 = (1 - start.x) * w;
                const y1 = start.y * h;
                const x2 = (1 - end.x) * w;
                const y2 = end.y * h;

                // Neon glow effect
                ctx.shadowBlur = 15;
                ctx.shadowColor = '#22c55e'; // neon green
                ctx.strokeStyle = '#22c55e';
                ctx.lineWidth = 3;

                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.stroke();
            });
            ctx.restore();

            // ─── Draw joint dots ─────────────────────────────────────────────
            ctx.save();
            KEY_JOINTS.forEach((idx) => {
                const point = landmarks[idx];
                if (!point) return;

                const x = (1 - point.x) * w;
                const y = point.y * h;

                // Outer glow
                ctx.shadowBlur = 20;
                ctx.shadowColor = '#38bdf8'; // electric blue
                ctx.fillStyle = '#38bdf8';
                ctx.beginPath();
                ctx.arc(x, y, 6, 0, Math.PI * 2);
                ctx.fill();

                // Inner bright dot
                ctx.shadowBlur = 0;
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(x, y, 3, 0, Math.PI * 2);
                ctx.fill();
            });
            ctx.restore();

            // ─── Draw angle label near the vertex joint ──────────────────────
            if (currentAngle > 0) {
                const angleIdx = getAngleLandmarkIndex();
                const joint = landmarks[angleIdx];
                if (joint) {
                    const x = (1 - joint.x) * w;
                    const y = joint.y * h;

                    ctx.save();
                    ctx.font = 'bold 18px Inter, sans-serif';
                    ctx.fillStyle = '#22c55e';
                    ctx.shadowBlur = 10;
                    ctx.shadowColor = '#22c55e';
                    ctx.textAlign = 'center';
                    ctx.fillText(`${currentAngle}°`, x, y - 20);
                    ctx.restore();
                }
            }
        }

        animRef.current = requestAnimationFrame(drawFrame);
    }, [canvasRef, videoRef, landmarks, currentAngle, getAngleLandmarkIndex]);

    useEffect(() => {
        if (isDetecting) {
            animRef.current = requestAnimationFrame(drawFrame);
        }
        return () => {
            if (animRef.current) cancelAnimationFrame(animRef.current);
        };
    }, [isDetecting, drawFrame]);

    return (
        <div className="relative w-full h-full overflow-hidden">
            {/* Hidden video element — camera stream goes here */}
            <video
                ref={videoRef}
                className="absolute inset-0 w-full h-full object-cover opacity-0"
                autoPlay
                playsInline
                muted
            />

            {/* Canvas overlay — draws the video frame + skeleton */}
            <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full object-cover"
            />

            {/* Placeholder when camera is not active */}
            {!isDetecting && (
                <div className="absolute inset-0 flex items-center justify-center bg-[#0f0f0f]">
                    <div className="text-center space-y-4">
                        <div className="w-20 h-20 mx-auto rounded-full border-2 border-[#22c55e]/30 flex items-center justify-center">
                            <svg
                                className="w-10 h-10 text-[#22c55e]/50"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={1.5}
                                    d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                                />
                            </svg>
                        </div>
                        <p className="text-white/40 text-sm font-medium tracking-wide">
                            Camera feed will appear here
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
