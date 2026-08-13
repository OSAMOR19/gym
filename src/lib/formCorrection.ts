/**
 * Form Correction System — Detects common form mistakes in real time
 *
 * Each exercise has form rules (defined in exercises.ts) that are evaluated
 * every frame. This module implements the actual rule checks using secondary
 * angle calculations and distance comparisons.
 *
 * Design constraints every rule must respect (this is a rewrite — the first
 * version violated all three and produced constant false warnings):
 *  1. Scale-invariant: never compare against absolute normalized distances —
 *     they change with how far the user stands from the camera. Normalize by
 *     torso length instead.
 *  2. Visibility-aware: MediaPipe hallucinates positions for occluded joints.
 *     A rule must not fire off landmarks it can't actually see, and should
 *     use whichever body side is visible.
 *  3. Posture-aware, not transit-triggered: a rule must describe a sustained
 *     fault, not an angle band every normal rep passes through. Range-of-
 *     motion feedback lives in the rep engine (near-miss detection + form
 *     score), not here.
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

// ─── Helpers ─────────────────────────────────────────────────────────────────

function distance(a: Point, b: Point): number {
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

const MIN_VISIBILITY = 0.6;

/** Landmark indices: [left, right] pairs for the joints rules care about. */
const EAR: [number, number] = [7, 8];
const SHOULDER: [number, number] = [11, 12];
const ELBOW: [number, number] = [13, 14];
const HIP: [number, number] = [23, 24];
const KNEE: [number, number] = [25, 26];
const ANKLE: [number, number] = [27, 28];
const TOE: [number, number] = [31, 32];

/**
 * Per-frame context handed to each rule: landmarks plus visibility-aware
 * accessors so rules automatically use whichever side the camera can see.
 */
class RuleContext {
    constructor(
        private lm: Point[],
        private visibility?: number[],
    ) {}

    vis(i: number): number {
        return this.visibility?.[i] ?? 1;
    }

    visible(i: number): boolean {
        return !!this.lm[i] && this.vis(i) >= MIN_VISIBILITY;
    }

    point(i: number): Point | null {
        return this.visible(i) ? this.lm[i] : null;
    }

    /** 0 = left side, 1 = right side; the side with better joint visibility. */
    bestSide(): 0 | 1 {
        const score = (side: 0 | 1) =>
            this.vis(SHOULDER[side]) + this.vis(HIP[side]) + this.vis(KNEE[side]);
        return score(0) >= score(1) ? 0 : 1;
    }

    /** A visible joint from the preferred side, falling back to the other. */
    sidePoint(pair: [number, number], side: 0 | 1): Point | null {
        return this.point(pair[side]) ?? this.point(pair[1 - side]);
    }

    /**
     * Torso length (shoulder→hip) of the best-visible side — the scale unit
     * all distance thresholds are expressed in.
     */
    torsoLen(): number | null {
        const side = this.bestSide();
        const s = this.point(SHOULDER[side]);
        const h = this.point(HIP[side]);
        if (!s || !h) return null;
        const len = distance(s, h);
        return len > 0.01 ? len : null;
    }
}

// ─── Rule Implementations ────────────────────────────────────────────────────
//
// Each rule returns whether the issue is currently detected. Rules return
// false when they can't see the joints they need — never guess.

type RuleChecker = (ctx: RuleContext) => boolean;

