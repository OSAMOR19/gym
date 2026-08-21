/**
 * Workout Session — collects per-set results during a workout and saves the
 * whole session atomically when it ends.
 *
 * The CV pipeline already knows per-set form quality, good/poor reps, and
 * timing; before this module none of it was persisted. The workout page
 * records each set as it completes (in memory), then completeSession() calls
 * the save_workout_v1 RPC, which writes session + sets + the legacy
 * workout_records row + events + program progress in ONE transaction — no
 * more "workout saved but sets missing".
 *
 * If the RPC isn't available (Phase 1 migration not applied yet), we fall
 * back to the original two-write path so nothing regresses; only the rich
 * per-set data is skipped. user_stats is saved as its own write in both
 * paths — stats are recomputable aggregates, unlike the workout data itself.
 */

import { createClient } from '../utils/supabase/client';
import { ExerciseId } from './exercises';
import { UserStats, saveStats } from './gamification';
import { saveWorkout } from './progressStore';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SetRecord {
    exerciseId: ExerciseId;
    setNumber: number;
    targetReps: number;
    completedReps: number;
    formScore: number;
    goodReps?: number;
    poorReps?: number;
    holdSeconds?: number;
    durationSeconds?: number;
    restSeconds?: number;          // rest taken before this set
    completedAt: string;
}

interface SessionDraft {
    startedAt: string;
    source: 'free' | 'program';
    programId?: string;
    programDayIndex?: number;
    programDayName?: string;
    sets: SetRecord[];
}

export interface CompleteSessionArgs {
    exerciseId: ExerciseId;
    /** Program days record under the day's name; free workouts under the exercise name */
    recordName: string;
    totalReps: number;
    avgFormScore: number;
    timeUnderTension: number;
    durationSeconds: number;
    xpGained: number;
    /** Post-workout stats snapshot (from gamification.applyWorkout) */
    stats: UserStats;
    programDayCompleted: { programId: string; dayIndex: number } | null;
}

export interface CompleteSessionResult {
    /** Workout data (session/sets/record) reached the server */
    saved: boolean;
    /** Stats upsert reached the server */
    statsSaved: boolean;
    sessionId: string | null;
}

// ─── In-memory draft (one workout at a time, like the coach state) ───────────

let draft: SessionDraft | null = null;

export function beginSession(
    source: 'free' | 'program',
    program?: { programId: string; dayIndex: number; dayName: string },
): void {
    draft = {
        startedAt: new Date().toISOString(),
        source,
        programId: program?.programId,
        programDayIndex: program?.dayIndex,
        programDayName: program?.dayName,
        sets: [],
    };
}

export function isSessionActive(): boolean {
    return draft !== null;
}

/** Record a completed set. No-op when no session is active. */
export function recordSet(set: Omit<SetRecord, 'completedAt'>): void {
    if (!draft) return;
    draft.sets.push({ ...set, completedAt: new Date().toISOString() });
}

/** Drop the draft without saving (workout ended with nothing to record). */
export function abandonSession(): void {
    draft = null;
}

// ─── Persistence ─────────────────────────────────────────────────────────────

export async function completeSession(args: CompleteSessionArgs): Promise<CompleteSessionResult> {
    const session = draft;
    draft = null;

    const supabase = createClient();
    let saved = false;
    let sessionId: string | null = null;

    const { data, error } = await supabase.rpc('save_workout_v1', {
        payload: {
            source: session?.source ?? (args.programDayCompleted ? 'program' : 'free'),
            program_id: session?.programId ?? args.programDayCompleted?.programId ?? null,
            program_day_index: session?.programDayIndex ?? args.programDayCompleted?.dayIndex ?? null,
            program_day_name: session?.programDayName ?? null,
            started_at: session?.startedAt ?? null,
            duration_seconds: Math.round(args.durationSeconds),
            total_reps: Math.round(args.totalReps),
            avg_form_score: Math.round(args.avgFormScore),
            time_under_tension: Math.round(args.timeUnderTension),
            xp_gained: Math.round(args.xpGained),
            exercise_id: args.exerciseId,
            exercise_name: args.recordName,
            sets: (session?.sets ?? []).map((s) => ({
                exercise_id: s.exerciseId,
                set_number: s.setNumber,
                target_reps: Math.round(s.targetReps),
                completed_reps: Math.round(s.completedReps),
                form_score: Math.round(s.formScore),
                good_reps: s.goodReps ?? null,
                poor_reps: s.poorReps ?? null,
                hold_seconds: s.holdSeconds != null ? Math.round(s.holdSeconds) : null,
                duration_seconds: s.durationSeconds != null ? Math.round(s.durationSeconds) : null,
                rest_seconds: s.restSeconds != null ? Math.round(s.restSeconds) : null,
                completed_at: s.completedAt,
            })),
            program_day_completed: args.programDayCompleted
                ? { program_id: args.programDayCompleted.programId, day_index: args.programDayCompleted.dayIndex }
                : null,
        },
    });

    if (!error && data) {
        saved = true;
        sessionId = (data as { session_id?: string }).session_id ?? null;
    } else {
        console.warn('[workoutSession] save_workout_v1 unavailable, using legacy save:', error?.message);
        // Legacy path (pre-migration): per-workout record only, no sets/events
        const record = await saveWorkout({
            exerciseId: args.exerciseId,
            exerciseName: args.recordName,
            reps: args.totalReps,
            formQuality: args.avgFormScore,
            timeUnderTension: args.timeUnderTension,
            duration: args.durationSeconds,
            xpGained: args.xpGained,
        });
        saved = record !== null;
    }

    const statsSaved = await saveStats(args.stats);

    return { saved, statsSaved, sessionId };
}
