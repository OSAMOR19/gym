/**
 * Form Correction System — Detects common form mistakes in real time
 *
 * Each exercise has form rules (defined in exercises.ts) that are evaluated
 * every frame. This module implements the actual rule checks using secondary
 * angle calculations and distance comparisons.
 *
 * Returns an array of correction messages that the UI displays in real time.
 */

import { calculateAngle, Point } from '../utils/angles';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface FormCorrection {
    ruleId: string;
    message: string;
    severity: 'warning' | 'error';
}

// ─── Helper: distance between two points ─────────────────────────────────────

function distance(a: Point, b: Point): number {
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

// ─── Rule Implementations ────────────────────────────────────────────────────
//
// Each rule takes the full set of 33 landmarks and returns whether the
// issue is currently detected.

type RuleChecker = (landmarks: Point[]) => boolean;

const RULE_CHECKERS: Record<string, RuleChecker> = {
    /**
     * Elbow drift: elbow moves away from torso during curls.
     * Checks if shoulder-to-elbow distance exceeds a threshold
     * relative to shoulder-to-hip distance (body proportional).
     */
    elbow_drift: (lm) => {
        const shoulderL = lm[11];
        const elbowL = lm[13];
        const hipL = lm[23];
        if (!shoulderL || !elbowL || !hipL) return false;

        const elbowDist = Math.abs(elbowL.x - shoulderL.x);
        const bodyWidth = Math.abs(shoulderL.x - hipL.x);
        // If elbow drifts more than 2× the body width horizontally, flag it
        return elbowDist > bodyWidth * 2.5;
    },

    /**
     * Incomplete extension: arm doesn't fully straighten.
     * This is handled by the main form quality score, but as an explicit
     * rule we flag if the max angle in a rep never exceeds 140°.
     */
    incomplete_extension: (lm) => {
        const angle = calculateAngle(lm[11], lm[13], lm[15]);
        // During IDLE state (arm should be extended), if angle is too low
        return angle > 60 && angle < 130;
    },

    /**
     * Hip sag: hips dropping below the shoulder-ankle line (push-ups/planks).
     * Checks the shoulder → hip → ankle angle — should be ~180° for good form.
     */
    hip_sag: (lm) => {
        const shoulder = lm[11];
        const hip = lm[23];
        const ankle = lm[27];
        if (!shoulder || !hip || !ankle) return false;

        const bodyAngle = calculateAngle(shoulder, hip, ankle);
        return bodyAngle < 155; // Hips are sagging
    },

    /**
     * Hip pike: hips too high (planks).
     */
    hip_pike: (lm) => {
        const shoulder = lm[11];
        const hip = lm[23];
        const ankle = lm[27];
        if (!shoulder || !hip || !ankle) return false;

        const bodyAngle = calculateAngle(shoulder, hip, ankle);
        return bodyAngle > 190 || (hip.y < shoulder.y && hip.y < ankle.y);
    },

    /**
     * Elbow flare: elbows too far from body during push-ups.
     * Checks horizontal distance between wrist and shoulder.
     */
    elbow_flare: (lm) => {
        const shoulderL = lm[11];
        const shoulderR = lm[12];
        const wristL = lm[15];
        const wristR = lm[16];
        if (!shoulderL || !shoulderR || !wristL || !wristR) return false;

        const shoulderWidth = Math.abs(shoulderR.x - shoulderL.x);
        const wristWidth = Math.abs(wristR.x - wristL.x);
        // If wrists are much wider than shoulders, elbows are flaring
        return wristWidth > shoulderWidth * 1.8;
    },

    /**
     * Knee valgus: knees collapsing inward during squats.
     * Checks if knee horizontal distance is narrower than ankle distance.
     */
    knee_valgus: (lm) => {
        const kneeL = lm[25];
        const kneeR = lm[26];
        const ankleL = lm[27];
        const ankleR = lm[28];
        if (!kneeL || !kneeR || !ankleL || !ankleR) return false;

        const kneeWidth = Math.abs(kneeR.x - kneeL.x);
        const ankleWidth = Math.abs(ankleR.x - ankleL.x);
        return kneeWidth < ankleWidth * 0.7;
    },

    /**
     * Insufficient depth: not going deep enough in squats.
     * Checks if knee angle stays above 100° during the "down" phase.
     */
    insufficient_depth: (lm) => {
        const angle = calculateAngle(lm[23], lm[25], lm[27]);
        // If angle is between 90-120°, user is attempting but not deep enough
        return angle > 95 && angle < 120;
    },

    /**
     * Forward lean: torso leaning too far forward during squats.
     * Checks shoulder-hip-knee angle to detect excessive forward tilt.
     */
    forward_lean: (lm) => {
        const shoulder = lm[11];
        const hip = lm[23];
        if (!shoulder || !hip) return false;

        // If shoulder x is significantly ahead of hip x (leaning forward)
        const lean = shoulder.x - hip.x;
        return Math.abs(lean) > 0.1; // Normalised coords — 0.1 is significant
    },

    /**
     * Back arch: excessive arching during overhead presses.
     */
    back_arch: (lm) => {
        const shoulder = lm[11];
        const hip = lm[23];
        const knee = lm[25];
        if (!shoulder || !hip || !knee) return false;

        const torsoAngle = calculateAngle(shoulder, hip, knee);
        return torsoAngle < 160; // Back is arching
    },

    /**
     * Shoulder shrug: shoulders rising during lateral raises.
     */
    shoulder_shrug: (lm) => {
        const ear = lm[7]; // left ear
        const shoulder = lm[11];
        if (!ear || !shoulder) return false;

        const neckLength = distance(ear, shoulder);
        return neckLength < 0.06; // Shoulders too close to ears
    },

    /**
     * Knee past toes: front knee going past toe in lunges.
     */
    knee_past_toe: (lm) => {
        const knee = lm[25];
        const toe = lm[31];
        if (!knee || !toe) return false;

        return knee.x > toe.x + 0.03;
    },
};

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Evaluate all form rules for an exercise against current landmarks.
 *
 * @param ruleKeys  Array of rule keys from the exercise config
 * @param messages  Corresponding correction messages
 * @param landmarks All 33 smoothed landmarks
 * @returns Array of active form corrections
 */
export function evaluateFormRules(
    rules: { ruleKey: string; correctionMessage: string; id: string }[],
    landmarks: Point[]
): FormCorrection[] {
    const corrections: FormCorrection[] = [];

    for (const rule of rules) {
        const checker = RULE_CHECKERS[rule.ruleKey];
        if (checker && checker(landmarks)) {
            corrections.push({
                ruleId: rule.id,
                message: rule.correctionMessage,
                severity: 'warning',
            });
        }
    }

    return corrections;
}
