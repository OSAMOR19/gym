/**
 * Progression — deterministic set-to-set adaptation rules.
 *
 * Decides, per exercise, whether the next session should progress, maintain,
 * or regress, from the user's most recent session of that exercise:
 *
 *   every set hit target AND hardest set RPE <= 6      → progress
 *   any set RPE >= 9 OR a set clearly missed (<80%)    → regress
 *   otherwise (incl. no history)                       → maintain
 *
 * Without RPE data, progress requires strong form evidence instead. All
 * thresholds live in trainingConfig. The program template stays the anchor:
 * adjustments drift at most a few reps/seconds from it, never unbounded.
 * An LLM never overrides these rules.
 */

import { PROGRESSION } from './trainingConfig';

export type ProgressionDecision = 'progress' | 'maintain' | 'regress';

/** One set from the user's last session of an exercise (workout_sets row). */
export interface LastSetSample {
    completedReps: number | null;
    targetReps: number | null;
    rpe: number | null;
    formScore: number | null;
    holdSeconds: number | null;
}

export function decideProgression(
    sets: LastSetSample[],
    template: { targetReps: number; targetHoldSeconds?: number },
): ProgressionDecision {
    if (sets.length === 0) return 'maintain';

    const isHold = (template.targetHoldSeconds ?? 0) > 0;

    let allHit: boolean;
    let clearlyMissed: boolean;
    if (isHold) {
        const holds = sets.map((s) => s.holdSeconds ?? 0);
        allHit = holds.every((h) => h >= template.targetHoldSeconds!);
        clearlyMissed = holds.some((h) => h < template.targetHoldSeconds! * PROGRESSION.missedRepShare);
    } else {
        const scored = sets.filter((s) => (s.targetReps ?? 0) > 0 && s.completedReps !== null);
        if (scored.length === 0) return 'maintain';
        allHit = scored.every((s) => s.completedReps! >= s.targetReps!);
        clearlyMissed = scored.some((s) => s.completedReps! < s.targetReps! * PROGRESSION.missedRepShare);
    }

    const rpes = sets.map((s) => s.rpe).filter((r): r is number => r !== null);
    const maxRpe = rpes.length > 0 ? Math.max(...rpes) : null;

    if ((maxRpe !== null && maxRpe >= PROGRESSION.regressMinRpe) || clearlyMissed) {
        return 'regress';
    }

    if (allHit) {
        if (maxRpe !== null) {
            return maxRpe <= PROGRESSION.progressMaxRpe ? 'progress' : 'maintain';
        }
        const forms = sets.map((s) => s.formScore).filter((f): f is number => f !== null);
        const avgForm = forms.length > 0 ? forms.reduce((a, b) => a + b, 0) / forms.length : null;
        return avgForm !== null && avgForm >= PROGRESSION.progressMinFormScore ? 'progress' : 'maintain';
    }

    return 'maintain';
}

export interface AdjustedTargets {
    targetReps: number;
    targetHoldSeconds?: number;
}

/**
 * Apply a decision to the template targets. Rep exercises continue from the
 * last session's target (so progress compounds) but stay clamped to a band
 * around the template; holds step one increment from the template.
 */
export function applyProgression(
    template: { targetReps: number; targetHoldSeconds?: number },
    lastTargetReps: number | null,
    decision: ProgressionDecision,
): AdjustedTargets {
    const isHold = (template.targetHoldSeconds ?? 0) > 0;

    if (isHold) {
        const t = template.targetHoldSeconds!;
        const next = decision === 'progress' ? t + PROGRESSION.holdIncrementSeconds
            : decision === 'regress' ? t - PROGRESSION.holdDecrementSeconds : t;
        return {
            targetReps: template.targetReps,
            targetHoldSeconds: Math.min(
                t + PROGRESSION.maxHoldIncreaseSeconds,
                Math.max(PROGRESSION.minHoldSeconds, next)),
        };
    }

    const base = lastTargetReps ?? template.targetReps;
    const next = decision === 'progress' ? base + PROGRESSION.repIncrement
        : decision === 'regress' ? base - PROGRESSION.repDecrement : base;
    const floor = Math.max(PROGRESSION.minTargetReps, template.targetReps - 4);
    const ceiling = template.targetReps + PROGRESSION.maxRepIncrease;
    return {
        targetReps: Math.min(ceiling, Math.max(floor, next)),
        targetHoldSeconds: template.targetHoldSeconds,
    };
}