const RULE_CHECKERS: Record<string, RuleChecker> = {
    /**
     * Elbow drift: upper arm swinging forward/back during curls. The elbow
     * should stay under the shoulder — flag when its horizontal offset from
     * the shoulder exceeds ~45% of torso length (≈30° of upper-arm swing).
     */
    elbow_drift: (ctx) => {
        const torso = ctx.torsoLen();
        if (!torso) return false;
        const side = ctx.bestSide();
        const shoulder = ctx.point(SHOULDER[side]);
        const elbow = ctx.point(ELBOW[side]);
        if (!shoulder || !elbow) return false;

        return Math.abs(elbow.x - shoulder.x) > torso * 0.45;
    },

    /**
     * Hip sag: hips dropping below the shoulder-ankle line (push-ups/planks).
     * Only meaningful when the body is roughly horizontal — standing posture
     * must not trigger it.
     */
    hip_sag: (ctx) => {
        const side = ctx.bestSide();
        const shoulder = ctx.point(SHOULDER[side]);
        const hip = ctx.point(HIP[side]);
        const ankle = ctx.point(ANKLE[side]);
        if (!shoulder || !hip || !ankle) return false;

        const horizontal = Math.abs(shoulder.y - ankle.y) < Math.abs(shoulder.x - ankle.x);
        if (!horizontal) return false;

        const bodyAngle = calculateAngle(shoulder, hip, ankle);
        // Sagging = body line bent AND the hip is on the floor side of it
        return bodyAngle < 155 && hip.y > (shoulder.y + ankle.y) / 2;
    },

    /**
     * Hip pike: hips too high (planks) — body line bent with the hip above
     * the shoulder-ankle midpoint. Horizontal-only, like hip_sag.
     */
    hip_pike: (ctx) => {
        const side = ctx.bestSide();
        const shoulder = ctx.point(SHOULDER[side]);
        const hip = ctx.point(HIP[side]);
        const ankle = ctx.point(ANKLE[side]);
        if (!shoulder || !hip || !ankle) return false;

        const horizontal = Math.abs(shoulder.y - ankle.y) < Math.abs(shoulder.x - ankle.x);
        if (!horizontal) return false;

        const bodyAngle = calculateAngle(shoulder, hip, ankle);
        return bodyAngle < 155 && hip.y < (shoulder.y + ankle.y) / 2;
    },

    /**
     * Elbow flare: wrists much wider than shoulders during presses/push-ups.
     * Requires both sides visible (it's an inherently bilateral check).
     */
    elbow_flare: (ctx) => {
        const shoulderL = ctx.point(11);
        const shoulderR = ctx.point(12);
        const wristL = ctx.point(15);
        const wristR = ctx.point(16);
        if (!shoulderL || !shoulderR || !wristL || !wristR) return false;

        const shoulderWidth = Math.abs(shoulderR.x - shoulderL.x);
        if (shoulderWidth < 0.03) return false; // profile view — can't judge width

        const wristWidth = Math.abs(wristR.x - wristL.x);
        return wristWidth > shoulderWidth * 1.8;
    },

    /**
     * Knee valgus: knees collapsing inward during squats. Only judged from a
     * front-ish view — in profile the ankles overlap and width is meaningless.
     */
    knee_valgus: (ctx) => {
        const kneeL = ctx.point(25);
        const kneeR = ctx.point(26);
        const ankleL = ctx.point(27);
        const ankleR = ctx.point(28);
        if (!kneeL || !kneeR || !ankleL || !ankleR) return false;

        const ankleWidth = Math.abs(ankleR.x - ankleL.x);
        const torso = ctx.torsoLen();
        // Facing check: feet visibly apart relative to body scale
        if (!torso || ankleWidth < torso * 0.25) return false;

        const kneeWidth = Math.abs(kneeR.x - kneeL.x);
        return kneeWidth < ankleWidth * 0.7;
    },

    /**
     * Forward lean: torso inclined more than ~40° from vertical. Normalized
     * by torso geometry (angle, not raw x-offset), so camera distance and
     * framing don't matter.
     */
    forward_lean: (ctx) => {
        const side = ctx.bestSide();
        const shoulder = ctx.point(SHOULDER[side]);
        const hip = ctx.point(HIP[side]);
        if (!shoulder || !hip) return false;

        const dx = Math.abs(shoulder.x - hip.x);
        const dy = Math.abs(shoulder.y - hip.y);
        const leanDegrees = (Math.atan2(dx, dy) * 180) / Math.PI;
        // Normal squats lean ~30–35°; flag only clearly excessive lean
        return leanDegrees > 45;
    },

    /**
     * Back arch: torso folding at the hip during standing lifts (presses,
     * deadlift lockout). Not applicable to seated or lying exercises — those
     * configs must not reference this rule.
     */
    back_arch: (ctx) => {
        const side = ctx.bestSide();
        const shoulder = ctx.point(SHOULDER[side]);
        const hip = ctx.point(HIP[side]);
        const knee = ctx.point(KNEE[side]);
        if (!shoulder || !hip || !knee) return false;

        const torsoAngle = calculateAngle(shoulder, hip, knee);
        return torsoAngle < 150;
    },

    /**
     * Shoulder shrug: ear-to-shoulder distance shrinking. Normalized by torso
     * length — the old absolute threshold fired based on how far the user
     * stood from the camera.
     */
    shoulder_shrug: (ctx) => {
        const torso = ctx.torsoLen();
        if (!torso) return false;
        const side = ctx.bestSide();
        const ear = ctx.point(EAR[side]);
        const shoulder = ctx.point(SHOULDER[side]);
        if (!ear || !shoulder) return false;

        return distance(ear, shoulder) < torso * 0.28;
    },

    /**
     * Knee past toes: front knee tracking beyond the toes in lunges.
     * Direction-agnostic — infers which way the user faces from the foot.
     */
    knee_past_toe: (ctx) => {
        const side = ctx.bestSide();
        const knee = ctx.point(KNEE[side]);
        const ankle = ctx.point(ANKLE[side]);
        const toe = ctx.point(TOE[side]);
        const torso = ctx.torsoLen();
        if (!knee || !ankle || !toe || !torso) return false;

        const facing = Math.sign(toe.x - ankle.x);
        if (facing === 0) return false;
        return (knee.x - toe.x) * facing > torso * 0.12;
    },

    /**
     * Arm sync: arms not moving together during jumping jacks. Wrist height
     * difference normalized by torso length.
     */
    arm_sync: (ctx) => {
        const torso = ctx.torsoLen();
        const wristL = ctx.point(15);
        const wristR = ctx.point(16);
        if (!torso || !wristL || !wristR) return false;

        return Math.abs(wristL.y - wristR.y) > torso * 0.5;
    },
};

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Evaluate all form rules for an exercise against current landmarks.
 *
 * @param rules      Rules from the exercise config
 * @param landmarks  All 33 smoothed landmarks
 * @param visibility Per-landmark MediaPipe visibility scores (0–1)
 * @returns Array of active form corrections
 */
export function evaluateFormRules(
    rules: { ruleKey: string; correctionMessage: string; id: string }[],
    landmarks: Point[],
    visibility?: number[],
): FormCorrection[] {
    const corrections: FormCorrection[] = [];
    const ctx = new RuleContext(landmarks, visibility);

    for (const rule of rules) {
        const checker = RULE_CHECKERS[rule.ruleKey];
        if (checker && checker(ctx)) {
            corrections.push({
                ruleId: rule.id,
                message: rule.correctionMessage,
                severity: 'warning',
            });
        }
    }

    return corrections;
}
