/**
 * Exercise availability — the admin kill-switch, app side.
 *
 * Admins flip exercises live/off in the portal (`exercise_flags`); the app
 * reads the overrides here and hides disabled exercises from the picker.
 * Fail-open by design: if the table is missing or the network is down,
 * every exercise stays available — a flaky connection must never empty
 * the exercise list mid-session.
 */

import { createClient } from '../utils/supabase/client';
import { ExerciseId } from './exercises';

const CACHE_MS = 5 * 60_000;

let cache: { disabled: Set<ExerciseId>; at: number } | null = null;
let inflight: Promise<Set<ExerciseId>> | null = null;

export async function getDisabledExercises(): Promise<Set<ExerciseId>> {
    if (cache && Date.now() - cache.at < CACHE_MS) return cache.disabled;
    if (inflight) return inflight;

    inflight = (async () => {
        try {
            const supabase = createClient();
            const { data, error } = await supabase
                .from('exercise_flags')
                .select('exercise_id')
                .eq('enabled', false);
            const disabled = error
                ? new Set<ExerciseId>()
                : new Set((data ?? []).map((r) => r.exercise_id as ExerciseId));
            cache = { disabled, at: Date.now() };
            return disabled;
        } catch {
            return cache?.disabled ?? new Set<ExerciseId>();
        } finally {
            inflight = null;
        }
    })();
    return inflight;
}
