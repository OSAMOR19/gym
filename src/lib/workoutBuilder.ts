/**
 * Workout Builder — turns a program day (static template) into the workout
 * the user should actually do today.
 *
 * Programs stay untouched as templates; personalization happens here at
 * queue-build time, deterministically:
 *
 *   1. Substitution — exercises the user can't do (equipment) or shouldn't
 *      do (intake limitations) are swapped for the closest appropriate
 *      alternative via the exercise graph, preserving rep mode.
 *   2. Readiness — after a long break, sets are trimmed (userState rules).
 *
 * Every modification is logged as a WORKOUT_MODIFIED event with the reasons,
 * so the history explains itself.
 */

import { ExerciseId } from './exercises';
import { WorkoutDay } from './programs';
import { QueueItem } from './workoutQueue';
import { getCoachPlan } from './coachIntake';
import {
    expandEquipment, canPerform, isContraindicated, findSubstitute, IntakeEquipment,
} from './exerciseGraph';
import { LimitationArea } from './exerciseMeta';
import { Readiness } from './userState';
import { READINESS } from './trainingConfig';
import { logEvent } from './events';

export interface Substitution {
    from: ExerciseId;
    to: ExerciseId;
    reasons: string[];
}

export interface BuiltDay {
    items: QueueItem[];
    substitutions: Substitution[];
    /** Sets removed per exercise (0 or negative). */
    setAdjustment: number;
}

/**
 * Build the queue items for a program day, personalized to the user.
 * Without an intake plan nothing is substituted — we don't guess at
 * equipment or limitations we were never told about.
 */
export function buildDayItems(
    programId: string,
    day: WorkoutDay,
    readiness: Readiness | null,
): BuiltDay {
    const plan = getCoachPlan();
    const substitutions: Substitution[] = [];

    const available = plan ? expandEquipment(plan.answers.equipment as IntakeEquipment[]) : null;
    const limitations: LimitationArea[] = plan
        ? plan.answers.limitations.filter((l): l is LimitationArea => l !== 'none')
        : [];
    const dayExerciseIds = day.exercises.map((e) => e.exerciseId);

    let items: QueueItem[] = day.exercises.map((ex) => {
        const needsSwap = available !== null
            && (!canPerform(ex.exerciseId, available) || isContraindicated(ex.exerciseId, limitations));

        if (needsSwap) {
            const sub = findSubstitute(ex.exerciseId, {
                available: available!,
                limitations,
                exclude: dayExerciseIds.filter((id) => id !== ex.exerciseId),
                sameRepModeOnly: true,
            });
            if (sub) {
                substitutions.push({ from: ex.exerciseId, to: sub.id, reasons: sub.reasons });
                return {
                    exerciseId: sub.id,
                    targetSets: ex.targetSets,
                    targetReps: ex.targetReps,
                    targetHoldSeconds: ex.targetHoldSeconds,
                    substitutedFrom: ex.exerciseId,
                };
            }
            // No suitable replacement — keep the original rather than drop the
            // slot; the user can still skip it themselves.
        }

        return {
            exerciseId: ex.exerciseId,
            targetSets: ex.targetSets,
            targetReps: ex.targetReps,
            targetHoldSeconds: ex.targetHoldSeconds,
        };
    });

    // Readiness: trim volume after a break, never below the floor
    const setAdjustment = readiness?.setAdjustment ?? 0;
    if (setAdjustment !== 0) {
        items = items.map((item) => ({
            ...item,
            targetSets: Math.max(READINESS.minSets, item.targetSets + setAdjustment),
        }));
    }

    if (substitutions.length > 0 || setAdjustment !== 0) {
        logEvent('WORKOUT_MODIFIED', {
            metadata: {
                program_id: programId,
                day_name: day.name,
                substitutions: substitutions.map((s) => ({
                    from: s.from, to: s.to, reasons: s.reasons,
                })),
                set_adjustment: setAdjustment,
                readiness: readiness?.level ?? 'ready',
            },
        });
    }

    return { items, substitutions, setAdjustment };
}
