/**
 * Rep Engine — Refactored rep counter using the new exercise library
 *
 * This replaces the original repCounter.ts with a more powerful engine that:
 *  - Uses ExerciseConfig from exercises.ts instead of hardcoded configs
 *  - Integrates form correction rules from formCorrection.ts
 *  - Supports both "standard" (rep counting) and "hold" (timed) modes
 *  - Returns detailed results including form corrections
 */

import { calculateAngle, Point } from '../utils/angles';
import { ExerciseConfig, ExerciseId, EXERCISES } from './exercises';
import { evaluateFormRules, FormCorrection } from './formCorrection';
import { getCameraGuide } from './cameraGuide';

/** Minimum MediaPipe visibility for a landmark to be trusted. */
const MIN_VISIBILITY = 0.6;

/**
 * Feedback when no tracked joints are visible — the user isn't in frame yet.
 * Exported so the workout screen can promote this one message to a large
 * centered overlay (the user is standing away from the phone and can't read
 * the small form pill).
 */
export const NOT_IN_FRAME_FEEDBACK = 'Step back so your full body is visible';

// ─── Types ───────────────────────────────────────────────────────────────────

export type RepState = 'IDLE' | 'DOWN' | 'UP';

export interface RepEngineResult {
    repCount: number;
    currentAngle: number;
    formQuality: number;
    state: RepState;
    feedback: string;
    timeUnderTension: number;
    formCorrections: FormCorrection[];
    holdTime: number;          // For plank-style exercises (seconds)
    isHolding: boolean;        // Whether the user is in the hold position
    repJustCounted: boolean;   // True on the frame a rep was counted
    /** Set when the user's orientation contradicts the exercise's best camera view */
    positionHint: string | null;
}

// ─── RepEngine Class ─────────────────────────────────────────────────────────

export class RepEngine {
    private config: ExerciseConfig;
    private state: RepState = 'IDLE';
    private repCount: number = 0;
    private formScores: number[] = [];
    private currentAngle: number = 0;
    private smoothedAngle: number | null = null;
    private tensionStartTime: number | null = null;
    private totalTensionTime: number = 0;
    private minAngleInRep: number = 180;
    private maxAngleInRep: number = 0;
    private lastCorrections: FormCorrection[] = [];
    // Hold mode
    private holdStartTime: number | null = null;
    private totalHoldTime: number = 0;
    private isHolding: boolean = false;
    // Near-miss tracking: deepest angle reached while still in IDLE, and when
    // we last told the user they almost made the rep threshold
    private idleLocalMin: number = 180;
    private nearMissAt: number = 0;
    // Facing check: warn when orientation has contradicted the exercise's
    // best camera view for a sustained stretch
    private mismatchSince: number | null = null;
    private positionHint: string | null = null;

    constructor(exerciseId: ExerciseId) {
        this.config = EXERCISES[exerciseId];
    }

