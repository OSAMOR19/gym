/**
 * AI tool layer — the ONLY way the model reaches Iron Track data.
 *
 * Gemini requests one of these by name; the server executes it against
 * Supabase with the AUTHENTICATED user's id baked into every query (plus
 * RLS underneath), and returns a sanitized JSON result. The model never
 * sees credentials, other users' rows, or raw errors.
 *
 * Every tool is backed by data that actually exists today:
 * user_profiles / user_stats / workout_records / workout_sets /
 * program_progress. Weight PRs are honestly reported as unavailable —
 * weight logging isn't captured yet.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { FunctionDeclaration } from '@google/genai';
import { EXERCISES, ExerciseId } from '../exercises';
import { PROGRAMS } from '../programs';

// ─── Declarations (JSON Schema via parametersJsonSchema) ─────────────────────

export const TOOL_DECLARATIONS: FunctionDeclaration[] = [
    {
        name: 'get_user_profile',
        description: "The user's fitness profile: goal, experience, equipment, preferred training days, limitations, recommended plan, and lifetime stats.",
        parametersJsonSchema: { type: 'object', properties: {} },
    },
    {
        name: 'get_recent_workouts',
        description: "The user's most recent recorded workouts (date, name, reps, form quality, duration).",
        parametersJsonSchema: {
            type: 'object',
            properties: {
                limit: { type: 'integer', description: 'How many workouts to return (1-15, default 8)' },
            },
        },
    },
    {
        name: 'get_exercise_history',
        description: 'Recent logged sets and workouts for one exercise (reps vs target, RPE, form score, holds).',
        parametersJsonSchema: {
            type: 'object',
            properties: {
                exercise: { type: 'string', description: "Exercise name or id, e.g. 'squat' or 'Bicep Curl'" },
            },
            required: ['exercise'],
        },
    },
    {
        name: 'get_exercise_progress',
        description: 'Progression for one exercise over a period: per-day totals and a first-vs-latest comparison of reps, form, and RPE.',
        parametersJsonSchema: {
            type: 'object',
            properties: {
                exercise: { type: 'string', description: 'Exercise name or id' },
                period: { type: 'string', enum: ['7_days', '30_days', '90_days', 'all'], description: 'Window to analyze (default 30_days)' },
            },
            required: ['exercise'],
        },
    },
    {
        name: 'get_personal_records',
        description: 'Best single-set reps and best single-workout reps per exercise. Weight PRs are not tracked yet.',
        parametersJsonSchema: { type: 'object', properties: {} },
    },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Fuzzy-resolve a user/model-provided name to a catalog exercise id. */
