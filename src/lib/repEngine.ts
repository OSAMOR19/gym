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
import { smoothValue } from '../utils/smoothing';
import { ExerciseConfig, ExerciseId, EXERCISES } from './exercises';
import { evaluateFormRules, FormCorrection } from './formCorrection';

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

    constructor(exerciseId: ExerciseId) {
        this.config = EXERCISES[exerciseId];
    }

    processFrame(landmarks: Point[]): RepEngineResult {
        const [iA, iB, iC] = this.config.landmarkIndices;
        const pointA = landmarks[iA];
        const pointB = landmarks[iB];
        const pointC = landmarks[iC];

        if (!pointA || !pointB || !pointC) {
            return this.getResult(false);
        }

        // Calculate and smooth the joint angle
        const rawAngle = calculateAngle(pointA, pointB, pointC);
        this.currentAngle = smoothValue(rawAngle, this.smoothedAngle, 0.4);
        this.smoothedAngle = this.currentAngle;

        // Evaluate form correction rules each frame
        this.lastCorrections = evaluateFormRules(this.config.formRules, landmarks);

        // Track min/max angles within the current rep
        this.minAngleInRep = Math.min(this.minAngleInRep, this.currentAngle);
        this.maxAngleInRep = Math.max(this.maxAngleInRep, this.currentAngle);

        let repJustCounted = false;

        if (this.config.repMode === 'hold') {
            // ─── Hold mode (plank) ───────────────────────────────────────────
            const inGoodPosition = this.currentAngle >= this.config.contractedThreshold;

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
    }

    setExercise(exerciseId: ExerciseId): void {
        this.config = EXERCISES[exerciseId];
        this.reset();
    }

    getExerciseId(): ExerciseId {
        return this.config.id;
    }
}
