/**
 * Rep Counter — State Machine for Exercise Repetition Counting
 *
 * Each exercise uses a finite state machine with states:
 *   IDLE → DOWN → UP → (rep counted, back to IDLE)
 *
 * The state transitions are driven by joint angle thresholds.
 * A "rep" is only counted when the user completes the full range of motion:
 *   extended → contracted → extended again.
 *
 * Form quality is calculated as a percentage based on how close the user
 * hits the ideal ROM thresholds at the extremes of the movement.
 */

import { calculateAngle, Point } from '../utils/angles';
import { smoothValue } from '../utils/smoothing';

// ─── Types ───────────────────────────────────────────────────────────────────

export type Exercise = 'curl' | 'squat' | 'pushup';
export type RepState = 'IDLE' | 'DOWN' | 'UP';

export interface RepResult {
    repCount: number;
    currentAngle: number;
    formQuality: number;       // 0–100 percentage
    state: RepState;
    feedback: string;           // "Good Form" or "Fix Your Form"
    timeUnderTension: number;   // seconds
}

// ─── Thresholds ──────────────────────────────────────────────────────────────
//
// Each exercise has an "extended" and "contracted" angle threshold.
// The user must cross both thresholds in sequence to count a rep.

interface ExerciseConfig {
    // Angle above which we consider the joint "extended" (start/end position)
    extendedThreshold: number;
    // Angle below which we consider the joint "contracted" (peak of movement)
    contractedThreshold: number;
    // MediaPipe landmark indices: [pointA, pointB (vertex), pointC]
    landmarkIndices: [number, number, number];
    // Ideal angles for form quality scoring
    idealExtended: number;
    idealContracted: number;
}

/**
 * MediaPipe Pose landmark indices (reference):
 *  11 = left shoulder,  12 = right shoulder
 *  13 = left elbow,     14 = right elbow
 *  15 = left wrist,     16 = right wrist
 *  23 = left hip,       24 = right hip
 *  25 = left knee,      26 = right knee
 *  27 = left ankle,     28 = right ankle
 */
const EXERCISE_CONFIGS: Record<Exercise, ExerciseConfig> = {
    curl: {
        // Bicep curl: track shoulder → elbow → wrist angle
        extendedThreshold: 150,   // arm nearly straight
        contractedThreshold: 50,  // arm fully curled
        landmarkIndices: [11, 13, 15], // left shoulder, left elbow, left wrist
        idealExtended: 170,
        idealContracted: 35,
    },
    squat: {
        // Squat: track hip → knee → ankle angle
        extendedThreshold: 160,   // standing upright
        contractedThreshold: 90,  // deep squat position
        landmarkIndices: [23, 25, 27], // left hip, left knee, left ankle
        idealExtended: 175,
        idealContracted: 70,
    },
    pushup: {
        // Push-up: track shoulder → elbow → wrist angle
        extendedThreshold: 150,   // arms extended (up position)
        contractedThreshold: 80,  // arms bent (down position)
        landmarkIndices: [11, 13, 15], // left shoulder, left elbow, left wrist
        idealExtended: 170,
        idealContracted: 60,
    },
};

// ─── RepCounter Class ────────────────────────────────────────────────────────

export class RepCounter {
    private exercise: Exercise;
    private state: RepState = 'IDLE';
    private repCount: number = 0;
    private formScores: number[] = [];
    private currentAngle: number = 0;
    private smoothedAngle: number | null = null;
    private tensionStartTime: number | null = null;
    private totalTensionTime: number = 0;
    private minAngleInRep: number = 180;
    private maxAngleInRep: number = 0;

    constructor(exercise: Exercise) {
        this.exercise = exercise;
    }

