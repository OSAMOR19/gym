/**
 * Angle calculation utilities for pose estimation.
 *
 * These functions compute the angle between three body landmarks,
 * which is essential for determining joint angles (e.g. elbow, knee).
 *
 * A "landmark" is a point with x, y coordinates (normalised 0–1 by MediaPipe).
 */

export interface Point {
  x: number;
  y: number;
}

/**
 * Calculate the angle (in degrees) at point B formed by points A → B → C.
 *
 * Uses the atan2 method:
 *   1. Compute vectors BA and BC
 *   2. Use atan2 to get the angle of each vector
 *   3. Subtract and convert to degrees
 *   4. Normalise to 0–360, then clamp to 0–180
 *
 * Example: For a bicep curl, A=shoulder, B=elbow, C=wrist.
 * A straight arm ≈ 170–180°, a fully curled arm ≈ 30–50°.
 */
export function calculateAngle(a: Point, b: Point, c: Point): number {
  const radians =
    Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);

  let angle = Math.abs((radians * 180) / Math.PI);

  // Normalise: if angle > 180, reflect it so we always get the inner angle
  if (angle > 180) {
    angle = 360 - angle;
  }

  return angle;
}

/**
 * Clamp an angle to 0–180 range.
 */
export function normalizeAngle(angle: number): number {
  return Math.max(0, Math.min(180, angle));
}
