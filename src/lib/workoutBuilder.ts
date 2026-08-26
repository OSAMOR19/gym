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
 *   2. Progression — targets adjust from the last session of each exercise
 *      (RPE + reps + form) under the deterministic progression rules.
 *   3. Readiness — after a long break, sets are trimmed (userState rules).
 *
 * Every modification is logged as a WORKOUT_MODIFIED event with the reasons,
 * so the history explains itself.
 */

import { createClient } from '../utils/supabase/client';
import { ExerciseId } from './exercises';
import { Program, WorkoutDay } from './programs';
import { QueueItem, setWorkoutQueue } from './workoutQueue';
import { getCoachPlan } from './coachIntake';
import {
    expandEquipment, canPerform, isContraindicated, findSubstitute, IntakeEquipment,
} from './exerciseGraph';
import { LimitationArea } from './exerciseMeta';
import { Readiness } from './userState';
import { READINESS } from './trainingConfig';
import {
    decideProgression, applyProgression, LastSetSample, ProgressionDecision,
} from './progression';
import { logEvent } from './events';

export interface Substitution {
    from: ExerciseId;
    to: ExerciseId;
    reasons: string[];
}

export interface TargetAdjustment {
    exerciseId: ExerciseId;
    decision: ProgressionDecision;
    fromReps?: number;
    toReps?: number;
    fromHoldSeconds?: number;
    toHoldSeconds?: number;
}

export interface BuiltDay {
    items: QueueItem[];
    substitutions: Substitution[];
    adjustments: TargetAdjustment[];
    /** Sets removed per exercise (0 or negative). */
    setAdjustment: number;
}

/** The most recent session's sets for each exercise, for progression.
 *  Empty map on any trouble (signed out, table missing, offline). */
async function fetchLastSessionSets(
    exerciseIds: ExerciseId[],
): Promise<Map<ExerciseId, LastSetSample[]>> {
    const result = new Map<ExerciseId, LastSetSample[]>();
    if (exerciseIds.length === 0) return result;
    try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return result;

        const { data, error } = await supabase
            .from('workout_sets')
            .select('exercise_id, session_id, completed_reps, target_reps, rpe, form_score, hold_seconds, completed_at')
            .eq('user_id', user.id)
            .in('exercise_id', exerciseIds)
            .order('completed_at', { ascending: false })
            .limit(120);

        if (error || !data) return result;

        // Keep only rows belonging to each exercise's newest session
        const latestSession = new Map<string, string>();
        for (const row of data) {
            if (!latestSession.has(row.exercise_id)) latestSession.set(row.exercise_id, row.session_id);
        }
        for (const row of data) {
            if (row.session_id !== latestSession.get(row.exercise_id)) continue;
            const id = row.exercise_id as ExerciseId;
            const sets = result.get(id) ?? [];
            sets.push({
                completedReps: row.completed_reps,
                targetReps: row.target_reps,
                rpe: row.rpe,
                formScore: row.form_score,
                holdSeconds: row.hold_seconds,
            });
            result.set(id, sets);
        }
        return result;
    } catch {
        return result;
    }
}

/**
 * Build the queue items for a program day, personalized to the user.
 * Without an intake plan nothing is substituted — we don't guess at
 * equipment or limitations we were never told about.
 */
export async function buildDayItems(
    programId: string,
    day: WorkoutDay,
    readiness: Readiness | null,
): Promise<BuiltDay> {
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

    // Progression: adjust targets from each exercise's most recent session.
    // Runs on the post-substitution ids — a swapped-in exercise usually has
    // no history yet and simply maintains the template.
    const adjustments: TargetAdjustment[] = [];
    const history = await fetchLastSessionSets(items.map((i) => i.exerciseId));
    items = items.map((item) => {
        const sets = history.get(item.exerciseId) ?? [];
        const template = { targetReps: item.targetReps, targetHoldSeconds: item.targetHoldSeconds };
        const decision = decideProgression(sets, template);
        if (decision === 'maintain' && sets.length === 0) return item;

        const lastTarget = sets.find((s) => (s.targetReps ?? 0) > 0)?.targetReps ?? null;
        const adjusted = applyProgression(template, lastTarget, decision);
        const changed = adjusted.targetReps !== item.targetReps
            || adjusted.targetHoldSeconds !== item.targetHoldSeconds;
        if (!changed) return item;

        adjustments.push({
            exerciseId: item.exerciseId,
            decision,
            fromReps: item.targetReps,
            toReps: adjusted.targetReps,
            fromHoldSeconds: item.targetHoldSeconds,
            toHoldSeconds: adjusted.targetHoldSeconds,
        });
        return { ...item, targetReps: adjusted.targetReps, targetHoldSeconds: adjusted.targetHoldSeconds };
    });

    // Readiness: trim volume after a break, never below the floor
    const setAdjustment = readiness?.setAdjustment ?? 0;
    if (setAdjustment !== 0) {
        items = items.map((item) => ({
            ...item,
            targetSets: Math.max(READINESS.minSets, item.targetSets + setAdjustment),
        }));
    }

    if (substitutions.length > 0 || adjustments.length > 0 || setAdjustment !== 0) {
        logEvent('WORKOUT_MODIFIED', {
            metadata: {
                program_id: programId,
                day_name: day.name,
                substitutions: substitutions.map((s) => ({
                    from: s.from, to: s.to, reasons: s.reasons,
                })),
                target_adjustments: adjustments.map((a) => ({
                    exercise_id: a.exerciseId, decision: a.decision,
                    from_reps: a.fromReps, to_reps: a.toReps,
                    from_hold_seconds: a.fromHoldSeconds, to_hold_seconds: a.toHoldSeconds,
                })),
                set_adjustment: setAdjustment,
                readiness: readiness?.level ?? 'ready',
            },
        });
    }

    return { items, substitutions, adjustments, setAdjustment };
}

/**
 * Build a program day (personalized) and stage it as the pending workout —
 * the shared "Start Day N" action used by the program calendar and the
 * dashboard's jump-back-in hero. Caller navigates to /workout afterwards.
 * Returns false when the day index doesn't exist.
 */
export async function launchProgramDay(
    program: Program,
    dayIndex: number,
    readiness: Readiness | null,
): Promise<boolean> {
    const flatDays = program.weeks.flatMap((w) => w.days);
    const day = flatDays[dayIndex];
    if (!day) return false;

    const built = await buildDayItems(program.id, day, readiness);
    setWorkoutQueue({
        programId: program.id,
        programName: program.name,
        dayIndex,
        dayName: day.name,
        items: built.items,
    });
    return true;
}