    /**
     * Process a single frame of landmarks and return the current rep state.
     *
     * @param landmarks Array of all 33 MediaPipe pose landmarks
     * @returns RepResult with current count, angle, form quality, and feedback
     */
    processFrame(landmarks: Point[]): RepResult {
        const config = EXERCISE_CONFIGS[this.exercise];
        const [iA, iB, iC] = config.landmarkIndices;

        // Extract the three relevant landmarks
        const pointA = landmarks[iA];
        const pointB = landmarks[iB];
        const pointC = landmarks[iC];

        if (!pointA || !pointB || !pointC) {
            return this.getResult();
        }

        // Calculate and smooth the joint angle
        const rawAngle = calculateAngle(pointA, pointB, pointC);
        this.currentAngle = smoothValue(rawAngle, this.smoothedAngle, 0.4);
        this.smoothedAngle = this.currentAngle;

        // Track min/max angles within the current rep for form scoring
        this.minAngleInRep = Math.min(this.minAngleInRep, this.currentAngle);
        this.maxAngleInRep = Math.max(this.maxAngleInRep, this.currentAngle);

        // ─── State Machine ─────────────────────────────────────────────────
        //
        //  IDLE ──(angle drops below contracted)──▶ DOWN
        //  DOWN ──(angle rises above extended)────▶ UP (rep counted!)
        //  UP   ──(reset)─────────────────────────▶ IDLE
        //

        let repCounted = false;

        switch (this.state) {
            case 'IDLE':
                // Waiting for the user to start the eccentric phase (contracting)
                if (this.currentAngle < config.contractedThreshold) {
                    this.state = 'DOWN';
                    this.tensionStartTime = Date.now();
                    this.minAngleInRep = this.currentAngle;
                    this.maxAngleInRep = this.currentAngle;
                }
                break;

            case 'DOWN':
                // User has reached the contracted position, now waiting for extension
                if (this.currentAngle > config.extendedThreshold) {
                    this.state = 'UP';
                    repCounted = true;
                }
                break;

            case 'UP':
                // Rep is complete — record it and reset
                this.repCount++;

                // Score form quality based on how close to ideal ROM the user achieved
                const formScore = this.calculateFormScore(config);
                this.formScores.push(formScore);

                // Track time under tension
                if (this.tensionStartTime) {
                    this.totalTensionTime += (Date.now() - this.tensionStartTime) / 1000;
                    this.tensionStartTime = null;
                }

                // Reset for next rep
                this.state = 'IDLE';
                this.minAngleInRep = 180;
                this.maxAngleInRep = 0;
                break;
        }

        // If we're currently in the DOWN state, we're under tension
        if (this.state === 'DOWN' && !this.tensionStartTime) {
            this.tensionStartTime = Date.now();
        }

        const result = this.getResult();
        if (repCounted) {
            // The caller (hook) will play the beep when it detects repCount changed
        }
        return result;
    }

    /**
     * Calculate form quality score (0–100).
     *
     * Scores how close the user's actual ROM matches ideal values:
     * - 100% = perfect ROM at both extended and contracted positions
     * - Lower = user didn't fully extend or contract
     */
    private calculateFormScore(config: ExerciseConfig): number {
        // How close did the contracted angle get to the ideal?
        const contractedScore = Math.max(
            0,
            100 - Math.abs(this.minAngleInRep - config.idealContracted) * 2
        );

        // How close did the extended angle get to the ideal?
        const extendedScore = Math.max(
            0,
            100 - Math.abs(this.maxAngleInRep - config.idealExtended) * 2
        );

        return Math.round((contractedScore + extendedScore) / 2);
    }

    private getResult(): RepResult {
        const avgForm =
            this.formScores.length > 0
                ? Math.round(
                    this.formScores.reduce((a, b) => a + b, 0) / this.formScores.length
                )
                : 0;

        // Calculate current tension time including ongoing rep
        let currentTension = this.totalTensionTime;
        if (this.tensionStartTime) {
            currentTension += (Date.now() - this.tensionStartTime) / 1000;
        }

        return {
            repCount: this.repCount,
            currentAngle: Math.round(this.currentAngle),
            formQuality: avgForm,
            state: this.state,
            feedback: avgForm >= 70 || this.formScores.length === 0 ? 'Good Form' : 'Fix Your Form',
            timeUnderTension: Math.round(currentTension * 10) / 10,
        };
    }

    /**
     * Reset all state — used when switching exercises.
     */
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
    }

    setExercise(exercise: Exercise): void {
        this.exercise = exercise;
        this.reset();
    }
}
