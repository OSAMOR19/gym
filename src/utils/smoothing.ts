/**
 * Smoothing utilities for pose landmark data.
 *
 * MediaPipe landmarks can jitter between frames. An Exponential Moving Average
 * (EMA) filter smooths the data by weighting the current frame's value against
 * the previous smoothed value:
 *
 *   smoothed = alpha * current + (1 - alpha) * previous
 *
 * Higher alpha (closer to 1) = more responsive but jittery.
 * Lower alpha (closer to 0) = smoother but more laggy.
 */

import { Point } from './angles';

/**
 * Smooth a single value using EMA.
 * @param current  The raw value from the current frame.
 * @param previous The smoothed value from the previous frame.
 * @param alpha    Smoothing factor (0–1). Default 0.5 is a good balance.
 */
export function smoothValue(
    current: number,
    previous: number | null,
    alpha: number = 0.5
): number {
    if (previous === null) return current;
    return alpha * current + (1 - alpha) * previous;
}

/**
 * Smooth a Point (x, y) using EMA on each coordinate independently.
 */
export function smoothPoint(
    current: Point,
    previous: Point | null,
    alpha: number = 0.5
): Point {
    if (previous === null) return current;
    return {
        x: alpha * current.x + (1 - alpha) * previous.x,
        y: alpha * current.y + (1 - alpha) * previous.y,
    };
}

/**
 * LandmarkSmoother maintains smoothed state for all 33 MediaPipe pose landmarks.
 * Call `smooth(landmarks)` each frame to get jitter-reduced positions.
 */
export class LandmarkSmoother {
    private previousPoints: (Point | null)[] = new Array(33).fill(null);
    private alpha: number;

    constructor(alpha: number = 0.4) {
        this.alpha = alpha;
    }

    smooth(landmarks: Point[]): Point[] {
        const smoothed = landmarks.map((landmark, i) => {
            const result = smoothPoint(landmark, this.previousPoints[i], this.alpha);
            this.previousPoints[i] = result;
            return result;
        });
        return smoothed;
    }

    reset(): void {
        this.previousPoints = new Array(33).fill(null);
    }
}