    /**
     * @param landmarks  All 33 smoothed landmark positions
     * @param visibility Per-landmark MediaPipe visibility scores (0–1).
     *                   MediaPipe hallucinates positions for occluded joints,
     *                   so angles are only trusted when all three tracked
     *                   points are actually visible.
     */
    processFrame(landmarks: Point[], visibility?: number[]): RepEngineResult {
        const vis = (i: number) => visibility?.[i] ?? 1;
        const sideVisible = ([a, b, c]: [number, number, number]) =>
            Math.min(vis(a), vis(b), vis(c)) >= MIN_VISIBILITY;
        const sidePoints = ([a, b, c]: [number, number, number]) =>
            landmarks[a] && landmarks[b] && landmarks[c]
                ? ([landmarks[a], landmarks[b], landmarks[c]] as const)
                : null;

        // Collect the angle from each side whose landmarks are trusted
        const angles: number[] = [];
        const primary = sidePoints(this.config.landmarkIndices);
        if (primary && sideVisible(this.config.landmarkIndices)) {
            angles.push(calculateAngle(primary[0], primary[1], primary[2]));
        }
        if (this.config.secondaryLandmarkIndices) {
            const secondary = sidePoints(this.config.secondaryLandmarkIndices);
            if (secondary && sideVisible(this.config.secondaryLandmarkIndices)) {
                angles.push(calculateAngle(secondary[0], secondary[1], secondary[2]));
            }
        }

        // No trusted side → freeze the state machine instead of feeding it
        // hallucinated coordinates (phantom reps).
        if (angles.length === 0) {
            const result = this.getResult(false);
            result.feedback = NOT_IN_FRAME_FEEDBACK;
            return result;
        }

        // Use the MORE CONTRACTED angle (lower value) among the visible
        // sides — whichever limb is actively working.
        const rawAngle = Math.min(...angles);

        this.updateFacingCheck(landmarks, vis);

        // The landmarks are already smoothed twice upstream (MediaPipe's
        // smoothLandmarks + the hook's EMA); a third EMA here made the angle
        // lag so much that fast reps never crossed both thresholds.
        this.currentAngle = rawAngle;
        this.smoothedAngle = rawAngle;

        // Evaluate form correction rules each frame
        this.lastCorrections = evaluateFormRules(this.config.formRules, landmarks, visibility);

        // Track min/max angles within the current rep
        this.minAngleInRep = Math.min(this.minAngleInRep, this.currentAngle);
        this.maxAngleInRep = Math.max(this.maxAngleInRep, this.currentAngle);

        let repJustCounted = false;

        if (this.config.repMode === 'hold') {
            // ─── Hold mode (plank / stretches) ───────────────────────────────
            // The hold position is an angle RANGE, not a single lower bound.
            // With only `angle >= contractedThreshold`, standing upright
            // (~180° at every joint) counted as holding for every exercise,
            // and quad stretch (knee ~30°) never counted at all.
            const [holdMin, holdMax] = this.config.holdRange
                ?? [this.config.contractedThreshold, this.config.extendedThreshold];
            let inGoodPosition =
                this.currentAngle >= holdMin && this.currentAngle <= holdMax;

            // Planks additionally require the body to be roughly horizontal,
            // otherwise standing still satisfies the body-line angle too.
            if (inGoodPosition && this.config.holdHorizontal) {
                const [hA, , hC] = this.config.landmarkIndices;
                const a = landmarks[hA];
                const c = landmarks[hC];
                if (a && c) {
                    inGoodPosition = Math.abs(a.y - c.y) < Math.abs(a.x - c.x);
                }
            }

            if (inGoodPosition && !this.isHolding) {
                this.holdStartTime = Date.now();
                this.isHolding = true;
            } else if (!inGoodPosition && this.isHolding) {
                if (this.holdStartTime) {
                    this.totalHoldTime += (Date.now() - this.holdStartTime) / 1000;
                }
                this.holdStartTime = null;
                this.isHolding = false;
            }
        } else {
            // ─── Standard rep counting mode ──────────────────────────────────
            switch (this.state) {
                case 'IDLE':
                    if (this.currentAngle < this.config.contractedThreshold) {
                        this.state = 'DOWN';
                        this.tensionStartTime = Date.now();
                        this.minAngleInRep = this.currentAngle;
                        this.maxAngleInRep = this.currentAngle;
                        this.idleLocalMin = 180;
                    } else {
                        // Near-miss: got close to the rep threshold but turned
                        // back — previously this produced zero feedback and
                        // the user had no idea why reps weren't counting.
                        this.idleLocalMin = Math.min(this.idleLocalMin, this.currentAngle);
                        const closeToThreshold =
                            this.idleLocalMin < this.config.contractedThreshold + 25;
                        const turningBack = this.currentAngle > this.idleLocalMin + 15;
                        if (closeToThreshold && turningBack) {
                            this.nearMissAt = Date.now();
                            this.idleLocalMin = 180;
                        }
                    }
                    break;

                case 'DOWN':
                    if (this.currentAngle > this.config.extendedThreshold) {
                        this.state = 'UP';
                        repJustCounted = true;
                    }
                    break;

                case 'UP':
                    this.repCount++;
                    const formScore = this.calculateFormScore();
                    this.formScores.push(formScore);

                    if (this.tensionStartTime) {
                        this.totalTensionTime += (Date.now() - this.tensionStartTime) / 1000;
                        this.tensionStartTime = null;
                    }

                    this.state = 'IDLE';
                    this.minAngleInRep = 180;
                    this.maxAngleInRep = 0;
                    break;
            }

            if (this.state === 'DOWN' && !this.tensionStartTime) {
                this.tensionStartTime = Date.now();
            }
        }

        return this.getResult(repJustCounted);
    }

