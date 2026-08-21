/**
 * Events — append-only stream of everything meaningful the user does.
 *
 * One table, structured jsonb metadata, no per-event-type tables. This stream
 * later powers the activity feed, notifications, analytics, and AI context.
 *
 * Logging is strictly fire-and-forget: an event failing to write must never
 * affect the workout experience, and the app must keep working before the
 * Phase 1 migration is applied (the insert just fails and is dropped).
 */

import { createClient } from '../utils/supabase/client';
import { ExerciseId } from './exercises';

export type WorkoutEventType =
    | 'WORKOUT_STARTED'
    | 'WORKOUT_COMPLETED'
    | 'WORKOUT_SKIPPED'
    | 'WORKOUT_MODIFIED'
    | 'EXERCISE_STARTED'
    | 'EXERCISE_COMPLETED'
    | 'SET_COMPLETED'
    | 'FORM_ISSUE_DETECTED'
    | 'RPE_RECORDED'
    | 'PR_RECORDED'
    | 'PROGRAM_DAY_COMPLETED'
    | 'PROGRAM_SELECTED'
    | 'INTAKE_COMPLETED';

interface EventOptions {
    exerciseId?: ExerciseId;
    sessionId?: string;
    metadata?: Record<string, unknown>;
}

// Warn about a missing events table once per page load, not once per event
let warned = false;

/**
 * Record an event. Never throws, never blocks — call it and move on.
 * (WORKOUT_COMPLETED / PROGRAM_DAY_COMPLETED are written atomically by the
 * save_workout_v1 RPC instead; don't log those from here.)
 */
export function logEvent(type: WorkoutEventType, options: EventOptions = {}): void {
    if (typeof window === 'undefined') return;

    void (async () => {
        try {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { error } = await supabase.from('events').insert({
                user_id: user.id,
                event_type: type,
                exercise_id: options.exerciseId ?? null,
                session_id: options.sessionId ?? null,
                metadata: options.metadata ?? {},
            });

            if (error && !warned) {
                warned = true;
                console.warn(`[events] Not recording events (${error.message}) — is the Phase 1 migration applied?`);
            }
        } catch {
            // Network hiccup etc. — events are best-effort by design.
        }
    })();
}
