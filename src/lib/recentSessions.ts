/**
 * Recent sessions — rich cards for the dashboard "Recent" strip.
 *
 * Reads workout_sessions + their workout_sets (which carry target_reps /
 * completed_reps per set) so each card can show a real completion
 * percentage, plus an image: the program photo for program days, the
 * exercise demo GIF for free workouts.
 *
 * Fail-soft: any query error returns [] and the dashboard falls back to the
 * legacy text-only strip (pre-Phase-1 accounts have no session rows).
 */

import { createClient } from '../utils/supabase/client';
import { EXERCISES, ExerciseId } from './exercises';
import { EXERCISE_VIDEOS } from '../components/ExerciseGuide';
import { getProgramById } from './programs';

export interface RecentSession {
    id: string;
    /** Display name: program day for program sessions, exercise for free. */
    name: string;
    /** Secondary line under the name (program name / extra exercises). */
    detail: string | null;
    image: string | null;
    /** photo = dark program art (cover); gif = white-canvas exercise demo */
    imageKind: 'photo' | 'gif' | null;
    /** Exercise icon code fallback when there is no image. */
    icon: string | null;
    /** Σ completed / Σ target reps, capped at 100. Null when no targets. */
    completionPct: number | null;
    totalReps: number;
    formScore: number | null;
    completedAt: Date;
    href: string;
}

interface SessionRow {
    id: string;
    source: 'free' | 'program';
    program_id: string | null;
    program_day_name: string | null;
    completed_at: string;
    total_reps: number | null;
    avg_form_score: number | null;
}

interface SetRow {
    session_id: string;
    exercise_id: string;
    set_number: number;
    target_reps: number | null;
    completed_reps: number | null;
}

export async function loadRecentSessions(limit = 6): Promise<RecentSession[]> {
    try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];

        const { data: sessions, error } = await supabase
            .from('workout_sessions')
            .select('id, source, program_id, program_day_name, completed_at, total_reps, avg_form_score')
            .eq('user_id', user.id)
            .order('completed_at', { ascending: false })
            .limit(limit);
        if (error || !sessions || sessions.length === 0) return [];

        const ids = (sessions as SessionRow[]).map((s) => s.id);
        const { data: sets } = await supabase
            .from('workout_sets')
            .select('session_id, exercise_id, set_number, target_reps, completed_reps')
            .eq('user_id', user.id)
            .in('session_id', ids)
            .order('set_number', { ascending: true });

        const setsBySession = new Map<string, SetRow[]>();
        for (const row of (sets ?? []) as SetRow[]) {
            const list = setsBySession.get(row.session_id);
            if (list) list.push(row);
            else setsBySession.set(row.session_id, [row]);
        }

        return (sessions as SessionRow[]).map((s) => {
            const sessionSets = setsBySession.get(s.id) ?? [];

            // Completion: per-set completed capped at its target, so extra
            // reps on one set don't hide a skipped set elsewhere.
            let target = 0;
            let completed = 0;
            for (const set of sessionSets) {
                if (set.target_reps && set.target_reps > 0) {
                    target += set.target_reps;
                    completed += Math.min(set.completed_reps ?? 0, set.target_reps);
                }
            }
            const completionPct = target > 0
                ? Math.max(0, Math.min(100, Math.round((completed / target) * 100)))
                : null;

            // Exercises in performed order (unique)
            const exerciseIds: ExerciseId[] = [];
            for (const set of sessionSets) {
                const id = set.exercise_id as ExerciseId;
                if (EXERCISES[id] && !exerciseIds.includes(id)) exerciseIds.push(id);
            }
            const firstExercise = exerciseIds[0] ? EXERCISES[exerciseIds[0]] : null;

            const program = s.program_id ? getProgramById(s.program_id) : null;

            let name: string;
            let detail: string | null = null;
            let image: string | null = null;
            let imageKind: RecentSession['imageKind'] = null;

            if (program) {
                name = s.program_day_name ?? program.name;
                detail = s.program_day_name ? program.name : null;
                image = program.image;
                imageKind = 'photo';
            } else {
                name = firstExercise?.name ?? 'Workout';
                detail = exerciseIds.length > 1 ? `+${exerciseIds.length - 1} more exercise${exerciseIds.length > 2 ? 's' : ''}` : null;
                const gif = exerciseIds[0] ? EXERCISE_VIDEOS[exerciseIds[0]] : undefined;
                if (gif) {
                    image = gif;
                    imageKind = 'gif';
                }
            }

            return {
                id: s.id,
                name,
                detail,
                image,
                imageKind,
                icon: firstExercise?.icon ?? null,
                completionPct,
                totalReps: s.total_reps ?? 0,
                formScore: s.avg_form_score ?? null,
                completedAt: new Date(s.completed_at),
                href: program ? `/programs/${program.id}` : '/progress',
            };
        });
    } catch {
        return [];
    }
}