    /**
     * Estimate whether the user faces the camera or stands side-on, and set a
     * positioning hint when it contradicts this exercise's best view.
     *
     * Facing metric: on-screen shoulder width relative to torso length —
     * facing the camera the shoulders span roughly a torso-length; side-on
     * they nearly overlap. Warnings only fire when we're confident (outside
     * the ambiguous middle band) and the mismatch has lasted a few seconds.
     */
    private updateFacingCheck(landmarks: Point[], vis: (i: number) => number): void {
        const guide = getCameraGuide(this.config.id);
        const shoulderL = landmarks[11];
        const shoulderR = landmarks[12];
        const hipL = landmarks[23];

        const clear = () => { this.mismatchSince = null; this.positionHint = null; };

        if (guide.view === 'angle' || !shoulderL || !shoulderR || !hipL
            || vis(11) < 0.6 || vis(12) < 0.6 || vis(23) < 0.6) {
            clear();
            return;
        }

        const torso = Math.hypot(shoulderL.x - hipL.x, shoulderL.y - hipL.y);
        if (torso < 0.01) { clear(); return; }
        const ratio = Math.abs(shoulderL.x - shoulderR.x) / torso;

        const facing: 'front' | 'side' | null = ratio > 0.6 ? 'front' : ratio < 0.32 ? 'side' : null;
        const mismatch = facing !== null && facing !== guide.view;

        if (!mismatch) { clear(); return; }
        const now = Date.now();
        if (this.mismatchSince === null) this.mismatchSince = now;
        if (now - this.mismatchSince > 2500) {
            this.positionHint = guide.view === 'side'
                ? 'Turn side-on to the camera so your reps track properly'
                : 'Face the camera for this exercise';
        }
    }

    private calculateFormScore(): number {
        const contractedScore = Math.max(
            0,
            100 - Math.abs(this.minAngleInRep - this.config.idealContracted) * 2
        );
        const extendedScore = Math.max(
            0,
            100 - Math.abs(this.maxAngleInRep - this.config.idealExtended) * 2
        );

        // Deduct for form corrections (each active correction removes 10 points)
        const correctionPenalty = this.lastCorrections.length * 10;

        return Math.max(0, Math.round((contractedScore + extendedScore) / 2 - correctionPenalty));
    }

    private getResult(repJustCounted: boolean): RepEngineResult {
        const avgForm =
            this.formScores.length > 0
                ? Math.round(this.formScores.reduce((a, b) => a + b, 0) / this.formScores.length)
                : 0;

        let currentTension = this.totalTensionTime;
        if (this.tensionStartTime) {
            currentTension += (Date.now() - this.tensionStartTime) / 1000;
        }

        let currentHold = this.totalHoldTime;
        if (this.holdStartTime) {
            currentHold += (Date.now() - this.holdStartTime) / 1000;
        }

        // Generate feedback based on form quality + corrections
        let feedback = 'Good Form';
        if (this.lastCorrections.length > 0) {
            feedback = this.lastCorrections[0].message;
        } else if (Date.now() - this.nearMissAt < 2500) {
            feedback = 'Almost — go a little further for the rep to count';
        } else if (avgForm > 0 && avgForm < 70) {
            feedback = 'Fix Your Form';
        }

        return {
            repCount: this.repCount,
            currentAngle: Math.round(this.currentAngle),
            formQuality: avgForm,
            state: this.state,
            feedback,
            timeUnderTension: Math.round(currentTension * 10) / 10,
            formCorrections: this.lastCorrections,
            holdTime: Math.round(currentHold * 10) / 10,
            isHolding: this.isHolding,
            repJustCounted,
            positionHint: this.positionHint,
        };
    }

    reset(): void {
        this.state = 'IDLE';
        this.repCount = 0;
        this.formScores = [];
        this.currentAngle = 0;
        this.smoothedAngle = null;
        this.tensionStartTime = null;
        this.totalTensionTime = 0;
        this.minAngleInRep = 180;
        this.maxAngleInRep = 0;
        this.lastCorrections = [];
        this.holdStartTime = null;
        this.totalHoldTime = 0;
        this.isHolding = false;
        this.idleLocalMin = 180;
        this.nearMissAt = 0;
    }

    setExercise(exerciseId: ExerciseId): void {
        this.config = EXERCISES[exerciseId];
        this.reset();
    }

    getExerciseId(): ExerciseId {
        return this.config.id;
    }
}
