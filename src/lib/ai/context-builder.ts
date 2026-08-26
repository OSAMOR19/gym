/**
 * Coach Context — server-side context builder for the AI coach.
 *
 * Assembles a compact, relevant snapshot of the user for each chat request:
 * profile, plan, program position, recent training, and coach memories.
 * NOT a database dump — every section is capped, and every query fails soft
 * (a missing table or empty history just drops that section).
 *
 * The deterministic engines (intake scoring, readiness, progression) remain
 * the authority on decisions; this context lets the LLM explain and coach
 * around them with real data. Server-only: called from /api/ai/chat.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { PROGRAMS } from '../programs';
import { EXERCISES } from '../exercises';

const DAY_MS = 24 * 60 * 60 * 1000;

async function soft<T>(promise: PromiseLike<T>): Promise<T | null> {
    try { return await promise; } catch { return null; }
}

function programName(programId: string | null | undefined): string | null {
    if (!programId) return null;
    return PROGRAMS.find((p) => p.id === programId)?.name ?? programId;
}

function exerciseName(id: string | null | undefined): string {
    return (id && EXERCISES[id as keyof typeof EXERCISES]?.name) || id || 'unknown';
}

/** Build the user-context block injected into the coach's system prompt. */
export async function buildCoachContext(
    supabase: SupabaseClient,
    userId: string,
): Promise<string> {
    const [profileRes, statsRes, recordsRes, progressRes, setsRes, eventsRes, memoryRes] =
        await Promise.all([
            soft(supabase.from('user_profiles').select('*').eq('user_id', userId).maybeSingle()),
            soft(supabase.from('user_stats').select('*').eq('user_id', userId).maybeSingle()),
            soft(supabase.from('workout_records')
                .select('date, exercise_name, reps, form_quality, duration')
                .eq('user_id', userId).order('date', { ascending: false }).limit(10)),
            soft(supabase.from('program_progress')
                .select('program_id, completed_days, current_day_index, last_session_at')
                .eq('user_id', userId).order('updated_at', { ascending: false }).limit(3)),
            soft(supabase.from('workout_sets')
                .select('exercise_id, completed_reps, target_reps, rpe, form_score, completed_at')
                .eq('user_id', userId).order('completed_at', { ascending: false }).limit(15)),
            soft(supabase.from('events')
                .select('event_type, exercise_id, metadata, created_at')
                .eq('user_id', userId).order('created_at', { ascending: false }).limit(12)),
            soft(supabase.from('coach_memory')
                .select('content').eq('user_id', userId)
                .order('updated_at', { ascending: false }).limit(10)),
        ]);

    const lines: string[] = [];
    const now = Date.now();
    lines.push(`Today's date: ${new Date().toISOString().slice(0, 10)}`);

    // ── Profile / plan ──
    const p = profileRes?.data as Record<string, unknown> | null | undefined;
    if (p) {
        const bits: string[] = [];
        if (p.primary_goal) bits.push(`goal: ${p.primary_goal}`);
        if (p.fitness_experience) bits.push(`experience: ${p.fitness_experience}`);
        if (Array.isArray(p.equipment) && p.equipment.length) bits.push(`equipment: ${(p.equipment as string[]).join(', ')}`);
        if (p.preferred_workout_days) bits.push(`prefers ${p.preferred_workout_days} workout days/week`);
        if (Array.isArray(p.limitations) && p.limitations.length) bits.push(`working around: ${(p.limitations as string[]).join(', ')}`);
        if (p.age) bits.push(`age: ${p.age}`);
        if (bits.length) lines.push(`PROFILE — ${bits.join('; ')}`);
        const rec = programName(p.recommended_program_id as string | null);
        if (rec) lines.push(`RECOMMENDED PLAN — ${rec}`);
    }

    // ── Overall stats ──
    const s = statsRes?.data as Record<string, number | string | null> | null | undefined;
    if (s) {
        lines.push(`TOTALS — ${s.total_workouts ?? 0} workouts, ${s.total_reps ?? 0} reps, level ${s.level ?? 1}, current streak ${s.current_streak ?? 0} day(s)`);
    }

    // ── Program position ──
    const progress = progressRes?.data as Array<Record<string, unknown>> | null | undefined;
    if (progress?.length) {
        for (const row of progress) {
            const days = (row.completed_days as number[] | null) ?? [];
            const last = row.last_session_at
                ? `${Math.floor((now - new Date(row.last_session_at as string).getTime()) / DAY_MS)} days ago`
                : 'never';
            lines.push(`PROGRAM — ${programName(row.program_id as string)}: ${days.length} day(s) completed, next day index ${row.current_day_index ?? 0}, last session ${last}`);
        }
    }

    // ── Recent workouts ──
    const records = recordsRes?.data as Array<Record<string, unknown>> | null | undefined;
    if (records?.length) {
        const daysSince = Math.floor((now - new Date(records[0].date as string).getTime()) / DAY_MS);
        lines.push(`LAST WORKOUT — ${daysSince} day(s) ago`);
        lines.push('RECENT WORKOUTS (newest first):');
        for (const r of records) {
            lines.push(`  - ${(r.date as string).slice(0, 10)}: ${r.exercise_name}, ${r.reps} reps, form ${r.form_quality}%, ${Math.round((r.duration as number) / 60)} min`);
        }
    } else {
        lines.push('RECENT WORKOUTS — none recorded yet');
    }

    // ── Recent sets (RPE / targets) ──
    const sets = setsRes?.data as Array<Record<string, unknown>> | null | undefined;
    if (sets?.length) {
        const withRpe = sets.filter((x) => x.rpe != null);
        if (withRpe.length) {
            const avg = withRpe.reduce((a, x) => a + (x.rpe as number), 0) / withRpe.length;
            lines.push(`RECENT EFFORT — avg RPE ${avg.toFixed(1)} over last ${withRpe.length} rated set(s)`);
        }
        lines.push('RECENT SETS (newest first):');
        for (const x of sets.slice(0, 8)) {
            const rpe = x.rpe != null ? `, RPE ${x.rpe}` : '';
            lines.push(`  - ${exerciseName(x.exercise_id as string)}: ${x.completed_reps}/${x.target_reps || '—'} reps, form ${x.form_score ?? '—'}%${rpe}`);
        }
    }

    // ── Recent app events (adjustments, PRs, form issues) ──
    const events = eventsRes?.data as Array<Record<string, unknown>> | null | undefined;
    const interesting = events?.filter((e) =>
        ['WORKOUT_MODIFIED', 'FORM_ISSUE_DETECTED', 'PROGRAM_DAY_COMPLETED', 'INTAKE_COMPLETED'].includes(e.event_type as string));
    if (interesting?.length) {
        lines.push('RECENT APP EVENTS:');
        for (const e of interesting.slice(0, 6)) {
            const meta = JSON.stringify(e.metadata).slice(0, 220);
            lines.push(`  - ${(e.created_at as string).slice(0, 10)} ${e.event_type}${e.exercise_id ? ` (${exerciseName(e.exercise_id as string)})` : ''}: ${meta}`);
        }
    }

    // ── Coach memories ──
    const memories = memoryRes?.data as Array<{ content: string }> | null | undefined;
    if (memories?.length) {
        lines.push('COACH NOTES ABOUT THIS USER:');
        for (const m of memories) lines.push(`  - ${m.content.slice(0, 200)}`);
    }

    return lines.join('\n');
}