export function resolveExerciseId(raw: string): ExerciseId | null {
    const q = raw.trim().toLowerCase().replace(/[\s-]+/g, '_');
    if (q in EXERCISES) return q as ExerciseId;
    const plain = raw.trim().toLowerCase();
    const byName = Object.values(EXERCISES).find((e) => e.name.toLowerCase() === plain)
        ?? Object.values(EXERCISES).find((e) => e.name.toLowerCase().includes(plain));
    return byName?.id ?? null;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function periodStart(period: string | undefined): string | null {
    const days = period === '7_days' ? 7 : period === '90_days' ? 90 : period === 'all' ? null : 30;
    return days === null ? null : new Date(Date.now() - days * DAY_MS).toISOString();
}

// ─── Executor ────────────────────────────────────────────────────────────────

export async function executeTool(
    supabase: SupabaseClient,
    userId: string,
    name: string,
    args: Record<string, unknown>,
): Promise<Record<string, unknown>> {
    try {
        switch (name) {
            case 'get_user_profile': {
                const [{ data: p }, { data: s }] = await Promise.all([
                    supabase.from('user_profiles').select('*').eq('user_id', userId).maybeSingle(),
                    supabase.from('user_stats').select('total_workouts, total_reps, level, current_streak, longest_streak, last_workout_date').eq('user_id', userId).maybeSingle(),
                ]);
                const recommended = p?.recommended_program_id
                    ? PROGRAMS.find((pr) => pr.id === p.recommended_program_id)?.name ?? null
                    : null;
                return {
                    goal: p?.primary_goal ?? null,
                    experience: p?.fitness_experience ?? null,
                    equipment: p?.equipment ?? null,
                    preferred_days_per_week: p?.preferred_workout_days ?? null,
                    limitations: p?.limitations ?? null,
                    recommended_plan: recommended,
                    totals: s ?? null,
                    note: p || s ? undefined : 'No profile data yet — the user has not completed the intake or trained.',
                };
            }

            case 'get_recent_workouts': {
                const limit = Math.min(15, Math.max(1, Number(args.limit) || 8));
                const { data } = await supabase
                    .from('workout_records')
                    .select('date, exercise_name, reps, form_quality, duration')
                    .eq('user_id', userId)
                    .order('date', { ascending: false })
                    .limit(limit);
                return { workouts: data ?? [], note: data?.length ? undefined : 'No workouts recorded yet.' };
            }

            case 'get_exercise_history': {
                const id = resolveExerciseId(String(args.exercise ?? ''));
                if (!id) return { error: `Unknown exercise "${args.exercise}". Use a name from the Iron Track catalog.` };
                const [{ data: sets }, { data: records }] = await Promise.all([
                    supabase.from('workout_sets')
                        .select('completed_at, set_number, completed_reps, target_reps, rpe, form_score, hold_seconds')
                        .eq('user_id', userId).eq('exercise_id', id)
                        .order('completed_at', { ascending: false }).limit(15),
                    supabase.from('workout_records')
                        .select('date, reps, form_quality')
                        .eq('user_id', userId).eq('exercise_id', id)
                        .order('date', { ascending: false }).limit(10),
                ]);
                return {
                    exercise: EXERCISES[id].name,
                    recent_sets: sets ?? [],
                    recent_workouts: records ?? [],
                    note: (sets?.length || records?.length) ? undefined : 'No logged history for this exercise yet.',
                };
            }

            case 'get_exercise_progress': {
                const id = resolveExerciseId(String(args.exercise ?? ''));
                if (!id) return { error: `Unknown exercise "${args.exercise}".` };
                let query = supabase.from('workout_sets')
                    .select('completed_at, completed_reps, rpe, form_score, hold_seconds')
                    .eq('user_id', userId).eq('exercise_id', id)
                    .order('completed_at', { ascending: true }).limit(200);
                const start = periodStart(args.period as string | undefined);
                if (start) query = query.gte('completed_at', start);
                const { data: sets } = await query;
                if (!sets || sets.length === 0) {
                    return { exercise: EXERCISES[id].name, note: 'No logged sets for this exercise in that period.' };
                }
                // Group per calendar day
                const byDay = new Map<string, { reps: number; sets: number; rpe: number[]; form: number[] }>();
                for (const s of sets) {
                    const day = (s.completed_at as string).slice(0, 10);
                    const d = byDay.get(day) ?? { reps: 0, sets: 0, rpe: [], form: [] };
                    d.reps += (s.completed_reps as number) ?? 0;
                    d.sets += 1;
                    if (s.rpe != null) d.rpe.push(s.rpe as number);
                    if (s.form_score != null) d.form.push(s.form_score as number);
                    byDay.set(day, d);
                }
                const avg = (n: number[]) => n.length ? Math.round((n.reduce((a, b) => a + b, 0) / n.length) * 10) / 10 : null;
                const days = [...byDay.entries()].map(([date, d]) => ({
                    date, total_reps: d.reps, sets: d.sets, avg_rpe: avg(d.rpe), avg_form: avg(d.form),
                }));
                const first = days[0];
                const latest = days[days.length - 1];
                return {
                    exercise: EXERCISES[id].name,
                    period: (args.period as string) ?? '30_days',
                    sessions: days,
                    comparison: days.length >= 2 ? { first, latest, rep_change: latest.total_reps - first.total_reps } : undefined,
                };
            }

            case 'get_personal_records': {
                const [{ data: sets }, { data: records }] = await Promise.all([
                    supabase.from('workout_sets')
                        .select('exercise_id, completed_reps, hold_seconds, completed_at')
                        .eq('user_id', userId)
                        .order('completed_reps', { ascending: false }).limit(200),
                    supabase.from('workout_records')
                        .select('exercise_id, exercise_name, reps, date')
                        .eq('user_id', userId)
                        .order('reps', { ascending: false }).limit(200),
                ]);
                const bestSet = new Map<string, { reps: number; date: string }>();
                for (const s of sets ?? []) {
                    const key = s.exercise_id as string;
                    if (!bestSet.has(key) && s.completed_reps != null) {
                        bestSet.set(key, { reps: s.completed_reps as number, date: (s.completed_at as string).slice(0, 10) });
                    }
                }
                const bestWorkout = new Map<string, { reps: number; date: string }>();
                for (const r of records ?? []) {
                    const key = r.exercise_id as string;
                    if (!bestWorkout.has(key)) {
                        bestWorkout.set(key, { reps: r.reps as number, date: (r.date as string).slice(0, 10) });
                    }
                }
                const nameOf = (id: string) => EXERCISES[id as ExerciseId]?.name ?? id;
                return {
                    best_single_set_reps: [...bestSet.entries()].map(([id, v]) => ({ exercise: nameOf(id), ...v })),
                    best_single_workout_reps: [...bestWorkout.entries()].slice(0, 15).map(([id, v]) => ({ exercise: nameOf(id), ...v })),
                    note: 'Weight is not logged yet, so there are no weight PRs — only rep records.',
                };
            }

            default:
                return { error: `Unknown tool: ${name}` };
        }
    } catch {
        // Never leak internals to the model
        return { error: 'The lookup failed — answer with what you already have.' };
    }
}
